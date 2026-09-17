# Relatório de Erros - Consolidação de Memória ai-memory

**Data:** 2026-09-11  
**Última atualização:** 2026-09-17  
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
| 6 | `memory_consolidate` | `provider error 503: model unavailable` | Sobrecarga do provedor LLM |

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

### Pendências abertas

| # | Item | Evidência | Situação |
|---|------|-----------|----------|
| 1 | Erro 6 é intermitente | `status` reportou `503 UNAVAILABLE` em `2026-09-17T01:10:54Z`; consolidação concluída às `07:19:54Z`, com `llm: ... ok` | Resolvido por retry; sem ação pendente |
| 2 | 2 páginas latest sem embedding | `status`: `2 latest pages missing`; `embed --dry-run`: 1 página a gerar, 14 já atualizadas no projeto | Correção disponível via `ai-memory embed` (não executada) |
| 3 | 2 links de páginas latest não resolvidos | `status`: `unresolved: 2, stale: 0` | Não sinalizados por `lint` nem `curator`; exigem inspeção manual |
| 4 | Título duplicado `user-prompt` | `lint --dry-run` e `curator`: 3 páginas de sessão com o mesmo título | Severidade `info`/`warning`, sem impacto funcional |

> Nenhuma correção foi aplicada — o conteúdo acima é apenas diagnóstico.

---

## Recomendações

1. Sempre fornecer UUID válido no formato 8-4-4-4-12
2. Verificar que a sessão está "completed" antes de consolidar
3. Aguardar finalização da sessão atual antes de tentar consolidar
4. Implementar retry para erros 503 (sobrecarga do provedor)
5. Documentar workarounds para referência futura