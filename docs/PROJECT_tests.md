# Documentação dos Arquivos de Teste

Análise completa e objetiva dos arquivos do diretório `/tests` do projeto.

---

## 📁 Arquivos Analisados

| Arquivo | Tipo | Propósito |
|---------|------|-----------|
| `/tests/examples/component-example.test.js` | Exemplo | Demonstração completa de testes de componentes React |
| `/tests/examples/simple-test.test.js` | Exemplo | Arquitetura básica e demonstração de helpers |
| `/tests/factories/index.js` | Factory | Ponto de exportação central das factories |
| `/tests/factories/music.js` | Factory | Geração de dados de teste para músicas |
| `/tests/factories/post.js` | Factory | Geração de dados de teste para posts do blog |
| `/tests/factories/user.js` | Factory | Geração de dados de teste para usuários |
| `/tests/factories/video.js` | Factory | Geração de dados de teste para vídeos do YouTube |
| `/tests/helpers/api.js` | Helper | Utilitários para testes de endpoints API |
| `/tests/helpers/auth.js` | Helper | Utilitários para testes de autenticação |
| `/tests/helpers/index.js` | Helper | Ponto de exportação central dos helpers |
| `/tests/helpers/render.js` | Helper | Utilitários para renderização de componentes React |
| `/tests/matchers/index.js` | Matcher | Registro e exportação dos matchers customizados do Jest |
| `/tests/matchers/toBeISODate.js` | Matcher | Validação de datas no formato ISO 8601 |
| `/tests/matchers/toBeValidJSON.js` | Matcher | Validação de JSON em respostas |
| `/tests/matchers/toHaveHeader.js` | Matcher | Validação de headers HTTP |
| `/tests/matchers/toHaveStatus.js` | Matcher | Validação de status code HTTP |
| `/tests/mocks/db.js` | Mock | Mocks para operações de banco de dados |
| `/tests/mocks/fetch.js` | Mock | Mocks para requisições fetch API |
| `/tests/mocks/index.js` | Mock | Ponto de exportação central dos mocks |
| `/tests/mocks/next.js` | Mock | Mocks para componentes e hooks do Next.js |
| `/tests/setup.js` | Setup | Configuração centralizada de todo o ambiente de testes |

---

## 1. 🧪 `/tests/examples/component-example.test.js`

### Propósito
Arquivo de exemplo completo que demonstra **todas as boas práticas e ferramentas** para testes de componentes React no projeto. Serve como referência e template para novos testes.

### Características Principais:
✅ 565 linhas de código com exemplos práticos
✅ Utiliza `@testing-library/react` + `userEvent`
✅ Demonstra todos os helpers de renderização disponíveis
✅ Inclui cenários completos de teste
✅ Contém guia de boas práticas no final

### O que é demonstrado:
1. **Renderização Básica** - estados vazio, com dados, loading e erro
2. **Interações do Usuário** - cliques, preenchimento de formulários
3. **Responsividade** - viewport mobile e desktop
4. **Integração com Router** - mock do Next.js Router
5. **Autenticação** - contexto de usuário logado/admin
6. **Fetch Mockado** - simulação de requisições API com sucesso e erro

### Boas Práticas Incluídas:
> ✅ Usar factories para dados consistentes
> ✅ Testar **comportamento**, não implementação
> ✅ Priorizar `getByRole` para acessibilidade
> ✅ Limpar mocks em `afterEach`
> ✅ Testar **todos** os estados do componente

---

## 2. 🧪 `/tests/examples/simple-test.test.js`

### Propósito
Arquivo de demonstração da **arquitetura de testes** do projeto. Mostra como usar todas as ferramentas, helpers, factories e matchers customizados.

### Estrutura:
✅ 237 linhas de código
✅ Testes de validação de todas as factories
✅ Demonstração dos helpers de API
✅ Exemplos de helpers de autenticação
✅ Matchers customizados do projeto
✅ Teste integrado completo de fluxo

### Funcionalidades Demonstradas:
| Categoria | Funcionalidades |
|-----------|-----------------|
| **Factories** | `postFactory`, `musicFactory`, `videoFactory`, `userFactory`, `adminFactory` |
| **API Helpers** | `createGetRequest`, `createPostRequest`, `expectStatus`, `expectJson` |
| **Auth Helpers** | `createAuthToken`, `mockAuthenticatedUser`, `mockAuthenticatedAdmin` |
| **Matchers Customizados** | `toBeISODate()`, `toHaveHeader()`, `toHaveStatus()` |
| **Mocks** | `mockQuery`, `mockFetchSuccess` |

### Fluxo de Teste Integrado:
1. Cria usuário admin autenticado
2. Gera dados com factory
3. Cria request POST
4. Simula handler da API
5. Valida resposta completa

---

## 3. 🏭 `/tests/factories/index.js`

### Propósito
Arquivo de **barril central** para exportação de todas as factories do projeto. Simplifica as importações nos arquivos de teste.

### Conteúdo:
✅ Arquivo de 13 linhas
✅ Único ponto de entrada para todas as factories
✅ Nenhuma lógica, somente exports

### Exports Disponíveis:
```javascript
export { postFactory } from './post.js';
export { musicFactory } from './music.js';
export { videoFactory } from './video.js';
export { userFactory } from './user.js';
```

### Vantagem:
Ao invés de importar cada factory separadamente:
```javascript
// ❌ Ruim
import { postFactory } from '../factories/post.js';
import { musicFactory } from '../factories/music.js';

// ✅ Bom
import { postFactory, musicFactory } from '../factories';
```

---

## 4. 🏭 `/tests/factories/music.js`

### Propósito
Factory especializada para **geração de dados de teste consistentes e realistas para músicas**.
É uma das factories mais completas do projeto.

### Características:
✅ 168 linhas de código
✅ Dados reais de músicas gospel e artistas
✅ Gera URLs válidas do Spotify automaticamente
✅ Suporta sobrescrita de qualquer propriedade
✅ Contém utilitários específicos para cenários de teste

### Funções Disponíveis:

| Função | Descrição |
|--------|-----------|
| `musicFactory()` | Cria uma música completa e válida |
| `musicFactory.list(n)` | Cria uma lista com `n` músicas |
| `publishedMusicFactory()` | Música com status publicado |
| `unpublishedMusicFactory()` | Música com status rascunho |
| `invalidSpotifyMusicFactory()` | Música com URL inválida (para testes de validação) |
| `detailedMusicFactory()` | Música com campos extras (álbum, gênero, ano, duração) |
| `createMusicInput()` | Dados limpos para criação (sem id/timestamps) |
| `updateMusicInput()` | Dados parcial para atualização |
| `resetMusicIdCounter()` | Reseta contador de IDs para testes determinísticos |

### Exemplos de Uso:
```javascript
// Música padrão
const musica = musicFactory();

// Música com título customizado
const minhaMusica = musicFactory({ titulo: 'Minha Música' });

// Lista com 10 músicas
const lista = musicFactory.list(10);

// Dados para enviar na API
const dadosParaCriar = createMusicInput();
```

---

## 5. 🏭 `/tests/factories/post.js`

### Propósito
Factory para geração de dados de teste consistentes para **posts e artigos do blog**.
Gera títulos, slugs e conteúdo realistas automaticamente.

### Características:
✅ 143 linhas de código
✅ Dados reais de títulos e conteúdos inspiradores
✅ Gera slugs automaticamente a partir do título
✅ Timestamps sequenciais consistentes
✅ Suporta sobrescrita completa de propriedades

### Funções Disponíveis:
| Função | Descrição |
|--------|-----------|
| `postFactory()` | Cria um post completo |
| `postFactory.list(n)` | Lista com `n` posts |
| `publishedPostFactory()` | Post publicado |
| `draftPostFactory()` | Post em rascunho |
| `createPostInput()` | Dados limpos para criação (sem id) |
| `updatePostInput()` | Dados parcial para atualização |
| `resetPostIdCounter()` | Reseta contador de IDs |

---

## 6. 🏭 `/tests/factories/user.js`

### Propósito
Factory completa para geração de **dados de usuários e autenticação**.
É a factory mais complexa do projeto, com suporte a hash de senha e dados reais brasileiros.

### Características:
✅ 162 linhas de código
✅ Nomes e sobrenomes reais brasileiros
✅ E-mails e usernames realistas
✅ Integração com bcrypt para hash de senha
✅ Dados inválidos pré-definidos para testes de validação

### Funções Disponíveis:
| Função | Descrição |
|--------|-----------|
| `userFactory()` | Usuário comum |
| `adminFactory()` | Usuário com role `admin` |
| `userFactory.withHash()` | Usuário com senha já hasheada (async) |
| `createUserInput()` | Dados para criação de usuário |
| `loginInput()` | Credenciais para teste de login |
| `jwtPayloadFactory()` | Payload JWT válido |
| `invalidUserInput()` | Dados inválidos para testes de validação |
| `resetUserIdCounter()` | Reseta contador de IDs |

---

## 7. 🏭 `/tests/factories/video.js`

### Propósito
Factory especializada para geração de dados de **vídeos do YouTube**.
Gera URLs válidas, thumbnails e dados realistas automaticamente.

### Características:
✅ 187 linhas de código
✅ Gera IDs válidos do YouTube (11 caracteres)
✅ URLs e thumbnails no formato correto
✅ Extrai ID de qualquer formato de URL do YouTube
✅ Suporta versões embedáveis para players

### Funções Disponíveis:
| Função | Descrição |
|--------|-----------|
| `videoFactory()` | Cria um vídeo completo |
| `videoFactory.list(n)` | Lista com `n` vídeos |
| `publishedVideoFactory()` | Vídeo publicado |
| `unpublishedVideoFactory()` | Vídeo não publicado |
| `invalidYoutubeVideoFactory()` | Vídeo com URL inválida |
| `embeddableVideoFactory()` | Vídeo com URL de embed |
| `createVideoInput()` | Dados para criação |
| `updateVideoInput()` | Dados para atualização |
| `extractYoutubeId()` | Extrai ID de qualquer URL YouTube |
| `resetVideoIdCounter()` | Reseta contador de IDs |

---

## 8. 🛠️ `/tests/helpers/api.js`

### Propósito
Conjunto completo de **utilitários para testes de endpoints API**.
Abstrai a complexidade do `node-mocks-http` e fornece helpers para validação de respostas.

### Características:
✅ 295 linhas de código
✅ Wrapper padronizado sobre `node-mocks-http`
✅ Todos os métodos HTTP suportados
✅ Funções de assert para respostas
✅ Suporte a autenticação Bearer e Cookie
✅ Validação de respostas paginadas

### Funções Disponíveis:

#### 📤 Criação de Requisições:
| Função | Descrição |
|--------|-----------|
| `createApiMocks()` | Cria objetos genéricos `req` e `res` |
| `createGetRequest()` | Requisição GET |
| `createPostRequest()` | Requisição POST |
| `createPutRequest()` | Requisição PUT |
| `createDeleteRequest()` | Requisição DELETE |
| `createPatchRequest()` | Requisição PATCH |
| `createAuthRequest()` | Requisição com token Bearer |
| `createCookieAuthRequest()` | Requisição com cookie de auth |

#### ✅ Validação de Respostas:
| Função | Descrição |
|--------|-----------|
| `expectStatus()` | Verifica status HTTP |
| `expectJson()` | Verifica e extrai JSON da resposta |
| `expectArray()` | Verifica se resposta é um array |
| `expectHeader()` | Verifica existência e valor de header |
| `expectError()` | Verifica resposta de erro |
| `expectPaginatedResponse()` | Valida resposta com paginação |
| `executeHandler()` | Executa handler de API e retorna resultado |

---

## 9. 🛠️ `/tests/helpers/auth.js`

### Propósito
Conjunto completo de utilitários para **testes de autenticação e autorização**.
Simplifica a criação de tokens JWT, mocks de usuário e helpers para bcrypt.

### Características:
✅ 243 linhas de código
✅ Integração nativa com `jsonwebtoken` e `bcryptjs`
✅ Tokens válidos, expirados e inválidos pré-configurados
✅ Mocks completos de contexto de autenticação
✅ Suporte a Bearer Token e Cookies

### Funções Disponíveis:

| Função | Descrição |
|--------|-----------|
| `createAuthToken()` | Cria token JWT válido |
| `createExpiredToken()` | Cria token já expirado |
| `createInvalidToken()` | Cria token inválido |
| `mockAuthenticatedUser()` | Mock completo de usuário logado |
| `mockAuthenticatedAdmin()` | Mock de usuário admin logado |
| `hashPassword()` | Gera hash bcrypt |
| `verifyPassword()` | Compara senha com hash |
| `mockAuthLib()` | Mock completo da lib de autenticação |
| `createMockAuthMiddleware()` | Middleware de auth mockado |
| `createBearerHeader()` | Header Authorization formatado |

---

## 10. 🛠️ `/tests/helpers/index.js`

### Propósito
Arquivo de barril central para **exportação de todos os helpers** do projeto.
Simplifica as importações nos arquivos de teste.

### Características:
✅ 11 linhas de código
✅ Único ponto de entrada para todos os helpers
✅ Reexporta todos os módulos do diretório

### Exports Disponíveis:
```javascript
export * from './api.js';
export * from './render.js';
export * from './auth.js';
```

### Vantagem:
```javascript
// ❌ Ruim
import { createPostRequest } from '../helpers/api.js';
import { renderWithProviders } from '../helpers/render.js';

// ✅ Bom
import { createPostRequest, renderWithProviders } from '../helpers';
```

---

## 11. 🛠️ `/tests/helpers/render.js`

### Propósito
Conjunto de helpers para **renderização de componentes React nos testes**.
Configura automaticamente todos os providers necessários (Router, Auth, Toast).

### Características:
✅ 266 linhas de código
✅ Wrapper sobre `@testing-library/react`
✅ Integração com `userEvent` já configurada
✅ Mock nativo do Next.js Router
✅ Helpers para viewport responsivo
✅ Utilitários para formulários e animações

### Funções Disponíveis:

#### 🎨 Renderização:
| Função | Descrição |
|--------|-----------|
| `renderWithProviders()` | Renderiza componente com providers básicos |
| `renderWithRouter()` | Renderiza com Next.js Router mockado |
| `renderWithAuth()` | Renderiza com contexto de autenticação |
| `renderWithToast()` | Renderiza com provider do react-hot-toast |

#### 📱 Responsividade:
| Função | Descrição |
|--------|-----------|
| `setMobileViewport()` | Simula tela de mobile 375x667 |
| `setTabletViewport()` | Simula tela de tablet 768x1024 |
| `setDesktopViewport()` | Simula tela de desktop 1440x900 |
| `resizeWindow()` | Redimensiona janela para tamanho customizado |

#### ✨ Utilitários:
| Função | Descrição |
|--------|-----------|
| `fillForm()` | Preenche formulário automaticamente |
| `clearForm()` | Limpa campos do formulário |
| `waitForAnimation()` | Aguarda animações terminarem |
| `clickAndWait()` | Clica e aguarda transição |
| `testLoadingState()` | Helper para testar estado de loading |
| `testErrorState()` | Helper para testar estado de erro |

---

## 12. ✅ `/tests/matchers/index.js`

### Propósito
Arquivo responsável por **registrar e importar todos os matchers customizados** que estendem o Jest.

### Características:
✅ 11 linhas de código
✅ Todos os matchers são carregados automaticamente
✅ Não necessita importar individualmente nos testes
✅ Basta importar este arquivo uma vez no setup do Jest

### Matchers Customizados Disponíveis:
| Matcher | Descrição |
|---------|-----------|
| `toHaveStatus()` | Verifica status HTTP da resposta |
| `toBeValidJSON()` | Verifica se o corpo contém JSON válido |
| `toHaveHeader()` | Verifica existência e valor de header |
| `toBeISODate()` | Verifica se string é data ISO 8601 válida |

### Uso:
```javascript
expect(res).toHaveStatus(200);
expect(res).toHaveHeader('content-type', 'application/json');
expect(data.created_at).toBeISODate();
```

---

## 13. ✅ `/tests/matchers/toBeISODate.js`

### Propósito
Matcher customizado para **validar datas no formato ISO 8601**. Verifica tanto o formato da string quanto se é uma data válida no calendário.

### Características:
✅ 82 linhas de código
✅ Regex preciso para o formato ISO
✅ Valida também se é uma data real válida
✅ Suporta variantes com e sem milissegundos
✅ Inclui também o matcher genérico `toBeValidDate()`

### Matchers Disponíveis:
| Matcher | Descrição |
|---------|-----------|
| `toBeISODate()` | Verifica se string está no formato `YYYY-MM-DDTHH:mm:ss.sssZ` |
| `toBeValidDate()` | Verifica se valor é uma data válida (suporta Date, string ou timestamp) |

---

## 14. ✅ `/tests/matchers/toBeValidJSON.js`

### Propósito
Matcher para **validar JSON em respostas HTTP**. Extrai automaticamente o corpo da resposta de diferentes formatos e opcionalmente verifica o conteúdo.

### Características:
✅ 52 linhas de código
✅ Suporta extração automática de `_getData()`, `body` ou `data`
✅ Faz parse automático de strings
✅ Comparação parcial com `expect.objectContaining()`
✅ Mensagens de erro detalhadas

### Uso:
```javascript
// Apenas verifica se é JSON válido
expect(res).toBeValidJSON();

// Verifica se contém campos específicos
expect(res).toBeValidJSON({ id: 1, success: true });
```

---

## 15. ✅ `/tests/matchers/toHaveHeader.js`

### Propósito
Matcher para **verificar headers HTTP em respostas**. Suporta diferentes formatos de resposta e case insensitive.

### Características:
✅ 55 linhas de código
✅ Extrai headers automaticamente de qualquer objeto de resposta
✅ Normalização case insensitive
✅ Suporta verificação de existência ou valor exato
✅ Suporta headers com múltiplos valores

### Uso:
```javascript
// Verifica se header existe
expect(res).toHaveHeader('content-type');

// Verifica valor exato
expect(res).toHaveHeader('content-type', 'application/json');
```

---

## 16. ✅ `/tests/matchers/toHaveStatus.js`

### Propósito
Matcher universal para **verificar status code HTTP**. Funciona com todos os formatos de resposta comuns no projeto.

### Características:
✅ 45 linhas de código
✅ Suporta `node-mocks-http`, Express, Fetch Response
✅ Detecta automaticamente `_getStatusCode()`, `.status` e `.statusCode`
✅ Mensagens de erro claras e formatadas

### Uso:
```javascript
expect(res).toHaveStatus(200);
expect(res).toHaveStatus(401);
expect(res).toHaveStatus(500);
```

---

## 17. 🎭 `/tests/mocks/db.js`

### Propósito
Conjunto completo de **mocks para operações de banco de dados PostgreSQL**.
Simula queries, transactions, pool de conexões e resultados paginados.

### Características:
✅ 247 linhas de código
✅ Retorna objetos no mesmo formato do driver `pg`
✅ Suporta funções dinâmicas para resultados
✅ Mocks específicos para INSERT, UPDATE e DELETE
✅ Helpers para verificação de chamadas

### Funções Disponíveis:
| Função | Descrição |
|--------|-----------|
| `mockQuery()` | Mock genérico de query |
| `mockQueryOne()` | Retorna um único resultado |
| `mockQueryMany()` | Retorna múltiplos resultados |
| `mockQueryError()` | Simula erro na query |
| `mockInsert()` | Mock para INSERT |
| `mockUpdate()` | Mock para UPDATE |
| `mockDelete()` | Mock para DELETE |
| `mockTransaction()` | Simula transaction completa |
| `mockPool()` | Mock de pool de conexões |
| `queryWasCalledWith()` | Verifica se query foi chamada com padrão |
| `mockPaginatedResult()` | Simula resultado paginado |

---

## 18. 🎭 `/tests/mocks/fetch.js`

### Propósito
Mocks para **simulação de requisições fetch API**.
Suporta diferentes status de erro, rotas dinâmicas e respostas sequenciais.

### Características:
✅ 181 linhas de código
✅ Retorna objeto Response padrão completo
✅ Todos os métodos (`json()`, `text()`, `blob()`) implementados
✅ Suporte a rotas por URL e RegExp
✅ Respostas sequenciais para fluxos complexos

### Funções Disponíveis:
| Função | Descrição |
|--------|-----------|
| `mockFetch()` | Mock genérico de fetch |
| `mockFetchSuccess()` | Retorna sucesso 200 OK |
| `mockFetchError()` | Retorna erro HTTP customizado |
| `mockFetchNotFound()` | Retorna 404 |
| `mockFetchUnauthorized()` | Retorna 401 |
| `mockFetchServerError()` | Retorna 500 |
| `mockFetchNetworkError()` | Simula erro de rede |
| `mockFetchWithRoutes()` | Mapa de URLs para respostas |
| `fetchWasCalledWith()` | Verifica chamada por URL |

---

## 19. 🎭 `/tests/mocks/index.js`

### Propósito
Arquivo de barril central para **exportação de todos os mocks** do projeto.

### Características:
✅ 11 linhas de código
✅ Único ponto de entrada para todos os mocks
✅ Reexporta todos os módulos do diretório

### Exports Disponíveis:
```javascript
export * from './next.js';
export * from './fetch.js';
export * from './db.js';
```

---

## 20. 🎭 `/tests/mocks/next.js`

### Propósito
Mocks completos para **todos os componentes e hooks do Next.js**.
Elimina a necessidade de configurar mocks repetidamente nos testes.

### Características:
✅ 226 linhas de código
✅ Todos os hooks e componentes comuns do Next.js
✅ Suporte Pages Router e App Router
✅ Mocks de `getServerSideProps`, `getStaticProps`
✅ Setup automático de todos os mocks

### Mocks Disponíveis:
| Mock | Descrição |
|------|-----------|
| `mockUseRouter()` | Mock do hook `useRouter` |
| `mockNextImage` | Mock do componente `<Image />` |
| `mockNextLink` | Mock do componente `<Link />` |
| `mockNextHead` | Mock do componente `<Head />` |
| `mockNextDynamic` | Mock da função `dynamic()` |
| `mockGetServerSideProps` | Mock do SSR |
| `mockGetStaticProps` | Mock do SSG |
| `mockNextHeaders` | Mock do `next/headers` |
| `mockNextCookies` | Mock do `next/cookies` |
| `setupNextMocks()` | Configura todos os mocks automaticamente |

---

## 21. ⚙️ `/tests/setup.js`

### Propósito
Arquivo de **setup centralizado de todo o ambiente de testes**.
É carregado automaticamente pelo Jest antes de qualquer teste.

### Características:
✅ 415 linhas de código
✅ Polyfills para todas as APIs faltantes no JSDOM
✅ Configuração do React Testing Library
✅ Cleanup automático após cada teste
✅ Registro de todos os matchers customizados
✅ Mocks globais e utilitários

### O que é configurado:
| Categoria | Funcionalidades |
|-----------|-----------------|
| **Polyfills** | `TextEncoder`, `TextDecoder`, `ReadableStream`, `Request`, `Response`, `Headers`, `localStorage`, `matchMedia`, `IntersectionObserver`, `ResizeObserver` |
| **RTL Config** | Timeout para queries, configuração de erros |
| **Cleanup** | Limpeza automática do DOM após cada teste |
| **Matchers** | Registro de todos os 5 matchers customizados |
| **Globais** | `global.wait()`, `global.suppressWarnings()` |
| **Filtros** | Supressão de warnings conhecidos e irrelevantes |

---

## 📌 Resumo Geral

### Padrões do Projeto:
✅ Todas as factories seguem o mesmo padrão de API
✅ Todos os exemplos são funcionais e podem ser copiados
✅ Estrutura organizada e bem documentada
✅ Dados realistas para testes confiáveis
✅ Boas práticas e padrões definidos explicitamente

### Benefícios da Arquitetura:
✅ Testes rápidos e consistentes
✅ Não existe dados hardcoded nos testes
✅ Fácil manutenção e atualização
✅ Novos desenvolvedores podem aprender rapidamente
✅ Reduz drasticamente a duplicação de código

---

> ✅ Documentação gerada automaticamente em 21/04/2026