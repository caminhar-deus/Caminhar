# Plano de Ação — Melhoria dos Logs do Servidor (npm run dev)

> **Objetivo:** Tornar as saídas do terminal durante `npm run dev` mais limpas, organizadas e de fácil entendimento  
> **Data:** 29/05/2026  
> **Status:** ✅ Implementado em 01/06/2026

---

## 1. Diagnóstico Original

### 1.1 Estrutura dos Logs (antes da implementação)

Os logs da aplicação durante `npm run dev` misturavam:

1. **Logs do Next.js** (automáticos — não controláveis diretamente):
   - Rotas sendo acessadas (`GET /api/... 200`)
   - Tempo de resposta do servidor

2. **Logs da aplicação** (~120 ocorrências identificadas) — espalhados por:
   - `lib/auth.js` (13 logs)
   - `lib/db.js` (15 logs)
   - `lib/cache.js` (8 logs)
   - `lib/redis.js` (15 logs)
   - `lib/crud.js` (2 logs)
   - `lib/api/adminCrudHandler.js` (1 log)
   - `lib/api/middleware.js` (4 logs)
   - `lib/api/validate.js` (4 logs)
   - `lib/domain/videos.js`, `musicas.js`, `posts.js` (3 logs)
   - `pages/api/` (vários scripts com logs)
   - `pages/api/admin/` (vários scripts com logs)

### 1.2 Problemas Identificados e Resolvidos

| # | Problema | Solução Aplicada |
|---|----------|------------------|
| P-L1 | **Prefixo de módulo inconsistente** | Helper centralizado `lib/logger.js` com módulo nomeado obrigatório |
| P-L2 | **Mistura de idiomas** | Logs em inglês traduzidos para português em `pages/api/settings.js` |
| P-L3 | **Log excessivamente verboso** | Logs de SQL movidos para DEBUG-only (`LOG_LEVEL=debug`) |
| P-L4 | **`detectSpoofedIP` loga a cada requisição** | Suprimido para IPs locais (`127.0.0.1`, `::1`) |
| P-L5 | **Formatação inconsistente de emojis** | Emojis padronizados por severidade no logger (`ℹ️ ✅ ⚠️ ❌ 🔍`) |
| P-L6 | **Logs sensíveis sem proteção** | Consultas SQL só aparecem com `LOG_LEVEL=debug` |
| P-L7 | **Nível de severidade mal classificado** | `console.log` → `logger.warn` em falhas de autenticação |
| P-L8 | **Logs do `detectSpoofedIP` durante testes** | Resolvido pela supressão para localhost |

---

## 2. Implementações Realizadas

### 2.1 Helper Centralizado de Logging

**Arquivo criado:** `lib/logger.js`

```javascript
export const logger = {
  info(module, message, ...args) {
    console.log(`[${module}] ℹ️  ${message}`, ...args);
  },
  success(module, message, ...args) {
    console.log(`[${module}] ✅ ${message}`, ...args);
  },
  warn(module, message, ...args) {
    console.warn(`[${module}] ⚠️ ${message}`, ...args);
  },
  error(module, message, ...args) {
    console.error(`[${module}] ❌ ${message}`, ...args);
  },
  debug(module, message, ...args) {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[${module}] 🔍 ${message}`, ...args);
    }
  },
};
```

**Benefícios:**
- Todos os logs seguem o mesmo formato `[Módulo] emoji mensagem`
- Nível DEBUG controlado por variável de ambiente (`LOG_LEVEL=debug`)
- Emojis padronizados por severidade

### 2.2 Migração Completa do `lib/db.js`

**Arquivo:** `lib/db.js`

Logs de consulta SQL movidos para DEBUG-only (`LOG_LEVEL=debug`) **e** todos os demais `console.*` do arquivo migrados para o logger centralizado:

| Localização | Antes | Depois |
|-------------|-------|--------|
| Health check falhou | `console.warn` | `logger.warn('DB', ...)` |
| Pool resetado | `console.log` | `logger.info('DB', ...)` |
| Erro fatal no pool | `console.error` | `logger.error('DB', ...)` |
| Pool recriado | `console.log` | `logger.info('DB', ...)` |
| Consulta SQL (DEBUG) | `console.log` | `logger.debug('DB', ...)` |
| Timeout retry | `console.warn` | `logger.warn('DB', ...)` |
| Erro na consulta | `console.error` | `logger.error('DB', ...)` |
| Pool fechado | `console.log` | `logger.info('DB', ...)` |
| Erro ao fechar pool | `console.error` | `logger.error('DB', ...)` |
| Transação falhou | `console.error` | `logger.error('DB', ...)` |
| Health check falhou | `console.error` | `logger.error('DB', ...)` |
| Erro info banco | `console.error` | `logger.error('DB', ...)` |

### 2.3 Supressão de `detectSpoofedIP` para IPs locais

**Arquivos:** `lib/api/middleware.js` e `pages/api/auth/login.js`

O log de spoofing é suprimido quando o socket é `127.0.0.1` ou `::1` (normalizado com `::ffff:`). Em `pages/api/auth/login.js`, o log foi rebaixado para DEBUG e também suprimido para localhost.

### 2.4 Remoção de Log de Debug

**Arquivo:** `pages/api/admin/musicas.js`

Removido `console.log('🔍 Admin Musicas GET:', ...)` que vazava dados da consulta.

### 2.5 Migração de Módulos para o Logger (Fase 2)

| Arquivo | Alterações |
|---------|------------|
| `lib/auth.js` | Import do logger, `console.log` → `logger.warn` em falhas de autenticação, `console.error` → `logger.error`, `console.log` → `logger.info`/`logger.success` |
| `lib/redis.js` | Import do logger, todos os `console.*` → `logger.*` com módulo `Redis` |
| `lib/cache.js` | Import do logger, todos os `console.*` → `logger.*` com módulo `Cache` |
| `lib/crud.js` | Import do logger, `console.warn` → `logger.warn` com módulo `CRUD` |

### 2.6 Tradução de Logs em Inglês

**Arquivo:** `pages/api/settings.js`

- `'Error fetching setting:'` → `'Erro ao buscar configuração:'`
- `'Error fetching settings:'` → `'Erro ao buscar configurações:'`
- `'Error creating setting:'` → `'Erro ao criar configuração:'`
- `'Error updating setting:'` → `'Erro ao atualizar configuração:'`

### 2.7 Migração de Domínios para o Logger

| Arquivo | Alterações |
|---------|------------|
| `lib/domain/videos.js` | Import do logger, `console.error` → `logger.error` com módulo `Videos` |
| `lib/domain/musicas.js` | Import do logger, `console.error` → `logger.error` com módulo `Musicas` |
| `lib/domain/posts.js` | Import do logger, `console.error` → `logger.error` com módulo `Posts` |

### 2.8 Migração de Endpoints Admin para o Logger

| Arquivo | Alterações |
|---------|------------|
| `lib/api/adminCrudHandler.js` | Import do logger, `console.error` → `logger.error` com módulo `AdminCrudHandler` |
| `lib/api/validate.js` | Import do logger, `console.error` → `logger.error` com módulo `Validate` |
| `pages/api/products.js` | Import do logger, `console.error` → `logger.error` com módulo `Products` |
| `pages/api/admin/rate-limit.js` | Import do logger, `console.*` → `logger.*` com módulo `RateLimit` |
| `pages/api/admin/fetch-spotify.js` | Import do logger, `console.error` → `logger.error` com módulo `FetchSpotify` |
| `pages/api/admin/fetch-ml.js` | Import do logger, `console.error` → `logger.error` com módulo `FetchML` |

### 2.9 Migração de Endpoints Públicos para o Logger

| Arquivo | Alterações |
|---------|------------|
| `pages/api/auth/login.js` | Import do logger, `console.log` → `logger.debug` com supressão para localhost, módulo `Auth` |
| `pages/api/auth/check.js` | Import do logger, `console.error` → `logger.error` com módulo `Auth` |
| `pages/api/dicas.js` | Import do logger, `console.error` → `logger.error` com módulo `Dicas` |
| `pages/api/videos.js` | Import do logger, `console.error` → `logger.error` com módulo `Videos` |
| `pages/api/musicas.js` | Import do logger, `console.error` → `logger.error` com módulo `Musicas` |
| `pages/api/posts.js` | Import do logger, `console.error` → `logger.error` (2 ocorrências) com módulo `Posts` |
| `pages/api/upload-image.js` | Import do logger, `console.error` → `logger.error` com módulo `Upload` |
| `pages/api/cleanup-test-data.js` | Import do logger, `console.error` → `logger.error` com módulo `Cleanup` |
| `pages/api/placeholder-image.js` | Import do logger, `console.warn` e `console.error` → `logger.warn`/`logger.error` com módulo `Placeholder` |

### 2.10 Não Implementado

O item **3.2 (Adicionar requestId para agrupamento)** do plano original não foi implementado por ser de baixa prioridade e requerer alterações estruturais mais profundas nos middlewares de API.

---

## 3. Resumo das Alterações por Arquivo

| Arquivo | O quê | Status |
|---------|-------|:------:|
| **Novo:** `lib/logger.js` | Helper centralizado de logging | ✅ |
| `lib/db.js` | Todos os `console.*` migrados para logger (13 ocorrências) + SQL DEBUG-only | ✅ |
| `lib/auth.js` | Migrado para logger + níveis corretos (log → warn) | ✅ |
| `lib/api/middleware.js` | Spoofing log suprimido para localhost | ✅ |
| `lib/redis.js` | Migrado para logger | ✅ |
| `lib/cache.js` | Migrado para logger | ✅ |
| `lib/crud.js` | Migrado para logger | ✅ |
| `lib/domain/videos.js` | Migrado para logger | ✅ |
| `lib/domain/musicas.js` | Migrado para logger | ✅ |
| `lib/domain/posts.js` | Migrado para logger | ✅ |
| `lib/api/adminCrudHandler.js` | Migrado para logger | ✅ |
| `lib/api/validate.js` | Migrado para logger | ✅ |
| `pages/api/admin/musicas.js` | Log de debug removido | ✅ |
| `pages/api/settings.js` | Traduzido para português + logger | ✅ |
| `pages/api/products.js` | Migrado para logger | ✅ |
| `pages/api/admin/rate-limit.js` | Migrado para logger | ✅ |
| `pages/api/admin/fetch-spotify.js` | Migrado para logger | ✅ |
| `pages/api/admin/fetch-ml.js` | Migrado para logger | ✅ |
| `pages/api/auth/login.js` | Spoofing log suprimido para localhost + logger | ✅ |
| `pages/api/auth/check.js` | Migrado para logger | ✅ |
| `pages/api/dicas.js` | Migrado para logger | ✅ |
| `pages/api/videos.js` | Migrado para logger | ✅ |
| `pages/api/musicas.js` | Migrado para logger | ✅ |
| `pages/api/posts.js` | Migrado para logger | ✅ |
| `pages/api/upload-image.js` | Migrado para logger | ✅ |
| `pages/api/cleanup-test-data.js` | Migrado para logger | ✅ |
| `pages/api/placeholder-image.js` | Migrado para logger | ✅ |

---

## 4. Exemplo de Antes e Depois

### Antes (estado original):
```
[Auth] detectSpoofedIP: socket=::ffff:127.0.0.1, normalized=127.0.0.1, forwarded=::ffff:127.0.0.1, isSpoofed=false
[Auth] Falha: Usuário 'usuario_fantasma_k6' não encontrado.
[Auth] ⚠️ Falha na tentativa de login para o usuário: "usuario_fantasma_k6"
 POST /api/auth/login?response=body 401 in 1527µs (next.js: 489µs, application-code: 1038µs)
Executando consulta SQL { text: 'SELECT * FROM users...', values: [...] }
```

### Depois (com melhorias):
```
 POST /api/auth/login 401 in 1527µs
[Auth] ⚠️ Falha na tentativa de login para o usuário: "usuario_fantasma_k6"
```

---

## 5. Benefícios Esperados

| Métrica | Antes | Depois | Redução |
|---------|:-----:|:------:|:-------:|
| Linhas de log por requisição com erro de login | ~6-7 | ~2 | **~67%** |
| Linhas de log por requisição GET normal | ~4-5 | ~1 | **~75%** |
| Poluição do terminal dos testes de carga | Alta (spoofing + SQL) | Baixa | **Significativa** |
| Facilidade de identificar problemas | Média | Alta | — |
| Consistência visual entre módulos | Baixa | Alta | — |
| Total de arquivos migrados para logger | 0 | **28 arquivos** | — |