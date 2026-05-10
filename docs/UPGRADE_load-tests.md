# 🔧 Relatório de Correções e Melhorias — `/load-tests`

> **Propósito:** Documentar problemas identificados, duplicidades, oportunidades de melhoria de performance e sugestões de correção nos scripts de teste de carga. **Nenhuma alteração foi aplicada** — apenas reportadas as análises.

---

## Sumário

1. [Duplicidade de Código](#1-duplicidade-de-código)
2. [Problemas de Segurança](#2-problemas-de-segurança)
3. [Problemas de Performance](#3-problemas-de-performance)
4. [Inconsistências e Padrões](#4-inconsistências-e-padrões)
5. [Melhorias de Manutenibilidade](#5-melhorias-de-manutenibilidade)
6. [Problemas no Workflow CI](#6-problemas-no-workflow-ci)
7. [Matriz de Prioridades](#7-matriz-de-prioridades)

---

## 1. Duplicidade de Código

### 1.1 Função `getRandomIP()` duplicada em múltiplos arquivos

**Severidade:** ⚠️ Média

**Arquivos afetados:**
- `/load-tests/musicas-load-test.js`
- `/load-tests/musicas-crud-test.js`
- `/load-tests/stress-test-combined.js`
- `/load-tests/videos-load-test.js`
- `/load-tests/videos-crud-test.js`
- (potencialmente outros)

**Problema:** A função `getRandomIP()` que gera endereços IPv4 aleatórios está implementada identicamente em pelo menos 5 arquivos diferentes.

**Código duplicado:**
```javascript
function getRandomIP() {
  const octet = () => Math.floor(Math.random() * 255);
  return `${octet()}.${octet()}.${octet()}.${octet()}`;
}
```

**Sugestão:** Extrair para um módulo compartilhado (ex: `load-tests/helpers/network.js`) e importar onde necessário. k6 suporta importação de módulos locais com sintaxe ES module.

---

### 1.2 Lógica de login repetida em ~90% dos arquivos

**Severidade:** 🔴 Alta

**Arquivos afetados:** Quase todos os scripts (com exceção de `health-check.js`, `ddos-search-test.js`, `pagination-test.js`, `posts-cursor-pagination-test.js`, `posts-tags-test.js`, `cache-headers-test.js`, `rate-limit-test.js`, `recovery-test.js`, `search-content-test.js`).

**Problema:** A função `setup()` com lógica de autenticação (POST para `/api/v1/auth/login` + extração de token) está duplicada em aproximadamente 18 arquivos.

**Código duplicado (variações menores):**
```javascript
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (loginRes.status !== 200) {
    throw new Error(`Login falhou: ${loginRes.status}`);
  }
  return { token: loginRes.json('data.token') };
}
```

**Sugestão:** Criar módulo compartilhado `load-tests/helpers/auth.js` com a lógica de login, aceitando parâmetros de configuração.

---

### 1.3 Configuração de ambiente (BASE_URL, USERNAME, PASSWORD) duplicada

**Severidade:** ⚠️ Média

**Arquivos afetados:** Todos os scripts de teste

**Problema:** Cada arquivo define suas próprias variáveis de ambiente com fallback, resultando em aproximadamente 28 declarações idênticas:

```javascript
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || '123456';
```

**Sugestão:** Centralizar em módulo `load-tests/helpers/config.js` que leia do `__ENV` e do `env-config.json` uma única vez.

---

### 1.4 Lógica de `handleSummary()` duplicada

**Severidade:** 🔴 Alta

**Arquivos afetados:** `health-check.js`, `backup-verification-test.js`, `musicas-load-test.js`, `videos-load-test.js`, `posts-tags-test.js`, `video-validation-test.js`, `musicas-crud-test.js`, `videos-crud-test.js`, `stress-test-combined.js` (e potencialmente outros).

**Problema:** A função `handleSummary()` que gera relatórios JSON e/ou HTML está implementada com lógica similar em múltiplos arquivos, com pequenas variações no nome do arquivo de saída.

**Sugestão:** Criar módulo compartilhado `load-tests/helpers/report.js` com função genérica que aceite o nome do teste como parâmetro.

---

### 1.5 Estruturas de teste CRUD quase idênticas entre músicas e vídeos

**Severidade:** ⚠️ Média

**Arquivos afetados:**
- `/load-tests/musicas-crud-test.js`
- `/load-tests/videos-crud-test.js`
- `/load-tests/musicas-filter-test.js`
- `/load-tests/videos-filter-test.js`
- `/load-tests/musicas-pagination-test.js`
- `/load-tests/videos-pagination-test.js`
- `/load-tests/musicas-sort-test.js`
- `/load-tests/videos-sort-test.js`
- `/load-tests/musicas-load-test.js`
- `/load-tests/videos-load-test.js`

**Problema:** Os pares de testes (músicas <-> vídeos) são estruturalmente idênticos, diferenciando-se apenas no endpoint e nos dados de payload. Isso representa aproximadamente 80% de duplicação de código.

**Sugestão:** Criar um test runner genérico que receba configuração do recurso (endpoint, payload template, campos), eliminando a necessidade de arquivos duplicados.

---

## 2. Problemas de Segurança

### 2.1 Credenciais de admin em texto plano

**Severidade:** 🔴 Alta

**Arquivos afetados:**
- `/load-tests/env-config.json` (credenciais: `admin` / `123456`)
- Todos os 28 scripts com fallback `ADMIN_PASSWORD || '123456'`

**Problema:** Credenciais de administrador hardcoded no código-fonte e no arquivo de configuração. Embora o repositório seja provavelmente privado, estas senhas podem ser descobertas por qualquer pessoa com acesso ao repositório.

**Sugestão:**
- Usar apenas variáveis de ambiente (`__ENV`) sem fallback para valores reais
- O fallback deve ser um valor dummy que claramente falhará (ex: `'CHANGE_ME'`)
- Documentar que as credenciais devem ser configuradas via CI/CD secrets ou arquivo `.env.local`

---

### 2.2 Header `X-Forwarded-For` sendo usado para contornar rate limit

**Severidade:** ⚠️ Média

**Arquivos afetados:** Todos que usam `getRandomIP()` (ver seção 1.1)

**Problema:** Os testes de carga deliberadamente falsificam o header `X-Forwarded-For` para evitar rate limit. Isso é contraditório com o propósito do teste `ip-spoofing-test.js`, que supostamente valida que IPs falsificados são rejeitados. Se o rate limit pode ser burlado com IP falso, isso é uma vulnerabilidade real.

**Sugestão:**
- Revisar a estratégia: ou o `X-Forwarded-For` é confiável (e não deve ser falsificado), ou não é (e deve ser tratado como vulnerabilidade)
- Alternativamente, usar diferentes contas de usuário reais para testes de carga
- Remover o spoofing de IP nos testes de carga se o sistema depende de rate limit por IP

---

### 2.3 Token JWT exposto em relatórios

**Severidade:** ⚠️ Média

**Arquivo:** `/load-tests/stress-test-combined.js` (linha 185-187)

**Problema:** O único arquivo que oculta o token JWT nos relatórios é o `stress-test-combined.js`. Nos demais testes, o token pode ser exposto nos relatórios de saída.

**Sugestão:** Adicionar sanitização de token em todos os `handleSummary()` que geram relatórios.

---

## 3. Problemas de Performance

### 3.1 Thresholds inconsistentes entre testes similares

**Severidade:** ⚠️ Média

**Arquivos afetados:** Múltiplos

**Problema:** Thresholds de performance variam sem justificativa clara:

| Teste | Threshold | Arquivo |
|-------|-----------|---------|
| `musicas-load-test` | p(95) < 300ms | `/load-tests/musicas-load-test.js` |
| `videos-load-test` | p(95) < 300ms | `/load-tests/videos-load-test.js` |
| `authenticated-flow` | p(95) < 1000ms | `/load-tests/authenticated-flow.js` |
| `musicas-crud-test` | p(95) < 500ms | `/load-tests/musicas-crud-test.js` |
| `videos-crud-test` | p(95) < 500ms | `/load-tests/videos-crud-test.js` |
| `health-check` | p(95) < 100ms | `/load-tests/health-check.js` |

**Sugestão:** Estabelecer SLAs consistentes por tipo de operação e documentá-los. Exemplo:
- Consultas simples (GET list): p(95) < 200ms
- Operações de escrita (POST/PUT/DELETE): p(95) < 500ms
- Health check: p(95) < 100ms
- Busca textual: p(95) < 800ms

---

### 3.2 Uso de `sleep()` fixo entre requisições

**Severidade:** 🟢 Baixa

**Arquivos afetados:** Todos que usam `sleep(1)`, `sleep(2)`, `sleep(0.5)`

**Problema:** O `sleep()` com valor fixo não simula comportamento real de usuário. Em produção, usuários têm tempos de思考 e ação variáveis.

**Sugestão:** Usar `sleep(random(0.5, 3))` para simular comportamento mais realista, ou usar a biblioteca `k6` com distribuições estatísticas (`k6/execution`, `k6/data`).

---

### 3.3 Verificação de health check duplicada em `setup()`

**Severidade:** 🟢 Baixa

**Arquivos afetados:** `/load-tests/authenticated-flow.js` (linha ~14), `/load-tests/musicas-load-test.js`

**Problema:** Alguns scripts fazem health check desnecessário no `setup()` antes do login, adicionando latência ao teste e consumindo recursos do servidor.

**Sugestão:** Remover health checks de `setup()` em testes que não testam especificamente health check. O k6 já reporta falhas se o servidor estiver indisponível.

---

## 4. Inconsistências e Padrões

### 4.1 Rotas sem versionamento (/api vs /api/v1)

**Severidade:** ⚠️ Média

**Arquivos afetados:** Múltiplos

**Problema:** Mistura de rotas com e sem prefixo de versão:

| Rota | Arquivo |
|------|---------|
| `GET /` | `authenticated-flow.js`, `musicas-load-test.js` |
| `GET /api/v1/health` | `health-check.js` |
| `GET /api/v1/status` | `stress-test-combined.js` |
| `GET /api/v1/settings` | `authenticated-flow.js` |
| `POST /api/v1/auth/login` | (padrão) |
| `GET /api/posts` | `posts-tags-test.js`, `posts-cursor-pagination-test.js` |
| `GET /api/musicas?search=` | `ddos-search-test.js` |
| `GET /api/search?q=` | `search-content-test.js` |

**Sugestão:** Padronizar o prefixo de versão da API. Rotas públicas sem autenticação usam `/api/` e rotas administrativas usam `/api/v1/`? Se sim, documentar a convenção. Se não, unificar.

---

### 4.2 Nomeclatura inconsistente de arquivos

**Severidade:** 🟢 Baixa

**Arquivos:** Todos

**Problema:** Mistura de padrões de nomenclatura:
- `musicas-crud-test.js` (recurso-test)
- `musicas-load-test.js` (recurso-test)
- `cache-headers-test.js` (funcionalidade-test)
- `cache-performance-test.js` (funcionalidade-test)
- `backup-verification-test.js` (funcionalidade-test)
- `authenticated-flow.js` (funcionalidade-flow - sem sufixo `-test`)
- `upload-flow.js` (funcionalidade-flow - sem sufixo `-test`)

**Sugestão:** Padronizar a nomenclatura. Sugestão: `{categoria}-{funcionalidade}-test.js`. Exemplos:
- `auth-authenticated-flow-test.js`
- `musicas-crud-test.js` (mantido)
- `cache-headers-test.js` (mantido)

---

### 4.3 Configuração de carga inconsistente entre testes

**Severidade:** ⚠️ Média

**Problema:** Cada teste define sua própria configuração de carga (VUs, duração, estágios) sem uma estratégia clara:

| Teste | VUs | Duração | Threshold |
|-------|-----|---------|-----------|
| `musicas-load-test` | 5 | 20s | p(95) < 300ms |
| `videos-load-test` | 5 | 20s | p(95) < 300ms |
| `authenticated-flow` | 5 | 35s | p(95) < 1000ms |
| `health-check` | 20 | 50s | p(95) < 100ms |
| `stress-test-combined` | 100 | 4m50s | p(95) < 500ms |
| `ddos-search-test` | 15 | 3min | p(95) < 2000ms |
| `rate-limit-test` | 50 | - | - |

**Sugestão:** Definir uma matriz de perfis de carga (leve, médio, pesado) e referenciá-los nos testes, em vez de cada um definir seus próprios parâmetros.

---

### 4.4 Ausência de testes de `teardown` na maioria dos arquivos

**Severidade:** ⚠️ Média

**Arquivos afetados:** Quase todos, exceto `stress-test-combined.js`

**Problema:** O `stress-test-combined.js` é o único que implementa `teardown()` para limpar dados de teste criados. Os demais testes CRUD criam dados que podem poluir o banco de dados.

**Sugestão:** Adicionar função `teardown()` em testes que criam dados (CRUD, criação de posts, upload, etc.) para remover os registros de teste após a execução.

---

## 5. Melhorias de Manutenibilidade

### 5.1 Arquivo `env-config.json` subutilizado

**Severidade:** 🟢 Baixa

**Arquivo:** `/load-tests/env-config.json`

**Problema:** O arquivo `env-config.json` define as configurações de ambiente, mas cada script k6 lê diretamente do `__ENV` com fallbacks inline. O JSON não é importado por nenhum script de forma padronizada.

**Sugestão:** Criar um módulo `load-tests/helpers/config.js` que:
1. Tenta ler `__ENV.CONFIG_FILE` e carregar o JSON
2. Faz fallback para `__ENV`
3. Exporta objeto de configuração padronizado

---

### 5.2 Ausência de tratamento de erros na extração de token

**Severidade:** ⚠️ Média

**Arquivos afetados:** Todos que fazem login

**Problema:** A extração do token assume que a estrutura da resposta será sempre `data.token`:

```javascript
return { token: loginRes.json('data.token') };
```

Se a API mudar a estrutura da resposta, o erro será silencioso (token `undefined`) e o teste falhará com mensagem confusa.

**Sugestão:** Validar a estrutura da resposta antes de extrair o token e lançar erro descritivo:

```javascript
const body = loginRes.json();
if (!body || !body.data || !body.data.token) {
  throw new Error(`Estrutura de resposta inesperada: ${JSON.stringify(body)}`);
}
```

---

### 5.3 Ausência de separação entre testes funcionais e de carga

**Severidade:** 🟢 Baixa

**Problema:** Alguns scripts são testes funcionais (ex: `backup-verification-test.js`, `video-validation-test.js`, `posts-tags-test.js`) mas estão na pasta `load-tests/` misturados com testes de carga reais.

**Sugestão:** Separar em subpastas:
- `load-tests/performance/` — Testes de carga, stress e performance
- `load-tests/functional/` — Testes funcionais e de validação
- `load-tests/security/` — Testes de segurança (rate limit, spoofing, DDoS)

---

### 5.4 Uso de versão hardcoded do k6-summary

**Severidade:** 🟢 Baixa

**Arquivos afetados:** Todos que usam `handleSummary()`

**Problema:** A URL do `textSummary` está hardcoded com versão específica:

```javascript
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
```

**Sugestão:** Usar a URL sem versão ou versionamento semântico para receber atualizações automáticas:

```javascript
import { textSummary } from 'https://jslib.k6.io/k6-summary/latest/index.js';
```

---

### 5.5 Comportamento "soft pass" em validações

**Severidade:** 🟢 Baixa

**Arquivos afetados:** Vários (ex: `video-validation-test.js`, `backup-verification-test.js`)

**Problema:** Alguns checks usam "soft pass" onde a validação é registrada mas não interrompe o fluxo. Por exemplo, se a API retorna um código diferente do esperado para URL inválida, o teste apenas registra o check como falho mas continua.

**Sugestão:** Para testes funcionais, usar `abortOnFail: true` em checks críticos para garantir que o teste não continue com dados inválidos.

---

## 6. Problemas no Workflow CI

### 6.1 Workflow executa apenas o `stress-test-combined.js`

**Severidade:** ⚠️ Média

**Arquivo:** `/load-tests.yml` (linha 112)

**Problema:** O workflow de CI executa **apenas** o `stress-test-combined.js`, ignorando os outros 27 scripts de teste. Isso significa que:
- Testes funcionais (backup, validação de vídeo, posts tags) nunca são executados em CI
- Testes de carga individuais (músicas, vídeos) nunca são validados
- Testes de segurança (rate limit, IP spoofing, DDoS) nunca são executados

**Sugestão:** Adicionar etapas no workflow para executar outros testes, ou criar um script orquestrador que execute todos os testes e agregue resultados.

---

### 6.2 Sem validação de thresholds no workflow

**Severidade:** ⚠️ Média

**Arquivo:** `/load-tests.yml`

**Problema:** O workflow executa o k6 mas não verifica explicitamente se os thresholds foram atingidos. Se os thresholds falharem, o k6 retorna código de erro, mas não há ações específicas configuradas para falha.

**Sugestão:** Adicionar notificação (Slack, email) quando thresholds são violados e configurar ações de rollback ou alerta.

---

### 6.3 Ausência de cache para dependências do k6

**Severidade:** 🟢 Baixa

**Arquivo:** `/load-tests.yml`

**Problema:** O k6 é instalado via GitHub Action (`grafana/setup-k6-action@v1`), mas as dependências de import (como `k6-summary` e `k6-reporter`) são baixadas via URLs HTTP toda vez que o workflow executa.

**Sugestão:** Usar versões locais das bibliotecas ou configurar cache para as URLs de import do k6.

---

### 6.4 Senha diferente entre configurações

**Severidade:** ⚠️ Média

**Problema:** A senha de admin no `env-config.json` é `123456`, mas no workflow CI (`load-tests.yml` linha 105) é `password123`. Isso pode causar falhas se o desenvolvedor tentar rodar os testes localmente com valores diferentes.

| Local | Username | Password |
|-------|----------|----------|
| `env-config.json` | `admin` | `123456` |
| `load-tests.yml` (CI) | `admin` | `password123` |
| Fallback nos scripts | `admin` | `123456` |

**Sugestão:** Sincronizar as credenciais entre ambiente local e CI, ou documentar claramente que as credenciais de CI são configuradas via secrets do GitHub Actions.

---

## 7. Matriz de Prioridades

| Prioridade | Categoria | Descrição | Esforço | Impacto |
|-----------|-----------|-----------|---------|---------|
| 🔴 **Crítica** | Duplicidade | Lógica de login duplicada em 18+ arquivos | Médio | Muito Alto |
| 🔴 **Crítica** | Duplicidade | `handleSummary()` duplicado em múltiplos arquivos | Baixo | Alto |
| 🔴 **Crítica** | Segurança | Credenciais hardcoded em texto plano | Baixo | Alto |
| ⚠️ **Alta** | Duplicidade | Função `getRandomIP()` duplicada | Baixo | Médio |
| ⚠️ **Alta** | Duplicidade | Configuração de ambiente duplicada | Baixo | Médio |
| ⚠️ **Alta** | Segurança | Header `X-Forwarded-For` usado para burlar rate limit | Médio | Alto |
| ⚠️ **Alta** | CI/CD | Workflow executa apenas 1 dos 28 testes | Alto | Muito Alto |
| ⚠️ **Alta** | Performance | Thresholds inconsistentes entre testes similares | Médio | Médio |
| ⚠️ **Alta** | Manutenção | Rotas sem versionamento consistente (`/api` vs `/api/v1`) | Baixo | Médio |
| ⚠️ **Alta** | CI/CD | Senhas diferentes entre env-config.json e CI | Baixo | Alto |
| ⚠️ **Alta** | Manutenção | Ausência de `teardown()` na maioria dos testes | Médio | Médio |
| ⚠️ **Alta** | Segurança | Token JWT exposto em relatórios | Baixo | Médio |
| ⚠️ **Média** | Manutenção | Configuração de carga inconsistente entre testes | Alto | Médio |
| ⚠️ **Média** | Duplicidade | Estruturas CRUD músicas/vídeos quase idênticas | Alto | Alto |
| 🟢 **Baixa** | Performance | `sleep()` fixo não simula comportamento real | Baixo | Baixo |
| 🟢 **Baixa** | Performance | Health check duplicado em `setup()` | Baixo | Baixo |
| 🟢 **Baixa** | Manutenção | Nomenclatura inconsistente de arquivos | Médio | Baixo |
| 🟢 **Baixa** | Manutenção | `env-config.json` subutilizado | Baixo | Médio |
| 🟢 **Baixa** | Manutenção | Separação difusa entre testes funcionais e de carga | Médio | Baixo |
| 🟢 **Baixa** | Manutenção | Versão hardcoded do k6-summary | Baixo | Baixo |
| 🟢 **Baixa** | Manutenção | Comportamento "soft pass" em validações | Baixo | Baixo |

### Benefícios das Ações Sugeridas

1. **Módulo de autenticação compartilhado**: Redução de ~90% de código duplicado relacionado a login
2. **Módulo de configuração centralizado**: Facilidade para adicionar novas variáveis de ambiente
3. **Módulo de relatórios padronizado**: Consistência na geração de relatórios e sanitização de dados sensíveis
4. **Reorganização em subpastas**: Clareza sobre o propósito de cada teste (performance vs funcional vs segurança)
5. **Workflow CI expandido**: Cobertura completa de testes em CI, não apenas o stress test combinado
6. **Test runner genérico para CRUD**: Eliminação de ~50% de código duplicado entre testes de músicas e vídeos

---

> **Data da análise:** 10/05/2026
> **Status:** Apenas reportado — nenhuma correção aplicada