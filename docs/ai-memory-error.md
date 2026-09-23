# Erros do AI-MEMORY — Diagnóstico e Resolução

**Projeto:** Caminhar · **Escopo:** `default/Caminhar`
**Diagnóstico:** 2026-09-11 → 2026-09-18 · **Correções publicadas:** v2.3.2 (2026-09-20) · **Verificação:** 2026-09-23

**Status: 1, 2, 3 e 8 resolvidos; 6 mitigado parcialmente.** As correções dos erros 1, 2, 3 e 8 estão no upstream (`akitaonrails/ai-memory`) desde a **v2.3.2**, foram encaminhadas para a **v2.4.0** e estão em uso local pela imagem `akitaonrails/ai-memory:latest` (**2.4.0**). O Erro 6 tem correção de código pendente no upstream (retry no caminho de auto-improve).

---

## 1. Status consolidado

| # | Ferramenta | Sintoma | Causa raiz | Status |
|---|-----------|---------|-----------|--------|
| 1 | `memory_consolidate` | `-32602 missing field session_id` | `session_id` obrigatório, sem default | ✅ Resolvido (v2.3.2) |
| 2 | `memory_consolidate` | `-32603 invalid uuid … expected length 32, found 0` | `session_id: ""` chegava ao store como id | ✅ Resolvido (v2.3.2) |
| 3 | `memory_auto_improve` | `-32602 invalid uuid … found 0` | `session_id: null` não era tratado como omitido | ✅ Resolvido (v2.3.2) |
| 4 | `memory_read_session_observations` | `no completed session in default/Caminhar` | nenhuma sessão concluída no momento da chamada | ✅ Não é bug |
| 5 | `memory_read_session_observations` | `invalid session id: 1787943533338_3w6i6` | id do Cline ≠ UUID do ai-memory | ✅ Não é bug |
| 6 | `memory_consolidate` / `memory_auto_improve` / scheduler | `-32603 provider error 503` / `429` | indisponibilidade do provedor LLM (Gemini) + retry ausente no caminho de auto-improve (claim parkado em `AUTO_IMPROVE_CLAIM_MAX_ATTEMPTS = 3`) | 🟡 Mitigado parcialmente (retry automático só na consolidação, v2.3.2) |
| 7 | `memory_consolidate` | `-32603 serde: EOF while parsing a string` | saída do LLM estourou o teto de tokens no fan-out `multi_page` | ✅ Mitigado (determinístico por design) |
| 8 | qualquer tool com escopo | `-32603 project 'caminhar' not found in workspace 'default'` | `.ai-memory.toml` em formato que o leitor ignora + erro de escopo classificado como interno | ✅ Resolvido (config local + v2.3.2) |

---

## 2. Como foi resolvido

| Data | Evento |
|------|--------|
| 2026-09-17/18 | Correções implementadas no fork `caminhar-deus/ai-memory`, branch `fix/consolidate-optional-session-id`; PR [#754](https://github.com/akitaonrails/ai-memory/pull/754) aberto no upstream |
| 2026-09-19 | Mantenedor faz cherry-pick dos 2 commits (autoria preservada) em `main` via PR [#789](https://github.com/akitaonrails/ai-memory/pull/789) — merge `7c02a36`, 20/21 checks passando |
| 2026-09-20 | Correções publicadas na release **v2.3.2** |
| 2026-09-21 | Forward-merge para a release **v2.4.0** (`b1b2521`) |
| 2026-09-22 | Container reimplantado com `akitaonrails/ai-memory:latest` (2.4.0) e as correções verificadas ao vivo |
| 2026-09-23 | Override `AI_MEMORY_IMAGE` e imagem `ai-memory:fix-consolidate` descartados; CLI e servidor na imagem oficial 2.4.0; aviso oficial de versão reativado |
| 2026-09-23 | `ai-memory upgrade` exercitado: wrapper já atualizado e imagem `latest` já atual (mesmo digest oficial); hooks staged re-aplicados para `claude-code` e `codex` sem alterar `settings.json`/`hooks.json`; container recriado da mesma imagem oficial e script de recreate apagado depois |

O PR #754 está **fechado** (absorvido pelo #789): a correção deixou de ser exclusiva do fork, então a imagem local `ai-memory:fix-consolidate` e o override `AI_MEMORY_IMAGE` que a apontava ficaram obsoletos e foram **descartados** em 2026-09-23 (§5, item 1). A fonte oficial é `github.com/akitaonrails/ai-memory` (releases **v2.3.2 → v2.4.0**), sem uso operacional do fork.

### Mudanças de comportamento entregues

1. **`session_id` opcional** — `ConsolidateArgs.session_id` é `Option<String>` com `#[serde(default)]`. Id **omitido, `null`, vazio ou só espaços** resolve a sessão concluída mais recente do projeto (`latest_completed_session_for_project`), o mesmo default de `memory_auto_improve` e `memory_read_session_observations`. Projeto sem sessão concluída falha como `no completed session in <scope>; pass session_id to consolidate a specific session`.
2. **Entrada inválida classificada como `invalid params`** — id malformado em `memory_consolidate` responde `-32602` (código que `memory_auto_improve` já usava), e falha de resolução de escopo no MCP responde `-32602`, espelhando o 400/404 da rota web. Só writer ausente ou falha do store continuam `-32603`. As mensagens não mudaram.
3. **Retry de falha transiente do LLM** — a chamada de **consolidação** (`memory_consolidate`: MCP, `session-end`/TaskComplete e checkpoint PreCompact no `serve`) é repetida **2× com 2 s** de intervalo quando falha por `429`, qualquer `5xx`, timeout de transporte ou falha de conexão. Falha determinística (auth, schema, `4xx`, saída não parseável/truncada) continua sendo reportada na 1ª tentativa — isso inclui o Erro 7. O **auto-improve (MCP, CLI e scheduler) não é retentado**, o que ainda permite claim parkado.

---

## 3. Detalhe por erro

### Erros 1, 2 e 3 — `session_id` obrigatório/vazio no MCP

`memory_consolidate` e `memory_auto_improve` passaram a ter o mesmo contrato: id opcional, com default para a sessão concluída mais recente do projeto — no `memory_auto_improve`, a mais recente **sem revisão** de auto-improve (`latest_unreviewed_completed_session_for_project`).

| Entrada em `session_id` | Antes | Depois (2.4.0) |
|-------------------------|-------|----------------|
| omitido ou `null` | `-32602 missing field session_id` (consolidate) / `-32602 invalid uuid … found 0` (auto_improve) | resolve a sessão padrão do projeto |
| `""` ou só espaços | `-32603 invalid uuid … expected length 32, found 0` | idêntico a omitido |
| id não-UUID | `-32603` | `-32602 invalid params` |

**Verificado ao vivo em 2026-09-22** (servidor 2.4.0, escopo `default/Caminhar`):

```json
{"multi_page": true, "dry_run": true}                 → sessions/27791c41-9739-589f-a371-af4cf817b248.md
{"session_id": "", "dry_run": true}                   → mesma página (vazio = omitido)
{"session_id": "mcp-probe-session", "dry_run": true}  → -32602 invalid uuid: invalid character: found `m` at 1
```

`dry_run: true` é o preflight barato: devolve o caminho-alvo sem chamar o LLM e sem gravar página.

### Erros 4 e 5 — comportamento esperado, não são bugs

- **Erro 4:** `no completed session in <scope>` ocorreu porque a sessão mais recente ainda estava `running`. Basta usar a sessão concluída mais recente ou passar um `session_id` explícito; a mensagem atual orienta isso (`pass session_id to …`).
- **Erro 5:** `1787943533338_3w6i6` é um id do Cline (gravado em `/home/gus/.cline/data/db/sessions.db`) e não o UUID usado pelo ai-memory — os dois sistemas numeram sessões de forma independente. Use o UUID devolvido por `memory_read_session_observations`.

### Erro 6 — provedor LLM indisponível (`503`/`429`)

Nunca foi bug do ai-memory: era sobrecarga do Gemini, intermitente. **Correção (v2.3.2):** retry automático de 2 tentativas extras com 2 s de intervalo para falha transiente da **consolidação** — os dois call sites em `consolidator.rs`, que atendem MCP, `session-end` (TaskComplete) e o checkpoint PreCompact no `serve`. O **auto-improve não tem retry**: `auto_improve.rs` chama o reviewer direto, então o caminho segue sujeito ao limite de tentativas do claim do scheduler.

**Evidência de 2026-09-22 (servidor 2.4.0):**

- `12:57Z` — o retry absorveu dois `503` seguidos (`attempt=1 max=3` e `attempt=2 max=3`) e a sessão foi consolidada às `12:57:16Z`. O intervalo aparente entre as tentativas (~5 s e ~8 s) inclui a latência da chamada que falhou; o intervalo configurado é de 2 s fixos.
- `14:58:44Z`, `15:58:54Z` e `16:58:55Z` — o scheduler de auto-improve falhou nos três ticks (`attempts=1`, `2` e `3`) e **parkou** a sessão `27791c41-9739-589f-a371-af4cf817b248` (`parked=true`); a partir de `17:58Z` o tick ficou sem candidatos (`scopes_with_candidates=0`). É esse o `503` de `16:58Z` registrado em §4: **não foi absorvido pelo retry**. A sessão foi destravada em `2026-09-22T20:46Z` por uma revisão manual (run `01a0cadf-af4b-70f3-88f4-c059cb2d6a43`, `review completed; no validated proposals`).

As duas sessões que travaram em 2026-09-18 (`35617c78`, `eba00679`) já haviam fechado por retry manual antes disso.

### Erro 7 — resposta do LLM truncada (`serde: EOF while parsing a string`)

Com `multi_page: true` o fan-out pede páginas demais e o JSON de uma linha devolvido pelo provedor estoura o teto de `max_output_tokens` (32.000 tokens). As colunas observadas (40.837, 79.973, 97.534, 126.264 ≈ 32k tokens) mostram o corte no meio de uma string, com resposta HTTP 200 — ou seja, o corpo é que vem incompleto, não há falha de rede.

**Não há correção de código, por decisão explícita do upstream:** saída truncada é classificada como falha **determinística**, portanto fica **fora** do retry do Erro 6. Mitigação operacional: repetir a chamada, usar `multi_page: false`, passar `instructions` conciso (limite de 2.000 caracteres) ou criar `_prompts/consolidation.md` com a preferência de concisão (§5.2).

### Erro 8 — nome do projeto no marcador não batia com o store

**Config local (aplicado em 2026-09-18):** o `.ai-memory.toml` foi reescrito no formato que o leitor realmente entende — chave plana, não `[project] name` / `[workspace] name`, que `parse_key_in` ignora e que tornava o marcador inerte:

```toml
workspace = "default"
project = "Caminhar"
```

**Classificação (v2.3.2):** escopo que não resolve passou de `-32603` para `-32602`, com a mensagem inalterada.

**Verificado ao vivo (2026-09-22):** `project: "caminhar"` → `-32602 project 'caminhar' not found in workspace 'default'`; `project: "Caminhar"` retorna as contagens. No CLI, o marcador passou a ser lido: `ai-memory embed --dry-run` na raiz do repo imprime `ai-memory: scope default/Caminhar (workspace + project from …/.ai-memory.toml)`.

---

## 4. Estado atual (métricas de 2026-09-23T00:50Z)

| Métrica | Valor |
|---------|-------|
| Servidor | `ai-memory 2.4.0` em `akitaonrails/ai-memory:latest`, healthy, `127.0.0.1:49374` (container `d4a0d8a5de07` recriado em 2026-09-23T00:42Z) |
| Páginas (latest / todas as versões) | 67 / 168 global · 58 / 153 em `default/Caminhar` |
| Sessões | 69 global · 45 em `default/Caminhar` |
| Observações | 4.602 global · 4.555 em `default/Caminhar` |
| Índice FTS | páginas 168/168; observações 4.602/4.602 |
| Embeddings | 167 linhas (`local/all-MiniLM-L6-v2`, 384d); 0 latest pages sem vetor |
| Links entre páginas | 2 (`unresolved: 2`, `stale: 0`) |
| Spool de ingestão | pending 2 (sessão em curso), retries 0 |
| Armazenamento | 4,8 MiB (reclaimable 48,0 KiB, 1,0%) |
| Provedor LLM | `gemini/gemini-3.6-flash` — último `503` absorvido pelo retry em `2026-09-22T12:57Z`; último `503` não absorvido (auto-improve → claim parkado, destravado às `20:46Z`) em `2026-09-22T16:58Z` |
| Embedder | `local/all-MiniLM-L6-v2` ok |
| CLI | wrapper `~/.local/bin/ai-memory` idêntico ao release oficial (sha256 `38986e85…`) e servidor na mesma imagem oficial `akitaonrails/ai-memory:latest` (**2.4.0**); `AI_MEMORY_IMAGE` não é mais exportado e a imagem `ai-memory:fix-consolidate` foi descartada (§5, item 1); `ai-memory upgrade` confirma wrapper e imagem já na versão oficial (`wrapper already up to date`, `Image is up to date`) |

---

## 5. Pendências residuais

Nenhuma delas é erro do ai-memory. As quatro foram encerradas em 2026-09-23.

| # | Item | Resolução | Status |
|---|------|-----------|--------|
| 1 | `~/.bashrc` exportava `AI_MEMORY_IMAGE=ai-memory:fix-consolidate`: o CLI rodava a imagem do fork (base 2.3.1) enquanto o servidor rodava 2.4.0 | Override e imagem descartados (`docker rmi ai-memory:fix-consolidate`); CLI e servidor na imagem oficial `akitaonrails/ai-memory:latest` (2.4.0), com o wrapper idêntico ao release oficial. O aviso oficial de versão (comparação de digest, 1×/dia) voltou a valer com a remoção de `AI_MEMORY_NO_VERSION_CHECK=1`, e o canal oficial foi exercitado em 2026-09-23 (`ai-memory upgrade` + container recriado da mesma imagem) | ✅ Encerrado |
| 2 | `_prompts/consolidation.md` não existia em `default/Caminhar` (nem no escopo `hermes`) | Página criada em `default/Caminhar` (`tier: semantic`, `pinned`, sem TTL) com as preferências de concisão, idioma e terminologia — é a mitigação do Erro 7 | ✅ Encerrado |
| 3 | 2 latest pages sem embedding | Já satisfeito antes da passada final: `ai-memory status` reporta `0 latest pages missing` (167 vetores, 384d); nenhum `embed` extra foi necessário | ✅ Encerrado |
| 4 | 2 links latest não resolvidos | Causa raiz: `index.md` do escopo **`default/tmp`** (não do Caminhar), gerado pelo bundle index OKF da migração de 2026-09-04, com links de diretório (`- [decisions/](decisions/)`, `- [notes/](notes/)`) que normalizam para um path que nunca casa com página (`to_page_id = NULL`); `lint` e `curator` só cobrem links cross-project, por design. Encerrado como ruído esperado, sem alteração de dados | ✅ Encerrado (esperado) |

---

## 6. Práticas que continuam valendo

1. `dry_run: true` antes de consolidar em lote — preflight sem LLM e sem escrita.
2. Descobrir o id da sessão com `memory_read_session_observations` (UUID do ai-memory). Ids do Cline (`1787943533338_3w6i6`) não servem.
3. `ai-memory backup --to /tmp/ai-memory-backup-…tar.gz` antes de rodar consolidação em massa.
4. Provedor: `ai-memory llm-test --provider gemini --model gemini-3.6-flash --prompt ping` antes de culpar o payload; `429`/`5xx` são retentados 2× automaticamente **na consolidação** (o auto-improve não retenta) e, se `attempts=3 parked=true` aparecer no log do scheduler, o claim precisa ser destravado à mão: `ai-memory auto-improve --session-id <uuid>` (rodando da raiz do projeto).
5. Saída truncada (Erro 7) **não** é retentada: repetir a chamada, usar `multi_page: false` ou `instructions` conciso — o projeto mantém a preferência de concisão em `_prompts/consolidation.md`.
6. Rodar o CLI sempre da raiz do projeto (ou com `--workspace`/`--project` explícitos): o cwd define o escopo e um diretório errado produz `project 'Projetos' not found`.
7. Cliente sem a tool MCP acoplada: `POST http://127.0.0.1:49374/mcp` (JSON-RPC Streamable HTTP, `stateful=false`, versão `2024-11-05`) na ordem `initialize` → `tools/list` → `memory_read_session_observations` → `memory_consolidate`.
8. O wiki tem histórico git próprio: versões anteriores de qualquer página voltam por `ai-memory checkpoints` / `ai-memory restore-page`.
9. `ai-memory upgrade` é o canal oficial de atualização: confere/atualiza o wrapper (sha256 contra `releases/latest`), faz pull de `akitaonrails/ai-memory:latest`, re-aplica os hooks staged (`claude-code`, `codex`) e escreve `~/.cache/ai-memory/recreate-ai-memory.sh` — que precisa ser revisado, executado para recriar o container e **apagado** depois (modo 0600, carrega a API key). No install via wrapper Docker o re-stage informa que o caminho shell/PowerShell não aplica `capture-policy v1` (não há binário nativo no host; a plataforma é forçada a `posix`).
10. `WARN handoff fetch failed error=invalid state: an ended session cannot accept a handoff` no log é esperado no ciclo do Cline: os hooks que pedem handoff (`TaskStart`/`TaskResume`, os únicos com `want_handoff=1`) chegam logo depois do `TaskComplete` que encerra a sessão, e o servidor recusa entregar o baton a uma sessão já encerrada. Não bloqueia captura nem consolidação: o handoff do turno fica aberto e é consumido pelo próximo task novo (`accepted` no store) ou expira quando o mesmo task continua. O primeiro comando de workstreams também instala, verificado por checksum, o cliente nativo de launch do host (`~/.cache/ai-memory/native-runner`).

> Os desvios manuais de diagnóstico usados em 2026-09-11 (leitura direta de `/home/gus/.cline/data/db/sessions.db` e dos `*.messages.json`) foram substituídos por `memory_read_session_observations` e não são mais necessários.

---

## 7. Referências

- PR [#754](https://github.com/akitaonrails/ai-memory/pull/754) — origem das correções (fork `caminhar-deus/ai-memory`, 19 commits; fechado e sem uso operacional desde 2026-09-23)
- PR [#789](https://github.com/akitaonrails/ai-memory/pull/789) — cherry-pick em `main`, merge `7c02a36` (2026-09-19)
- Releases [v2.3.2](https://github.com/akitaonrails/ai-memory/releases/tag/v2.3.2) e [v2.4.0](https://github.com/akitaonrails/ai-memory/releases/tag/v2.4.0)
- Fonte oficial: [`github.com/akitaonrails/ai-memory`](https://github.com/akitaonrails/ai-memory) — imagem `akitaonrails/ai-memory:latest`, wrapper `ai-memory-wrapper` e atualização por `ai-memory upgrade`
- Configuração local: `.ai-memory.toml` e `.clinerules/hooks/`
- Memória do projeto: `conceitos/integracao-ai-memory.md`
