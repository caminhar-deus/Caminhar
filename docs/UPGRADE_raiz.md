# Documento de Melhorias — Arquivos da Raiz do Projeto (`/`)

## Visão Geral

Este documento lista correções possíveis, ajustes estruturais, melhorias de manutenção/performance e pontos de atenção identificados nos arquivos da raiz do projeto, em `/home/qa/Projeto/Caminhar/`. Nenhuma alteração foi aplicada — apenas levantamento analítico.

---

## 1. `package.json`

### 🟡 Descrição do projeto vazia
O campo `"description": ""` está vazio. Embora não impacte o funcionamento, preencher com uma descrição como `"Plataforma web de conteúdo católico com Next.js"` melhora a apresentação em ferramentas que leem o package.json.

### 🟡 Campo `author` vazio
O campo `"author": ""` está vazio. Recomenda-se preencher com o nome do mantenedor ou organização.

### 🟡 Scripts muito numerosos (88 scripts)
Há 88 scripts no `package.json`. Scripts de teste de carga individuais (34 variações) poderiam ser parcialmente centralizados em um orquestrador, reduzindo poluição.

### 🟡 `overrides` sem comentários
Os overrides para `tar`, `glob`, `minimatch`, `postcss`, `uuid`, `whatwg-encoding` não possuem comentários explicando o motivo de cada override (ex.: segurança, compatibilidade).

---

## 2. `next.config.js`

### 🟡 HSTS sem `preload`
O HSTS está configurado com `max-age=31536000; includeSubDomains`, mas sem a diretiva `preload`. Para máxima segurança, considerar adicionar `preload`.

### 🟡 CORS genérico para toda a API
O CORS permite origens listadas em `ALLOWED_ORIGINS` para todas as rotas `/api/:path*`. Seria mais seguro definir origens específicas por endpoint.

---

## 3. `next-sitemap.config.js`

### 🟡 Duplicidade de configuração de frequência/prioridade
`changefreq` e `priority` são definidos tanto no objeto raiz quanto na função `transform`. A função `transform` sobrescreve os valores do objeto raiz, criando duas fontes de verdade.

### 🟡 Queries ao banco sem notificação em falha
O bloco `additionalPaths` faz queries no banco com try/catch, mas apenas loga o erro. Sem notificação, falhas de conexão passam despercebidas.

---

## 4. `proxy.js`

### 🔴 Nome do arquivo inconsistente com a convenção
O arquivo se chama `proxy.js`, mas o Next.js Middleware tradicionalmente usa `middleware.js`. O `config.matcher` no final sugere que é usado como middleware, mas o nome diferente pode fazer com que não seja reconhecido. **Verificar se o Next.js está invocando este arquivo corretamente.**

### 🟡 Falta de suporte a WebSocket
O rate limit não cobre conexões WebSocket. Se o projeto vier a usar WebSockets, será necessário estender a proteção.

### 🟡 Logging sem nível de severidade configurável
`console.warn` é fixo. Um sistema de logging com níveis configuráveis (`LOG_LEVEL`) melhoraria o controle em produção.

---

## 5. `.env` e `.env.example`

### 🔴 Senhas e tokens hardcoded no `.env`
O `.env` contém senhas reais (`123456`), chave JWT fixa, chave de criptografia fixa e token Upstash real. Risco de exposição acidental. Recomenda-se usar placeholders e gerenciar valores reais via secrets.

### 🟡 `.env` com permissão de execução
O `.env` tem permissão `-rwxrwxr-x` (executável). Deveria ser `chmod 600 .env` por segurança.

### 🔴 `.env.example` idêntico ao `.env`
O `.env.example` é uma cópia exata do `.env` com valores reais. Deveria conter apenas placeholders (ex.: `JWT_SECRET="sua-chave-aqui"`).

---

## 6. `jest.config.js`

### 🟡 `maxWorkers: 1` como gargalo
Torna a execução estritamente sequencial. Em CI com mais núcleos, aumentar para `maxWorkers: 2` ou `'50%'` reduziria o tempo de execução.

### 🟡 `transformIgnorePatterns` com muitos pacotes
A lista de exclusão pode crescer conforme novas dependências ESM são adicionadas, tornando a manutenção custosa.

---

## 7. `jest.config.db.js`

### 🟡 Duplicação com `jest.config.js`
Repete o mesmo `moduleNameMapper`, `transform` e `transformIgnorePatterns`. Uma abordagem com composição/herança de configuração reduziria duplicidade.

---

## 8. `jest.teardown.js`

### 🟡 Aguardo fixo de 1 segundo
`await new Promise(resolve => setTimeout(resolve, 1000))` é um timeout fixo. Idealmente, deveria aguardar ativamente eventos de `close` ou `end` das conexões.


---

## 9. `eslint.config.js`

### 🟡 Regra `react/prop-types` desligada globalmente para JSX
`"react/prop-types": "off"` está aplicado para todos os arquivos JSX. Se o projeto evoluir para usar PropTypes, essa regra precisará ser reativada.

### 🟡 Regras CSS desativadas globalmente
`css/no-invalid-properties`, `css/use-baseline` e `css/no-important` estão desligados. Pode permitir CSS de baixa qualidade sem alertas.

---

## 10. `schema.knip.json`

### 🟡 Arquivo muito grande na raiz (986 linhas)
Schema de validação do Knip embutido localmente. Recomenda-se substituir pela referência ao schema oficial online (`https://json.schemastore.org/knip.json`).

---

## 11. `skills-lock.json`

### 🟡 Arquivo muito grande na raiz (~945 linhas)
Lockfile de skills de IA. Recomenda-se mover para um diretório como `.agents/` ou `config/`.

---

## 12. `tree.txt`

### 🟡 Snapshot estático desatualizado
1151 linhas com estrutura de diretórios que tende a desatualizar. Recomenda-se remover ou adicionar script para gerá-lo dinamicamente (`npm run generate-tree`).

---

## 13. `ci.yml`

### 🟡 Workflow muito simples, sem cache
Executa apenas checkout, setup e testes, sem cache de dependências. Os outros workflows têm estruturas mais completas com cache.

---

## 14. `pr-coverage.yml`

### 🟡 Nome do job enganoso
O nome é `"Enforce >20% Test Coverage (Baseline)"`, mas o threshold real no `jest.config.js` é de 80%/85%/90%/90%. O nome pode induzir a erro.

---

## 15. `load-tests.yml` e `security-tests.yml`

### 🟡 Duplicação de configuração entre workflows
Blocos quase idênticos de serviços PostgreSQL/Redis, steps de setup, build e start da aplicação aparecem em 3 workflows. Poderiam ser extraídos para uma Composite Action reutilizável.

### 🟡 Duplicidade de health checks do PostgreSQL
`--health-cmd pg_isready`, `--health-interval 10s`, `--health-timeout 5s`, `--health-retries 5` aparecem identicamente em 3 workflows.

### 🟡 Duplicidade de health checks do Redis
`--health-cmd "redis-cli ping"`, `--health-interval 10s`, `--health-timeout 5s`, `--health-retries 5` aparecem identicamente em 3 workflows.

---

## 16. `GEMINI.md`

### 🟡 Caminhos relativos podem quebrar
O arquivo referencia `.agents/skills/...` que funcionam quando o diretório de trabalho é a raiz, mas podem falhar se o assistente for invocado de outro diretório.

---

## 17. Pontos de Atenção Técnicos

### 🔴 Nome do Middleware (`proxy.js`)
O arquivo `proxy.js` não segue a convenção `middleware.js` do Next.js. É urgente verificar se o Next.js está reconhecendo e executando este arquivo como middleware. Caso contrário, o rate limiting não está ativo.

### 🔴 Arquivos `.env` com credenciais reais
Qualquer commit acidental do `.env` expõe toda a infraestrutura. Configurar um hook de pre-commit que bloqueie arquivos `.env` é recomendado.

### 🟡 Proliferação de arquivos grandes na raiz
`schema.knip.json` (986 linhas), `skills-lock.json` (945 linhas), `tree.txt` (1151 linhas) e `package-lock.json` (~15k linhas) poluem a raiz. Manter a raiz enxuta melhora a navegabilidade.

---

## Resumo das Melhorias Identificadas

| Prioridade | Arquivo | Problema | Sugestão |
|------------|---------|----------|----------|
| 🔴 Alta | `proxy.js` | Nome inconsistente com Next.js | Renomear para `middleware.js` ou verificar |
| 🔴 Alta | `.env.example` | Contém valores reais | Substituir por placeholders |
| 🔴 Alta | `.env` | Credenciais em texto claro | Usar placeholders + secrets |
| 🟡 Média | `jest.config.js` | `maxWorkers: 1` lento | Avaliar `maxWorkers: '50%'` |
| 🟡 Média | `jest.config.db.js` | Duplicação com `jest.config.js` | Usar composição de configs |
| 🟡 Média | `jest.teardown.js` | Timeout fixo de 1s | Aguardar eventos de close |
| 🟡 Média | `schema.knip.json` | 986 linhas na raiz | Referenciar schema oficial |
| 🟡 Média | `skills-lock.json` | ~945 linhas na raiz | Mover para `.agents/` |
| 🟡 Média | `tree.txt` | Snapshot estático desatualizado | Remover ou gerar dinamicamente |
| 🟡 Média | Workflows YML | Duplicação de blocos (3x) | Extrair para Composite Action |
| 🟡 Média | `eslint.config.js` | Regras CSS desligadas | Revisar desativação |
| 🟡 Média | `next-sitemap.config.js` | Duplicidade changefreq/priority | Simplificar |
| 🟡 Média | `pr-coverage.yml` | Nome do job enganoso | Corrigir nome |
| 🟡 Média | `package.json` | Campos vazios | Preencher description/author |
| 🟢 Leve | `next.config.js` | HSTS sem `preload` | Adicionar diretiva |
| 🟢 Leve | `ci.yml` | Sem cache de dependências | Adicionar cache npm |

