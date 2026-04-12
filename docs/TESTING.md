# Diretrizes de Testes

## Visão Geral

Este documento descreve a estratégia de testes do projeto, cobrindo desde testes unitários até testes de carga, e como executá-los.

## Stack de Testes

- **Jest & React Testing Library:** Para testes unitários, de componentes e de integração.
- **Cypress:** Para testes End-to-End (E2E) que simulam a jornada do usuário.
- **k6 (Grafana):** Para testes de carga, estresse e performance da API.

## Como Executar os Testes

### Testes Unitários e de Integração (Jest)

- **Executar todos os testes:**
  ```bash
  npm test
  ```

- **Executar um arquivo de teste específico:**
  ```bash
  npm test tests/caminho/para/o/arquivo.test.js
  ```

- **Executar testes com relatório de cobertura:**
  ```bash
  npm test -- --coverage
  ```

### Testes End-to-End (Cypress)

- **Abrir a interface do Cypress (modo interativo):**
  ```bash
  npm run test:e2e
  ```

- **Executar testes E2E em modo headless (terminal):**
  ```bash
  npm run test:e2e:run
  ```

### Testes de Carga (k6)

- **Executar um cenário de teste de carga específico:**
  ```bash
  # Exemplo: Teste de estresse na busca
  npm run test:load:stress
  
  # Exemplo: Teste de performance do cache
  npm run test:load:cache
  ```

## Tipos de Teste

### 1. Testes Unitários e de Integração (Jest)
- **Localização:** `/tests/unit` e `/tests/integration`.
- **Objetivo:** Validar a lógica de negócio em funções isoladas (unitários) e o comportamento de endpoints da API (integração), mockando dependências externas como o banco de dados.

### 2. Testes End-to-End (Cypress)
- **Localização:** `/cypress/e2e`.
- **Objetivo:** Simular fluxos completos do usuário em um navegador real, como o processo de login, criação de um post ou navegação pelo painel administrativo.

### 3. Testes de Carga e Performance (k6)
- **Localização:** `/load-tests`.
- **Objetivo:** Garantir que a aplicação seja performática e resiliente sob estresse, simulando picos de tráfego e medindo tempos de resposta e taxas de erro.

## Ambiente de Testes e CI/CD

### Ambiente Local
- Para rodar testes de integração localmente, é necessário ter **Docker** com contêineres de **PostgreSQL** e **Redis** em execução.
- Configure as variáveis de ambiente para testes em um arquivo `.env.test.local` (ou similar), seguindo o exemplo do `.env.example`.

### Integração Contínua (GitHub Actions)
- **`pr-coverage.yml`**: Este workflow é acionado a cada Pull Request. Ele executa a suíte de testes do Jest e bloqueia o PR se os testes falharem ou se a cobertura de código cair abaixo do limite estabelecido (atualmente 20%).
- **`load-tests.yml`**: Executa os testes de carga do k6 diariamente para monitorar a performance da aplicação ao longo do tempo.

> **⚠️ Aviso Importante:** Relatórios e logs gerados localmente (ex: `/reports/k6-summaries/`) **não devem ser commitados** no repositório.


--- 

## Conteúdo migrado de /tests/README.md

# Test Suite Architecture

Arquitetura de testes completa para o projeto "O Caminhar com Deus" usando Jest e React Testing Library.

## 📁 Estrutura

```
tests/
├── setup.js              # Configuração centralizada
├── factories/            # Geradores de dados de teste
├── helpers/              # Utilitários para testes
├── mocks/                # Mocks reutilizáveis
├── matchers/             # Matchers customizados Jest
└── examples/             # Exemplos de uso
```

## 🚀 Uso Rápido

### Teste de API

```javascript
import { postFactory, createPostInput } from '../factories/post.js';
import { createPostRequest, expectStatus, expectJson } from '../helpers/api.js';
import { mockAuthenticatedAdmin } from '../helpers/auth.js';

describe('API Posts', () => {
  it('deve criar post', async () => {
    const { headers } = mockAuthenticatedAdmin();
    const postData = createPostInput({ title: 'Novo Post' });
    const { req, res } = createPostRequest(postData, headers);
    
    await handler(req, res);
    
    expect(res).toHaveStatus(201);
    expect(res).toBeValidJSON({ title: 'Novo Post' });
  });
});
```

### Teste de Componente

```javascript
import { postFactory } from '../factories/post.js';
import { renderWithProviders, fillForm } from '../helpers/render.js';

describe('PostList', () => {
  it('deve renderizar posts', () => {
    const posts = postFactory.list(3);
    renderWithProviders(<PostList posts={posts} />);
    
    posts.forEach(post => {
      expect(screen.getByText(post.title)).toBeInTheDocument();
    });
  });
});
```

## 📦 Factories

Geram dados de teste consistentes.

```javascript
// Post Factory
import { postFactory } from '../factories/post.js';

const post = postFactory();                    // Post padrão
const post = postFactory({ title: 'Custom' });  // Com overrides
const posts = postFactory.list(5);             // Lista de 5 posts
const draft = draftPostFactory();                // Rascunho

// Music Factory
import { musicFactory } from '../factories/music.js';

const music = musicFactory();
const music = musicFactory({ url_spotify: 'https://...' });
const unpublished = unpublishedMusicFactory();

// Video Factory
import { videoFactory } from '../factories/video.js';

const video = videoFactory();
const video = embeddableVideoFactory();          // Com URL embed

// User Factory
import { userFactory, adminFactory } from '../factories/user.js';

const user = userFactory();
const admin = adminFactory();
const user = await userFactory.withHash({ password: '123' });
```

## 🔧 Helpers

### API Helpers

```javascript
import {
  createApiMocks,           // Cria req/res mock
  createGetRequest,         // GET request
  createPostRequest,        // POST request
  createPutRequest,         // PUT request
  createDeleteRequest,      // DELETE request
  expectStatus,             // Verifica status
  expectJson,               // Verifica JSON
  expectArray,              // Verifica array
  expectError,              // Verifica erro
  expectPaginatedResponse,  // Verifica paginação
  executeHandler,           // Executa handler
} from '../helpers/api.js';
```

### Render Helpers

```javascript
import {
  renderWithProviders,      // Render com providers
  renderWithRouter,         // Com router mock
  renderWithAuth,           // Com auth mock
  renderWithToast,          // Com toast provider
  fillForm,                 // Preenche formulário
  setMobileViewport,        // Viewport mobile
  setDesktopViewport,       // Viewport desktop
} from '../helpers/render.js';
```

### Auth Helpers

```javascript
import {
  createAuthToken,          // Cria JWT
  createExpiredToken,       // Token expirado
  mockAuthenticatedUser,    // Mock usuário
  mockAuthenticatedAdmin,   // Mock admin
  hashPassword,             // Hash de senha
  mockAuthLib,              // Mock completo auth
} from '../helpers/auth.js';
```

## 🎭 Mocks

### Next.js Mocks

```javascript
import {
  mockUseRouter,            // Mock useRouter
  mockNextImage,            // Mock Image
  mockNextLink,             // Mock Link
  setupNextMocks,           // Configura todos
} from '../mocks/next.js';

// Uso
jest.mock('next/router', () => ({
  useRouter: () => mockUseRouter({ pathname: '/admin' }),
}));
```

### Fetch Mocks

```javascript
import {
  mockFetch,                // Mock básico
  mockFetchSuccess,         // Sucesso
  mockFetchError,           // Erro
  mockFetchNotFound,        // 404
  mockFetchUnauthorized,    // 401
  mockFetchNetworkError,    // Erro de rede
  setupFetchMock,           // Configura global
} from '../mocks/fetch.js';

// Uso
global.fetch = mockFetchSuccess({ posts: [] });
```

### DB Mocks

```javascript
import {
  mockQuery,                // Query básica
  mockQueryOne,             // Uma linha
  mockQueryMany,            // Múltiplas linhas
  mockQueryError,          // Query com erro
  mockInsert,              // INSERT mock
  mockUpdate,              // UPDATE mock
  mockDelete,              // DELETE mock
  mockDbModule,            // Módulo completo
} from '../mocks/db.js';

// Uso
const queryMock = mockQuery([{ id: 1, name: 'Test' }]);
jest.mock('../../lib/db', () => ({ query: queryMock }));
```

## ✅ Matchers Customizados

```javascript
// Status HTTP
expect(res).toHaveStatus(200);
expect(res).toHaveStatus(404);

// JSON válido
expect(res).toBeValidJSON();
expect(res).toBeValidJSON({ id: 1 });

// Headers
expect(res).toHaveHeader('content-type');
expect(res).toHaveHeader('content-type', 'application/json');

// Datas ISO
expect(dateString).toBeISODate();
```

## 📖 Exemplos

- `examples/api-example.test.js` - Template completo para testes de API
- `examples/component-example.test.js` - Template completo para testes de componentes

## 🔧 Configuração

Atualize `jest.config.js`:

```javascript
export default {
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],  // Setup centralizado
  transform: {
    '^.+\.(js|jsx|mjs)$': ['babel-jest', { configFile: './babel.jest.config.js' }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  clearMocks: true,
  restoreMocks: true,
};
```

## 📝 Boas Práticas

1. **Factories**: Sempre use factories para dados de teste
2. **Setup**: Limpe mocks em `beforeEach`
3. **Matchers**: Use matchers customizados para legibilidade
4. **Grupos**: Organize testes em `describe` blocks
5. **Nomes**: Use nomes descritivos para testes
6. **DRY**: Use helpers para código repetitivo

## 🐛 Debug

```javascript
// Ver DOM renderizado
screen.debug();

// Ver elemento específico
screen.debug(screen.getByRole('button'));

// Log de elementos
console.log(screen.getAllByRole('listitem'));
```

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Jest Matchers](https://jestjs.io/docs/expect)
