#!/usr/bin/env bash
# ==============================================================================
# _ai_memory_cline_lib.sh
# Biblioteca compartilhada dos hooks Cline -> ai-memory
#
# Todo hook de evento (TaskStart, PreToolUse, PostToolUse, ...) faz:
#   . "$(dirname "$0")/_ai_memory_cline_lib.sh"
#   amc_main "<cline_hook_name>" "<ai_memory_kind>" [want_handoff:0|1]
#
# Contrato de entrada (Cline -> hook, via stdin, JSON):
#   Campos comuns: "taskId", "hookName", "clineVersion", "timestamp",
#   "workspaceRoots": [...], "userId", "model": { "provider", "slug" }.
#   Bloco ANINHADO específico do evento, nomeado em camelCase a partir do
#   próprio hookName (só o bloco do evento atual vem preenchido):
#     "userPromptSubmit": { "prompt", "attachments": [...] }
#     "preToolUse":       { "toolName", "parameters": {} }
#     "postToolUse":      { "toolName", "parameters": {}, "result", "success", "executionTimeMs" }
#     "taskStart":        { "taskMetadata": { "taskId", "ulid", "initialTask" } }
#     "taskResume":       { "taskMetadata": {...}, "previousState": {...} }
#     "taskCancel":       { "taskMetadata": { "taskId", "ulid", "completionStatus" } }
#     "taskComplete":     { "taskMetadata": { "taskId", "ulid", "result", "command" } }
#     "preCompact":       { "taskId", "ulid", "contextSize", "compactionStrategy", ... }
#
# Contrato de saída (hook -> Cline, via stdout, JSON):
#   { "cancel": bool, "contextModification": string, "errorMessage": string }
#   (stderr é livre para debug; stdout só o JSON final)
#
# Contrato com o ai-memory (POST /hook + GET /handoff):
#   - POST $AI_MEMORY_URL/hook?event=<kind>&agent=cline&extension=cline
#     com corpo JSON canônico em snake_case (session_id, cwd, model,
#     prompt / tool_name+tool_input+tool_response, etc.) — formato que o
#     roteador/sanitizador do ai-memory espera (cf. exemplos oficiais
#     "agent=other" em docs/marker-file.md e docs/architecture.md).
#   - GET $AI_MEMORY_URL/handoff?agent=cline&extension=cline&cwd=...
#     apenas para TaskStart/TaskResume: devolve texto de handoff pendente
#     que é injetado no Cline via "contextModification".
#   - Todos os timeouts são curtos e nenhuma falha de rede deve travar o
#     Cline (fire-and-forget; erros só viram log se AI_MEMORY_DEBUG=1).
# ==============================================================================

set -u

# ------------------------------------------------------------------------
# Configuração (todas sobrescrevíveis via variável de ambiente)
# ------------------------------------------------------------------------
: "${AI_MEMORY_BIN:=ai-memory-hooks-disabled}"  # binário nativo (opt-in; sentinel desabilita)
: "${AI_MEMORY_URL:=http://127.0.0.1:49374}"    # ajuste para a porta real do seu servidor
: "${AI_MEMORY_TIMEOUT:=0.5}"                   # segundos (POST /hook — fire-and-forget)
: "${AI_MEMORY_HANDOFF_TIMEOUT:=2.0}"           # segundos (GET /handoff — síncrono)
: "${AI_MEMORY_EXTENSION_NS:=cline}"            # namespace usado para não colapsar em "other"
: "${AI_MEMORY_DEBUG:=0}"                       # 1 = loga em stderr
: "${AI_MEMORY_BODY_MAX_BYTES:=16384}"          # 16 KiB, mesmo limite documentado do servidor
: "${AI_MEMORY_DISABLE:=0}"                     # 1 = desliga a integração sem remover os hooks
: "${AI_MEMORY_AUTH_TOKEN:=}"                   # opcional; vira Authorization: Bearer quando setado

amc_log() {
  [ "$AI_MEMORY_DEBUG" = "1" ] && printf '[ai-memory-cline] %s\n' "$*" >&2
  return 0
}

# Escreve o resultado final para o Cline em stdout e termina o processo.
# amc_emit_result <contextModification|""> <cancel:true|false> <errorMessage|"">
amc_emit_result() {
  local ctx="$1" cancel="${2:-false}" err="${3:-}"
  if command -v jq >/dev/null 2>&1; then
    jq -n --arg ctx "$ctx" --argjson cancel "$cancel" --arg err "$err" \
      '{contextModification: (if $ctx == "" then null else $ctx end),
        cancel: $cancel,
        errorMessage: (if $err == "" then null else $err end)}
       | with_entries(select(.value != null))'
  else
    printf '{'
    [ -n "$ctx" ] && printf '"contextModification": %s,' "$(amc_json_escape "$ctx")"
    [ -n "$err" ] && printf '"errorMessage": %s,' "$(amc_json_escape "$err")"
    printf '"cancel": %s}' "$cancel"
  fi
  exit 0
}

amc_json_escape() {
  # Escapa uma string crua para uso como valor JSON (fallback sem jq)
  local s="$1"
  s="${s//\\/\\\\}"
  s="${s//\"/\\\"}"
  s="$(printf '%s' "$s" | awk '{printf "%s\\n", $0}' | sed '$ s/\\n$//')"
  printf '"%s"' "$s"
}

# Lê o payload inteiro do stdin (o Cline sempre manda JSON) uma única vez.
amc_read_stdin() {
  cat -
}

# Extrai um campo do JSON de entrada via jq. `jq` é uma dependência obrigatória
# desta biblioteca (ver seção 7 do README) — sem ele, o campo volta vazio e o
# hook segue em frente com corpo vazio (nunca trava o Cline).
# amc_jget <json> <caminho jq, ex: .taskId ou .preToolUse.toolName>
amc_jget() {
  local json="$1" path="$2"
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$json" | jq -r "$path // empty" 2>/dev/null
  else
    printf ''
  fi
}

# Trunca um texto para o limite documentado do servidor (16 KiB) antes de enviar.
amc_truncate() {
  local text="$1"
  printf '%s' "$text" | head -c "$AI_MEMORY_BODY_MAX_BYTES"
}

# ------------------------------------------------------------------------
# Monta o corpo JSON canônico para o /hook do ai-memory.
# O roteador/sanitizador do servidor extrai conteúdo de campos em snake_case
# (session_id, cwd, prompt, tool_name, tool_input, tool_response, ...) —
# por isso empacotamos os dados do Cline nesse formato, em vez de metê-los
# numa string "body" opaca (que o servidor não consegue interpretar).
# amc_build_payload <raw_json_cline> <cline_hook_name>
# ------------------------------------------------------------------------
amc_build_payload() {
  local raw="$1" native="$2"

  # Sem jq não há como transformar o payload com segurança; envia o bruto do
  # Cline como corpo para que o servidor decida (fail-open, nunca trava).
  if ! command -v jq >/dev/null 2>&1; then
    printf '%s' "$raw"
    return 0
  fi

  printf '%s' "$raw" | jq -c --arg native "$native" --arg pwd "$PWD" '
    def common: {
      session_id: (.taskId // ""),
      cwd: ((.workspaceRoots[0] // empty) // $pwd),
      model: (if (.model | type) == "object"
              then ((.model.provider // "unknown") + "/" + (.model.slug // "unknown"))
              else (.model // "") end),
      timestamp: (.timestamp // ""),
      native_event: $native,
      source: "cline"
    };
    common +
    (if $native == "UserPromptSubmit" then
       {prompt: (.userPromptSubmit.prompt // "")}
     elif $native == "PreToolUse" then
       {tool_name: (.preToolUse.toolName // ""),
        tool_input: ((.preToolUse.parameters // {}) | tostring)}
     elif $native == "PostToolUse" then
       {tool_name: (.postToolUse.toolName // ""),
        tool_input: ((.postToolUse.parameters // {}) | tostring),
        tool_response: (.postToolUse.result // ""),
        success: (.postToolUse.success // false),
        execution_time_ms: (.postToolUse.executionTimeMs // 0)}
     elif $native == "TaskStart" then
       {initial_task: (.taskStart.taskMetadata.initialTask // "")}
     elif $native == "TaskResume" then
       {previous_state: ((.taskResume.previousState // {}) | tostring)}
     elif $native == "TaskCancel" then
       {completion_status: (.taskCancel.taskMetadata.completionStatus // "")}
     elif $native == "TaskComplete" then
       {result: ((.taskComplete.taskMetadata.result //
                  .taskComplete.taskMetadata.command) // "")}
     elif $native == "PreCompact" then
       {compaction_strategy: (.preCompact.compactionStrategy // ""),
        tokens_in:  (.preCompact.tokensIn  // 0),
        tokens_out: (.preCompact.tokensOut // 0),
        context_size: (.preCompact.contextSize // 0)}
     else
       {}
     end)'
}

# ------------------------------------------------------------------------
# Envia o payload ao ai-memory (fire-and-forget; nunca deve travar o Cline).
# Caminho 1 (se AI_MEMORY_BIN existir no PATH):
#   ai-memory hook --event <kind> --agent cline --server-url <url> [--auth-token <tok>]
# Caminho 2 (fallback HTTP):
#   POST <url>/hook?event=<kind>&agent=cline&extension=<ns>
# amc_send <payload_json> <ai_memory_kind>
# ------------------------------------------------------------------------
amc_send() {
  local payload="$1" kind="$2"

  if [ -n "$AI_MEMORY_BIN" ] && command -v "$AI_MEMORY_BIN" >/dev/null 2>&1; then
    amc_log "usando binário nativo: $AI_MEMORY_BIN hook --event $kind --agent cline"
    local args=(hook --event "$kind" --agent cline --server-url "$AI_MEMORY_URL")
    [ -n "$AI_MEMORY_AUTH_TOKEN" ] && args+=(--auth-token "$AI_MEMORY_AUTH_TOKEN")
    printf '%s' "$payload" \
      | timeout "${AI_MEMORY_TIMEOUT}s" "$AI_MEMORY_BIN" "${args[@]}" \
        >/dev/null 2>>/tmp/ai-memory-cline.err \
      || amc_log "binário nativo falhou/timeout"
    return 0
  fi

  local url="${AI_MEMORY_URL}/hook?event=${kind}&agent=cline&extension=${AI_MEMORY_EXTENSION_NS}"
  amc_log "POST $url"
  local auth=()
  [ -n "$AI_MEMORY_AUTH_TOKEN" ] && auth=(-H "Authorization: Bearer $AI_MEMORY_AUTH_TOKEN")
  curl -sS -m "$AI_MEMORY_TIMEOUT" -X POST "$url" \
    -H 'Content-Type: application/json' \
    "${auth[@]}" \
    -d "$payload" >/dev/null 2>>/tmp/ai-memory-cline.err \
    || amc_log "POST /hook falhou/timeout"
}

# ------------------------------------------------------------------------
# GET /handoff — busca handoff pendente (só faz sentido em TaskStart/TaskResume).
# Retorna em stdout o corpo da resposta (texto puro ou JSON; ver
# amc_extract_handoff para a interpretação).
# amc_fetch_handoff <cwd> <session_id>
# ------------------------------------------------------------------------
amc_fetch_handoff() {
  local cwd="$1" sid="$2"
  local base="${AI_MEMORY_URL}/handoff"

  local args=(-sS -m "$AI_MEMORY_HANDOFF_TIMEOUT" -G "$base"
              --data-urlencode "agent=cline"
              --data-urlencode "extension=${AI_MEMORY_EXTENSION_NS}")
  [ -n "$cwd" ] && args+=(--data-urlencode "cwd=$cwd")
  [ -n "$sid" ] && args+=(--data-urlencode "session_id=$sid")

  local auth=()
  [ -n "$AI_MEMORY_AUTH_TOKEN" ] && auth=(-H "Authorization: Bearer $AI_MEMORY_AUTH_TOKEN")

  amc_log "GET $base"
  curl "${args[@]}" "${auth[@]}" 2>>/tmp/ai-memory-cline.err \
    || amc_log "GET /handoff falhou/timeout"
}

# Tenta extrair um texto de handoff utilizável de uma resposta arbitrária
# (JSON com chave context/handoff/markdown/body/summary, ou texto puro).
amc_extract_handoff() {
  local resp="$1" v
  [ -z "$resp" ] && return 0
  if command -v jq >/dev/null 2>&1; then
    for key in '.context' '.handoff' '.handoff_markdown' '.markdown' '.body' '.summary'; do
      v="$(printf '%s' "$resp" | jq -r "$key // empty" 2>/dev/null)"
      if [ -n "$v" ] && [ "$v" != "null" ]; then
        printf '%s' "$v"
        return 0
      fi
    done
    # Se o JSON não tem nenhuma dessas chaves mas é um objeto/array válido, ignora.
    if printf '%s' "$resp" | jq -e . >/dev/null 2>&1; then
      return 0
    fi
  fi
  # Não era JSON reconhecível: trata como texto puro de handoff.
  printf '%s' "$resp"
}

# ------------------------------------------------------------------------
# Ponto de entrada padrão usado por todos os scripts de evento.
# amc_main <cline_hook_name> <ai_memory_kind> [want_handoff:0|1]
#
# Fluxo:
#   1) lê stdin
#   2) monta payload canônico a partir do bloco ANINHADO do evento
#   3) POST /hook (fire-and-forget)
#   4) se want_handoff=1, GET /handoff e injeta via contextModification
# ------------------------------------------------------------------------
amc_main() {
  local native="$1" kind="$2" want_handoff="${3:-0}"
  local raw payload

  if [ "$AI_MEMORY_DISABLE" = "1" ]; then
    printf '{}'
    exit 0
  fi

  raw="$(amc_read_stdin)"
  payload="$(amc_build_payload "$raw" "$native")"

  # Fire-and-forget: uma falha aqui nunca deve alterar o stdout do hook
  # (o Cline exige JSON válido de volta). Logs vão para stderr.
  amc_send "$payload" "$kind" || true

  if [ "$want_handoff" = "1" ]; then
    local cwd sid handoff resp
    cwd="$(amc_jget "$raw" '.workspaceRoots[0]')"
    [ -z "$cwd" ] && cwd="$PWD"
    sid="$(amc_jget "$raw" '.taskId')"
    resp="$(amc_fetch_handoff "$cwd" "$sid")"
    handoff="$(amc_extract_handoff "$resp")"
    amc_emit_result "$handoff" false ""
  else
    amc_emit_result "" false ""
  fi
}