# Plano de Ação — Melhoria dos Logs do Servidor (npm run dev)

> **Objetivo:** Tornar as saídas do terminal durante `npm run dev` mais limpas, organizadas e de fácil entendimento  
> **Data:** 29/05/2026

---

## 1. Diagnóstico Atual

### 1.1 Estrutura dos Logs

Atualmente, os logs da aplicação durante `npm run dev` misturam:

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
   - `pages/api/admin/` (vários scripts com logs)

### 1.2 Problemas Identificados

| # | Problema | Exemplo | Impacto |
|---|----------|---------|---------|
| P-L1 | **Prefixo de módulo inconsistente** | `[Auth]`, `[DB]`, `[Cache]`, mas alguns sem prefixo como `console.error('Error fetching settings:')` | Dificulta filtrar logs por módulo |
| P-L2 | **Mistura de idiomas** | `[Auth] Falha: Usuário '...' não encontrado.` (português) vs `console.error('Error fetching settings:')` (inglês) | Quebra a consistência visual |
| P-L3 | **Log excessivamente verboso** | `db.js` loga cada consulta SQL com parâmetros: `Executando consulta SQL` + `Consulta SQL executada com sucesso` | Polui o terminal em produção com ~100+ linhas extras por execução |
| P-L4 | **`detectSpoofedIP` loga a cada requisição** | `[Auth] detectSpoofedIP: socket=::ffff:127.0.0.1, ...` | Aparece para **toda** requisição a rotas protegidas — barulho excessivo em desenvolvimento |
| P-L5 | **Formatação inconsistente de emojis** | Alguns usam `✅`, `⚠️`, `❌`, outros usam texto puro | Poluição visual sem padrão |
| P-L6 | **Logs sensíveis sem proteção** | `db.js` loga `text` da consulta SQL e `values` | Risco de expor dados sensíveis no terminal |
| P-L7 | **Nível de severidade mal classificado** | `console.log` usado para erros de autenticação (`[Auth] Falha: Usuário...`) | `console.log` deveria ser `console.warn` para falhas |
| P-L8 | **Logs do `detectSpoofedIP` durante testes** | No output dos testes: toda requisição de login gera `detectSpoofedIP: socket=::ffff:127.0.0.1...` | Polui o resultado dos testes de carga |

---

## 2. Propostas de Melhoria

### 2.1 Padronização de Prefixos e Níveis

**Ação:** Criar um helper centralizado de logging

```javascript
// lib/logger.js
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
- Todos os logs seguem o mesmo formato
- Nível DEBUG controlado por variável de ambiente
- Emojis padronizados por severidade

### 2.2 Supressão de Logs Verbosos em Desenvolvimento

**Arquivo:** `lib/db.js`

**Logs a tornar condicionais (nível DEBUG):**

| Linha | Log atual | Ação |
|-------|-----------|------|
| `db.js:145` | `Executando consulta SQL` | 🔇 Mover para debug |
| `db.js:157` | `Consulta SQL executada com sucesso` | 🔇 Mover para debug |
| `db.js:177` | `[DB] A consulta retornou resultados lentos` | 🔇 Mover para debug |

### 2.3 Supressão de `detectSpoofedIP` para IPs locais

**Arquivo:** `lib/api/middleware.js` (linha ~178)

**Problema:** O log `[SpoofDetection] 🚫 IP spoofing detectado...` é acionado a cada requisição em localhost porque o Next.js/Turbopack faz proxy.

**Solução:** Não logar quando o socket for `127.0.0.1` ou `::1`:

```javascript
// Só loga spoofing se não for localhost
const normalizedSocket = socketIP?.replace(/^::ffff:/, '');
if (normalizedSocket !== '127.0.0.1' && normalizedSocket !== '::1') {
  console.warn(`[SpoofDetection] 🚫 IP spoofing detectado: ...`);
}
```

### 2.4 Remoção de Logs de Consulta em Produção

**Arquivo:** `lib/db.js` e arquivos de API

**Solução:** Adicionar verificação de `NODE_ENV`:

```javascript
if (process.env.NODE_ENV !== 'production' && process.env.LOG_LEVEL === 'debug') {
  console.log('[DB] Executando consulta SQL', { text, values });
}
```

### 2.5 Padronização de Idiomas

**Decisão:** Manter **português** como idioma principal (consistente com o projeto), exceto mensagens técnicas internas (stack traces, erros de bibliotecas).

**Ação:** Traduzir logs em inglês para português:
- `"Error fetching settings:"` → `"Erro ao buscar configurações:"`
- `"Error fetching setting:"` → `"Erro ao buscar configuração:"`

### 2.6 Correção de Níveis de Severidade

**Arquivo:** `lib/auth.js`

| Linha | Atual | Deveria ser | Justificativa |
|-------|-------|-------------|---------------|
| 104 | `console.log` | `console.warn` | Falha de autenticação é um aviso, não informação |
| 110 | `console.log` | `console.warn` | Idem |
| 146 | `console.warn` | ✅ Correto | |
| 223 | `console.log` | ✅ Correto | Inicialização é informativo |

### 2.7 Agrupamento de Logs de Requisição

**Solução:** Usar o `requestId` para agrupar logs de uma mesma requisição:

```javascript
// No middleware de API
req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

// Nos logs
console.log(`[${req.requestId}] [Auth] detectSpoofedIP: ...`);
```

### 2.8 Resumo das Alterações por Arquivo

| Arquivo | O quê | Prioridade | Esforço |
|---------|-------|:----------:|:-------:|
| **Novo:** `lib/logger.js` | Helper centralizado de logging | Alta | 🟢 Baixo |
| `lib/db.js` | Tornar consultas SQL DEBUG-only | Alta | 🟢 Baixo |
| `lib/auth.js` | Ajustar níveis (log → warn) e português | Média | 🟢 Baixo |
| `lib/api/middleware.js` | Suprimir spoofing log para localhost | Alta | 🟢 Baixo |
| `lib/redis.js` | Tornar logs de inicialização INFO, operacionais DEBUG | Média | 🟢 Baixo |
| `lib/cache.js` | Padronizar prefixo e emojis | Média | 🟢 Baixo |
| `lib/crud.js` | Padronizar para português | Baixa | 🟢 Baixo |
| `pages/api/admin/musicas.js:39` | Remover log de debug (vaza dados da consulta) | Alta | 🟢 Baixo |
| `pages/api/settings.js` | Traduzir mensagens de erro | Baixa | 🟢 Baixo |

---

## 3. Ordem de Execução Recomendada

```
Fase 1 — Impacto Imediato (Alta Visibilidade)
├── 1.1 Criar lib/logger.js (helper centralizado)
├── 1.2 Suprimir detectSpoofedIP para localhost (middleware.js)
├── 1.3 Tornar consultas SQL DEBUG-only (db.js)
└── 1.4 Remover console.log de debug em pages/api/admin/musicas.js

Fase 2 — Consistência (Média Prioridade)
├── 2.1 Migrar lib/auth.js para logger + português + níveis corretos
├── 2.2 Migrar lib/redis.js para logger
├── 2.3 Migrar lib/cache.js para logger
└── 2.4 Migrar lib/crud.js para logger

Fase 3 — Polimento (Baixa Prioridade)
├── 3.1 Traduzir logs em inglês (pages/api/settings.js, etc.)
├── 3.2 Adicionar requestId para agrupamento
├── 3.3 Migrar logs dos domains para logger
└── 3.4 Migrar logs dos pages/api/admin para logger
```

---

## 4. Exemplo de Antes e Depois

### Antes (estado atual):
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