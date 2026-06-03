# Análise dos Resultados dos Testes de Carga (Orquestrador) — Segunda Execução

> **Data da análise:** 02/06/2026  
> **Execução analisada:** 29/05/2026 — 30 scripts, 29 passaram, **1 falhou** (create-post-flow, exit code 99)  
> **Documento principal (visão geral):** `docs/analise-load-tests-orchestrator.md`  
> **Documento de thresholds:** `docs/plano-ajuste-thresholds-load-tests.md`  
> **Objetivo:** Documentar a falha específica do `create-post-flow` na execução de 29/05 e as correções aplicadas.  
> **Nota:** Este documento complementa os outros dois — informações duplicadas foram removidas.

---

## 1. Resumo dos Resultados

| Métrica | Valor |
|---------|-------|
| Total de Scripts | 30 |
| Passaram | 29 |
| **Falharam** | **1** |
| Ignorados | 0 |

**Única falha:** `create-post-flow` (exit code: 99) na categoria `🧪 Performance Tests`

---

## 2. Análise da Falha: `create-post-flow` (exit code 99)

### 2.1 O que o teste faz

O script `load-tests/performance/create-post-flow.js` executa um fluxo de criação de posts com as seguintes etapas:

1. **Setup**: Autentica via `POST /api/auth/login?response=body` e obtém token JWT
2. **Criação**: `POST /api/admin/posts` com payload JSON contendo `title`, `slug`, `content`, `published`
3. **Validação**: Verifica se o status HTTP retornado é `201`
4. **Teardown**: Remove posts criados durante o teste

### 2.2 Thresholds do teste (já ajustados conforme plano)

```javascript
thresholds: {
    'http_req_duration{flow:create_post}': ['p(95)<2000'],   // ↓ de 3000ms
    'checks{flow:create_post}': ['rate>0.95'],                // ↑ de 85%
    http_req_failed: ['rate<0.10'],                           // ↓ de 80%
}
```

Exit code 99 indica **violação de thresholds**. Os thresholds atuais (↓ de 80% para 10% em `http_req_failed`) são os que causaram a detecção da falha — anteriormente mascara­da.

### 2.3 Causa Raiz Identificada

**Problema: Campo `position` ausente no INSERT do `createPost`**

O LOG do k6 mostra:

```
http_req_failed................: 48.61% 35 out of 72
```

- **72 requisições HTTP totais**
- **35 requisições com falha** (48.61%)

**Distribuição das requisições:**
- 1 login (`setup`) → ✅ sucesso
- 35 POSTs de criação → ❌ **falha (status 500)**
- 1 GET no teardown (listar posts) → ✅ sucesso
- **35 DELETEs no teardown → ✅ sucesso** (handler aceita `req.body?.id || req.query?.id`)

Os 35 POSTs de criação falham porque a função `createPost` em `lib/domain/posts.js` não incluía o campo `position` no payload enviado ao `createRecord` do CRUD genérico. O schema da tabela `posts` em `lib/crud.js` lista `position` como campo esperado:

```javascript
posts: ['id', 'title', 'slug', 'excerpt', 'content', 'image_url', 'published', 'position', 'created_at', 'updated_at'],
```

A função `_filterAllowedFields` apenas **filtra campos não permitidos**, mas não **valida campos obrigatórios** que faltam. Com isso, o INSERT tentava criar o registro sem `position`, e o PostgreSQL rejeitava com erro de NOT NULL violation.

**Observação importante:** O `handleDelete` (linha 119 de `pages/api/admin/posts.js`) **já aceita query string**: `const id = req.body?.id || req.query?.id`. Portanto, o teardown do `create-post-flow.js` funciona corretamente — não é fonte de falha.

### 2.4 Demais problemas no mesmo fluxo (documentação para ajuste futuro)

#### 2.4.1 `logActivity` não é aguardado (fire-and-forget)

Em `pages/api/admin/posts.js` (handlePost, linha 67):

```javascript
req.adminUtils.logActivity('CRIAR POST', newPost.id, `Criou o artigo: ${title}`);
```

A chamada não tem `await`. Se a tabela `activity_logs` não existir ou tiver problema de constraint, ocorrerá unhandled promise rejection. Isso não interrompe a resposta (já foi enviada como 201), mas polui os logs.

**Arquivo envolvido:** `pages/api/admin/posts.js` (linha 67)

---

## 3. Outros Problemas Documentados (mantidos para referência)

Os seguintes problemas foram identificados durante a análise mas **não são abordados neste documento** — estão detalhados em `docs/analise-load-tests-orchestrator.md`:

| ID | Problema | Severidade | Documento |
|----|----------|------------|-----------|
| P1 | Rate Limit inoperante (Redis) | 🔴 → ✅ Corrigido | **✅ Resolvido em 02/06/2026.** `rate-limit-proxy.js` substituído por `proxy.js`. Detalhes no documento principal. |
| P2 | Schema de resposta de vídeos (56.65% checks) | 🔴 → ✅ Corrigido | **✅ Resolvido em 02/06/2026.** Checks do `videos-load-test.js` corrigidos para alinhar com schema real da API (`data: [...]` e `pagination` no nível raiz). |
| P4 | Monitor de memória Node.js sem dados | 🟡 → ✅ Corrigido | **✅ Resolvido em 02/06/2026.** Endpoint `/api/status` agora expõe `rss`, `heapTotal` e `heapUsed`. |
| P5 | Banco com poucos registros (páginas vazias) | 🟡 Média | `analise-load-tests-orchestrator.md` |
| P6 | Proteção DDoS não validada | 🟡 → ✅ Corrigido | **✅ Resolvido em 02/06/2026.** Middleware expandido com rate limit de 30 req/min para rotas públicas. |
| P8 | Stress-test sem checks | 🟡 → ✅ Corrigido | **✅ Resolvido em 02/06/2026.** Checks adicionados com tag `{ scenario: 'stress_test' }` em CREATE, UPDATE e DELETE. |

Problemas de infraestrutura adicionais (detectados nesta análise secundária):

- **`getClientIP`** em `lib/api/helpers.js` — fallback inconsistente para IP externo com proxy reverso
- **`detectSpoofedIP`** em `lib/api/helpers.js` — bloqueia IPs privados com proxy legítimo (ex: Docker 172.x + Nginx)
- **`clean-load-test-posts.js`** — executado após categoria de performance, mas pode não limpar posts se `create-post-flow` falhar
- **Senha fraca como fallback** no orquestrador (`123456`)

---

## 4. Resumo de Arquivos Envolvidos

| Arquivo | Papel | Problema |
|---------|-------|----------|
| `load-tests/performance/create-post-flow.js` | Script de teste k6 | Detectou falha real com thresholds ajustados (antes mascara­da) |
| `lib/domain/posts.js` | Camada de domínio (criação de posts) | **✅ CORRIGIDO:** `position` adicionado com valor padrão `0` |
| `lib/crud.js` | CRUD genérico | `_filterAllowedFields` não valida campos obrigatórios |
| `pages/api/admin/posts.js` | Handler da API admin | `logActivity` sem await |
| `lib/cache.js` | Cache e Rate Limiting | Fallback em memória não compartilhado entre workers |
| `lib/api/helpers.js` | Helpers (IP, spoofing) | `getClientIP` inconsistente; `detectSpoofedIP` bloqueia cenários legítimos |
| `scripts/run-all-load-tests-sequentially.js` | Orquestrador | Senha fraca como fallback |

---

## 5. Ações Corretivas

### 5.1 Correção Imediata (aplicada)

- **`lib/domain/posts.js`**: Adicionado `position: 0` ao objeto passado para `createRecord`, evitando falha NOT NULL no INSERT quando o banco não possui DEFAULT para a coluna.

### 5.2 Correções Futuras Recomendadas

1. **Adicionar `await` no `logActivity`** para capturar erros de auditoria
2. **Adicionar validação de campos obrigatórios** no CRUD genérico (`createRecord`)
3. **Revisar `detectSpoofedIP`** para não bloquear IPs privados com proxy legítimo
4. **✅ Rate limit implementado** via proxy.js (02/06/2026) — usa `checkRateLimit` de `lib/cache.js` com suporte a Redis e fallback em memória
5. **Remover fallback de senha fraca** no orquestrador

---

## 6. Checklist de Verificação

- [x] Identificar script com falha (`create-post-flow`, exit code 99)
- [x] Analisar causa raiz (`position` ausente no INSERT do `createPost`)
- [x] Documentar problemas encontrados
- [x] Aplicar correção imediata (adicionar `position: 0` no `createPost`)
- [ ] Verificar demais CRUDs que podem ter o mesmo problema (`musicas`, `videos`, `products`)
- [ ] Adicionar `await` no `logActivity` dos handlers
- [ ] Adicionar validação de campos obrigatórios no CRUD genérico
- [ ] Remover fallback de senha fraca no orquestrador

---

*Documento gerado em 02/06/2026*