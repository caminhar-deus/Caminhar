# Estratégia de Testes - O Caminhar com Deus

## Visão Geral

Este documento descreve a estratégia de testes do projeto, abrangendo testes unitários, de integração, end-to-end e de carga. A abordagem garante qualidade, confiabilidade e performance da aplicação.

## Tipos de Testes

### 1. Testes Unitários (Jest)

**Objetivo**: Testar componentes e funções isoladamente.

**Localização**: Arquivos `*.test.js` e pasta `__tests__/`

**Comandos**:
```bash
npm test                    # Executa todos os testes
npm run test:watch          # Modo observação
npm run test:coverage       # Com cobertura de código
```

**Cobertura**:
- Componentes React
- Funções de utilidade
- Lógica de negócio
- Validação de dados (zod)
- Hooks personalizados

### 2. Testes de Integração

**Objetivo**: Validar integração entre módulos e serviços externos.

**Principais áreas**:
- APIs RESTful
- Banco de dados PostgreSQL
- Sistema de cache Redis
- Autenticação JWT
- Upload de arquivos

**Comandos**:
```bash
npm test integration
```

### 3. Testes End-to-End (Cypress)

**Objetivo**: Simular fluxos completos de usuário.

**Principais fluxos**:
- Autenticação completa
- Gerenciamento de posts
- Upload de imagens
- Navegação entre páginas

**Comandos**:
```bash
npm run cypress:open        # Modo interativo
npm run cypress:run         # Modo headless
```

### 4. Testes de Carga (k6)

**Objetivo**: Validar performance sob estresse.

**Cenários disponíveis**:
```bash
npm run test:load           # Health check básico
npm run test:load:auth      # Fluxo autenticado
npm run test:load:write     # Criação de posts
npm run test:load:stress    # Estresse combinado
npm run test:load:cache     # Sistema de cache
npm run test:load:ratelimit # Rate limiting
```

## Configuração de Ambiente

### Variáveis de Teste

Arquivo `.env.test`:
```env
# Banco de Dados
TEST_DB_HOST=localhost
TEST_DB_PORT=5433
TEST_DB_NAME=caminhar_test
TEST_DB_USER=test_user
TEST_DB_PASS=test_password

# Redis
TEST_REDIS_URL=redis://localhost:6380

# Autenticação
TEST_JWT_SECRET=test-secret
TEST_ADMIN_PASSWORD=test123

# Configurações
TEST_TIMEOUT=30000
TEST_DEBUG=true
```

### Setup de Banco de Dados

```bash
# Configurar banco de teste
npm run setup:test-db

# Limpar dados de teste
npm run clean:load-posts
```

## Estrutura de Testes

```
__tests__/
├── auth.test.js           # Autenticação
├── db.test.js            # Banco de dados
├── api/                  # APIs RESTful
│   ├── posts.test.js
│   ├── musicas.test.js
│   └── videos.test.js
├── components/           # Componentes React
│   ├── ContentTabs.test.js
│   └── PostCard.test.js
└── integration/          # Testes de integração

cypress/
├── e2e/                  # Testes end-to-end
│   ├── auth.cy.js
│   ├── posts.cy.js
│   └── upload.cy.js
└── support/              # Configurações Cypress

load-tests/               # Testes de carga k6
├── health-check.js
├── auth-flow.js
├── write-flow.js
└── stress-test-combined.js
```

## Cobertura de Código

**Objetivo**: >90% de cobertura

**Configuração**:
```json
{
  "coverageThreshold": {
    "global": {
      "branches": 90,
      "functions": 90,
      "lines": 90,
      "statements": 90
    }
  }
}
```

**Relatórios**:
```bash
npm run test:coverage:report  # Gerar relatório HTML
open coverage/lcov-report/index.html
```

## CI/CD

### Pipeline GitHub Actions

```yaml
name: Testes
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: caminhar_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
      redis:
        image: redis:7-alpine
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

## Performance e Segurança

### Testes de Performance

```bash
npm run test:performance  # Lighthouse
npm run test:load:stress  # k6 stress test
```

### Testes de Segurança

```bash
npm run test:security     # npm audit
npm run test:accessibility # Acessibilidade
```

## Boas Práticas

### 1. Organização de Testes

- Nomear arquivos com `.test.js`
- Agrupar testes por funcionalidade
- Usar `describe` para organizar blocos de testes
- Manter testes independentes

### 2. Mocks e Stubs

```javascript
// Mocks globais em jest.setup.js
jest.mock('pg');
jest.mock('redis');
jest.mock('bcrypt');

// Mocks específicos por teste
beforeEach(() => {
  jest.clearAllMocks();
});
```

### 3. Dados de Teste

```javascript
// Factories para criação de dados
const createPost = (overrides = {}) => ({
  title: 'Test Post',
  content: 'Test Content',
  published: true,
  ...overrides
});
```

### 4. Testes Assíncronos

```javascript
test('should handle async operations', async () => {
  const result = await api.getData();
  expect(result).toBeDefined();
});
```

## Solução de Problemas

### Erros Comuns

**Conexão com banco de dados**:
```bash
# Verificar se o banco está rodando
psql -h localhost -U test_user caminhar_test
```

**Testes de carga falhando**:
```bash
# Verificar se o servidor está rodando
npm run dev
```

**Cobertura baixa**:
```bash
# Verificar relatório detalhado
npm run test:coverage
```

### Debug

```bash
# Modo debug
DEBUG=test npm test

# Testes específicos
npm test auth.test.js

# Verbose output
npm test -- --verbose
```

## Métricas de Qualidade

### Cobertura Atual
- **Componentes**: 100%
- **APIs**: 100%
- **Middleware**: 100%
- **Autenticação**: 100%

### Performance
- **Tempo de execução**: ~15s (todos os testes)
- **Taxa de erros**: 0.00%
- **Tempo de resposta**: <500ms (p95)

## Atualizações Recentes

### v1.7.0
- ✅ Migração para ES modules
- ✅ Testes de ContentTabs
- ✅ Integração Spotify/YouTube
- ✅ Sistema de cache
- ✅ Testes de carga otimizados

### v1.6.0
- ✅ Testes de upload de imagens
- ✅ Sistema de backup
- ✅ API RESTful v1.4.0
- ✅ Testes de segurança

## Conclusão

A estratégia de testes garante:
- **Qualidade**: Cobertura >90% e validação rigorosa
- **Performance**: Testes de carga e monitoramento
- **Segurança**: Validação de vulnerabilidades
- **Confiança**: CI/CD automatizado e confiável

Para dúvidas ou contribuições, consulte a documentação ou abra uma issue no repositório.