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

### 1.1 Função `getRandomIP()` duplicada em múltiplos arquivos — **RESOLVIDO (23/05/2026)**

**Severidade anterior:** ⚠️ Média

**Arquivos afetados originalmente:**
- `/load-tests/musicas-load-test.js`
- `/load-tests/stress-test-combined.js`
- `/load-tests/videos-load-test.js`
- `/load-tests/cache-performance-test.js`
- `/load-tests/ip-spoofing-test.js`

> **Nota:** A documentação original listava `musicas-crud-test.js` e `videos-crud-test.js`, mas estes arquivos **não possuíam** a função `getRandomIP()`. Os arquivos corretos (`cache-performance-test.js` e `ip-spoofing-test.js`) foram identificados e corrigidos.

**Problema original:** A função `getRandomIP()` que gera endereços IPv4 aleatórios estava implementada identicamente em 5 arquivos diferentes.

**Código duplicado removido:**
```javascript
function getRandomIP() {
  const octet = () => Math.floor(Math.random() * 255);
  return `${octet()}.${octet()}.${octet()}.${octet()}`;
}
```

**O que foi feito (23/05/2026):**
1. Criado módulo compartilhado `load-tests/helpers/network.js` com a função `getRandomIP()`
2. Adicionado `import { getRandomIP } from './helpers/network.js'` nos 5 arquivos afetados
3. Removida a declaração local da função `getRandomIP()` de cada arquivo
4. Atualizada a documentação com a lista correta de arquivos

**Sugestão original:** Extrair para um módulo compartilhado (ex: `load-tests/helpers/network.js`) e importar onde necessário. k6 suporta importação de módulos locais com sintaxe ES module.


### 1.2 Lógica de login repetida em ~90% dos arquivos — **RESOLVIDO (23/05/2026)**

**Severidade anterior:** 🔴 Alta

**Arquivos afetados originalmente:** Quase todos os scripts (com exceção de `health-check.js`, `ddos-search-test.js`, `pagination-test.js`, `posts-cursor-pagination-test.js`, `posts-tags-test.js`, `cache-headers-test.js`, `rate-limit-test.js`, `recovery-test.js`, `search-content-test.js`).

**Problema original:** A função `setup()` com lógica de autenticação (POST para `/api/auth/login?response=body` + extração de token) estava duplicada em aproximadamente 18 arquivos.

**Código duplicado removido:**
```javascript
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login?response=body`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  if (loginRes.status !== 200) {
    throw new Error(`Login falhou: ${loginRes.status}`);
  }
  return { token: loginRes.json('data.token') };
}
```

**O que foi feito (23/05/2026):**
1. Criado módulo compartilhado `load-tests/helpers/auth.js` com a lógica de login
2. Todos os 18 arquivos com login foram atualizados para importar de `./helpers/auth.js`
3. Adicionada validação de estrutura da resposta (token undefined) antes de retornar
4. Confirmado que os 9 arquivos listados como exceção realmente não precisam de login

> **Nota:** Os 9 arquivos listados como exceção (`health-check.js`, `ddos-search-test.js`, `pagination-test.js`, `posts-cursor-pagination-test.js`, `posts-tags-test.js`, `cache-headers-test.js`, `rate-limit-test.js`, `recovery-test.js`, `search-content-test.js`) são endpoints públicos que **não necessitam** de autenticação. Estes 9 arquivos permaneceram inalterados para o item 1.2.

**Sugestão original:** Criar módulo compartilhado `load-tests/helpers/auth.js` com a lógica de login, aceitando parâmetros de configuração.


### 1.3 Configuração de ambiente (BASE_URL, USERNAME, PASSWORD) duplicada — **RESOLVIDO (23/05/2026)**

**Severidade anterior:** ⚠️ Média

**Arquivos afetados originalmente:** Todos os scripts de teste

**Problema original:** Cada arquivo definia suas próprias variáveis de ambiente com fallback, resultando em aproximadamente 28 declarações idênticas:

```javascript
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || '123456';
```

**O que foi feito (23/05/2026):**
1. Criado módulo compartilhado `load-tests/helpers/config.js` que centraliza a leitura de `__ENV` com fallback
2. Exporta as constantes `BASE_URL`, `USERNAME` e `PASSWORD` para uso em todos os scripts
3. Todos os 28 scripts foram atualizados para importar de `./helpers/config.js`
4. Removidas as declarações locais de `BASE_URL`, `USERNAME` e `PASSWORD`

**Sugestão original:** Centralizar em módulo `load-tests/helpers/config.js` que leia do `__ENV` e do `env-config.json` uma única vez.


### 1.4 Lógica de `handleSummary()` duplicada — **RESOLVIDO (23/05/2026)**

**Severidade anterior:** 🔴 Alta

**Arquivos afetados originalmente:** `health-check.js`, `backup-verification-test.js`, `musicas-load-test.js`, `videos-load-test.js`, `posts-tags-test.js`, `video-validation-test.js`, `musicas-crud-test.js`, `videos-crud-test.js`, `stress-test-combined.js` (e potencialmente outros).

**Problema original:** A função `handleSummary()` que gera relatórios JSON e/ou HTML estava implementada com lógica similar em múltiplos arquivos, com pequenas variações no nome do arquivo de saída.

**O que foi feito (23/05/2026):**
1. Criado módulo compartilhado `load-tests/helpers/report.js` com a função `generateReport(data, testName)`
2. Todos os arquivos com `handleSummary()` foram atualizados para usar `generateReport()`
3. Atualizada a URL do `textSummary` de versão fixa (`0.0.2`) para `latest` (resolve também o item 5.4)

**Sugestão original:** Criar módulo compartilhado `load-tests/helpers/report.js` com função genérica que aceite o nome do teste como parâmetro.


### 1.5 Estruturas de teste CRUD quase idênticas entre músicas e vídeos — **RESOLVIDO (23/05/2026)**

**Severidade anterior:** ⚠️ Média

**Arquivos afetados originalmente:**
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

**Problema original:** Os pares de testes (músicas <-> vídeos) eram estruturalmente idênticos, diferenciando-se apenas no endpoint e nos dados de payload. Isso representava aproximadamente 80% de duplicação de código.

**O que foi feito (23/05/2026):**
1. Criado módulo compartilhado `load-tests/helpers/resource-test-runner.js` com funções genéricas:
   - `createCrudTest(config)` — Gera CRUD (create/update/delete) a partir de configuração
   - `createFilterTest(config)` — Gera teste de filtro por termo de busca
   - `createPaginationTest(config)` — Gera teste de paginação com validação cruzada
   - `createSortTest(config)` — Gera teste de ordenação (explícita ou comportamento padrão)
   - `createLoadTest(config)` — Gera teste de carga com suporte a health check, IP spoofing e requisições extras
2. Todos os 10 arquivos foram refatorados para ~20-30 linhas cada, importando do runner genérico
3. O `videos-filter-test.js` foi corrigido — anteriormente testava paginação (não filtro), agora testa filtro real por termos de busca
4. Adicionado `teardown()` no `musicas-crud-test.js` (já existia no `videos-crud-test.js`)
5. Adicionado `handleSummary()` no `musicas-load-test.js` e `videos-load-test.js` (não existiam anteriormente)
6. Corrigido `videos-load-test.js` para usar `__ENV.BASE_URL` em vez de URL hardcoded `'http://localhost:3000'`
7. Todos os arquivos agora usam `generateReport()` do `helpers/report.js` e importações padronizadas

> **Nota:** O `videos-filter-test.js` anteriormente testava paginação (não filtro). O conteúdo foi reescrito para testar filtro real, e o nome do arquivo foi mantido para consistência com a estrutura de pares.

**Redução de código:** Os 10 arquivos somavam ~850+ linhas de código altamente duplicado. Agora cada arquivo tem ~20-30 linhas de configuração (~250 linhas no total), e a lógica compartilhada está centralizada no runner (~547 linhas). Redução líquida de ~600 linhas de código duplicado.

**Sugestão original:** Criar um test runner genérico que receba configuração do recurso (endpoint, payload template, campos), eliminando a necessidade de arquivos duplicados.

---

## 2. Problemas de Segurança

### 2.1 Credenciais de admin em texto plano — **RESOLVIDO (23/05/2026)**

**Severidade anterior:** 🔴 Alta

**Arquivos afetados originalmente:**
- `/load-tests/env-config.json` (credenciais: `admin` / `123456`)
- `/load-tests/helpers/config.js` (fallbacks: `ADMIN_PASSWORD || '123456'`)
- `/load-tests.yml` (CI) (credenciais: `admin` / `password123`)

**Problema original:** Credenciais de administrador hardcoded no código-fonte, no arquivo de configuração e no workflow CI. Havia **3 valores diferentes** de senha dependendo do local:
| Local | Username | Password |
|-------|----------|----------|
| `env-config.json` | `admin` | `123456` |
| `load-tests.yml` (CI) | `admin` | `password123` |
| Fallback em `config.js` | `admin` | `123456` |

**O que foi feito (23/05/2026):**
1. **`load-tests/env-config.json`**: Substituídos valores reais por `CHANGE_ME` para forçar falha se não configurado
2. **`load-tests/helpers/config.js`**: Fallback de `USERNAME` e `PASSWORD` alterado de `'admin'` / `'123456'` para `'CHANGE_ME'` / `'CHANGE_ME'`
3. **`load-tests.yml`**: Removidas senhas hardcoded; agora usa `${{ secrets.ADMIN_PASSWORD }}` e `${{ secrets.ADMIN_USERNAME || 'admin' }}`
4. **Documentação**: Este relatório atualizado com a resolução

---

### 2.2 Header `X-Forwarded-For` sendo usado para contornar rate limit — **RESOLVIDO (23/05/2026)**

**Severidade anterior:** ⚠️ Média

**Arquivos afetados anteriormente:** `ip-spoofing-test.js` e todos que usam `getRandomIP()` (ver seção 1.1)

**Problema original:** Os testes de carga deliberadamente falsificavam o header `X-Forwarded-For` para evitar rate limit. Isso era contraditório com o propósito do teste `ip-spoofing-test.js`, que supostamente validava que IPs falsificados são rejeitados.

**O que foi feito (23/05/2026):**
1. O `ip-spoofing-test.js` foi reescrito como **teste de vulnerabilidade (Opção A)**: verifica se o rate limit pode ser burlado via rotação do header `X-Forwarded-For`. Status esperado:
   - `429 (Too Many Requests)` → protegido (rate limit global ignorou IP falso)
   - `401 (Unauthorized)` → vulnerável (rate limit foi burlado)
2. Criado novo teste `ip-spoofing-deteccao-test.js` como **teste de proteção (Opção B)**: valida que o sistema detecta e rejeita ativamente requisições com headers falsificados. Status esperado:
   - `403 (Forbidden)` ou `400 (Bad Request)` → protegido (spoofing detectado e bloqueado)
   - `429 (Too Many Requests)` → protegido (rate limit global bloqueou)
   - `401 (Unauthorized)` → vulnerável (spoofing não foi detectado)
3. Ambos os testes agora usam os módulos compartilhados (`config.js`, `profiles.js`, `report.js`, `network.js`)
4. O perfil de carga utilizado é `rateLimit` do `helpers/profiles.js`
5. O `sleep()` foi removido para máxima taxa de requisições, consistente com propósito do teste

**Resultado:** Agora há dois testes com propósitos claros e não contraditórios:
- `ip-spoofing-test.js` — Testa se o sistema é vulnerável a evasão de rate limit via IP spoofing
- `ip-spoofing-deteccao-test.js` — Testa se o sistema detecta e bloqueia ativamente IPs falsificados

**Sugestão original:** Revisar a estratégia — ou o `X-Forwarded-For` é confiável (e não deve ser falsificado), ou não é (e deve ser tratado como vulnerabilidade).

---

### 2.3 Token JWT exposto em relatórios — **RESOLVIDO (23/05/2026)**

**Severidade anterior:** ⚠️ Média

**Arquivo:** `/load-tests/stress-test-combined.js` (linha 185-187)

**Problema original:** O único arquivo que ocultava o token JWT nos relatórios era o `stress-test-combined.js`. Nos demais testes, o token podia ser exposto nos relatórios de saída.

**O que foi feito (23/05/2026):**
1. **Abordagem mais eficiente:** Adicionada sanitização de token diretamente dentro da função `generateReport()` no módulo compartilhado `helpers/report.js` — isso corrige automaticamente todos os ~22 arquivos que usam esta função para gerar relatórios.
2. **Arquivos com sanitização manual refatorados:** `stress-test-combined.js`, `upload-flow.js` e `backup-verification-test.js` foram atualizados para usar `generateReport()` em vez de sanitização manual inline, eliminando código duplicado.
3. **Arquivos com `handleSummary()` próprio padronizados:** `video-validation-test.js`, `login-negative-test.js` e `musicas-search-test.js` foram atualizados para usar `generateReport()`, ganhando sanitização automática e padronização de saída.
4. **`helpers/resource-test-runner.js`:** A função `sanitizeToken(data)` exportada pelo runner continua disponível, mas agora a sanitização ocorre automaticamente via `generateReport()` — não sendo mais necessário chamá-la manualmente nos arquivos de teste.
5. **Import removido:** O import do `textSummary` manual foi removido dos arquivos que não precisam mais dele, sendo substituído pelo `generateReport()` do helper.

**Arquivos afetados:**
- `helpers/report.js` — Adicionada função interna `sanitizeToken()` chamada automaticamente dentro de `generateReport()`
- `stress-test-combined.js` — Refatorado para usar `generateReport()` (removeu `textSummary` manual)
- `upload-flow.js` — Refatorado para usar `generateReport()` (removeu sanitização inline)
- `backup-verification-test.js` — Refatorado para usar `generateReport()` (removeu sanitização inline)
- `video-validation-test.js` — Adicionado `generateReport()` (ganhou sanitização automática)
- `login-negative-test.js` — Adicionado `generateReport()` (padronização, sem token para ocultar)
- `musicas-search-test.js` — Adicionado `generateReport()` (padronização, sem token para ocultar)

**Resultado:** Todos os arquivos que geram relatórios agora sanitizam automaticamente o token JWT antes da exportação, sem necessidade de chamada manual em cada teste.

---

## 3. Problemas de Performance

### 3.1 Thresholds inconsistentes entre testes similares — **RESOLVIDO (23/05/2026)**

**Severidade anterior:** ⚠️ Média

**Arquivos afetados originalmente:** Múltiplos

**Problema original:** Thresholds de performance variavam sem justificativa clara:

| Teste | Threshold | Arquivo |
|-------|-----------|---------|
| `musicas-load-test` | p(95) < 300ms | `/load-tests/musicas-load-test.js` |
| `videos-load-test` | p(95) < 300ms | `/load-tests/videos-load-test.js` |
| `authenticated-flow` | p(95) < 1000ms | `/load-tests/authenticated-flow.js` |
| `musicas-crud-test` | p(95) < 500ms | `/load-tests/musicas-crud-test.js` |
| `videos-crud-test` | p(95) < 500ms | `/load-tests/videos-crud-test.js` |
| `health-check` | p(95) < 100ms | `/load-tests/health-check.js` |

**O que foi feito (23/05/2026):**
1. Criado módulo compartilhado `load-tests/helpers/profiles.js` com perfis de carga padronizados
2. Estabelecidos SLAs consistentes por tipo de operação:
   - **Health check** (`health`): p(95) < 100ms
   - **Consultas leves** (`light`): 1 VU, p(95) < 500ms, checks rate==1.0
   - **Carga média** (`medium`): 5 VUs, p(95) < 300ms, failed < 1%
   - **Carga pesada** (`heavy`): 50 VUs, p(95) < 2000ms, failed < 5%
   - **Recuperação** (`recovery`): 1 VU, 2min, sem thresholds fixos
   - **Rate limit** (`rateLimit`): ramp 0→50 VUs, sem thresholds fixos
3. Todos os 28 scripts foram atualizados para usar `getProfile()` com o perfil adequado
4. Cada script pode sobrescrever thresholds específicos via `getProfile('nome', { thresholds: {...} })`

**Sugestão original:** Estabelecer SLAs consistentes por tipo de operação e documentá-los.

---

### 3.2 Uso de `sleep()` fixo entre requisições

**Severidade:** 🟢 Baixa

**Arquivos afetados:** Todos que usam `sleep(1)`, `sleep(2)`, `sleep(0.5)`

**Problema:** O `sleep()` com valor fixo não simula comportamento real de usuário. Em produção, usuários têm tempos de pensamento e ação variáveis.

**Sugestão:** Usar `sleep(random(0.5, 3))` para simular comportamento mais realista, ou usar a biblioteca `k6` com distribuições estatísticas (`k6/execution`, `k6/data`).

> **Status:** Não resolvido — requer implementação de randomização nos scripts. Os arquivos `ddos-search-test.js` e `rate-limit-test.js` devem permanecer sem sleep por propósito de teste.

---

### 3.3 Verificação de health check duplicada em `setup()`

**Severidade:** 🟢 Baixa

**Arquivos afetados:** `/load-tests/authenticated-flow.js` (linha ~14), `/load-tests/musicas-load-test.js`

**Problema:** Alguns scripts fazem health check desnecessário no `setup()` antes do login, adicionando latência ao teste e consumindo recursos do servidor.

**Sugestão:** Remover health checks de `setup()` em testes que não testam especificamente health check. O k6 já reporta falhas se o servidor estiver indisponível.

---

## 4. Inconsistências e Padrões

### 4.1 Rotas sem versionamento (/api vs /api/v1) — **RESOLVIDO (13/05/2026)**

**Severidade anterior:** ⚠️ Média

**Arquivos afetados:** Múltiplos

**Problema anterior:** Mistura de rotas com e sem prefixo de versão.

**O que foi feito (13/05/2026):**
- Estratégia definida: adotar **apenas endpoints sem versão** (padrão)
- O diretório `/pages/api/v1/` foi **removido** do projeto
- Os endpoints foram migrados para rotas sem versão:
  - `/api/v1/status` → `/api/status`
  - `/api/v1/auth/check` → `/api/auth/check`
  - `/api/v1/auth/login` → `/api/auth/login?response=body`
  - `/api/v1/health` → `/api/status?mode=health`
- Todos os load tests foram atualizados para usar as novas rotas via comandos sed
- Testes unitários e de integração também foram atualizados
- Documentação (`lib/auth.js`) atualizada — referências ao v1 removidas

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

### 4.3 Configuração de carga inconsistente entre testes — **RESOLVIDO (23/05/2026)**

**Severidade anterior:** ⚠️ Média

**Problema original:** Cada teste definia sua própria configuração de carga (VUs, duração, estágios) sem uma estratégia clara:

| Teste | VUs | Duração | Threshold |
|-------|-----|---------|-----------|
| `musicas-load-test` | 5 | 20s | p(95) < 300ms |
| `videos-load-test` | 5 | 20s | p(95) < 300ms |
| `authenticated-flow` | 5 | 35s | p(95) < 1000ms |
| `health-check` | 20 | 50s | p(95) < 100ms |
| `stress-test-combined` | 100 | 4m50s | p(95) < 500ms |
| `ddos-search-test` | 15 | 3min | p(95) < 2000ms |
| `rate-limit-test` | 50 | - | - |

**O que foi feito (23/05/2026):**
1. Definida matriz de perfis de carga em `load-tests/helpers/profiles.js`:
   - `light`: 1 VU, 5 iterações (testes funcionais)
   - `medium`: 5 VUs, estágios 5s/10s/5s (carga moderada)
   - `heavy`: 50 VUs, estágios 10s/30s/10s (estresse)
   - `health`: 20 VUs, estágios 5s/10s/5s (SLA rigoroso)
   - `recovery`: 1 VU constante por 2min (monitoramento)
   - `rateLimit`: ramp-up 0→20→50 VUs (brute force)
2. Todos os testes referenciam `getProfile()` em vez de definir configurações inline

**Sugestão original:** Definir uma matriz de perfis de carga (leve, médio, pesado) e referenciá-los nos testes, em vez de cada um definir seus próprios parâmetros.

---

### 4.4 Ausência de testes de `teardown` na maioria dos arquivos

**Severidade:** ⚠️ Média

**Arquivos afetados:** Quase todos, exceto `stress-test-combined.js`

**Problema:** O `stress-test-combined.js` é o único que implementa `teardown()` para limpar dados de teste criados. Os demais testes CRUD criam dados que podem poluir o banco de dados.

**Sugestão:** Adicionar função `teardown()` em testes que criam dados (CRUD, criação de posts, upload, etc.) para remover os registros de teste após a execução.

---

## 5. Melhorias de Manutenibilidade

### 5.1 Arquivo `env-config.json` subutilizado — **RESOLVIDO (23/05/2026)**

**Severidade anterior:** 🟢 Baixa

**Arquivo:** `/load-tests/env-config.json`

**Problema original:** O arquivo `env-config.json` definia as configurações de ambiente, mas cada script k6 lia diretamente do `__ENV` com fallbacks inline. O JSON não era importado por nenhum script de forma padronizada.

**O que foi feito (23/05/2026):**
1. Criado módulo `load-tests/helpers/config.js` que centraliza a leitura de configuração
2. O módulo tenta ler `__ENV` e exporta constantes pré-resolvidas
3. Todos os scripts agora importam `BASE_URL`, `USERNAME` e `PASSWORD` de `./helpers/config.js`
4. Fallback permanece com valores default (para ambiente local) mas centralizado

**Sugestão original:** Criar um módulo `load-tests/helpers/config.js` que:
1. Tenta ler `__ENV.CONFIG_FILE` e carregar o JSON
2. Faz fallback para `__ENV`
3. Exporta objeto de configuração padronizado

---

### 5.2 Ausência de tratamento de erros na extração de token — **RESOLVIDO (23/05/2026)**

**Severidade anterior:** ⚠️ Média

**Arquivos afetados originalmente:** Todos que fazem login

**Problema original:** A extração do token assumia que a estrutura da resposta seria sempre `data.token`:

```javascript
return { token: loginRes.json('data.token') };
```

Se a API mudar a estrutura da resposta, o erro será silencioso (token `undefined`) e o teste falhará com mensagem confusa.

**O que foi feito (23/05/2026):**
1. O módulo `load-tests/helpers/auth.js` agora valida a estrutura da resposta antes de extrair o token:
2. Lança erro descritivo se `body`, `body.data` ou `body.data.token` não existirem
3. Verifica se `loginRes.status` é 200 antes de tentar parsear a resposta

**Sugestão original:** Validar a estrutura da resposta antes de extrair o token e lançar erro descritivo:

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

### 5.4 Uso de versão hardcoded do k6-summary — **RESOLVIDO (23/05/2026)**

**Severidade anterior:** 🟢 Baixa

**Arquivos afetados originalmente:** Todos que usam `handleSummary()`

**Problema original:** A URL do `textSummary` estava hardcoded com versão específica:

```javascript
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
```

**O que foi feito (23/05/2026):**
1. O módulo `load-tests/helpers/report.js` importa de `https://jslib.k6.io/k6-summary/latest/index.js`
2. Todos os arquivos que usavam `handleSummary()` agora importam via `generateReport()` do módulo compartilhado
3. A URL com versão fixa foi removida de todos os 28 scripts

**Sugestão original:** Usar a URL sem versão ou versionamento semântico para receber atualizações automáticas.

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

### 6.4 Senha diferente entre configurações — **RESOLVIDO (23/05/2026)**

**Severidade anterior:** ⚠️ Média

**Problema original:** Havia **3 valores diferentes** de senha dependendo do local, que podiam causar falhas se o desenvolvedor tentasse rodar os testes localmente com valores diferentes.

**Status:** Resolvido juntamente com a seção [2.1 Credenciais de admin em texto plano](#21-credenciais-de-admin-em-texto-plano---resolvido-23052026). Consulte aquela seção para detalhes completos.

---

## 7. Matriz de Prioridades

| Prioridade | Categoria | Descrição | Esforço | Impacto | Status |
|-----------|-----------|-----------|---------|---------|--------|
| 🔴 **Crítica** | Duplicidade | Lógica de login duplicada em 18+ arquivos | Médio | Muito Alto | ✅ Resolvido (23/05/2026) |
| 🔴 **Crítica** | Duplicidade | `handleSummary()` duplicado em múltiplos arquivos | Baixo | Alto | ✅ Resolvido (23/05/2026) |
| 🔴 **Crítica** | Segurança | Credenciais hardcoded em texto plano | Baixo | Alto | ✅ Resolvido (23/05/2026) |
| ⚠️ **Alta** | Duplicidade | Função `getRandomIP()` duplicada | Baixo | Médio | ✅ Resolvido (23/05/2026) |
| ⚠️ **Alta** | Duplicidade | Configuração de ambiente duplicada | Baixo | Médio | ✅ Resolvido (23/05/2026) |
| ⚠️ **Alta** | Segurança | Header `X-Forwarded-For` usado para burlar rate limit | Médio | Alto | ✅ Resolvido (23/05/2026) |
| ⚠️ **Alta** | CI/CD | Workflow executa apenas 1 dos 28 testes | Alto | Muito Alto | ❌ Pendente |
| ⚠️ **Alta** | Performance | Thresholds inconsistentes entre testes similares | Médio | Médio | ✅ Resolvido (23/05/2026) |
| ⚠️ **Alta** | Manutenção | Rotas sem versionamento consistente (`/api` vs `/api/v1`) | Baixo | Médio | ✅ Resolvido (13/05/2026) |
| ⚠️ **Alta** | CI/CD | Senhas diferentes entre env-config.json e CI | Baixo | Alto | ✅ Resolvido (23/05/2026) |
| ⚠️ **Alta** | Manutenção | Ausência de `teardown()` na maioria dos testes | Médio | Médio | ❌ Pendente |
| ⚠️ **Alta** | Segurança | Token JWT exposto em relatórios | Baixo | Médio | ✅ Resolvido (23/05/2026) |
| ⚠️ **Média** | Manutenção | Configuração de carga inconsistente entre testes | Alto | Médio | ✅ Resolvido (23/05/2026) |
| ⚠️ **Média** | Duplicidade | Estruturas CRUD músicas/vídeos quase idênticas | Alto | Alto | ✅ Resolvido (23/05/2026) |
| 🟢 **Baixa** | Performance | `sleep()` fixo não simula comportamento real | Baixo | Baixo | ❌ Pendente |
| 🟢 **Baixa** | Performance | Health check duplicado em `setup()` | Baixo | Baixo | ❌ Pendente |
| 🟢 **Baixa** | Manutenção | Nomenclatura inconsistente de arquivos | Médio | Baixo | ❌ Pendente |
| 🟢 **Baixa** | Manutenção | `env-config.json` subutilizado | Baixo | Médio | ✅ Resolvido (23/05/2026) |
| 🟢 **Baixa** | Manutenção | Separação difusa entre testes funcionais e de carga | Médio | Baixo | ❌ Pendente |
| 🟢 **Baixa** | Manutenção | Versão hardcoded do k6-summary | Baixo | Baixo | ✅ Resolvido (23/05/2026) |
| 🟢 **Baixa** | Manutenção | Comportamento "soft pass" em validações | Baixo | Baixo | ❌ Pendente |
| 🟢 **Baixa** | Manutenção | Ausência de tratamento de erros na extração de token | Baixo | Médio | ✅ Resolvido (23/05/2026) |

> **Legenda:**
> - ✅ **Resolvido** — Problema corrigido e validado
> - ❌ **Pendente** — Problema identificado mas ainda não corrigido

### Benefícios das Ações Realizadas (23/05/2026)

1. **Módulo de autenticação compartilhado**: Redução de ~90% de código duplicado relacionado a login
2. **Módulo de configuração centralizado**: Facilidade para adicionar novas variáveis de ambiente
3. **Módulo de relatórios padronizado**: Consistência na geração de relatórios e sanitização de dados sensíveis
4. **Módulo de perfis de carga**: Thresholds consistentes e matriz de perfis reutilizável
5. **Validação de token robusta**: Erro descritivo se estrutura da resposta mudar
6. **Versionamento do k6-summary atualizado**: Importa `latest` em vez de versão fixa

### Benefícios das Ações Sugeridas (Pendentes)

1. **Reorganização em subpastas**: Clareza sobre o propósito de cada teste (performance vs funcional vs segurança)
2. **Workflow CI expandido**: Cobertura completa de testes em CI, não apenas o stress test combinado
3. **Test runner genérico para CRUD**: Eliminação de ~50% de código duplicado entre testes de músicas e vídeos
4. **Segurança**: Remoção de credenciais hardcoded, sanitização de tokens em relatórios

---

> **Data da análise:** 10/05/2026
> **Última atualização:** 23/05/2026
> **Status:** Correções parciais aplicadas — ver coluna "Status" na matriz de prioridades