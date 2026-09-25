# Erros do AI-MEMORY — Diagnóstico e Resolução

**Projeto:** Caminhar · **Escopo:** `default/Caminhar`
**Diagnóstico:** 2026-09-11 → 2026-09-25 · **Correções publicadas:** v2.3.2 (2026-09-20) e v2.4.1 (2026-09-25, Erro 12) · **Verificação:** 2026-09-24 (provedor trocado para OpenRouter; Erro 9 resolvido com `LLM_API_KEY`; consolidação validada ponta a ponta) e 2026-09-25 (`ai-memory upgrade` → CLI e servidor em **2.4.1**; `status` com `links: 6 … (unresolved: 0, stale: 0)`)

**Status: 1, 2, 3, 8 e 9 resolvidos; 6 mitigado parcialmente; 10 e 11 contornados.** As correções dos erros 1, 2, 3 e 8 estão no upstream (`akitaonrails/ai-memory`) desde a **v2.3.2**, foram encaminhadas para a **v2.4.0** e estão em uso local pela imagem `akitaonrails/ai-memory:latest` (**2.4.1**). O Erro 6 tem correção de código pendente no upstream (retry no caminho de auto-improve). O **Erro 9 não era bug do upstream**: era o nome da variável da chave no provedor `openai-compat`. Os erros **10** e **11** são de escopo/operação do CLI e têm contorno conhecido. O **Erro 12** está corrigido no upstream: os dados em `2026-09-25` e o fix do extrator de links no **v2.4.1** (PR #915). As duas melhorias que viajavam no mesmo PR (#911 — finding `broken_link` intra-projeto e `status --workspace/--project`) foram **revertidas antes do v2.4.1** e ainda **não** estão na versão em uso.

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
| 9 | `memory_consolidate` | `-32603 provider error 401: Missing Authentication header` | o caminho de chat do `openai-compat` lê **`LLM_API_KEY`** (ou `--api-key`); a chave estava no container como `OPENROUTER_API_KEY`/`OPENAI_API_KEY`, então o header `Authorization` não era enviado | ✅ Resolvido (env do container, 2026-09-24) |
| 10 | `memory_write_page` | gravação "invisível": a página não aparece na leitura e o lint mantém o título antigo | chamada **sem** `workspace`/`project` gravou no escopo `default/scratch` em vez de `default/Caminhar` | ✅ Contornado (sempre passar `workspace: "default"` + `project: "Caminhar"`; órfãs removidas) |
| 11 | `ai-memory embed` | `POST /admin/embed: 404 {"error":"project 'data' not found in workspace 'default'"}` | o CLI inferiu o projeto a partir do `--data-dir /data` quando as flags de escopo não foram passadas | ✅ Contornado (`ai-memory embed --workspace default --project Caminhar [--force]`) |
| 12 | `ai-memory status` (linha `links`) | `7 latest-page links (unresolved: 3, stale: 0)` — 3 links que nunca resolvem | dois defeitos de normalização de alvo: (i) `relations: fixes: ["sessions/"]` (diretório) virou o literal `sessions/.md`; (ii) `index.md` de bundle OKF com links de diretório (`- [decisions/](decisions/)`) que não casam com path de página | ✅ Fix no upstream **v2.4.1** (PR #915, merge `d5ebec30`); dados corrigidos em 2026-09-25; as 2 melhorias do PR #911 foram revertidas antes do release e não estão no v2.4.1 |

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
| 2026-09-24 18:48Z / 19:00Z | Provedor trocado de Gemini (`gemini-3.6-flash`) para `openai-compat` + OpenRouter (`liquid/lfm-2.5-2.6b:free`) por causa do Erro 6 — sem efeito porque a chave chegou como `OPENROUTER_API_KEY` e depois como `OPENAI_API_KEY` |
| 2026-09-24 19:45Z | Erro 9 diagnosticado e resolvido: container recriado com **`LLM_API_KEY`** + `OPENAI_API_KEY`; `llm-test` voltou a responder |
| 2026-09-24 19:47Z | Modelo trocado para `nvidia/nemotron-3-ultra-550b-a55b:free` depois de o `liquid/lfm-2.5-2.6b:free` (2,6 B) alucinar no primeiro teste real de consolidação |
| 2026-09-24 19:48Z | Consolidação de `329cd318` validada ponta a ponta: saída fiel, com o aviso correto de que as observações não trazem detalhe substantivo, e título na convenção de `_prompts/consolidation.md` |
| 2026-09-25 12:04Z | Erro 12 diagnosticado: `status` com `links: 7 … (unresolved: 3)`; dois defeitos de normalização de alvo — diretório em `relations:` (`sessions/` → `sessions/.md`) e links de diretório no `index.md` do escopo `tmp` |
| 2026-09-25 | Erro 12 com dados corrigidos no wiki (frontmatter da sessão + `index.md` do `tmp`, sem purgar o escopo): `links: 6 … (unresolved: 0, stale: 0)` |
| 2026-09-25 20:28Z | PRs [#915](https://github.com/akitaonrails/ai-memory/pull/915) (patch: o fix do extrator) e [#911](https://github.com/akitaonrails/ai-memory/pull/911) (minor: finding `broken_link` intra-projeto + `status --workspace/--project`) mergeados no upstream, ambos com CI verde |
| 2026-09-25 | `42467259` reverte o `#911` antes da tag, para manter a linha de patch enxuta — o mesmo tratamento dado a #904, #884 e aos docs #873: o minor fica para o próximo release |
| 2026-09-25 21:46Z | Release **v2.4.1** (`433a19f3`) com o fix do extrator; `ai-memory upgrade` deixa CLI e servidor em 2.4.1 e o `status` confirma `links: 6 … (unresolved: 0, stale: 0)` |

O PR #754 está **fechado** (absorvido pelo #789): a correção deixou de ser exclusiva do fork, então a imagem local `ai-memory:fix-consolidate` e o override `AI_MEMORY_IMAGE` que a apontava ficaram obsoletos e foram **descartados** em 2026-09-23 (§5, item 1). A fonte oficial é `github.com/akitaonrails/ai-memory` (releases **v2.3.2 → v2.4.1**), sem uso operacional do fork — o fork voltou a ser usado apenas como origem de desenvolvimento/CI dos PRs #915 e #911 em 2026-09-25, nunca como fonte de imagem.

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

### Erro 9 — `401 Missing Authentication header` no `openai-compat`

Depois da troca de provedor, `memory_consolidate` devolvia `-32603 provider error 401: {"error":{"message":"Missing Authentication header","code":401}}` e `ai-memory status` mostrava `llm: openai-compat/liquid/lfm-2.5-2.6b:free error (status 401 …)`. A chave era válida (73 caracteres, prefixo `sk-or-v1-`): o problema era o **nome da variável**.

Prova A/B com a **mesma chave**, dentro do container, em `2026-09-24T19:01Z`:

| Como a chave é exposta | Resultado |
|---|---|
| `OPENAI_API_KEY` (env do container) | `provider error 401: Missing Authentication header` |
| `LLM_API_KEY` definida no ambiente do comando | resposta real do modelo (`Pong!`), `usage: in=11 out=257` |
| `--api-key` na CLI | resposta real do modelo (`Pong!`), `usage: in=11 out=303` |

O caminho de chat do `openai-compat` lê **`LLM_API_KEY`** (ou `--api-key`); `OPENAI_API_KEY`/`EMBEDDING_API_KEY` valem só para *embeddings* openai-compatible (mensagem do binário 2.4.0). Sem a variável certa o binário chama o OpenRouter **sem** header `Authorization`.

**Correção aplicada em 2026-09-24T19:45Z** — container recriado preservando volume, porta, modelo e `--restart unless-stopped`, com as duas variáveis (`-e LLM_API_KEY -e OPENAI_API_KEY`, valores vindos do env do container anterior via `export`, sem passar pela linha de comando):

```bash
KEY=$(docker exec ai-memory sh -c 'printf %s "$OPENAI_API_KEY"')
export LLM_API_KEY="$KEY" OPENAI_API_KEY="$KEY"
docker rm -f ai-memory
docker run -d --name ai-memory --restart unless-stopped \
  -p 127.0.0.1:49374:49374 -v ai-memory-data:/data \
  -e AI_MEMORY_LLM_PROVIDER=openai-compat \
  -e AI_MEMORY_LLM_BASE_URL=https://openrouter.ai/api/v1 \
  -e AI_MEMORY_LLM_MODEL=<modelo> \
  -e AI_MEMORY_DATA_DIR=/data \
  -e AI_MEMORY_ALLOWED_HOSTS=localhost,127.0.0.1,::1,host.docker.internal \
  -e AI_MEMORY_IN_CONTAINER=1 \
  -e LLM_API_KEY -e OPENAI_API_KEY \
  akitaonrails/ai-memory:latest serve --transport http --bind 0.0.0.0:49374 --enable-web
```

**Nota de qualidade do modelo (2026-09-24).** O primeiro modelo escolhido, `liquid/lfm-2.5-2.6b:free` (2,6 B), produz saída ruim: na consolidação de teste inventou o propósito do projeto a partir do nome ("focada em navegação e exploração sistemática"), ignorou as preferências de `_prompts/consolidation.md` (título `Contexto do Projeto — Caminhar`, que voltaria a duplicar títulos) e gerou link inválido. Com `nvidia/nemotron-3-ultra-550b-a55b:free` a mesma sessão saiu fiel, com título `Sessão 329cd318 — …`. Modelos pequenos também tendem a operar com teto de tokens menor — a consolidação valida mínimos de 6.000 tokens de entrada e 1.000 de saída. Referência de comparativo do upstream (`docs/llm-provider-comparison.md`): Haiku 4.5 é o padrão recomendado, GPT-5.4-mini a alternativa barata, e modelos de *reasoning* são inelegíveis (a chamada trava).

**Detalhe cosmético:** o LLM pode emitir `<br>` no corpo da página; o markdown fica correto com uma limpeza (`sed -i 's|<br><br>|\n\n|g; s|<br>|\n|g'`) e a preferência "use markdown puro, nunca tags HTML" foi acrescentada a `_prompts/consolidation.md`.

**Limite estrutural da consolidação neste projeto.** O hook envia `tool_name`, `tool_input`, `tool_response`, `success` e `execution_time_ms` (verificado no payload cru do spool em `/data/hook-spool/`), mas a observação persistida sai como `title: "post-tool-use"`, `body: ""` — ou seja, o log de uma sessão não contém o que foi lido/escrito/decidido. Consolidar por LLM rende, no melhor caso, uma página de metadados (contagens, cronologia, prompts) e o modelo chega a registrar isso explicitamente. O conteúdo durável continua vindo das páginas curadas (`conceitos/`, `procedimentos/`, `decisoes/`, `_regras/`).

### Erro 10 — `memory_write_page` sem escopo gravou em `default/scratch`

Em `2026-09-24T19:02Z`, três chamadas de `memory_write_page` **sem** `workspace`/`project` foram gravadas no projeto **`scratch`** (diretório de escopo `01a04541-86e1-78f1-9680-720007cba5d6`), enquanto `memory_read_page`/`memory_recent` serviam `Caminhar` (`01a05962-d1d0-7bb2-8fc7-9db0cf93421b`). Sintomas: a página recém-escrita "não aparece"; a leitura devolve o corpo antigo; o lint continua vendo o título antigo.

Confirmação: `_meta.md` do diretório de escopo (dizia `project: scratch`) e `find /data/wiki -name <arquivo> -printf '%TY-%Tm-%Td %TH:%TM %p'`. Sinal de alerta nas leituras de status: `memory_status` com `resolved_by: shared_slot` ou `startup_seed` (a chamada **não** foi casada com a sessão). Contorno: sempre passar `workspace: "default"` + `project: "Caminhar"`; as três páginas órfãs foram removidas com `memory_delete_page` (escopo `default`/`scratch`).

### Erro 11 — `ai-memory embed` sem flags de escopo

`ai-memory embed` sem `--workspace`/`--project` resolve o projeto pelo cwd/basename e falha com:

```
Error: POST /admin/embed: server returned 404 Not Found: {"error":"project 'data' not found in workspace 'default'"}
```

O nome `data` vem do `--data-dir /data` (ou de `AI_MEMORY_DATA_DIR`) interpretado como projeto. Contorno verificado em `2026-09-24T19:26Z` e `19:52Z`: `ai-memory embed --workspace default --project Caminhar` (acrescentar `--force` para recomputar vetores existentes). É o mesmo padrão de escopo da prática 6.

### Erro 12 — links não resolvidos: alvo de diretório em `relations:` e no bundle index

Em `2026-09-25`, `ai-memory status` no Caminhar reportou `links: 7 latest-page links (unresolved: 3, stale: 0)` e `typed edges: causes: 1, fixes: 1`. Nada falhava em ingestão, consolidação ou busca: eram dois defeitos independentes de normalização de alvo, nenhum deles específico do Caminhar.

**Defeito A — `relations:` com alvo de diretório (1 dos 3 links).** O frontmatter de `sessions/bc48d71b-c5de-5e54-ad4c-4fdf74814320.md` trazia `relations: { causes: ["conceitos/estado-atual.md"], fixes: ["sessions/"] }` (emitido na consolidação de `2026-09-25T02:04Z`). Em `crates/ai-memory-wiki/src/markdown.rs`, `extract_relation_links` anexava `.md` a qualquer último segmento sem ponto, então `sessions/` virava `sessions/.md` — path aceito por `PagePath::new` e gravado em `links` com `to_page_id = NULL`. A rota equivalente do corpo (`normalize_link_target`) tinha a guarda que faltava nessa função; versões anteriores da mesma página guardam 4 ocorrências históricas do mesmo alvo (`sessions/.md` ×3 e `sessoes/.md` ×1).

**Defeito B — bundle index com links de diretório (2 dos 3 links).** O `index.md` do escopo `default/tmp` (não do Caminhar), gerado por `ensure_bundle_indexes` na migração OKF e regenerado pelo exportador de bundle, lista famílias como `- [decisions/](decisions/)`. O extrator preserva `decisions` (sem extensão) e nenhum path de página pode casar com ele. Esta entrada revisa a leitura do §5 item 4, que havia encerrado o caso como ruído esperado.

Dados corrigidos em `2026-09-25` por edição direta do markdown no wiki (o `serve` reindexa sozinho): removido o `fixes: [...]` inválido do frontmatter da sessão e os dois links do `index.md` passaram a apontar para páginas reais (`decisions/arquitetura-e-infra.md`, `notes/projeto-caminhar.md`); o escopo `tmp` **não** foi purgado (segue como decisão do operador). Resultado: `links: 6 latest-page links (unresolved: 0, stale: 0)` e `typed edges: causes: 1`. As 4 linhas históricas com `to_path` degenerado continuam na tabela porque `links` fica preso à versão imutável da página — só as latest entram na contagem.

Correção de código no upstream: o fix foi separado no PR **#915** — `last_segment_names_a_page` passou a recusar alvo de diretório (barra final) e `.md` sem radical nas duas rotas (`relations:` e corpo/wikilink), descartando com `warn!` em vez de gravar um path que nunca resolve. Mergeado em `2026-09-25T20:28Z` (merge `d5ebec30`) e publicado no **v2.4.1** (tag `433a19f3`, `2026-09-25T21:46Z`), que é a versão em uso após `ai-memory upgrade` — confirmado no tree do release (3 ocorrências do predicado) e na entrada `(#915)` do CHANGELOG do v2.4.1.

As duas melhorias que viajavam no PR original foram separadas no PR **#911**: o finding `broken_link` intra-projeto (`reader.dangling_internal_links`) e o escopo em `ai-memory status --workspace/--project` com `links_scope` em `GET /admin/status` — com os testes adversariais exigidos pela regra do `AGENTS.md` (`status_scoped_links_rejects_partial_scope`, `…fails_closed_on_an_unknown_scope`, `…do_not_leak_across_workspaces`, `an_unresolved_same_project_link_is_a_broken_link_finding`) e a linha 9 de `docs/security-boundaries.md` atualizada. Foi mergeado em `b18cb1a3` e **revertido** em `42467259` antes da tag, junto com outros reverts da linha de patch (PRs #904, #884, docs #873): o **v2.4.1 não contém** essas melhorias — o CLI 2.4.1 responde `error: unexpected argument '--workspace' found` e `links_scope`/`ScopeLinkStatus`/`dangling_internal_links` não existem no tree do release (a página do PR aparece como *Merged*, mas o conteúdo foi desfeito no `main`). Ficam para o próximo release minor; se o upstream não as recolocar, o caminho é um PR novo (`feat`) sobre o `main` atual.

---

## 4. Estado atual (métricas de 2026-09-24T19:55Z)

| Métrica | Valor |
|---------|-------|
| Servidor | `ai-memory 2.4.0` em `akitaonrails/ai-memory:latest`, healthy, `127.0.0.1:49374` (container recriado em 2026-09-24T19:47Z, já com `LLM_API_KEY`) |
| Páginas (latest / todas as versões) | 73 / 236 global · 62 / 218 em `default/Caminhar` |
| Sessões | 96 global · 49 em `default/Caminhar` |
| Observações | 5.317 global · 5.216 em `default/Caminhar` |
| Índice FTS | páginas 236/236; observações 5.317/5.317 |
| Embeddings | 87 linhas (`local/all-MiniLM-L6-v2`, 384d); 1 latest page sem vetor (a recém-consolidada) |
| Links entre páginas | 5 (`unresolved: 2`, `stale: 0`) |
| Spool de ingestão | pending 23 (sessões em curso), retries 0 |
| Armazenamento | 6,4 MiB (reclaimable 136,0 KiB, 2,1%) |
| Provedor LLM | `openai-compat` + OpenRouter, modelo `nvidia/nemotron-3-ultra-550b-a55b:free`; `llm-test` respondendo desde `2026-09-24T19:47Z`. Histórico recente: Gemini (`gemini-3.6-flash`, Erro 6) → `liquid/lfm-2.5-2.6b:free` (descartado por alucinar, §3 Erro 9) |
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
| 5 | 1 latest page sem vetor (a página recém-consolidada) | `ai-memory embed --workspace default --project Caminhar` → `{"embedded": 1, "skipped": 61, "failed": 0}` em 2026-09-24T19:57Z; sem flags de escopo o comando falha (§3, Erro 11) | ✅ Encerrado |
| 6 | 33 páginas de `sessions/` ainda no resumo heurístico M3 (sem consolidação por LLM) | Consolidar em lote tem valor limitado enquanto a observação não carregar corpo (§3, Erro 9, "limite estrutural"): o resultado é uma página de metadados com título próprio e cronologia. O ganho real seria acabar com títulos herdados do prompt. Alternativa sistêmica: habilitar `AI_MEMORY_CONSOLIDATE_ON_SESSION_END=1` no container para consolidar automaticamente no fim de cada sessão (custo: 1 chamada de LLM por sessão; fallback determinístico em caso de falha do provedor) | 🟡 Aberta — decisão do operador |
| 7 | `sessions/` com títulos herdados do prompt renderam 6 warnings `duplicate` no lint | Resolvido em 2026-09-24: 20 páginas renomeadas para `Sessão <id-curto> — <assunto>` por edição direta do markdown no wiki (o `serve` reindexa sozinho) + `ai-memory commit` (`c7057370`); varredura de títulos do frontmatter → 0 duplicados e `_lint/report.md` com 0 findings do tipo `duplicate`. Preferência registrada em `_prompts/consolidation.md` | ✅ Encerrado |

---

## 6. Práticas que continuam valendo

1. `dry_run: true` antes de consolidar em lote — preflight sem LLM e sem escrita.
2. Descobrir o id da sessão com `memory_read_session_observations` (UUID do ai-memory). Ids do Cline (`1787943533338_3w6i6`) não servem.
3. Backup antes de consolidar em massa: o destino **precisa estar dentro do volume de dados** — o wrapper do host roda um container efêmero por comando e só monta `ai-memory-data` em `/data`, então `--to /tmp/…` grava dentro do container descartável e **o arquivo desaparece** ao fim do comando. Use `ai-memory backup --to /data/backups/ai-memory-backup-<data>.tar.gz`, que persiste em `/data/backups/` (modo 0600).
4. Provedor: o `llm-test` **executado no host falha** com `provider not configured: <ENV>` (o container efêmero do CLI não herda o env do servidor); rode de dentro do servidor — `docker exec ai-memory ai-memory llm-test --provider openai-compat --model <modelo> --base-url https://openrouter.ai/api/v1 --prompt ping` — antes de culpar o payload. Com o gateway OpenRouter a variável da chave é **`LLM_API_KEY`** (§3, Erro 9) e a chave precisa estar no **env do container do servidor**, não só na linha de comando do `docker exec`. `429`/`5xx` são retentados 2× automaticamente **na consolidação** (o auto-improve não retenta; `401`/`404` são determinísticos e não são retentados — repetir não adianta) e, se `attempts=3 parked=true` aparecer no log do scheduler, o claim precisa ser destravado à mão: `ai-memory auto-improve --session-id <uuid>` (rodando da raiz do projeto).
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
