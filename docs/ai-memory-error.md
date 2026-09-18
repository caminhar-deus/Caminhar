# Relatório de Erros - Consolidação de Memória ai-memory

**Data:** 2026-09-11  
**Última atualização:** 2026-09-18  
**Projeto:** Caminhar  
**Objetivo:** Consolidar memória do projeto usando `memory_consolidate`

---

## Resumo dos Erros

| # | Ferramenta | Erro | Causa Raiz |
|---|-----------|------|-----------|
| 1 | `memory_consolidate` | `missing field session_id` | Parâmetro obrigatório não fornecido |
| 2 | `memory_consolidate` | `invalid uuid: invalid length: expected 32, found 0` | UUID vazio ou malformado |
| 3 | `memory_auto_improve` | `invalid uuid: invalid length: expected 32, found 0` | UUID vazio ou malformado |
| 4 | `memory_read_session_observations` | `no completed session in default/Caminhar` | Sessão mais recente ainda aberta |
| 5 | `memory_read_session_observations` | `session X not found` | ID de sessão incompatível entre sistemas |
| 6 | `memory_consolidate` | `provider error 503: model unavailable` | Sobrecarga do provedor LLM (na prática aparece também como `429`) |
| 7 | `memory_consolidate` | `serde: EOF while parsing a string at line 1 column N` | Resposta do LLM truncada (estouro do teto de saída no fan-out `multi_page`) |
| 8 | `memory_status` e demais tools com escopo | `project 'caminhar' not found in workspace 'default'` | `.ai-memory.toml` do repo declara `caminhar`; o store registra `Caminhar` |

---

## Detalhamento dos Erros

### Erro 1: `memory_consolidate` sem `session_id`

**Comando:**
```json
{"session_id": null, "multi_page": true}
```

**Erro:**
```
MCP error -32602: failed to deserialize parameters: missing field `session_id`
```

**Análise:** A ferramenta exige `session_id` como obrigatório. Omitir causa erro de desserialização.

**Resolvido (2026-09-17):** a omissão de `session_id` deixou de falhar. `ConsolidateArgs.session_id` virou `#[serde(default)] session_id: Option<String>` e o handler resolve a **sessão concluída mais recente** do projeto via `latest_completed_session_for_project`, o mesmo padrão já usado por `memory_auto_improve` e `memory_read_session_observations`. Correção no upstream `akitaonrails/ai-memory`: branch `fix/consolidate-optional-session-id` publicado no fork `caminhar-deus/ai-memory` (commit `5fa5d360`) e PR [#754](https://github.com/akitaonrails/ai-memory/pull/754) aberto. Enquanto não houver release do upstream com o fix, a correção roda **apenas localmente** (imagem `ai-memory:fix-consolidate`), portanto não chega por `ai-memory upgrade`.

Verificado no servidor vivo: `required` deixou de listar `session_id`; tanto `{"session_id": null, "multi_page": true}` quanto `{}` passaram a resolver a mesma sessão que `memory_read_session_observations` sem id usa como padrão (`2a3d5b9d-…`), em `dry_run`. O caso da string vazia (**Erro 2**) permaneceu com o comportamento anterior, por decisão de escopo — fechado em 2026-09-18 (ver Erro 2).

---

### Erro 2: UUID vazio no `memory_consolidate`

**Comando:**
```json
{"session_id": "", "multi_page": true}
```

**Erro:**
```
MCP error -32603: malformed record in store: invalid uuid: invalid length: expected length 32 for simple format, found 0
```

**Análise:** Sistema espera UUID de 32 caracteres. String vazia causa erro de validação. O sistema não trata UUID vazio como "usar sessão padrão".

**Resolvido (2026-09-18):** `session_id` **vazio ou só com espaços** passou a equivaler a **campo omitido** no `memory_consolidate` — resolve a sessão concluída mais recente, exatamente como `memory_read_session_observations` já lia o id em branco. Um id **malformado** deixou de ser `-32603` e passou a `-32602` (`invalid params`), o mesmo código que `memory_auto_improve` já usava para o mesmo argumento; a mensagem (`malformed record in store: invalid uuid: …`) permaneceu igual. A causa era o par `Some("")` + `McpError::internal_error` no `memory_consolidate`, preservado de propósito no commit `5fa5d360` e fechado agora. A classificação de escopo do MCP também foi alinhada à rota web (`is_bad_request()`/`is_not_found()` → `-32602`; só `WriterRequired`/`Store` continuam `-32603`), o que corrige o Erro 8 na mesma rodada. Correção no fork `caminhar-deus/ai-memory`.

Verificado no servidor vivo (2026-09-18, escopo `default/Caminhar`): `{"session_id": ""}` e o campo **omitido** resolvem a **mesma** página (`sessions/3e9f0f3e-…`, em `dry_run`); `{"session_id": "not-a-uuid"}` → `-32602`. No binário anterior (imagem antiga, mesma chamada) o retorno era `-32603` com a mensagem de UUID inválido.

---

### Erro 3: UUID vazio no `memory_auto_improve`

**Comando:**
```json
{"project": "Caminhar", "session_id": null}
```

**Erro:**
```
MCP error -32602: malformed record in store: invalid uuid: invalid length: expected length 32 for simple format, found 0
```

**Análise:** Mesmo comportamento do erro 2. Sistema falha silenciosamente com UUID vazio.

---

### Erro 4: Nenhuma sessão concluída encontrada

**Comando:**
```json
{"project": "Caminhar"}
```

**Erro:**
```
MCP error -32602: no completed session in default/Caminhar; pass session_id to read an open one
```

**Análise:** A sessão mais recente estava em status "running". Sistema só retorna sessões concluídas por padrão.

---

### Erro 5: Sessão não encontrada (incompatibilidade de IDs)

**Comando:**
```json
{"session_id": "1787943533338_3w6i6"}
```

**Erro:**
```
MCP error -32602: invalid session id: 1787943533338_3w6i6
```

**Análise:** IDs do Cline (formato `1787943533338_3w6i6`) são incompatíveis com UUID do ai-memory (formato `eba00679-92b6-53cf-8db0-4189c75e92fb`). São dois sistemas de rastreamento distintos.

---

### Erro 6: Provedor LLM indisponível (503)

**Comando:**
```json
{"session_id": "eba00679-92b6-53cf-8db0-4189c75e92fb", "multi_page": true}
```

**Erro:**
```
MCP error -32603: provider error 503: This model is currently experiencing high demand.
```

**Análise:** Provedor LLM sobrecarregado. Erro temporário que requer retry.

**Status (2026-09-17):** é **intermitente**, não bloqueio permanente. Nova tentativa falhou com o mesmo payload 503 (`UNAVAILABLE`), último erro registrado em `2026-09-17T01:10:54Z`. O próprio `ai-memory status` sugere o comando de verificação:

```bash
ai-memory llm-test --provider gemini --model gemini-3.6-flash --prompt ping
```

**Resolvido (2026-09-17T07:19Z):** a consolidação da sessão `3928e650-a75f-5edb-a486-6b8d12906285` concluiu com sucesso e o `status` passou a reportar `llm: gemini/gemini-3.6-flash ok (last call: 2026-09-17T07:19:54Z)`. Confirmado que basta retry.

**Recorrência (2026-09-18, 03:12Z–03:32Z):** a mesma janela de indisponibilidade voltou, agora alternando `503 UNAVAILABLE` e `429` (`status`: `llm: gemini/gemini-3.6-flash error (status 429)`). Sete tentativas falharam nesse intervalo, mas **duas sessões fecharam por retry depois da janela** (`eba00679` às `03:14Z`, `35617c78` às `03:28Z`) — reforça que o tratamento correto é retry com backoff, não alterar o payload.

**Mitigação implantada (2026-09-18):** o retry deixou de ser manual. `ai-memory-consolidate` passou a repetir a chamada de consolidação ao provedor com retry **curto e limitado** — 3 tentativas no total (a original + 2), 2 segundos fixos entre elas — e **somente** para falha transiente segundo `LlmError::is_transient()` (`429`, qualquer `5xx`, timeout ou falha de conexão). Erro determinístico (auth, schema, `4xx` que não seja `429`, resposta não parseável) continua falhando na primeira tentativa. O wrapper cobre os **dois** caminhos de consolidação (`consolidate_session` e `consolidate_session_multi`), então vale para o MCP, para a consolidação de SessionEnd e para o `serve`. Cobertura: 3 testes novos em `ai-memory-consolidate` — recupera o 503 dentro do orçamento, desiste ao esgotá-lo e não repete erro determinístico (este último também confirma que uma tentativa falha não grava página).

---

### Erro 7: Resposta do LLM truncada (`serde: EOF while parsing a string`)

**Comandos:**
```json
{"session_id": "35617c78-bb77-57de-a190-f45b9d11c946", "multi_page": true}
{"session_id": "eba00679-92b6-53cf-8db0-4189c75e92fb", "multi_page": true}
```

**Erro:**
```
MCP error -32603: serde: EOF while parsing a string at line 1 column 97534
```

**Análise:** o JSON devolvido pelo provedor chega cortado no meio de uma string. As colunas observadas (`40837`, `79973`, `97534`, `126264`) pertencem a um JSON de uma única linha; a maior (~126 KiB ≈ 32k tokens) coincide com o `max_output_tokens=32000` do servidor — ou seja, quando o fan-out `multi_page` pede páginas demais, a saída estoura o teto e o parser aborta. Diferente do **Erro 6**, aqui o provedor responde 200: o corpo é que vem incompleto.

**Mitigações aplicadas/possíveis:**
- `multi_page` desligado (página única) encurta a saída, mas em 2026-09-18 as tentativas caíram no Erro 6 (503) antes de dar para validar.
- Passar `instructions` conciso (limite de 2.000 caracteres) para limitar o tamanho das páginas.
- Criar a página `_prompts/consolidation.md` no projeto com a preferência de concisão: hoje `default/Caminhar` **não** tem diretório `_prompts`, então toda consolidação usa apenas o prompt padrão.
- Basta retry: 5 das 7 sessões do projeto concluíram na primeira tentativa.
- O retry automático do **Erro 6** **não** cobre este caso: `LlmError::is_transient()` exclui `Serde`/`UnexpectedShape`, então a resposta truncada continua sendo reportada na primeira tentativa e as mitigações manuais acima seguem sendo o caminho.

---

### Erro 8: Nome do projeto no marcador não bate com o store

**Comando:**
```json
{"tool": "memory_status", "arguments": {"workspace": "default", "project": "caminhar"}}
```

**Erro:**
```
MCP error -32603: project 'caminhar' not found in workspace 'default'
```

**Análise:** o `.ai-memory.toml` deste repo declara `[project] name = "caminhar"` (minúsculo), enquanto o store registra o projeto como `Caminhar` (maiúsculo, ver `_meta.md` em `default`). As instruções do servidor MCP mandam ler workspace/projeto exatamente do marcador mais próximo — seguir o marcador aqui **quebra** toda chamada com escopo. Usar `workspace: "default"` + `project: "Caminhar"` funciona.

**Correção aplicada (2026-09-18):** o `.ai-memory.toml` foi reescrito no formato que o leitor do ai-memory realmente entende — chave plana `workspace = "..."` / `project = "..."` (o par `[project] name` / `[workspace] name` que existia não é lido por `parse_key_in`, o que tornava o marcador inerte). O valor agora é `project = "Caminhar"`, idêntico ao nome gravado no store, então o marcador deixou de ser um caminho de quebra. Em paralelo, o erro de escopo do MCP passou a ser reportado como **`-32602` (invalid params)** em vez de `-32603`, com a mensagem inalterada. A alternativa por `ai-memory rename-project` não foi usada: mexeria no store e manteria o marcador inválido.

Verificado no servidor vivo (2026-09-18): `project: "caminhar"` responde `-32602` com a mensagem `project 'caminhar' not found in workspace 'default'` e `project: "Caminhar"` volta a reportar as contagens; no CLI, o marcador passou a ser lido — `ai-memory embed --dry-run` na raiz do repo imprime `ai-memory: scope default/Caminhar (workspace + project from …/.ai-memory.toml)`.

---

## Tentativas de Workaround

### 1. Acesso direto ao banco SQLite do Cline

**Localização:** `/home/gus/.cline/data/db/sessions.db`  
**Tabelas:** `sessions`, `subagent_spawn_queue`, `schedules`  
**Resultado:** Acesso bem-sucedido, permitiu identificar sessões e metadados

### 2. Leitura de arquivos de mensagens

**Localização:** `/home/gus/.cline/data/sessions/{id}/{id}.messages.json`  
**Estrutura:** JSON com campos `version`, `messages`, `system_prompt`  
**Resultado:** Permitiu extrair conteúdo completo das sessões manualmente

### 3. Criação manual de páginas

**Ferramenta:** `memory_write_page`  
**Resultado:** 7 páginas criadas manualmente

### 4. Chamada MCP direta por JSON-RPC (agente sem a tool acoplada)

**Contexto:** o agente Cline não tinha `memory_consolidate` no conjunto de ferramentas, e o CLI `ai-memory` **não** expõe subcomando de consolidação (só `auto-improve`, `finalize-session`, `lint`, `curator`).  
**Caminho:** `POST http://127.0.0.1:49374/mcp` com JSON-RPC `tools/call` (transporte Streamable HTTP, `stateful=false`, versão negociada `2024-11-05`).  
**Ordem que funcionou:** `initialize` → `tools/list` (23 tools) → `memory_read_session_observations` (para descobrir a sessão concluída mais recente) → `memory_consolidate`.  
**Resultado:** consolidação executada sem depender do cliente MCP.

### 5. `ai-memory embed` falha quando o cwd não é o do projeto

**Erro:**
```
Error: POST /admin/embed: server returned 404 Not Found: {"error":"project 'Projetos' not found in workspace 'default'"}
```

**Análise:** o CLI resolve o projeto a partir do diretório corrente (e do `.ai-memory.toml` mais próximo). Executá-lo a partir de `~/Projetos` fez o CLI derivar um projeto chamado `Projetos`, que não existe.  
**Correção:** rodar `cd /home/gus/Projetos/Caminhar && ai-memory embed` (ou passar `--workspace`/`--project` explícitos).

---

## Estado Final (2026-09-11)

| Métrica | Valor |
|---------|-------|
| Páginas criadas manualmente | 7 |
| Total de páginas no projeto | 13 |
| Sessões no banco Cline | 6 |
| Observações no ai-memory | 170 |

---

## Estado Atual (2026-09-17)

**Fonte:** `ai-memory status`, complementado por `ai-memory embed --dry-run` e `ai-memory curator`. Os valores são um retrato do instante `2026-09-17T07:15Z` e variam com a ingestão em andamento.

| Métrica | Valor |
|---------|-------|
| Páginas (latest / todas as versões) | 24 / 45 |
| Sessões no ai-memory | 28 |
| Observações no ai-memory | 260 |
| Sessões no banco Cline (`/home/gus/.cline/data/db/sessions.db`) | 29 (24 completed, 4 failed, 1 running) |
| Embeddings | 43 linhas; **2 páginas latest sem vetor** |
| Links entre páginas | 2 (unresolved: **2**, stale: 0) |
| Índice FTS | páginas 45/45; observações 260/260 |
| Spool de ingestão | pending 0, retries 0, última escrita há 7s |
| Armazenamento | 1,1 MiB (reclaimable: 8,0 KiB) |
| Formato do wiki | OKF v0.2 (migrado); backup pré-migração em `/data/backups/ai-memory-backup-okf-v0.2-20260904-130831.tar.gz` |

> **Pós-consolidação (2026-09-17T07:19Z)** — depois de consolidar a sessão `3928e650-a75f-5edb-a486-6b8d12906285`: páginas `24 / 47`, sessões `29`, observações `301`, embeddings `45 linhas (2 latest pages missing)`, FTS `47/47` e `301/301`. A pendência #1 (Erro 6) foi resolvida por retry.

### Pendências abertas

| # | Item | Evidência | Situação |
|---|------|-----------|----------|
| 1 | Erro 6 é intermitente | `status` reportou `503 UNAVAILABLE` em `2026-09-17T01:10:54Z`; consolidação concluída às `07:19:54Z`, com `llm: ... ok` | Resolvido por retry; sem ação pendente |
| 2 | 2 páginas latest sem embedding | `status`: `2 latest pages missing`; `embed --dry-run`: 1 página a gerar, 14 já atualizadas no projeto | Correção disponível via `ai-memory embed` (não executada) |
| 3 | 2 links de páginas latest não resolvidos | `status`: `unresolved: 2, stale: 0` | Não sinalizados por `lint` nem `curator`; exigem inspeção manual |
| 4 | Título duplicado `user-prompt` | `lint --dry-run` e `curator`: 3 páginas de sessão com o mesmo título | Severidade `info`/`warning`, sem impacto funcional |

> Nenhuma correção foi aplicada — o conteúdo acima é apenas diagnóstico.

---

## Estado Atual (2026-09-18)

**Fonte:** `ai-memory status`, `memory_status` (escopo `default`/`Caminhar`), `curator` e inspeção do wiki dentro do container. Retrato do instante `2026-09-18T03:32Z`, com a ingestão da sessão corrente em andamento.

### Consolidação executada em 2026-09-18

Alvo: as 7 sessões concluídas de `default/Caminhar` — `memory_consolidate` sem `session_id` resolve a mais recente (`2a3d5b9d-…`). Todas as chamadas em `multi_page: true`.

| Sessão | Página antes → depois | Situação |
|--------|----------------------|----------|
| `2a3d5b9d-efe1-55c9-ab1e-685a66184aff` | 12.180 → 1.225 bytes | ✅ consolidada |
| `16222e35-33cc-5f0f-803d-610bfdf27a15` | 6.978 → 481 bytes | ✅ consolidada |
| `873b8a0f-c251-50de-ba22-daebaed3034c` | 28.247 → 1.115 bytes | ✅ consolidada |
| `3928e650-a75f-5edb-a486-6b8d12906285` | 1.092 bytes | ✅ já consolidada (09-17) |
| `f453eabb-62d8-5e36-bc90-2491aeca9407` | 532 bytes | ✅ já consolidada |
| `35617c78-bb77-57de-a190-f45b9d11c946` | 3.031 → 742 bytes | ✅ consolidada no retry (`03:28Z`) |
| `eba00679-92b6-53cf-8db0-4189c75e92fb` | 1.171 → 603 bytes | ✅ consolidada no retry (`03:14Z`) |

**Cobertura final: 7/7 sessões concluídas do projeto com `consolidated: true`.**

As páginas consolidadas passam a trazer `consolidated: true` no frontmatter, com `title` descritivo, `kind`, `tags` e `entities` — no lugar do `title: user-prompt` / `type: Session Summary` escrito no `session-end`. As versões anteriores seguem recuperáveis pelos checkpoints git do wiki (`ai-memory checkpoints` / `ai-memory restore-page`).

As duas sessões que falharam no primeiro passe fecharam por **retry**: `35617c78` na 3ª tentativa do segundo lote; `eba00679` na 2ª tentativa do primeiro lote. Nenhuma tentativa falha grava página, então não houve sobrescrita dupla.

**Backup antes da rodada:** `ai-memory backup --to /tmp/ai-memory-backup-pre-consolidacao-20260918.tar.gz` (594 KiB).

### Métricas

| Métrica | Valor |
|---------|-------|
| Páginas (latest / todas as versões) | 26 / 74 |
| Páginas do projeto (`memory_status` em `default`/`Caminhar`) | 17 / 60 |
| Sessões no ai-memory (global / projeto) | 32 / 11 |
| Observações no ai-memory (global / projeto) | 1.058 / 989 |
| Embeddings | 73 linhas; **0 latest pages missing** (5 geradas após as consolidações) |
| Índice FTS | páginas 74/74; observações 1.058/1.058 |
| Links entre páginas | 2 (unresolved: **2**, stale: 0) |
| Spool de ingestão | pending 0, retries 0 |
| Armazenamento | 1,6 MiB (reclaimable: 0 B) |
| `curator` | `findings: []` |
| Provedor LLM | `gemini/gemini-3.6-flash` — **error (status 429)** às 03:32Z |

### Pendências abertas (2026-09-18)

| # | Item | Evidência | Situação |
|---|------|-----------|----------|
| 1 | 2 sessões travaram no 1º passe (`35617c78`, `eba00679`) | `35617c78`: 1× Erro 7 + 3× 503, depois 3× 503/429; `eba00679`: 1× falha + 3× 503 | Resolvido por retry (03:14Z e 03:28Z); retry automático implantado em 2026-09-18 (ver Erro 6) |
| 2 | `_prompts/consolidation.md` inexistente | não há diretório `_prompts` no wiki de `default/Caminhar` | Sem preferências de projeto; provável causa do Erro 7 |
| 3 | `.ai-memory.toml` diverge do store (`caminhar` × `Caminhar`) | Erro 8 | Corrigido (2026-09-18): marcador reescrito em chave plana com `project = "Caminhar"`; escopo do MCP passa a responder `-32602` |
| 4 | 2 links latest não resolvidos | `status`: `unresolved: 2, stale: 0` | Herdado de 09-17; não sinalizado por `lint`/`curator` |
| 5 | Títulos duplicados `user-prompt` | nenhuma página de sessão resta com esse título | Resolvido pelas consolidações (títulos descritivos) |

> Corrigido nesta rodada: os embeddings em falta (pendência #2 de 2026-09-17) e a cobertura de consolidação (7/7 sessões). Seguem abertas as pendências 2 e 4.

> **Pós-implementação (2026-09-18, rodada de código)** — os Erros 2 e 8 foram corrigidos e o Erro 6 ganhou mitigação automática (ver as seções respectivas). Publicado no fork `caminhar-deus/ai-memory`: commit `1ed8a7d5` no branch `fix/consolidate-optional-session-id`, anexado ao PR [#754](https://github.com/akitaonrails/ai-memory/pull/754) — retargetado pelo mantenedor de `main` para `release/2.4`, com 6 arquivos e 3 commits no diff. Verificação no commit publicado: `cargo fmt --all -- --check` e `cargo clippy -p ai-memory-mcp -p ai-memory-consolidate --all-targets -- -D warnings` limpos, e `cargo test -p ai-memory-consolidate -p ai-memory-mcp -p ai-memory-store` com 221 (4 ignorados), 431 e 452 (1 ignorado) aprovados — 0 falhas. A imagem `ai-memory:fix-consolidate` foi reconstruída a partir desse commit e o container reimplantado. O PR não tem checks de CI: nenhum workflow rodou nele.

---

## Recomendações

1. Sempre fornecer UUID válido no formato 8-4-4-4-12
2. Verificar que a sessão está "completed" antes de consolidar
3. Aguardar finalização da sessão atual antes de tentar consolidar
4. Implementar retry para erros 503 (sobrecarga do provedor) — implantado em 2026-09-18 (ver Erro 6)
5. Documentar workarounds para referência futura
6. Tratar `serde: EOF while parsing a string` como problema de **tamanho de saída**, não de rede: repetir, usar `multi_page: false` ou passar `instructions` conciso
7. Criar `_prompts/consolidation.md` no projeto para fixar preferências de consolidação (concisão, nomenclatura em pt-BR) — hoje a página não existe
8. Rodar o CLI `ai-memory` sempre a partir da raiz do projeto, ou com `--workspace`/`--project` explícitos (ver workaround 5)
9. Alinhar o `name` do `.ai-memory.toml` com o nome gravado no store (`Caminhar`) para não quebrar chamadas com escopo (Erro 8) — aplicado em 2026-09-18
