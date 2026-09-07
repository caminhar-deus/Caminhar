#!/usr/bin/env bash
# ==============================================================================
# _ai_memory_cline_lib.sh
# Biblioteca compartilhada dos hooks Cline -> ai-memory
#
# Todo hook de evento (TaskStart, PreToolUse, PostToolUse, ...) faz:
#   . "$(dirname "$0")/_ai_memory_cline_lib.sh"
#   amc_main "<cline_hook_name>" "<ai_memory_kind>"
#
# Contrato de entrada (Cline -> hook, via stdin, JSON):
#   Campos comuns: "taskId", "hookName", "clineVersion", "timestamp",
#   "workspaceRoots": [...], "userId", "model": { "provider", "slug" }.
#   Além dos campos comuns, cada hook recebe um bloco ANINHADO específico,
#   nomeado em camelCase a partir do próprio hookName (só o bloco do evento
#   atual vem preenchido; os demais ficam ausentes):
#     "userPromptSubmit": { "prompt", "attachments": [...] }
#     "preToolUse":       { "toolName", "parameters": {} }
#     "postToolUse":      { "toolName", "parameters": {}, "result", "success", "executionTimeMs" }
#     "taskStart":        { "taskMetadata": { "taskId", "ulid", "initialTask" } }
#     "taskResume":       { "taskMetadata": {...}, "previousState": { "lastMessageTs", "messageCount", "conversationHistoryDeleted" } }
#     "taskCancel":       { "taskMetadata": { "taskId", "ulid", "completionStatus" } }
#     "taskComplete":     { "taskMetadata": { "taskId", "ulid", "result", "command" } }
#     "preCompact":       { "taskId", "ulid", "contextSize", "compactionStrategy",
#                            "tokensIn", "tokensOut", "tokensInCache", "tokensOutCache", ... }
#
# Contrato de saída (hook -> Cline, via stdout, JSON):
#   { "cancel": bool, "contextModification": string, "errorMessage": string }
#   (stderr é usado livremente para debug/log, nunca stdout fora do JSON final)
#
# Contrato com o ai-memory:
#   - Preferencial: binário nativo `ai-memory hook --event <kind> --extension cline`
#     (lê o envelope via stdin, faz spool+idempotência+handoff automaticamente)
#   - Fallback: HTTP POST http(s)://<host>/hook?extension=cline (timeout curto,
#     nunca bloqueia o Cline em caso de falha de rede)
# ==============================================================================

set -u

# ------------------------------------------------------------------------
# Configuração (todas sobrescrevíveis via variável de ambiente)
# ------------------------------------------------------------------------
: "${AI_MEMORY_BIN:=ai-memory}"                # binário nativo, se estiver no PATH
: "${AI_MEMORY_URL:=http://127.0.0.1:8765}"     # ajuste para a porta real do seu servidor ai-memory
: "${AI_MEMORY_TIMEOUT:=0.5}"                   # segundos (mesmo timeout curto usado nos hooks oficiais)
: "${AI_MEMORY_EXTENSION_NS:=cline}"            # namespace usado para não colapsar em "other"
: "${AI_MEMORY_DEBUG:=0}"                       # 1 = loga em stderr
: "${AI_MEMORY_BODY_MAX_BYTES:=16384}"          # 16 KiB, mesmo limite documentado do servidor
: "${AI_MEMORY_DISABLE:=0}"                     # 1 = desliga a integração sem remover os hooks

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
    # Fallback bem simples sem jq (evita depender de libs externas)
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

# Monta o envelope canônico enviado ao ai-memory a partir do payload bruto do Cline.
# amc_build_envelope <raw_json_cline> <ai_memory_kind> <cline_hook_name> <extra_body>
amc_build_envelope() {
  local raw="$1" kind="$2" native="$3" extra_body="$4"
  local task_id cwd model ts body
  task_id="$(amc_jget "$raw" '.taskId')"
  cwd="$(amc_jget "$raw" '.workspaceRoots[0]')"
  # "model" chega como objeto { provider, slug } no schema real do Cline;
  # mantém compatibilidade com um eventual "model" plano (string) por segurança.
  model="$(amc_jget "$raw" 'if (.model | type) == "object" then ((.model.provider // "unknown") + "/" + (.model.slug // "unknown")) else (.model // empty) end')"
  ts="$(amc_jget "$raw" '.timestamp')"
  [ -z "$ts" ] && ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  body="$(amc_truncate "$extra_body")"

  if command -v jq >/dev/null 2>&1; then
    jq -n \
      --arg source "cline" \
      --arg event "$kind" \
      --arg native_event "$native" \
      --arg session_id "$task_id" \
      --arg cwd "$cwd" \
      --arg model "$model" \
      --arg ts "$ts" \
      --arg ext "$AI_MEMORY_EXTENSION_NS" \
      --arg body "$body" \
      '{source: $source, event: $event, native_event: $native_event,
        session_id: $session_id, cwd: $cwd, model: $model,
        timestamp: $ts, extension: $ext, body: $body}
       | with_entries(select(.value != null and .value != ""))'
  else
    printf '{"source":"cline","event":"%s","native_event":"%s","session_id":"%s","cwd":"%s","model":"%s","timestamp":"%s","extension":"%s","body":%s}' \
      "$kind" "$native" "$task_id" "$cwd" "$model" "$ts" "$AI_MEMORY_EXTENSION_NS" "$(amc_json_escape "$body")"
  fi
}

# Envia o envelope ao ai-memory. Retorna em stdout o texto de handoff (se houver,
# só relevante para TaskStart/TaskResume). Nunca deve travar o Cline: timeout curto
# e falhas são silenciosamente ignoradas (fire-and-forget), exceto em modo debug.
# amc_send <envelope_json> <ai_memory_kind>
amc_send() {
  local envelope="$1" kind="$2"
  local out=""

  if command -v "$AI_MEMORY_BIN" >/dev/null 2>&1; then
    amc_log "usando binário nativo: $AI_MEMORY_BIN hook --event $kind --extension $AI_MEMORY_EXTENSION_NS"
    out="$(printf '%s' "$envelope" | timeout "${AI_MEMORY_TIMEOUT}s" "$AI_MEMORY_BIN" hook \
      --event "$kind" --extension "$AI_MEMORY_EXTENSION_NS" 2>>/tmp/ai-memory-cline.err)" || amc_log "binário nativo falhou/timeout"
  else
    amc_log "binário não encontrado no PATH, usando fallback HTTP -> ${AI_MEMORY_URL}/hook"
    out="$(curl -sS -m "$AI_MEMORY_TIMEOUT" -X POST "${AI_MEMORY_URL}/hook?extension=${AI_MEMORY_EXTENSION_NS}" \
      -H 'Content-Type: application/json' \
      -d "$envelope" 2>>/tmp/ai-memory-cline.err)" || amc_log "POST /hook falhou/timeout"
  fi

  printf '%s' "$out"
}

# Tenta extrair um texto de handoff utilizável de uma resposta arbitrária
# (json com chave context/handoff/markdown/body, ou texto puro).
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

# Ponto de entrada padrão usado por todos os scripts de evento.
# amc_main <cline_hook_name> <ai_memory_kind> [want_handoff:0|1]
#
# Extrai o corpo (extra_body) de cada evento a partir do bloco ANINHADO
# correspondente ao hookName (ver schema documentado no topo deste arquivo).
amc_main() {
  local native="$1" kind="$2" want_handoff="${3:-0}"
  local raw resp handoff extra_body=""

  if [ "$AI_MEMORY_DISABLE" = "1" ]; then
    printf '{}'
    exit 0
  fi

  raw="$(amc_read_stdin)"

  case "$native" in
    UserPromptSubmit)
      extra_body="$(amc_jget "$raw" '.userPromptSubmit.prompt')"
      ;;
    PreToolUse)
      extra_body="$(amc_jget "$raw" '.preToolUse.toolName') $(amc_jget "$raw" '.preToolUse.parameters | tostring')"
      ;;
    PostToolUse)
      extra_body="$(amc_jget "$raw" '.postToolUse.toolName') $(amc_jget "$raw" '.postToolUse.result // (.postToolUse.parameters | tostring)') (success=$(amc_jget "$raw" '.postToolUse.success'))"
      ;;
    TaskStart)
      extra_body="$(amc_jget "$raw" '.taskStart.taskMetadata.initialTask')"
      ;;
    TaskResume)
      extra_body="$(amc_jget "$raw" '.taskResume.previousState | tostring')"
      ;;
    TaskCancel)
      extra_body="$(amc_jget "$raw" '.taskCancel.taskMetadata.completionStatus')"
      ;;
    TaskComplete)
      extra_body="$(amc_jget "$raw" '.taskComplete.taskMetadata.result // .taskComplete.taskMetadata.command')"
      ;;
    PreCompact)
      extra_body="strategy=$(amc_jget "$raw" '.preCompact.compactionStrategy') tokensIn=$(amc_jget "$raw" '.preCompact.tokensIn') tokensOut=$(amc_jget "$raw" '.preCompact.tokensOut') contextSize=$(amc_jget "$raw" '.preCompact.contextSize')"
      ;;
    *)
      extra_body=""
      ;;
  esac

  resp="$(amc_send "$(amc_build_envelope "$raw" "$kind" "$native" "$extra_body")" "$kind")"

  if [ "$want_handoff" = "1" ]; then
    handoff="$(amc_extract_handoff "$resp")"
    amc_emit_result "$handoff" false ""
  else
    amc_emit_result "" false ""
  fi
}
