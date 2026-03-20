# Diretrizes de Testes - Projeto Caminhar

Este documento serve como o guia principal para a arquitetura, escrita e execução de testes no projeto. Nossa infraestrutura de testes foi desenhada para garantir a confiabilidade da aplicação em múltiplos níveis, desde a regra de negócio isolada até a performance sob carga.

## 1. Visão Geral e Stack de Testes

Nossa stack de testes é composta por ferramentas modernas que cobrem diferentes aspectos da aplicação (Frontend, Backend, Integração e Performance). Abaixo estão as principais ferramentas utilizadas:

### 🃏 Jest & React Testing Library (RTL)
Utilizados para **Testes Unitários, de Componentes e de Integração da API**.
*   **Jest:** O executor principal de testes (`test runner`). Usado intensivamente para testar funções utilitárias (`lib/db.js`, `lib/auth.js`) e rotas de API (`/api/*`), utilizando bibliotecas como `node-mocks-http` para simular requisições HTTP e facilitadores de mocks. Para facilitar cenários de acesso seguro, mantemos utilitários robustos de autenticação (como injeção de tokens e middlewares mockados) centralizados em `tests/helpers/auth.js`.
*   **React Testing Library:** Utilizado para testar os componentes React garantindo acessibilidade e simulação de interações reais do usuário. Possuímos diversos wrappers customizados (ex: `renderWithAuth`, `renderWithRouter`, `renderWithToast`) localizados em `tests/helpers/render.js` para facilitar a injeção de dependências nos testes.

### 🌲 Cypress
Utilizado para **Testes End-to-End (E2E) e Fluxos de Interface**.
*   Focado em testar a aplicação do ponto de vista do usuário final em um navegador real.
*   Garante que os principais fluxos da aplicação (como navegação, submissão de formulários e painel administrativo) funcionem perfeitamente. *Nota: Utilizamos `cy.intercept()` ativamente para isolar o front-end e evitar dependência de dados voláteis do banco sempre que necessário.*

### 🚀 K6 (Grafana K6)
Utilizado para **Testes de Carga, Stress e Performance**.
*   Localizados na pasta `/load-tests/`, os scripts simulam múltiplos usuários virtuais (VUs) acessando e interagindo com a aplicação.
*   Cenários incluem validação de cache (`cache-headers-test.js`), fluxos de criação pesados (`create-post-flow.js`) e performance de operações CRUD no banco de dados (`videos-crud-test.js`).
*   Resultados e métricas (*Thresholds*) geram relatórios detalhados na pasta `/reports/k6-summaries/`.

### ⚙️ Integração Contínua (CI) e Cobertura
Nossos testes são garantidos através de pipelines automatizadas no **GitHub Actions**:
*   **PR Test Coverage:** Todo Pull Request disparado para a branch `main` executa a suíte de testes do Jest. O PR é bloqueado se a cobertura global cair abaixo da linha de base de **20%** ou se algum teste quebrar (configurado via `pr-coverage.yml`).
*   **Serviços de CI:** O ambiente de testes automatizado sobe contêineres efêmeros do **PostgreSQL 15** e **Redis 7-alpine** para garantir que os testes de integração rodem em um ambiente mais próximo possível da produção.


## 2. Configuração do Ambiente de Testes

Para executar os testes de integração e carga localmente de forma fidedigna ao ambiente de CI, é necessário preparar alguns serviços de infraestrutura e variáveis de ambiente.

### Requisitos de Infraestrutura
A aplicação depende de dois serviços principais que devem estar rodando (preferencialmente via Docker):
1.  **PostgreSQL (Versão 15+)**: Banco de dados relacional principal.
2.  **Redis (Versão 7-alpine)**: Gerenciamento de filas e cache distribuído da aplicação.

### Variáveis de Ambiente
Os testes que interagem com o banco, cache e fluxos autenticados dependem de variáveis de ambiente específicas. Crie um arquivo ou exporte as seguintes variáveis no seu terminal antes de rodar os testes:

```env
# Banco de Dados de Teste
TEST_DB_HOST=localhost
TEST_DB_PORT=5432
TEST_DB_NAME=caminhar_test
TEST_DB_USER=test_user
TEST_DB_PASS=test_password

# Redis de Teste
TEST_REDIS_URL=redis://localhost:6379

# JWT para Testes
TEST_JWT_SECRET=test-secret-key-local

# Credenciais Admin (Obrigatório para os testes de carga do K6)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=password
```

### Preparação do Banco de Dados
Antes de executar testes pesados ou fluxos E2E localmente, você pode usar os scripts utilitários do projeto para limpar ou popular o banco de dados.
*   `npm run db:reset`: Limpa e recria todas as tabelas e schemas do banco de dados do zero.
*   `npm run db:clear`: Limpa os registros do banco e os arquivos de uploads para testes em ambiente limpo.
*   `node scripts/seed-all.js`: Executa a injeção em massa de dados mockados (posts, músicas, vídeos) de forma sequencial.

## 3. Testes Unitários e de Integração (Backend/API)

A nossa arquitetura de testes de API e regras de negócio baseia-se fortemente no **Jest**. Garantimos a estabilidade das rotas simulando requisições e isolando dependências de I/O (Input/Output).

### Estrutura de Diretórios
*   `/tests/integration/api/`: Contém as suítes de testes para as rotas da API (ex: `upload-image.test.js`, `videos.test.js`).
*   `/tests/unit/`: Destinado a testes isolados de funções utilitárias ou regras de negócio específicas.

### Ferramentas e Padrões de Mock
Ao testar rotas Next.js (Handlers de API), utilizamos o pacote `node-mocks-http` para criar requisições (`req`) e respostas (`res`) simuladas. Para manter a performance, adotamos os seguintes padrões de isolamento:

1.  **Banco de Dados (`lib/db.js`)**: Interceptamos o módulo de banco de dados (`jest.mock('../../../lib/db.js')`) e injetamos retornos estáticos através de `mockResolvedValue()`. 
2.  **Autenticação (`lib/auth.js`)**: Injetamos tokens falsos ou alteramos o payload do JWT para testar rotas seguras.
3.  **File System**: Para rotas como `/api/upload-image`, utilizamos `jest.mock('fs')` e `formidable` para impedir manipulações reais no disco.

**Exemplo de uso do `node-mocks-http`:**
```javascript
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/admin/videos.js';

it('deve criar um vídeo', async () => {
  const { req, res } = createMocks({
    method: 'POST',
    headers: { 'Authorization': 'Bearer valid-token' },
    body: { titulo: 'Novo Vídeo', url_youtube: 'https://...' },
  });

  await handler(req, res);
  expect(res._getStatusCode()).toBe(201);
});
```

## 4. Testes de Componentes (Frontend)

A validação da interface do usuário é conduzida utilizando o **React Testing Library (RTL)** e o **Jest**, com foco em acessibilidade e nas interações reais do usuário.

### Centralização de Helpers (`tests/helpers/render.js`)
Para evitar repetição de código (boilerplate) ao injetar contextos no React, centralizamos diversos wrappers utilitários no arquivo de helpers. Sempre que testar um componente, utilize as seguintes funções ao invés do `render` padrão do RTL:

*   **`renderWithProviders(ui, options)`**: Envolve o componente com os provedores básicos da aplicação.
*   **`renderWithRouter(ui, options)`**: Injeta um mock completo do `useRouter` do Next.js. Útil para testar componentes que usam `router.push()` ou dependem de query params.
*   **`renderWithAuth(ui, options)`**: Fornece um contexto de autenticação falso (mock do `useAuth`), permitindo testar facilmente as variações da UI entre usuários logados e visitantes.
*   **`renderWithToast(ui, options)`**: Adiciona o `Toaster` do `react-hot-toast` à árvore de renderização para validar mensagens de sucesso e erro na tela.

### Simulação de Estado e Viewport
Nossos helpers também oferecem funções para validar comportamentos dinâmicos:
*   **Interações de Usuário**: O retorno dos nossos renders customizados já inclui uma instância configurada do `userEvent` (como `user.click()`), preferível ao antigo `fireEvent`.
*   **Testes Responsivos**: Utilize funções como `setMobileViewport()`, `setTabletViewport()` e `setDesktopViewport()` (presentes em `render.js`) para garantir que os componentes reajam corretamente à mudança de resolução.

## 5. Testes E2E e Fluxos de Interface (Cypress)

Para validar a jornada completa do usuário final, do navegador até o banco de dados, utilizamos o **Cypress**. 

### Localização e Organização
*   Todos os testes E2E estão localizados no diretório `/cypress/e2e/`.
*   Os testes devem ser focados em fluxos críticos de negócio: Login, Criação de Conteúdo, Submissão de Formulários e Navegação pelo Painel Administrativo.

### Boas Práticas e Isolamento (`cy.intercept`)
Os testes E2E frequentemente sofrem de *flakiness* (instabilidade) quando dependem de dados reais que podem mudar. Para mitigar isso:
*   Use intensivamente o `cy.intercept()` para mockar retornos de APIs (ex: uma lista de vídeos vinda do banco) se o foco do teste for puramente a UI.
*   Ao testar funcionalidades de UI (como modais, zoom de imagem ou paginação), evite mutações no banco de dados. Prefira carregar páginas com *fixtures* locais para garantir que a interface reage bem aos dados simulados.

## 6. Testes de Carga e Performance (K6)

Para garantir que o sistema escale adequadamente durante picos de tráfego, utilizamos o **Grafana K6**. Os testes simulam dezenas a centenas de Usuários Virtuais (VUs) acessando a aplicação simultaneamente.

### Execução e Cenários (`/load-tests/`)
Os scripts estão na pasta `/load-tests/` e são escritos em JavaScript (ES6). Alguns fluxos importantes incluem:
*   **`create-post-flow.js`**: Avalia o impacto no banco de dados em um cenário de pico de criação de conteúdo por múltiplos administradores simultaneamente.
*   **`posts-tags-test.js` e `videos-crud-test.js`**: Avaliam a velocidade das operações de leitura e pesquisa com filtros e paginações.
*   **Validação de Cache**: Scripts específicos que atestam a taxa de acerto no Redis (Cache Hit Rate) durante cargas pesadas (ex: >85% de Hits).

### Thresholds (Critérios de Aceitação)
Nossos testes baseiam-se em critérios restritos que, caso não sejam atingidos, marcam o teste de carga como falho:
*   A taxa global de sucesso das requisições deve ser **superior a 98%**.
*   Para requisições pesadas (como criações ou fluxos administrativos), o tempo de resposta do P95 (95% das requisições) deve ser mantido **abaixo de 800ms**.

*Nota: Nossa pipeline no GitHub Actions está configurada para executar a suíte de testes do K6 todos os dias na madrugada via Cron, garantindo a monitoria contínua da performance sem afetar o desenvolvimento.*

Os relatórios consolidados em formato JSON e sumários de console são gerados na pasta `/reports/k6-summaries/`.

## 7. CI/CD e Cobertura de Código

A garantia de qualidade contínua é feita através de automações no **GitHub Actions**, que bloqueiam regressões antes que cheguem à produção.

### Pipeline de PRs (`pr-coverage.yml`)
Toda vez que um Pull Request é aberto para a branch `main`:
1.  Um ambiente efêmero com **PostgreSQL 15** e **Redis 7-alpine** é provisionado via containers.
2.  A suíte completa de testes do Jest é executada.
3.  **Critério de Bloqueio**: A cobertura global de código (branches, funções, linhas e statements) não pode cair abaixo da linha de base estabelecida (atualmente configurada em **20%**).
4.  **Feedback Visual**: Caso a cobertura não seja atingida ou algum teste falhe, o *bot* do GitHub Actions publicará automaticamente um comentário no PR detalhando o relatório de erro e as linhas específicas que perderam cobertura.

### Rotina Diária de Performance
Como mencionado na seção de testes de carga, a execução pesada do K6 não roda a cada Pull Request para economizar tempo de *build* e recursos computacionais. Em vez disso, utilizamos jobs agendados diariamente (Cron) no GitHub Actions para monitorar a integridade, os *thresholds* e a saúde do sistema a longo prazo.

> **⚠️ Aviso Importante:** Os relatórios, arquivos de cache e logs detalhados gerados pelas execuções locais do K6 (como os arquivos de sumário em `/reports/k6-summaries/`) **não devem ser commitados** no repositório. Certifique-se de que eles permaneçam ignorados pelo Git para manter o histórico de controle de versão limpo e leve.
