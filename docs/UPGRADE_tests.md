# Análise Completa de Testes — Projeto Caminhar (`tests/`)

> **Data:** 23/09/2026
> **Objeto:** Análise profunda e individual de todos os arquivos na pasta `/home/gus/Projetos/Caminhar/tests/`
> **Total de arquivos:** 224
> **Escopo:** Documentação técnica de cada arquivo de teste

---

**Índice:**

1. [Examples e Factories](#1-examples-e-factories)
2. [Helpers e Matchers](#2-helpers-e-matchers)
3. [Mocks e Setups](#3-mocks-e-setups)
4. [Testes de Integração — Admin API](#4-testes-de-integração--admin-api)
5. [Testes de Integração — API Pública (Auth, Audit, Musicas)](#5-testes-de-integração--api-pública-auth-audit-musicas)
6. [Testes de Integração — API Pública (Posts, Products, Settings, Stats, Status, Upload)](#6-testes-de-integração--api-pública-posts-products-settings-stats-status-upload)
7. [Testes de Integração — Videos, Auth e Domain](#7-testes-de-integração--videos-auth-e-domain)
8. [Testes Unitários — Root, Domain e Hooks](#8-testes-unitários--root-domain-e-hooks)
9. [Testes Unitários — Admin Components](#9-testes-unitários--admin-components)
10. [Testes Unitários — Admin Tools, Managers e Componentes Misc](#10-testes-unitários--admin-tools-managers-e-componentes-misc)
11. [Testes Unitários — Features](#11-testes-unitários--features)
12. [Testes Unitários — Layout, Performance e SEO](#12-testes-unitários--layout-performance-e-seo)
13. [Testes Unitários — UI Components](#13-testes-unitários--ui-components)
14. [Testes Unitários — Lib](#14-testes-unitários--lib)
15. [Testes Unitários — Lib DB e Backup](#15-testes-unitários--lib-db-e-backup)
16. [Testes Unitários — Pages API](#16-testes-unitários--pages-api)
17. [Testes Unitários — Scripts](#17-testes-unitários--scripts)
18. [Testes Unitários — GitHub Workflows e Snapshots](#18-testes-unitários--github-workflows-e-snapshots)

---

## 1. Examples e Factories


- **Finalidade:** Arquivo de demonstração da arquitetura de testes, validando se todas as factories, helpers, mocks e matchers customizados estão funcionando corretamente. Serve como teste de sanidade (smoke test) da infraestrutura de testes e exemplo de uso integrado dos utilitários.

- **Arquivos acionados:**
  - `../factories/post.js` (`postFactory`, `createPostInput`)
  - `../factories/music.js` (`musicFactory`)
  - `../factories/video.js` (`videoFactory`)
  - `../factories/user.js` (`userFactory`, `adminFactory`)
  - `../helpers/api.js` (`createApiMocks`, `createGetRequest`, `createPostRequest`)
  - `../helpers/auth.js` (`createAuthToken`, `mockAuthenticatedUser`, `mockAuthenticatedAdmin`)
  - `../mocks/index.js` (`mockQuery`, `mockFetchSuccess`)
  - `@jest/globals`

- **Resumo:** Contém 234 linhas organizados em 5 blocos principais: (1) **Factories** — testa criação, overrides, listas e inputs de post, música, vídeo, usuário e admin; (2) **API Helpers** — testa `createApiMocks`, `createPostRequest`, matcher `toHaveStatus`, matcher `toBeValidJSON`; (3) **Auth Helpers** — testa `createAuthToken`, `mockAuthenticatedUser`, `mockAuthenticatedAdmin`; (4) **Matchers Customizados** — testa `toBeISODate`, `toHaveHeader`; (5) **Mocks** — testa `mockQuery` e `mockFetchSuccess`. Finaliza com um teste integrado de fluxo completo simulando criação de post por admin.

- **Problemas:**
  - O nome "simple-test" é enganoso — o arquivo testa muitos subsistemas diferentes, não é um teste simples.
  - O teste de fluxo integrado (linhas 202-233) simula um handler manualmente (`res.statusCode = 201; res._getData = ...`) em vez de importar e invocar um handler real, limitando o valor do teste de integração.
  - Não há teste para `createMusicInput`, `createVideoInput`, `updatePostInput`, `updateMusicInput`, `updateVideoInput` — apenas factories principais e `createPostInput` são cobertos.
  - O matcher `toBeValidJSON` é invocado (linha 135) mas não é importado explicitamente — depende de registro global via setup do Jest, o que pode causar falhas se o setup não for carregado antes.

- **Melhorias:**
  - Renomear para `infrastructure-smoke.test.js` ou `architecture-demo.test.js` para refletir melhor o propósito.
  - Adicionar testes para os inputs faltantes (`createMusicInput`, `createVideoInput`, etc.).
  - Importar explicitamente os matchers customizados no início do arquivo para evitar dependência implícita de setup global.
  - No teste integrado, importar um handler real (se existir) em vez de simular manualmente a resposta.

- **Duplicidades:**
  - O padrão de resetar factories (`resetId()`) no `beforeEach` é duplicado em relação ao `component-example.test.js`, mas justificado pois são arquivos independentes.
  - A criação de `postFactory.list(2)` e verificação de propriedades se repete em estilo similar ao `component-example.test.js`.

- **Código morto:**
  - Nenhum código morto identificado. Todas as importações são utilizadas.
  - A variável `queryMock` no teste de `mockQuery` (linha 180) é utilizada para asserções.

---

#### tests/factories/base.js

- **Finalidade:** Módulo central que implementa o padrão Factory Method para geração de dados de teste. Fornece a função `createBaseFactory` que abstrai contador incremental de IDs, método `.list()` para criação de múltiplos registros, método `.resetId()` para reset do contador, e utilitário `generateTimestamp` para geração de datas ISO. É a base sobre a qual todas as factories específicas (post, music, video, user) são construídas.

- **Arquivos acionados:**
  - Nenhum import interno — é o módulo raiz da hierarquia de factories.
  - É acionado por: `post.js`, `music.js`, `video.js`, `user.js` (todos importam `createBaseFactory`).

- **Resumo:** Contém 67 linhas com duas exportações: (1) `generateTimestamp(daysAgo)` — gera timestamp ISO retrocedendo N dias; (2) `createBaseFactory(defaultsGenerator)` — função fábrica que recebe um gerador de defaults e retorna uma função factory com: contador incremental interno (`idCounter`), assinatura `(overrides = {}) => { ... }`, método `.list(count, overrides, mapFn)` para gerar arrays, e método `.resetId()` para zerar o contador. A lógica de ID usa `overrides.id ?? idCounter` e incrementa apenas quando `id` não está presente em overrides.

- **Problemas:**
  - A lógica de incremento do `idCounter` tem condição `if (!('id' in overrides))` — isso significa que se `overrides.id` for explicitamente passado mas for `undefined`, o contador não incrementa (o `??` atribui `idCounter` mas o incremento não ocorre). Pode causar IDs duplicados em cenários específicos.
  - Não há validação de tipo nos parâmetros — `defaultsGenerator` não é verificado como função, `count` em `.list()` não é validado como número positivo.
  - Não há suporte a factories encadeadas ou composição de factories (ex: userFactory que referencia postFactory).

- **Melhorias:**
  - Adicionar validação de tipos com TypeScript ou runtime checks (`typeof defaultsGenerator !== 'function'`).
  - Simplificar a lógica de incremento: sempre incrementar quando `overrides.id` não for fornecido, usar uma verificação mais explícita.
  - Adicionar método `.createMany()` ou aceitar array de overrides em `.list()` para cenários onde cada item precisa de overrides diferentes.
  - Considerar suporte a `Symbol` ou prefixos de ID para evitar conflitos em testes paralelos.

- **Duplicidades:**
  - O padrão de gerar timestamp com `new Date()` e `setDate(date.getDate() - id)` é replicado nas factories específicas (post, music, video, user), embora `generateTimestamp` esteja disponível — as factories optam por implementar manualmente em vez de reutilizar.

- **Código morto:**
  - Nenhum código morto. Todas as exportações são utilizadas por múltiplas factories.

---

#### tests/factories/index.js

- **Finalidade:** Barrel file (arquivo índice) que centraliza e re-exporta todas as factories e o factory base, permitindo importações simplificadas via `from '../factories'` em vez de caminhos individuais. Facilita a manutenção dos imports nos arquivos de teste.

- **Arquivos acionados:**
  - `./base.js` (re-exporta `createBaseFactory`)
  - `./post.js` (re-exporta `postFactory`)
  - `./music.js` (re-exporta `musicFactory`)
  - `./video.js` (re-exporta `videoFactory`)
  - `./user.js` (re-exporta `userFactory`)

- **Resumo:** Contém 18 linhas com apenas declarações de re-exportação. Documenta no cabeçalho o padrão de uso esperado (imports via caminho base, criação de factory custom com `createBaseFactory`). Serve como ponto de entrada único para o módulo de factories.

- **Problemas:**
  - Não exporta `adminFactory` (disponível em `user.js`) — usuários que importam via barrel não têm acesso a `adminFactory` sem importar diretamente de `./factories/user.js`.
  - Não exporta factories auxiliares como `draftPostFactory`, `publishedPostFactory`, `unpublishedMusicFactory`, etc.
  - Não exporta utilitários como `createPostInput`, `createMusicInput`, `generateSpotifyUrl`, `generateYoutubeUrl`, etc.

- **Melhorias:**
  - Expandir exports para incluir `adminFactory` e principais factories auxiliares (`draftPostFactory`, `publishedPostFactory`).
  - Considerar exportar também os `create*Input` e `update*Input` helpers para simplificar imports.
  - Ou, alternativamente, documentar que o barrel é intencionalmente minimalista e factories auxiliares devem ser importadas diretamente.

- **Duplicidades:**
  - Nenhuma duplicidade — é um arquivo de re-exportação puro.

- **Código morto:**
  - Nenhum código morto. Todas as re-exportações são utilizadas por pelo menos um arquivo de teste.

---

#### tests/factories/music.js

- **Finalidade:** Factory para geração de dados de teste do domínio "músicas", incluindo títulos de músicas gospel, artistas, URLs do Spotify e estados de publicação. Fornece múltiplas variações de factory para diferentes cenários de teste (publicada, não publicada, URL inválida, detalhada).

- **Arquivos acionados:**
  - `./base.js` (importa `createBaseFactory`)

- **Resumo:** Contém 160 linhas. Define arrays de templates (`musicTitles` com 10 títulos gospel, `artists` com 10 artistas). Exporta: (1) `generateTrackId()` — gera ID alfanumérico de 22 caracteres para Spotify; (2) `generateSpotifyUrl()` — gera URL completa do Spotify; (3) `generateMusicDefaults(id)` — gera defaults com id, titulo, artista, url_imagem, url_spotify, publicado, timestamps; (4) `musicFactory` — factory base; (5) `unpublishedMusicFactory` — factory de música não publicada; (6) `publishedMusicFactory` — factory de música publicada; (7) `invalidSpotifyMusicFactory` — factory com URL inválida; (8) `createMusicInput` — dados para criação (sem id/timestamps); (9) `updateMusicInput` — dados para atualização (campos opcionais condicionais); (10) `detailedMusicFactory` — música com álbum, gênero, ano, duração.

- **Problemas:**
  - O array `artists` tem 10 itens mas `musicTitles` também tem 10 — o acesso `artists[index % artists.length]` é correto mas redundante pois `index` já é limitado por `musicTitles.length`.
  - A geração de timestamp em `generateMusicDefaults` replica manualmente a lógica de `generateTimestamp` de `base.js` em vez de reutilizá-la — duplicação de lógica.
  - `generateTrackId()` e `generateMusicDefaults()` não são exportadas, limitando reuso externo.
  - A validação de URL do Spotify não é verificada em nenhum lugar — assume-se que o formato gerado é sempre válido.

- **Melhorias:**
  - Extrair `generateTrackId` e `generateMusicDefaults` como exportações para permitir uso isolado.
  - Reutilizar `generateTimestamp` de `base.js` em vez de reimplementar lógica de data.
  - Adicionar testes para `detailedMusicFactory` (não coberto em nenhum dos exemplos).
  - Considerar validação de formato de URL Spotify gerada.

- **Duplicidades:**
  - Padrão idêntico a `post.js` e `video.js`: factory base + published/unpublished/invalid + createInput + updateInput. Deveria ser abstraído em helper de criação de factories.
  - Lógica de timestamp duplicada em relação a `base.js` e outras factories.

- **Código morto:**
  - Nenhum código morto identificado. Todas as exportações são potencialmente utilizáveis.

---

#### tests/factories/post.js

- **Finalidade:** Factory principal para geração de dados de teste do domínio "posts do blog", incluindo títulos, slugs, conteúdos, imagens e estados de publicação. É a factory mais utilizada nos arquivos de exemplo e serve como modelo para as demais factories do projeto.

- **Arquivos acionados:**
  - `./base.js` (importa `createBaseFactory`)

- **Resumo:** Contém 126 linhas. Define arrays de templates (`postTitles` com 10 títulos temáticos, `postContents` com 5 conteúdos de exemplo). Exporta: (1) `generateSlug(title)` — helper que converte título para slug (lowercase, remove caracteres especiais, substitui espaços por hífens); (2) `generatePostDefaults(id)` — gera defaults com id, title, slug, excerpt, content, image_url, published, timestamps; (3) `postFactory` — factory base; (4) `draftPostFactory` — factory de rascunho; (5) `publishedPostFactory` — factory de post publicado; (6) `createPostInput` — dados para criação (sem id/timestamps, gera slug automaticamente); (7) `updatePostInput` — dados para atualização (campos opcionais condicionais).

- **Problemas:**
  - `generateSlug` não trata caracteres acentuados (ex: "Caminhando" → "caminhando" correto, mas "Comunhão" falharia sem normalização) — depende de regex `[^a-z0-9]+` que remove acentos antes da conversão, mas não há normalize Unicode explícito.
  - O título gerado é `${postTitles[titleIndex]} ${id}` (ex: "A Jornada da Fé 1"), o que pode gerar slugs repetidos se `resetId` não for chamado entre testes.
  - `generatePostDefaults` não é exportada, impede reuso isolado.
  - A geração de timestamp replica lógica manual em vez de usar `generateTimestamp` de `base.js`.

- **Melhorias:**
  - Exportar `generateSlug` e `generatePostDefaults` para permitir uso isolado.
  - Adicionar normalização Unicode explícita em `generateSlug` (`.normalize('NFD')` + remoção de diacríticos).
  - Reutilizar `generateTimestamp` de `base.js`.
  - Adicionar validação de unicidade de slug ou usar `nanoid`/`uuid` para slugs únicos.

- **Duplicidades:**
  - Padrão idêntico a `music.js` e `video.js` — factory base + published/unpublished + createInput + updateInput.
  - Lógica de timestamp duplicada em relação a `base.js` e outras factories.
  - Estrutura de `createPostInput` e `updatePostInput` é espelho exato de `createMusicInput`/`updateMusicInput` e `createVideoInput`/`updateVideoInput`.

- **Código morto:**
  - Nenhum código morto identificado. Todas as exportações são utilizadas nos arquivos de exemplo.

---

#### tests/factories/user.js

- **Finalidade:** Factory para geração de dados de teste do domínio "usuários", incluindo nomes, emails, senhas, roles, avatares e hashes bcrypt. É a factory mais complexa, com suporte a hash de senha assíncrono e geração de payloads JWT. Diferencia-se das demais por incluir dependência externa (`bcryptjs`).

- **Arquivos acionados:**
  - `./base.js` (importa `createBaseFactory`)
  - `bcryptjs` (importa `bcrypt` para hash de senhas)

- **Resumo:** Contém 153 linhas. Define arrays de templates (`firstNames`, `lastNames`, `domains`). Exporta: (1) `pickRandom(arr)` — helper para escolha aleatória; (2) `generateUsername(firstName, lastName)` — gera username normalizado (remove acentos) com número aleatório; (3) `generateUserDefaults(id)` — gera defaults completos; (4) `userFactory` — factory base; (5) `adminFactory` — factory de admin (role: 'admin'); (6) `regularUserFactory` — factory de usuário comum (role: 'user'); (7) `userFactory.withHash(overrides, saltRounds)` — método estático assíncrono que gera usuário com senha hasheada via bcrypt; (8) `createUserInput` — dados para criação; (9) `loginInput` — credenciais de login; (10) `jwtPayloadFactory` — payload JWT para testes; (11) `invalidUserInput(type)` — fábrica de dados inválidos para testes de validação (6 tipos: empty, short, invalid_email, no_username, no_password, weak_password).

- **Problemas:**
  - A dependência de `bcryptjs` torna esta factory mais pesada que as demais — qualquer teste que importe `userFactory` indiretamente carrega bcrypt, mesmo que não use `withHash`.
  - `generateUsername` usa `Math.floor(Math.random() * 100)` — pode gerar usernames duplicados em execuções consecutivas, potencialmente causando falsos negativos em testes de unicidade.
  - `userFactory.withHash` é definido como propriedade da função após a criação (`userFactory.withHash = ...`) — funciona mas é um padrão incomum que pode confundir desenvolvedores e ferramentas de análise estática.
  - O `plainPassword` é retornado junto com o hash (linha 92), o que é útil para testes mas representa risco de segurança se o objeto vazar para logs ou ambiente de produção.
  - `invalidUserInput` não valida o parâmetro `type` — retorna `types.empty` silenciosamente para tipos desconhecidos.

- **Melhorias:**
  - Mover `withHash` para função exportada separada (`export const createUserWithHash = ...`) em vez de propriedade de função.
  - Usar ID no username em vez de número aleatório para garantir unicidade: `${first}.${last}${id}`.
  - Validar parâmetro `type` em `invalidUserInput` com error explícito.
  - Considerar tornar `bcryptjs` opcional via dynamic import para evitar carregamento desnecessário.
  - Documentar que `plainPassword` deve ser usado apenas em testes e nunca persistido.

- **Duplicidades:**
  - Lógica de timestamp duplicada em relação a `base.js` e outras factories.
  - Estrutura de `createUserInput` espelha `createPostInput`, `createMusicInput`, `createVideoInput`.

- **Código morto:**
  - Nenhum código morto identificado. Todas as exportações são potencialmente utilizáveis.

---

#### tests/factories/video.js

- **Finalidade:** Factory para geração de dados de teste do domínio "vídeos do YouTube", incluindo títulos, URLs do YouTube, IDs, thumbnails e descrições. Fornece utilitários para extração de ID do YouTube e geração de vídeos embeddable. É a factory mais rica em utilitários auxiliares.

- **Arquivos acionados:**
  - `./base.js` (importa `createBaseFactory`)

- **Resumo:** Contém 179 linhas. Define arrays de templates (`videoTitles` com 10 títulos, `videoDescriptions` com 5 descrições). Exporta: (1) `generateYoutubeId()` — gera ID de 11 caracteres (alfanumérico + `-_`); (2) `generateYoutubeUrl(videoId)` — gera URL completa do YouTube; (3) `generateVideoDefaults(id)` — gera defaults com id, titulo, url_youtube, youtube_id, descricao, publicado, thumbnail_url, timestamps; (4) `videoFactory` — factory base; (5) `unpublishedVideoFactory` — factory de vídeo não publicado; (6) `publishedVideoFactory` — factory de vídeo publicado; (7) `invalidYoutubeVideoFactory` — factory com URL inválida (Vimeo); (8) `createVideoInput` — dados para criação; (9) `updateVideoInput` — dados para atualização; (10) `extractYoutubeId(url)` — extrai ID do YouTube de URLs em 4 formatos diferentes (watch, embed, /v/, youtu.be); (11) `embeddableVideoFactory` — vídeo com URL embed e thumbnail maxresdefault.

- **Problemas:**
  - `generateYoutubeId()` usa caractere `-` e `_` no alfabeto, que são válidos em base64 mas raros em IDs reais do YouTube — pode gerar IDs que nunca ocorreriam na realidade.
  - A lógica de timestamp em `generateVideoDefaults` replica manualmente em vez de usar `generateTimestamp` de `base.js`.
  - `extractYoutubeId` retorna `null` para URLs inválidas mas não há validação de formato de URL de entrada — strings completamente inválidas podem causar comportamento inesperado.
  - `embeddableVideoFactory` depende de `extractYoutubeId` para extrair ID da URL gerada — se `extractYoutubeId` falhar (retornar `null`), usa `generateYoutubeId()` como fallback, o que pode gerar inconsistência entre `url_youtube` e `embed_url`.

- **Melhorias:**
  - Ajustar alfabeto de `generateYoutubeId` para refletir melhor os caracteres reais usados em IDs do YouTube.
  - Reutilizar `generateTimestamp` de `base.js`.
  - Validar entrada de `extractYoutubeId` (verificar se é string, se contém 'youtube' ou 'youtu.be').
  - Garantir que `embeddableVideoFactory` sempre use o mesmo ID para `url_youtube` e `embed_url`.
  - Adicionar testes para `extractYoutubeId` com os 4 formatos de URL suportados.

- **Duplicações:**
  - Padrão idêntico a `post.js` e `music.js` — factory base + published/unpublished/invalid + createInput + updateInput.
  - Lógica de timestamp duplicada em relação a `base.js` e outras factories.
  - Estrutura de `createVideoInput`/`updateVideoInput` espelha exatamente as demais factories.

- **Código morto:**
  - Nenhum código morto identificado. Todas as exportações são potencialmente utilizáveis.

---


#### Arquitetura
O sistema de factories segue o padrão **Factory Method** com composição via `createBaseFactory`. A hierarquia é:
- `base.js` → núcleo (contador, list, resetId, timestamp)
- `index.js` → barrel de exportação
- `post.js`, `music.js`, `video.js`, `user.js` → factories especializadas

#### Padrões Repetitivos Identificados
1. **Todas as factories específicas** reimplementam lógica de timestamp em vez de usar `generateTimestamp` de `base.js`.
2. **Todas seguem o mesmo blueprint**: factory base + publishedFactory + unpublishedFactory + invalidFactory + createInput + updateInput.
3. **user.js é outlier** por ter dependência externa (bcrypt) e método assíncrono `withHash`.

#### Cobertura de Testes
- Os arquivos em `examples/` demonstram uso mas não são testes exaustivos.
- `simple-test.test.js` cobre factories principais mas ignora factories auxiliares e vários métodos.
- Não há teste dedicado para `base.js` isoladamente.

#### Recomendações Estratégicas
1. **Consolidar geração de timestamp**: usar `generateTimestamp` de `base.js` em todas as factories.
2. **Expandir barrel (`index.js`)** ou documentar explicitamente sua natureza minimalista.
3. **Criar abstração para o blueprint** de factory (published/unpublished/input/update) para evitar duplicação entre post, music, video.
4. **Isolar bcrypt** em user.js para evitar carregamento desnecessário em testes que não usam hash.
5. **Adotar normalização Unicode** explícita em `generateSlug` e `generateUsername`.


---


## 2. Helpers e Matchers


- **Finalidade:** Criação e execução de mocks HTTP para testes de API. Fornece fábricas para diferentes métodos HTTP e execução de handlers Next.js em ambiente simulado.
- **Arquivos acionados:** `node-mocks-http` (dependência externa). Exportado via `helpers/index.js`.
- **Resumo:** Oferece `createApiMocks` (fábrica base com headers padrão), `createGetRequest`, `createPostRequest`, `createPutRequest`, `createDeleteRequest`, `createPatchRequest` (atalhos por método HTTP), `executeHandler` (executa handler e retorna dados normalizados), `createWebhookPayload`, `createAuthRequest`, `createCookieAuthRequest`, e `getResponseBody`.
- **Problemas:**
  1. `executeHandler` usa `res.getHeaders?.() || res._getHeaders?.() || {}` — a verificação de dois métodos diferentes sugere acoplamento com duas versões distintas da `node-mocks-http`, o que é frágil.
  2. `getResponseBody` e `executeHandler` ambos fazem `JSON.parse(res._getData())` com tratamento de erro — lógica duplicada de parsing.
  3. `createAuthRequest` e `createCookieAuthRequest` aceitam `options` mas não validam se `options.headers` ou `options.cookies` existem antes de espalhar.
  4. `createDeleteRequest` omite `body` padrão (deixa `undefined`), diferentemente das outras funções que defaultam para `{}`.
- **Melhorias:** Fatorar o parsing de corpo da resposta em uma função utilitária compartilhada entre `executeHandler` e `getResponseBody`. Tornar `createDeleteRequest` consistente com os outros (default `body = {}`). Documentar que `createPatchRequest` não aceita `query` (diferente de PUT).
- **Duplicidades:** `JSON.parse(res._getData())` aparece duas vezes (linhas 101 e 155) com tratamento de erro idêntico.
- **Código morto:** Nenhum.

---

#### helpers/async-polyfills.js

- **Finalidade:** Aplicar polyfills assíncronos necessários para o ambiente de testes (Node.js + JSDOM). Exportada separadamente do `tests/setup.js` para que tanto setup quanto teardown possam importá-la sem depender de Jest.
- **Arquivos acionados:** `tests/setup.js` (importa `setupAsyncPolyfills`). `tests/setup.db.js` também a utiliza indiretamente via setup.
- **Resumo:** Exporta função `setupAsyncPolyfills()` que polyfilla `ReadableStream` (de `node:stream/web`) e `MessageChannel`/`MessagePort` (de `node:worker_threads`) apenas se não existirem em `globalThis`. Usa padrão singleton via `polyfillsPromise` para garantir idempotência — múltiplas chamadas retornam a mesma promise.
- **Problemas:**
  1. O catch de erros usa `console.warn` sem opção de suprimir — polui saída dos testes quando polyfills falham intencionalmente em alguns ambientes.
  2. A separação "para que possa ser importada tanto pelo setup quanto pelo teardown" não é refletida na prática — `tests/teardown.js` (se existir) não importa este módulo segundo a análise.
- **Melhorias:** Adicionar flag opcional `{ silent: true }` para suprimir warnings quando o polyfill falhar intencionalmente. Documentar quais pacotes externos requerem cada polyfill (undici, etc.) para facilitar manutenção.
- **Duplicidades:** Nenhuma.
- **Código morto:** Nenhum.

---

#### helpers/auth.js

- **Finalidade:** Utilitários completos para testes de autenticação — criação/validação de tokens JWT, mock de usuários autenticados, simulação de middleware de autenticação e helpers de senha com bcrypt.
- **Arquivos acionados:** `jsonwebtoken`, `bcryptjs` (dependências externas). `AuthContext` (indiretamente via `mockAuthLib`). Exportado via `helpers/index.js`.
- **Resumo:** Fornece:
  - **Token:** `createAuthToken`, `createExpiredToken`, `createInvalidToken`, `decodeToken`, `isValidToken`
  - **Mock de usuário:** `mockAuthenticatedUser`, `mockAuthenticatedAdmin`
  - **Senha:** `hashPassword`, `verifyPassword`
  - **Middleware/Lib:** `createMockAuthMiddleware`, `mockAuthLib`
  - **Headers/Cookies:** `clearAuthCookies`, `createBearerHeader`, `createAuthCookie`
  - **Payloads padrão:** `defaultTokenPayload`, `adminTokenPayload`
- **Problemas:**
  1. **Hardcoded JWT_SECRET** (linha 11): `'caminhar-com-deus-secret-key-2026'` é fallback quando `process.env.JWT_SECRET` não está definido. Isso é risco de segurança e pode mascarar configuração incorreta.
  2. `mockAuthLib` cria tokens e faz `jest.verify`/`jest.sign` inline, mas o `verifyToken` no mock sempre retorna o `mockUser` — ignora o token real passado, o que pode mascarar bugs de validação.
  3. `clearAuthCookies` usa `document.cookie.split(';')` em contexto onde `document` pode não estar definido (Node.js puro), podendo lançar ReferenceError.
  4. `defaultTokenPayload` e `adminTokenPayload` são exportados mas não utilizados internamente no arquivo — servem como referência externa, mas ocupam escopo sem uso interno claro.
- **Melhorias:** Remover fallback hardcoded do JWT_SECRET; lançar erro explícito se não estiver definido. Em `mockAuthLib`, documentar que `verifyToken` ignora o token real. Tornar `clearAuthCookies` defensivo com `typeof document !== 'undefined'`.
- **Duplicações:** `mockAuthenticatedAdmin` é essencialmente `mockAuthenticatedUser` com role override — correto e aceitável.
- **Código morto:** Nenhum. Todos os exports são utilizados externamente (verificado via grep nos testes).

---

#### helpers/console.js

- **Finalidade:** Utilitários para supressão controlada de saída de console e mock de funções globais durante testes.
- **Arquivos acionados:** Exportado via `helpers/index.js`. Utilizado por mais de 20 arquivos de teste (componentes e integração).
- **Resumo:** Exporta:
  - `suppressConsoleError()`: spy silencioso para `console.error`
  - `filterConsoleError(suppressList)`: spy que suprime apenas mensagens contendo padrões específicos da lista
  - `mockGlobalFetch()`: mock de `global.fetch` via atribuição direta (Jest spy não funciona em JSDOM), retorna mock com `.mockRestore()`
  - `createConfirmSpy(defaultValue)`: spy para `window.confirm`
- **Problemas:**
  1. `filterConsoleError` chama `console.error(...args)` dentro do `mockImplementation` para mensagens NÃO suprimidas — isso pode causar loop se o spy já estiver ativo (embora `jest.spyOn` seja configurado antes, então é seguro na prática, mas confuso).
  2. O JSDoc diz "comportamento inverso do allowList" mas a docstring dentro da função diz "os padrões listados são SILENCIADOS" — a nomenclatura é correta mas a explicação do "comportamento inverso" pode confundir leitores.
  3. `mockGlobalFetch` não salva referência para restauração em cenários onde múltiplos testes trocam o fetch sequencialmente.
- **Melhorias:** Simplificar a docstring removendo referência a "allowList" — apenas documentar que a lista contém padrões a suprimir. Adicionar tipo de retorno JSDoc mais preciso.
- **Duplicações:** Nenhuma.
- **Código morto:** Nenhum.

---

#### helpers/crud-test.js

- **Finalidade:** Abstrair padrões repetitivos de testes CRUD de API. Fornecer funções que geram suites de teste completas com assertions padrão (405, 401, 400, etc.).
- **Arquivos acionados:** `node-mocks-http`, `@jest/globals`. Exportado via `helpers/index.js`. Utilizado por `tests/integration/api/posts.test.js`, `musicas.test.js`, `videos.test.js`, `admin/posts.test.js`, `admin/musicas.test.js`, etc.
- **Resumo:** Exporta três funções de teste:
  - `testPublicGetEndpoint(handler, resourceConfig, customTests?)` — testa endpoints GET públicos (405, 400 paginação)
  - `testAdminCrudEndpoint(handler, resourceConfig, customTests?)` — testa endpoints CRUD admin (401 sem auth)
  - `testAdminGetEndpoint(handler, resourceConfig, customTests?)` — testa endpoints GET admin (401, 405)
  
  Cada função gera um `describe` com `it` embutido, recebendo testes customizados via callback `customTests({ handler, createMocks })`.
- **Problemas:**
  1. `testAdminCrudEndpoint` NÃO testa 405 — o código documenta que "middleware withAuth ocorre ANTES da verificação de método", mas isso é frágil: se a ordem do middleware mudar, o bug será silencioso.
  2. `testPublicGetEndpoint` tem `skipMethodNotAllowed` mas `testAdminGetEndpoint` não tem opção equivalente — inconsistência na API.
  3. `testAdminGetEndpoint` testa 405 sem autenticação, mas a justitiva do `testAdminCrudEndpoint` sugere que 405 deveria ser testado COM autenticação — há uma lacuna aqui.
  4. Função interna `capitalize` não é exportada mas é utilizada como dependência de todas as três funções — fica "escondida" no módulo.
- **Melhorias:** Adicionar opção `skipMethodNotAllowed` a `testAdminGetEndpoint`. Extrair `capitalize` para módulo de utils compartilhado ou exportá-la. Adicionar opção para testar 405 com autenticação em `testAdminCrudEndpoint`.
- **Duplicações:** A estrutura de `describe` com `customTests` é replicada nas três funções — aceitável dado que cada uma tem assertions padrão distintas.
- **Código morto:** Nenhum.

---

#### helpers/db-test.js

- **Finalidade:** Utilitários para testes de integração com PostgreSQL real (via Docker/Testcontainers). Gerencia conexões, transações e migrações.
- **Arquivos acionados:** `pg` (node-postgres), `child_process.execSync`, `../../scripts/utils/init-table-utils.js` (importa `validateIdentifier`). Importado por `tests/integration/domain/*.db.test.js`.
- **Resumo:** Exporta:
  - `isDockerAvailable()`: verifica variável `TEST_DATABASE_URL`
  - `createTestDb()`: cria pool de conexões PostgreSQL
  - `applyMigrations()`: executa `node scripts/migrate.js` via subprocess com timeout de 30s
  - `withTransaction(pool)`: inicia transação com rollback automático — retorna `{ query, rollback }`
  - `truncateAll(pool)`: limpa todas as tabelas públicas com validação de identificadores via `validateIdentifier`
- **Problemas:**
  1. `applyMigrations()` usa `execSync` para rodar script de migração — acopla o helper à estrutura de diretório do projeto (`scripts/migrate.js`) e ao subprocess, o que é frágil em ambientes onde o caminho relativo não é o esperado.
  2. `isDockerAvailable()` retorna falso apenas se `TEST_DATABASE_URL === '__docker_unavailable__'` — string mágica não documentada em nenhum outro lugar.
  3. `withTransaction` retorna função `rollback` mas não há commit — sempre assume rollback, o que é correto para testes mas pode surpreender.
  4. `truncateAll` itera sobre todas as tabelas públicas incluindo possivelmente tabelas de sistema ou de extensão (ex: `pg_*` via `schemaname = 'public'`) — geralmente seguro, mas depende do schema.
- **Melhorias:** Documentar a string mágica `__docker_unavailable__`. Adicionar opção para filtrar tabelas no `truncateAll`. Considerar aplicar migrações via API interna em vez de subprocess.
- **Duplicações:** Nenhuma.
- **Código morto:** Nenhum.

---

#### helpers/render.js

- **Finalidade:** Utilitários para renderização de componentes React em testes com Testing Library. Configura providers (Auth, Router, Toast) necessários para isolar componentes.
- **Arquivos acionados:** `react`, `@testing-library/react`, `@testing-library/user-event`, `next/router` (mockado), `react-hot-toast` (em `renderWithToast`), `../../hooks/AuthContext`. Exportado via `helpers/index.js`. Utilizado por mais de 30 arquivos de teste de componentes.
- **Resumo:** Exporta:
  - `renderWithProviders(ui, options)` — renderização básica sem providers (apenas wrapper vazio `<>...</>`)
  - `renderWithRouter(ui, options)` — renderização com mock completo de Next.js Router (pathname, query, push, replace, etc.)
  - `renderWithAuth(ui, options)` — renderização com `AuthContext.Provider` injetado
  - `renderWithToast(ui, options)` — renderização com `react-hot-toast` Toaster
  - `testLoadingState(ui, loadingTestId)` — helper para verificar estado de loading
  - `testErrorState(ui, errorMessage)` — helper para verificar mensagem de erro
  - `resizeWindow(w, h)`, `setMobileViewport()`, `setTabletViewport()`, `setDesktopViewport()` — simulação de viewport
  - `waitForAnimation(duration)`, `clickAndWait(user, element)`, `fillForm(user, fields)`, `clearForm(user, fieldLabels)` — helpers de interação
- **Problemas:**
  1. **Falso nome:** `renderWithProviders` não fornece providers — apenas renderiza com wrapper vazio. O nome sugere que providers são incluídos (Auth, Router, Toast), mas não são.
  2. `renderWithToast` usa `require('react-hot-toast')` dinâmico em vez de import estático — inconsistente com o resto do código e pode causar problemas em alguns ambientes de bundling.
  3. `testLoadingState` retorna `waitForLoadingToFinish` que espera o elemento APARECER (`findByTestId`) mas o nome sugere "esperar acabar" — semanticamente invertido.
  4. `fillForm` e `clearForm` usam `screen.getByLabelText(label) || screen.getByTestId(label)` — se nenhum dos dois existir, o erro lançado é pouco informativo.
  5. `resizeWindow` não restaura valores originais após teste — pode causar vazamento de estado entre testes.
- **Melhorias:** Renomear `renderWithProviders` para `renderBasic` ou similar. Corrigir semântica de `waitForLoadingToFinish` para aguardar desaparição do loading. Adicionar cleanup automático para `resizeWindow` via `afterEach`.
- **Duplicações:** Padrão `screen.getByLabelText(label) || screen.getByTestId(label)` aparece em `fillForm` e `clearForm` — poderia ser fatorado.
- **Código morto:** Nenhum.

---

#### matchers/index.js

- **Finalidade:** Barrel de matchers customizados do Jest. Importa todos os matchers para registrá-los via `expect.extend()`.
- **Arquivos acionados:** `./toHaveStatus.js`, `./toBeValidJSON.js`, `./toHaveHeader.js`, `./toBeISODate.js`, `./toHaveProperties.js`. Importado por `tests/setup.js` (linha 29) e `tests/setup.db.js` (linha 20).
- **Resumo:** Realiza imports side-effect de todos os matchers customizados, fazendo com que `expect.extend()` seja chamado automaticamente ao importar este módulo.
- **Problemas:**
  1. Não há validação se dois matchers definem o mesmo nome — colisão silenciosa de nomes pode ocorrer.
  2. Se um matcher falhar ao importar (erro de sintaxe, import circular), o erro é pouco informativo sem try/catch.
- **Melhorias:** Adicionar comentário documentando a ordem de importação (se relevante) e a necessidade de manter este arquivo sincronizado com novos matchers adicionados ao diretório.
- **Duplicações:** Nenhuma.
- **Código morto:** Nenhum.

---

#### matchers/toBeISODate.js

- **Finalidade:** Matcher customizado `toBeISODate` para verificar se uma string está em formato ISO 8601 válido. Também define `toBeValidDate` como matcher adicional.
- **Arquivos acionados:** Importado por `tests/matchers/index.js`. Utilizado em testes de API e domínio que verificam campos de data.
- **Resumo:** 
  - `toBeISODate(received)`: verifica se `received` é string, se corresponde ao regex ISO 8601 (`YYYY-MM-DDTHH:mm:ss(.sss)?(Z)?`), e se `new Date(received)` é uma data válida.
  - `toBeValidDate(received)`: aceita Date object, string ou number e verifica se resulta em data válida (sem regex de formato).
- **Problemas:**
  1. Regex ISO 8601 não aceita offset de timezone (ex: `+03:00` em vez de `Z`) — o `?` após `Z` torna Z opcional, mas não aceita outros offsets, o que pode falhar em datas de banco de dados PostgreSQL que usam `+00`.
  2. A validação `!isNaN(date.getTime())` aceita strings como `"2024-13-45T99:99:99"` que passam no regex? Não, porque o regex rejeita numericamente — mas há edge cases onde regex aceita mas data é inválida.
  3. O matcher `toBeValidDate` é definido no mesmo arquivo que `toBeISODate` — não há arquivo dedicado, o que viola a separação por matcher dos outros módulos.
- **Melhorias:** Mover `toBeValidDate` para arquivo próprio (`toBeValidDate.js`). Expandir regex para aceitar offset numérico (`+HH:MM` ou `-HH:MM`) se necessário.
- **Duplicações:** Nenhuma duplicação externa.
- **Código morto:** Nenhum.

---

#### matchers/toBeValidJSON.js

- **Finalidade:** Matcher `toBeValidJSON` para verificar se uma resposta contém JSON válido, opcionalmente comparando com estrutura esperada.
- **Arquivos acionados:** Importado por `tests/matchers/index.js`. Utilizado em testes de integração de API.
- **Resumo:** Extrai corpo da resposta de múltiplos formatos (`res.data`, `res._getData?.()`, `res.body`), faz parse se for string, e:
  - Sem argumentos: apenas valida se é JSON válido
  - Com argumento: verifica se dados contêm as propriedades esperadas via `expect.objectContaining(expected)`
- **Problemas:**
  1. A extração de corpo tenta `received.data` primeiro — se o objeto tiver um campo `data` que não seja o corpo HTTP (ex: `{ data: {...}, status: 200 }`), pode pegar o campo errado.
  2. `JSON.parse(body)` é chamado dentro de try/catch que apenas retorna `{ pass: false }` sem informação sobre qual formato falhou.
  3. A verificação `this.equals(data, expect.objectContaining(expected))` pode falhar silenciosamente se `data` for `null` ou não-objeto, pois `this.equals` pode retornar false sem razão clara.
- **Melhorias:** Melhorar mensagem de erro para indicar qual formato de extração foi utilizado. Adicionar verificação de null antes de `this.equals`.
- **Duplicações:** Lógica de extração de corpo similar à de `toBeValidJSON` pode aparecer em `getResponseBody` do `helpers/api.js` — mas são escopos diferentes.
- **Código morto:** Nenhum.

---

#### matchers/toHaveHeader.js

- **Finalidade:** Matcher `toHaveHeader` para verificar se uma resposta HTTP possui um header específico, opcionalmente com valor específico.
- **Arquivos acionados:** Importado por `tests/matchers/index.js`. Utilizado em testes de API.
- **Resumo:** Extrai headers de `received.headers`, `received.getHeaders?.()`, ou `received._getHeaders?.()`. Normaliza nome do header para lowercase. Se valor não especificado, verifica existência. Se especificado, verifica igualdade ou se valor está em array (útil para headers com múltiplos valores).
- **Problemas:**
  1. Busca em headers é case-insensitive apenas para lowercase e uppercase — não busca no caso original se o header estiver mixed-case (ex: `Content-Type`).
  2. A busca `headers[headerName] || headers[normalizedName] || headers[headerName.toUpperCase()]` pode retornar `undefined` para headers que existem mas têm valor `0` ou `""` (falsy) — embora raro para headers HTTP, é tecnicamente possível.
- **Melhorias:** Usar `Object.prototype.hasOwnProperty.call(headers, name)` em vez de acesso direto para evitar problemas com herança de protótipo.
- **Duplicações:** Nenhuma.
- **Código morto:** Nenhum.

---

#### matchers/toHaveProperties.js

- **Finalidade:** Matcher `toHaveProperties` para verificar se um objeto possui todas as propriedades listadas em um array.
- **Arquivos acionados:** Importado por `tests/matchers/index.js`. Utilizado em testes que verificam formato de retorno de API.
- **Resumo:** Aceita array de propriedades ou string única (convertida para array). Compara chaves do objeto recebido com lista de propriedades esperadas. Lista propriedades faltantes em mensagem de erro.
- **Problemas:**
  1. `typeof received === 'object' && received !== null` exclui arrays — um array `[]` seria convertido para `receivedKeys = Object.keys(received)` (índices numéricos), o que pode ser inesperado para quem passa um array.
  2. Não verifica propriedades aninhadas — apenas primeiro nível.
  3. Não suporta verificação de tipo de propriedade (apenas existência).
- **Melhorias:** Adicionar warning/documentação sobre comportamento com arrays. Considerar suporte opcional a paths aninhados (`toHaveProperties(['user.name'])`) para maior utilidade.
- **Duplicações:** Nenhuma.
- **Código morto:** Nenhum.

---

#### matchers/toHaveStatus.js

- **Finalidade:** Matcher `toHaveStatus` para verificar se uma resposta HTTP possui o código de status esperado.
- **Arquivos acionados:** Importado por `tests/matchers/index.js`. Utilizado extensivamente em todos os testes de API.
- **Resumo:** Extrai código de status de múltiplos formatos de resposta:
  - `received._getStatusCode()` (node-mocks-http)
  - `received.status` (fetch Response / Express)
  - `received.statusCode` (http.ServerResponse)
  - `received.statusCode` (fallback)
  - `undefined` (nenhum dos anteriores)
  
  Compara com `expected` e retorna resultado com mensagem formatada.
- **Problemas:**
  1. A cadeia de verificações é frágil: `typeof received.statusCode === 'number'` seguido de `received.statusCode !== undefined` nunca será alcançado se `statusCode` for número — mas se for string, cairá no else e atribuirá `status = received.statusCode` (string), quebrando a comparação `===` com número.
  2. A ordem de prioridade `_getStatusCode` > `status` > `statusCode` pode mascarar bugs onde o objeto tem ambos os campos mas com valores diferentes.
- **Melhorias:** Remover o quarto branch (`received.statusCode !== undefined`) pois é redundante — se `typeof !== 'number'` mas `!== undefined`, o valor é truthy mas não-numérico e deveria falhar com mensagem clara em vez de ser usado na comparação.
- **Duplicações:** Nenhuma.
- **Código morto:** Nenhum.

---

## Observações Gerais

#### Duplicidades entre arquivos
- **Parsing de corpo HTTP:** `getResponseBody` em `helpers/api.js` e extração em `matchers/toBeValidJSON.js` fazem parse similar — escopos diferentes mas lógica sobreponível.
- **Extração de headers:** `helpers/api.js:executeHandler` e `matchers/toHaveHeader.js` percorrem métodos similares (`getHeaders`, `_getHeaders`) — poderia ser fatorado.

#### Código morto
- Nenhum código morto detectado em nenhum dos arquivos analisados. Todas as funções exportadas são referenciadas por arquivos de teste no projeto.

#### Melhorias transversais
1. Consistência de barrel: `helpers/index.js` deveria exportar `async-polyfills.js` e `db-test.js` para unificar a API de importação.
2. Segurança: `helpers/auth.js` possui fallback hardcoded de JWT_SECRET — deveria lançar erro em vez de usar default.
3. Documentação: Matchers adicionais como `toBeValidDate` estão em arquivos de outro matcher (`toBeISODate.js`) — deveriam ter arquivo dedicado para manter a convenção do diretório.


---


## 3. Mocks e Setups


- **Finalidade:** Centralizar mocks para operações de cache (Redis/memória), especificamente o módulo `lib/cache/cache.js`.

- **Arquivos acionados:**
  - `lib/cache/cache.js` (módulo alvo)
  - Testes de integração que dependem de cache

- **Resumo:** Exporta:
  - `mockCacheModule(overrides)`: `getOrSetCache` executa a função de busca diretamente (sem cache), `checkRateLimit` retorna `false` (não rate-limited), `invalidateCache` é noop.
  - `resetCacheMocks(cacheMock)`: Reseta comportamentos padrão.

- **Problemas:**
  - `getOrSetCache` ignora o parâmetro `key` completamente — não permite testar comportamento real de cache hit/miss.
  - `checkRateLimit` sempre resolve `false` — impossível testar cenários de rate limit excedido sem override.
  - Não há mock para operações como `set`, `delete`, `get` individuais — o módulo real pode ter mais funções.

- **Melhorias:**
  - Adicionar opção `cacheHits` para simular hits/misses.
  - Adicionar `mockRateLimitExceeded()` para testar throttling.
  - Verificar se o módulo real exporta mais funções além das três mockadas.

- **Duplicidades:**
  - Nenhuma. Arquivo pequeno e focado.

- **Código morto:**
  - Nenhum.

---

#### mocks/db-module.js

- **Finalidade:** Mock centralizado para o módulo `lib/infra/db.js`, exportando exatamente as mesmas funções do módulo real (`query`, `resetPool`, `closeDatabase`, `transaction`, `healthCheck`, `getDatabaseInfo`).

- **Arquivos acionados:**
  - `lib/infra/db.js` (módulo alvo direto)
  - `tests/mocks/index.js` (re-exporta via `export * from './db-module.js'`)

- **Resumo:** Exporta:
  - `mockDb(overrides)`: Módulo completo com `query` retornando `{ rows: [], rowCount: 0 }`, `transaction` com simulação de BEGIN/COMMIT/ROLLBACK, `healthCheck` retornando `true`, `getDatabaseInfo` com dados fixos PostgreSQL 15.0.
  - `mockDbError(error)`: Variante que simula erro de conexão — `query` rejeita, `healthCheck` retorna `false`.
  - `resetDbMocks(dbMock)`: Limpa e reseta `query`.

- **Problemas:**
  - `transaction` mock executa `client.query('BEGIN')` mas o `client.query` interno também é mockado — chamadas reais dentro da transaction não são rastreadas.
  - `getDatabaseInfo` retorna `timestamp: new Date().toISOString()` — valor dinâmico que pode causar flaky tests se comparado diretamente.
  - `resetDbMocks` não reseta `transaction`, `healthCheck` ou `getDatabaseInfo` — apenas `query`.

- **Melhorias:**
  - Adicionar `mockDbConnectionError` separado de `mockDbError` para distinguir falha de conexão de falha de query.
  - Incluir `timestamp` fixo em `getDatabaseInfo` para estabilidade.
  - Reseta completo de todos os mocks em `resetDbMocks`.

- **Duplicidades:**
  - **Duplicidade com `mocks/db.js`:** Ambos mockam `query`, `transaction`, `pool`, `connect`. O `db-module.js` é mais focado no módulo específico `lib/infra/db.js`, enquanto `db.js` é um helper genérico com builders (`mockQuery`, `mockInsert`, etc.). A lógica de `transaction` é duplicada quase identicamente.
  - O `mockPool` de `db.js` (linha 127-138) é similar ao `client` criado dentro de `transaction` em `db-module.js`.

- **Código morto:**
  - Nenhum. Funções são usadas por testes ou re-exportadas.

---

#### mocks/db.js

- **Finalidade:** Fornecer builders genéricos para mocks de banco de dados — funções auxiliares para criar mocks de query com comportamentos específicos (INSERT, UPDATE, DELETE, paginação, sequência).

- **Arquivos acionados:**
  - `tests/mocks/index.js` (re-exporta)
  - Testes unitários que precisam de mocks de query customizados

- **Resumo:** Exporta:
  - `mockQuery(returnValue)`: Mock genérico que retorna `{ rows, rowCount, command }` derivado do returnValue.
  - `mockQueryOne(row)`, `mockQueryMany(rows)`: Atalhos para `mockQuery`.
  - `mockQueryError(error)`: Mock que rejeita com erro.
  - `mockInsert(insertedRow)`, `mockUpdate(updatedRow)`, `mockDelete(deletedId)`: Mocks específicos para operações CRUD com `command` fixo.
  - `mockTransaction(callback)`: Mock de transaction com client, BEGIN/COMMIT/ROLLBACK.
  - `mockPool(options)`: Mock de pool de conexões.
  - `queryWasCalledWith(queryMock, pattern)`: Verifica se query foi chamada com padrão.
  - `getQueryParams(queryMock, callIndex)`: Obtém parâmetros de uma chamada.
  - `mockDbModule(options)`: Módulo db mockado completo (similar ao `db-module.js`).
  - `mockPaginatedResult(data, page, limit)`: Simula paginação.
  - `clearQueryMocks(...queryMocks)`: Limpa múltiplos mocks.
  - `mockQuerySequence(responses)`: Mock com respostas sequenciais.

- **Problemas:**
  - `mockQuery` extrai `command` via `_query.trim().split(' ')[0].toUpperCase()` — frágil para queries que começam com comentos ou parênteses.
  - `mockInsert` sempre adiciona `id: 1` se não fornecido — pode mascarar bugs de missing ID.
  - `mockUpdate` e `mockDelete` sempre retornam `rowCount: 1` — impossível testar cenários de linha não encontrada sem override.
  - `mockQuerySequence` repete a última resposta após esgotar a lista — pode esconder bugs de chamadas inesperadas.

- **Melhorias:**
  - Adicionar opção `rowCount` parametrizável em `mockInsert`/`mockUpdate`/`mockDelete`.
  - Melhorar extração de `command` para lidar com comentários SQL.
  - Documentar comportamento de repetição da última resposta em `mockQuerySequence`.

- **Duplicidades:**
  - **Duplicidade com `mocks/db-module.js`:** `mockDbModule` (linha 173-183) é similar a `mockDb` de `db-module.js`. A lógica de `transaction` é duplicada (linhas 103-120 vs 19-34 de db-module.js). `mockPool` é duplicado.
  - `mockQuerySequence` é similar a `mockFetchSequence` de `fetch.js` — padrão repetido.

- **Código morto:**
  - Nenhum. Todas as exportações são úteis.

---

#### mocks/fetch.js

- **Finalidade:** Centralizar mocks para requisições HTTP via `global.fetch`, fornecendo builders para cenários de sucesso, erro, 404, 401, 500, network error e roteamento por URL.

- **Arquivos acionados:**
  - `tests/mocks/index.js` (re-exporta)
  - Testes que dependem de chamadas fetch (client-side ou API routes)

- **Resumo:** Exporta:
  - `mockFetch(response, options)`: Mock base com `ok`, `status`, `headers`, `json()`, `text()`, `blob()`, `arrayBuffer()`, `formData()`, `clone()`.
  - `mockFetchSuccess(data, options)`: Atalho para sucesso 200.
  - `mockFetchError(status, error, options)`: Atalho para erro com status customizável.
  - `mockFetchNotFound()`, `mockFetchUnauthorized()`, `mockFetchServerError()`: Atalhos para erros comuns.
  - `mockFetchNetworkError(message)`: Mock que rejeita (simula falha de rede).
  - `mockFetchWithRoutes(urlMap, defaultResponse)`: Roteamento por URL/regex.
  - `mockFetchSequence(responses)`: Respostas sequenciais.
  - `fetchDelay(ms)`: Helper para delays.
  - `setupFetchMock(mockImpl)`, `clearFetchMock()`: Setup/cleanup do `global.fetch`.
  - `fetchWasCalledWith(fetchMock, url)`: Verifica URL chamada.
  - `getLastFetchCall(fetchMock)`: Obtém última chamada.

- **Problemas:**
  - `mockFetch` retorna `text()` como `JSON.stringify(result)` — incompatível com respostas que não são JSON (HTML, texto puro).
  - `clone()` retorna novo mockFetch recursivamente — pode causar stack overflow se clonado muitas vezes.
  - `mockFetchSequence` repete última resposta após esotar lista (similar a `mockQuerySequence`).
  - `setupFetchMock` não usa `jest.fn()` wrapper — substitui diretamente `global.fetch`.

- **Melhorias:**
  - Permitir `text()` retornar string customizada para respostas não-JSON.
  - Adicionar opção para `mockFetchSequence` lançar erro ao invés de repetir última resposta.
  - Usar `jest.fn()` em `setupFetchMock` para permitir asserções.

- **Duplicidades:**
  - Padrão `mockFetchSequence` é similar a `mockQuerySequence` de `db.js`.
  - Padrão `fetchWasCalledWith` é similar a `queryWasCalledWith` de `db.js`.

- **Código morto:**
  - Nenhum.

---

#### mocks/index.js

- **Finalidade:** Ponto de entrada centralizado para todos os mocks reutilizáveis, permitindo import único `import { mockUseRouter, mockFetch } from '../mocks'`.

- **Arquivos acionados:**
  - Todos os outros arquivos em `tests/mocks/` (next, fetch, db, cache, auth, db-module)

- **Resumo:** Re-exporta tudo de `next.js`, `fetch.js`, `db.js`, `cache.js`, `auth.js` e `db-module.js` via `export *`.

- **Problemas:**
  - **Conflito de nomes:** `mockDbModule` é exportado por `db.js` E `db-module.js` — o último sobrescreve o primeiro. Testes que importam de `mocks/index.js` podem receber implementação errada.
  - `setupNextMocks` de `next.js` é re-exportado mas está deprecated — confunde consumidores.

- **Melhorias:**
  - Renomear `mockDbModule` de `db.js` para `mockDbGeneric` ou similar para evitar conflito.
  - Remover re-exportação de `setupNextMocks` deprecated.
  - Adicionar comentário sobre a ordem de precedência dos `export *`.

- **Duplicidades:**
  - O conflito `mockDbModule` mencionado é uma duplicidade de exportação.

- **Código morto:**
  - A re-exportação de `setupNextMocks` é efetivamente código morto (deprecated e não usado pelo next-setup.js).

---

#### mocks/next-setup.js

- **Finalidade:** Centralizar os `jest.mock()` para módulos do Next.js, eliminando duplicação em dezenas de arquivos de teste. Basta importar este arquivo no início do teste.

- **Arquivos acionados:**
  - `tests/mocks/next.js` (importa `mockNextImage`, `mockNextLink`, `mockNextHead`, `mockNextScript`, `mockNextDynamic`)
  - Módulos do Next.js: `next/router`, `next/navigation`, `next/image`, `next/link`, `next/head`, `next/script`, `next/dynamic`, `next/headers`, `next/server`

- **Resumo:** Registra `jest.mock()` para:
  - `next/router`: `useRouter` com router completo (pathname, query, push, replace, events, i18n).
  - `next/navigation`: `useRouter` (App Router), `usePathname`, `useSearchParams`, `useParams`, `redirect`, `notFound`, `permanentRedirect`.
  - `next/image`, `next/link`, `next/head`, `next/script`, `next/dynamic`: Usam componentes mockados de `next.js`.
  - `next/headers`: `headers()` e `cookies()` assíncronos.
  - `next/server`: Preserva módulo original mas mocka `NextResponse.json`, `NextResponse.redirect`, `NextResponse.next`.

- **Problemas:**
  - **Duplicação de `useRouter`:** O `useRouter` de `next/router` (linha 27-47) é similar ao `mockUseRouter` de `next.js` (linha 13-42). O next-setup.js define inline ao invés de reutilizar `mockUseRouter`.
  - **Duplicação de headers/cookies:** O next-setup.js define headers/cookies inline ao invés de usar `mockNextHeaders`/`mockNextCookies` de `next.js`.
  - **Sem reset:** Não há função para resetar mocks entre testes — depende do `jest.clearAllMocks()` do setup.js.
  - **`next/server` mock incompleto:** Preserva original mas mocka apenas três métodos — pode quebrar se código usar outros métodos de `NextResponse`.

- **Melhorias:**
  - Reutilizar `mockUseRouter` de `next.js` em vez de duplicar.
  - Reutilizar `mockNextHeaders`/`mockNextCookies` de `next.js`.
  - Adicionar `resetNextMocks()` para consistência com outros módulos.

- **Duplicidades:**
  - `useRouter` inline duplica lógica de `mockUseRouter` de `next.js`.
  - `headers()`/`cookies()` inline duplicam `mockNextHeaders`/`mockNextCookies` de `next.js`.

- **Código morto:**
  - Nenhum neste arquivo, mas ele referencia funções que têm código morto em `next.js`.

---

#### mocks/next.js

- **Finalidade:** Fornecer builders individuais para mocks de componentes e hooks do Next.js — `useRouter`, `Image`, `Link`, `Head`, `Script`, `dynamic`, `getServerSideProps`, `getStaticProps`, `getStaticPaths`, `headers`, `cookies`.

- **Arquivos acionados:**
  - `tests/mocks/next-setup.js` (usa `mockNextImage`, `mockNextLink`, `mockNextHead`, `mockNextScript`, `mockNextDynamic`)
  - `tests/mocks/index.js` (re-exporta tudo)

- **Resumo:** Exporta:
  - `mockUseRouter(options)`: Builder parametrizável de router mockado.
  - `mockNextImage`, `mockNextLink`, `mockNextHead`, `mockNextScript`, `mockNextDynamic`: Componentes React mockados.
  - `mockGetServerSideProps`, `mockGetStaticProps`, `mockGetStaticPaths`: Builders para data fetching.
  - `mockNextHeaders(headers)`, `mockNextCookies(cookies)`: Builders parametrizáveis.
  - `setupNextMocks()`: **@deprecated** — substituído pelo `next-setup.js`.

- **Problemas:**
  - **`setupNextMocks()` deprecated:** A função existe mas está marcada como deprecated. Os `jest.mock()` dentro dela não têm factory function — criam mocks vazios sem comportamento.
  - **Funções potencialmente não usadas:** `mockGetServerSideProps`, `mockGetStaticProps`, `mockGetStaticPaths` não são referenciadas em `next-setup.js` nem no `index.js` de forma explícita.
  - **`mockNextHeaders`/`mockNextCookies` não usados:** O `next-setup.js` implementa sua própria versão inline em vez de usar estes builders.
  - **`mockNextDynamic` assíncrono:** Usa `useEffect` para carregar componente — pode causar warnings de act() em testes síncronos.

- **Melhorias:**
  - Remover `setupNextMocks()` deprecated.
  - Verificar se `mockGetServerSideProps`, `mockGetStaticProps`, `mockGetStaticPaths` são usados em algum teste — se não, remover.
  - Fazer `next-setup.js` usar `mockNextHeaders`/`mockNextCookies` em vez de duplicar lógica.

- **Duplicidades:**
  - `mockUseRouter` é duplicado inline no `next-setup.js`.
  - `mockNextHeaders`/`mockNextCookies` são duplicados inline no `next-setup.js`.

- **Código morto:**
  - `setupNextMocks()` (linhas 205-213) — deprecated e substituído pelo next-setup.js.
  - `mockGetServerSideProps`, `mockGetStaticProps`, `mockGetStaticPaths` — possivelmente não usados.
  - `mockNextHeaders`, `mockNextCookies` — possivelmente não usados (next-setup.js tem versão própria).

---

#### mocks/next.test.js

- **Finalidade:** Teste de sanidade para verificar se os mocks do Next.js (`next-setup.js` e `next.js`) estão funcionando corretamente. Deve ser executado após atualizações do Next.js para detectar quebras silenciosas.

- **Arquivos acionados:**
  - `tests/mocks/next-setup.js` (importado no topo para registrar mocks)
  - Módulos do Next.js via `jest.requireMock()` e `await import()`

- **Resumo:** Testa:
  - `next/router`: Verifica se `useRouter` é função e retorna propriedades esperadas (pathname, push, replace, reload, back, events, isReady).
  - `next/navigation`: Verifica exports (useRouter, usePathname, useSearchParams, useParams, redirect, notFound, permanentRedirect) e valores padrão.
  - `next/image`: Renderiza e verifica elemento `img` com src/alt/width/height.
  - `next/link`: Renderiza e verifica elemento `a` com href.
  - `next/head`: Renderiza e verifica título.
  - `next/script`: Renderiza e verifica elemento `script` com src.
  - `next/headers`: Verifica se headers/cookies são funções assíncronas com métodos.

- **Problemas:**
  - **`next/head` teste frágil:** Verifica `document.title` mas o mock `mockNextHead` renderiza children como Fragment — o `document.title` só é atualizado se o browser processar `<title>`. Pode funcionar no JSDOM mas é frágil.
  - **Não testa `next/dynamic`:** Faltam testes para `mockNextDynamic`.
  - **Não testa `next/server`:** Faltam testes para `NextResponse` mockado.
  - **`jest.requireMock` vs `await import`:** Usa ambas as abordagens de forma inconsistente — `next/router` usa `jest.requireMock`, outros usam `await import`.

- **Melhorias:**
  - Adicionar testes para `next/dynamic` e `next/server`.
  - Padronizar abordagem de import (usar apenas `jest.requireMock` ou apenas `await import`).
  - Verificar se `next/head` teste é realmente efetivo ou se passa sempre.

- **Duplicidades:**
  - Nenhuma duplicação — é o único arquivo de teste de sanidade para mocks.

- **Código morto:**
  - Nenhum.

---

#### global-setup.db.js

- **Finalidade:** Global setup do Jest para testes de integração com PostgreSQL real via Testcontainers. Inicializa container Docker antes de todos os testes e disponibiliza `TEST_DATABASE_URL`.

- **Arquivos acionados:**
  - `@testcontainers/postgresql` (biblioteca de containers)
  - Testes de integração que usam banco real

- **Resumo:** Exporta função `globalSetup()` que:
  - Inicia `PostgreSqlContainer` com database `caminhar_user`, username/password `test`, com reuse.
  - Define `process.env.TEST_DATABASE_URL` com URI de conexão.
  - Salva referência em `global.__TEST_DB_CONTAINER__` para teardown.
  - Em caso de falha (Docker indisponível), define `TEST_DATABASE_URL = '__docker_unavailable__'` e loga warning.

- **Problemas:**
  - **`withReuse(true)` risco:** Reutilizar container entre execuções pode causar contaminação de estado se testes anteriores sujarem o banco.
  - **Sem skip automático:** Quando Docker indisponível, `TEST_DATABASE_URL` é `'__docker_unavailable__'` mas não há mecanismo para pular testes — testes falharão com URI inválida.
  - **`global.__TEST_DB_CONTAINER__` não tipado:** Variável global sem tipo definido pode causar confusão.
  - **Sem timeout:** Não há timeout para o start do container — pode pendergar indefinidamente.
  - **Sem teardown reference:** Salva container em global mas não exporta função de teardown — o teardown deve ser feito em outro arquivo.

- **Melhorias:**
  - Adicionar `globalTeardown` para parar o container ao final.
  - Adicionar timeout para start do container.
  - Quando Docker indisponível, pular testes via `test.skip()` ou similar.
  - Documentar que `withReuse` requer limpeza manual entre execuções.
  - Considerar usar `--no-reuse` em CI para evitar contaminação.

- **Duplicidades:**
  - Nenhuma — é o único global setup.

- **Código morto:**
  - Nenhum.

---

#### setup.db.js

- **Finalidade:** Setup específico para testes de integração com PostgreSQL real em ambiente `node` (sem JSDOM). Versão enxuta do `setup.js` sem polyfills DOM.

- **Arquivos acionados:**
  - `./matchers/index.js` (custom matchers)
  - Testes de integração com banco real

- **Resumo:** Configura:
  - Polyfills de `ReadableStream` e `MessageChannel`/`MessagePort` (necessários para testcontainers/undici).
  - Filtro de `console.error` para warnings conhecidos (KNOWN_API_WARNINGS).
  - `afterEach` com `jest.clearAllMocks()`.
  - Logs de debug.

- **Problemas:**
  - **Duplicação com `setup.js`:** O filtro de `console.error` (linhas 55-70) é similar ao de `setup.js` (linhas 139-181), mas com menos filtros (apenas KNOWN_API_WARNINGS).
  - **Polyfills inline vs helper:** `setup.js` usa `helpers/async-polyfills.js` enquanto `setup.db.js` implementa polyfills inline — duplicação de lógica.
  - **`KNOWN_API_WARNINGS` duplicado:** A lista é definida em `setup.db.js` e `setup.js` — deveria ser compartilhada.
  - **Sem `cleanup()` do RTL:** Diferente de `setup.js`, não chama `cleanup()` do React Testing Library — pode causar vazamento de memória em testes de componente no ambiente node (embora seja incomum).

- **Melhorias:**
  - Extrair `KNOWN_API_WARNINGS` para módulo compartilhado.
  - Usar helper `async-polyfills.js` em vez de polyfills inline.
  - Adicionar mais filtros de console consistentes com `setup.js`.
  - Considerar se `cleanup()` do RTL é necessário neste ambiente.

- **Duplicidades:**
  - `KNOWN_API_WARNINGS` é igual ao de `setup.js`.
  - Polyfills de `ReadableStream` e `MessageChannel` são iguais aos de `setup.js` (via helper).
  - Filtro de `console.error` é versão simplificada do `setup.js`.

- **Código morto:**
  - Nenhum.

---

#### setup.js

- **Finalidade:** Setup centralizado principal para todos os testes (ambiente JSDOM). Configura polyfills, React Testing Library, custom matchers, mocks globais, filtros de console e cleanup automático.

- **Arquivos acionados:**
  - `./helpers/async-polyfills.js` (polyfills assíncronos)
  - `@testing-library/jest-dom` (matchers DOM)
  - `@testing-library/react` (configure, cleanup)
  - `./matchers/index.js` (custom matchers)

- **Resumo:** Configura:
  - **Polyfills síncronos:** `TextEncoder`, `TextDecoder`, `localStorage`, `matchMedia`, `IntersectionObserver`, `ResizeObserver`, `scrollTo`, `crypto.randomUUID`, `URL.revokeObjectURL`.
  - **Polyfills assíncronos:** Via `setupAsyncPolyfills()` helper (ReadableStream, MessageChannel).
  - **React Testing Library:** `configure()` com timeout 5000ms e custom `getElementError`.
  - **Custom matchers:** Importa `./matchers/index.js`.
  - **Filtro de `console.error`:** Suprime React deprecation warnings, API warnings, intentional auth errors e React rendering warnings.
  - **Cleanup:** `afterEach` com `cleanup()` e `jest.clearAllMocks()`.
  - **Utilidades globais:** `global.wait(ms)` para delays, `global.suppressWarnings(fn, patterns)` para suppressão temporária.

- **Problemas:**
  - **Código comentado (linhas 230-232):** Logs de debug descomentados — código morto.
  - **`KNOWN_API_WARNINGS` duplicado:** Lista igual à de `setup.db.js`.
  - **`IntersectionObserver` com timer:** Usa `setTimeout(callback, 0)` para simular interseção imediata — pode causar warnings de act() se não for limpo.
  - **`global.crypto` substituição:** Define `crypto` inteiro com apenas `randomUUID` — pode quebrar código que usa outros métodos de crypto.
  - **Filtro de console frágil:** Usa `args[0].includes(pattern)` — não lida com múltiplos argumentos ou objetos.
  - **`getElementError` não usa `_container`:** Parâmetro prefixado com `_` indica não usado — deveria ser removido ou utilizado.

- **Melhorias:**
  - Remover logs de debug comentados.
  - Extrair `KNOWN_API_WARNINGS`, `REACT_DEPRECATION_WARNINGS`, etc. para módulo compartilhado com `setup.db.js`.
  - Melhorar `IntersectionObserver` para não usar timer automático (ou limpar no afterEach).
  - Preservar métodos existentes de `crypto` ao invés de substituir objeto inteiro.
  - Considerar usar `jest.spyOn` em vez de substituir `console.error` diretamente.

- **Duplicidades:**
  - `KNOWN_API_WARNINGS` duplicado em `setup.db.js`.
  - Polyfills de `ReadableStream`/`MessageChannel` são compartilhados via helper, mas `setup.db.js` duplica inline.
  - Filtro de `console.error` é versão expandida do `setup.db.js`.

- **Código morto:**
  - Linhas 230-232: Logs de debug comentados.

---


---


## 3.1. Infraestrutura Complementar


#### Finalidade
Inicializa um container PostgreSQL real (via Testcontainers) antes de todos os testes, disponibilizando `TEST_DATABASE_URL` via `process.env` para os testes de integração. Projeto pensado para testes de banco reais.

#### Estrutura
- Exporta função `globalSetup()` assícnrona (padrão Jest Global Setup).
- Usa `PostgreSqlContainer` com `withReuse(true)` para performance entre execuções.
- Salva referência em `global.__TEST_DB_CONTAINER__` para teardown posterior.
- Em falha de Docker, define `TEST_DATABASE_URL = '__docker_unavailable__'` (sentinela).

#### Problemas identificados
1. **Ausência de teardown** — não existe `globalTeardown` neste arquivo. A referência `global.__TEST_DB_CONTAINER__` é salva mas não é parada automaticamente, podendo deixar containers órfãos.
2. **`withReuse(true)` sem condição** — o reuse persiste containers entre execuções; pode causar conflito de portas em ambientes CI paralelos ou em execuções simultâneas.
3. **Sentinela mágica** — `'__docker_unavailable__'` é uma string hardcoded que exige conhecimento tácito dos testes que a consomem; melhor seria um booleano como `TEST_DB_AVAILABLE=false` ou um módulo compartilhado.
4. **Timeout implícito** — o `PostgreSqlContainer().start()` pode demorar muito em CI frio; sem `timeout` configurado, o Jest aborta com timeout global.

#### Melhorias sugeridas
- Criar `tests/global-teardown.db.js` que faz `await global.__TEST_DB_CONTAINER__.stop()`.
- Tornar `withReuse` condicional via env var (ex: `TESTCONTAINERS_REUSE`).
- Adicionar `{ timeout: 120000 }` ao container.
- Extrair a sentinela para constante compartilhada (`tests/constants.js`).

#### Código morto / duplicações
- Nenhum código morto. A função é enxuta e faz o que promete.

---


#### Finalidade
Aplica polyfills assíncronos (`ReadableStream`, `MessageChannel`, `MessagePort`) necessários para undici/fetch funcionarem em Node/JSDOM. Projeto **idempotente** — usa promise lazy para evitar re-execução.

#### Estrutura
- Variável de módulo `polyfillsPromise` mantém a promise singleton.
- `setupAsyncPolyfills()` exportada; pode ser chamada por setup/teardown sem conflito.
- Cada polyfill verifica existência antes de aplicar; faz `try/catch` com `console.warn` em falha.

#### Problemas identificados
1. **Falta de `structuredClone`** — em Node < 17 ou JSDOM antigo, `structuredClone` está ausente e é requerido por `fetch`/`Response`. Deveria constar no polyfill.
2. **`MessagePort` poluindo global** — sobrescrever `globalThis.MessagePort` pode conflitar com bibliotecas que esperam API diferente.
3. **Sem reset entre testes** — como é idempotente, não há forma de "limpar" os polyfills em teardown sem matar o processo.

#### Melhorias sugeridas
- Adicionar polyfill de `structuredClone` via `node:worker_threads` ou implementação inline.
- Exportar função `cleanupAsyncPolyfills()` que restaura valores originais (para teardown rigoroso).
- Trocar `console.warn` por `console.debug` para não poluir output em CI.

#### Código morto / duplicações
- Nenhum código morto. Tudo é utilizado.

---


#### Finalidade
Helpers de renderização para testes de componentes React, oferecendo 4 variações de wrapper com providers (básico, router, autenticação, toast) e helpers auxiliares (loading, error, viewport, animação, formulário).

#### Estrutura
- `renderWithProviders` — wrapper vazio (não injeta providers reais, apenas children). **Possível armadilha**: nome sugere providers reais mas não entrega nenhum.
- `renderWithRouter` — injeta mock do `next/router` com defaults razoáveis.
- `renderWithAuth` — injeta `AuthContext.Provider` com mock completo (user, login, logout).
- `renderWithToast` — injeta `<Toaster />` do react-hot-toast.
- `testLoadingState`, `testErrorState` — helpers de estado.
- `resizeWindow`, `setMobileViewport`, `setTabletViewport`, `setDesktopViewport` — simulação viewport.
- `waitForAnimation`, `clickAndWait`, `fillForm`, `clearForm` — helpers de interação.

#### Problemas identificados
1. **`renderWithProviders` é enganoso** — o wrapper `<>{children}</>` não adiciona providers reais; apenas delega ao `renderWithRouter`/`renderWithAuth` indiretamente. Pode confundir quem espera providers globais (Redux, QueryClient, Theme, etc.).
2. **`jest.mock('next/router')` no nível do módulo** — este mock é aplicado a TODOS os arquivos que importarem `render.js`, mesmo que o teste precise de outro comportamento. Viola o princípio de mock local.
3. **Duplicação com `tests/mocks/next-setup.js`** — há um mock centralizado de Next.js no `mocks/next-setup.js`; este arquivo duplica parte desse mock (apenas `useRouter`).
4. **`fillForm`/`clearForm`** — `screen.getByLabelText(label) || screen.getByTestId(label)` é uma cadeia frágil; `getByLabelText` lança erro antes de testar `getByTestId`, a menos que use variante `queryByLabelText`.
5. **Viewport mock incompleto** — `window.innerWidth` não afeta Media Queries; testes de responsividade exigem `window.matchMedia` mockado, que não está presente.
6. **`renderWithToast` usa `require` dinâmico** — desnecessário; basta import estático. O `require` impede tree-shaking e dificulta análise estática.

#### Melhorias sugeridas
- Renomear `renderWithProviders` para `renderBare` ou documentar explicitamente que não há providers.
- Mover o `jest.mock('next/router')` para um parâmetro `mockRouter: true` no options ou remover e confiar no `next-setup.js`.
- Corrigir `fillForm` para `screen.queryByLabelText(label) ?? screen.queryByTestId(label)`.
- Adicionar `window.matchMedia` mock.
- Importar `react-hot-toast` estaticamente.

#### Código morto / duplicações
- **`testErrorState`** — assinatura `(ui, errorMessage)` retorna boolean, mas no RTL é mais idiomático usar `screen.queryByText` diretamente nos testes. O helper raramente é usado (provavelmente nenhum outro arquivo o importa).
- Duplicação do mock de `next/router` com `mocks/next-setup.js`.

---


#### Finalidade
Dois matchers Jest customizados:
- `toBeISODate()` — verifica se string está em formato ISO 8601.
- `toBeValidDate()` — verifica se valor é data válida (Date, string, ou número).

#### Estrutura
- `toBeISODate`: regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$` + validação via `new Date()`.
- `toBeValidDate`: converte para Date e verifica `!isNaN(date.getTime())`.

#### Problemas identificados
1. **Regex excessivamente restritiva** — rejeita formatos ISO 8601 válidos como `2024-01-15` (data apenas), `2024-01-15T10:30:00-03:00` (com offset de timezone), `20240115T103000Z` (formato básico).
2. **Aceita datas absurdas** — a regex permite `2024-99-99T99:99:99Z` pois verifica formato mas `new Date('2024-99-99T99:99:99Z')` retorna `Invalid Date`, então funciona. Porém `2024-02-30T00:00:00Z` (30 de fevereiro) passa em ambas validações porque JS normaliza para 1º de março sem erro.
3. **`toBeValidDate` aceita timestamps negativos** — `new Date(-1)` é válida historicamente, o que pode não ser desejado.
4. **Mensagens negativas confusas** — `message: () => 'expected ... not to be ...'` quando pass=true pode ser de difícil leitura.

#### Melhorias sugeridas
- Aceitar offset de timezone: regex `/Z|[+-]\d{2}:\d{2}$/` no lugar do `Z?` final.
- Adicionar validação de faixas mês/dia opcional (ex: `0[1-9]|1[0-12]`).
- Separar os dois matchers em arquivos distintos para melhor descoberta e tree-shaking.
- Adicionar `this.isNot` no contexto para melhorar mensagens de negação.

#### Código morto / duplicações
- Nenhum código morto. Ambos os matchers estão definidos no mesmo arquivo, o que é aceitável mas não ideal.

---


#### Finalidade
Matcher `toBeValidJSON(expected?)` que verifica se uma resposta contém JSON válido. Suporta verificação parcial quando `expected` é fornecido.

#### Estrutura
- Extrai corpo de `received.data`, `received._getData()`, `received.body` ou usa direto.
- Parseia com `JSON.parse` se string.
- Se `expected` definido, verifica via `expect.objectContaining(expected)`.

#### Problemas identificados
1. **Múltiplas tentativas de extração** — a lógica `received.data || received._getData?.() || received.body || received` é frágil; pode pegar `_getData` indefinido e lançar TypeError em vez de passar para próximo fallback.
2. **`_getData` e `_getHeaders`** — métodos privados de `node-mocks-http`; acoplamento frágil com implementação interna.
3. **Sem verificação de `received` null/undefined** — lança `TypeError` em vez de mensagem de matcher clara.
4. **`pass: true` quando `expected === undefined`** — retorna `{ pass: true }` mesmo que o objeto parseado esteja vazio. Não há verificação de que o parseamento realmente produziu algo válido.

#### Melhorias sugeridas
- Adicionar guard `if (received == null)` com mensagem clara.
- Extrair lógica de extração para helper reutilizável entre `toBeValidJSON` e `toHaveHeader`.
- Verificar se `data` parseada é objeto/array não-vazio.

#### Código morto / duplicações
- Nenhum código morto. Mas há duplicação da lógica de extração de response body com `toHaveHeader.js`.

---


#### Finalidade
Matcher `toHaveHeader(headerName, expectedValue?)` que verifica existência (e opcionalmente valor) de header HTTP em diferentes formatos de resposta.

#### Estrutura
- Extrai headers de `received.headers`, `received.getHeaders()`, `received._getHeaders()` ou `{}`.
- Normaliza nome do header para lowercase.
- Busca valor original, lowercase, e uppercase.

#### Problemas identificados
1. **Busca case-insensitive incompleta** — testa `headerName`, `headerName.toLowerCase()`, e `headerName.toUpperCase()`, mas não `headerName.charAt(0).toUpperCase() + headerName.slice(1).toLowerCase()` (padrão `Content-Type`).
2. **Headers podem ser string ou array** — `http.OutgoingMessage` permite múltiplos valores como array; a busca por `toUpperCase` retorna array, e `actualValue === expectedValue` falha.
3. **Headers numéricos** — `content-length` é número em alguns mocks; a comparação `===` falha se expectedValue for string `"123"` mas actual for `123`.
4. **Mensagem de negação** — não diferencia "header não existe" de "header existe mas valor diferente".

#### Melhorias sugeridas
- Usar `Object.keys(headers).find(k => k.toLowerCase() === normalizedName)` para case-insensitive real.
- Converter ambos os lados para string antes de comparar.
- Adicionar mensagem de erro mais específica ("header não encontrado" vs "valor diferente").

#### Código morto / duplicações
- Lógica de extração de headers duplicada com `toBeValidJSON.js` (extração de response body). Ambos poderiam compartilhar `getResponseMeta(response)`.

---


#### Finalidade
Matcher `toHaveProperties(properties)` verifica se objeto possui todas as propriedades listadas.

#### Estrutura
- Normaliza `properties` para array.
- Filtra chaves existentes e retorna `missing.length === 0`.

#### Problemas identificados
1. **Verifica apenas próprias enumeráveis** — `Object.keys()` não inclui propriedades herdadas nem symbol. Para objetos planos do backend isso é OK, mas documentação deveria mencionar.
2. **Aceita `null` como received** — trata como `receivedKeys = []` sem mensagem específica.
3. **Não verifica valores undefined** — `{ name: undefined }` passa em `toHaveProperties(['name'])`. Deveria distinguir "chave existe" de "chave tem valor definido".
4. **Sem suporte a nested paths** — `toHaveProperties(['user.name'])` não funciona; seria útil para APIs.

#### Melhorias sugeridas
- Adicionar opção `{ allowUndefined: false }` para rejeitar `undefined`.
- Mensagem diferenciando "received null" vs "received array".
- Documentar limitação de propriedades herdadas.

#### Código morto / duplicações
- Nenhum código morto.

---


#### Finalidade
Matcher `toHaveStatus(expected)` verifica código de status HTTP em diferentes formatos de resposta (node-mocks-http, fetch Response, http.ServerResponse).

#### Estrutura
- Tenta `_getStatusCode()` (node-mocks-http), depois `.status` (fetch/express), depois `.statusCode`.
- Suporta encadeamento: `received.statusCode` verifica number e truthy separadamente.

#### Problemas identificados
1. **Lógica de statusCode redundante** — linhas 21-25 verificam `typeof received.statusCode === 'number'` e depois `received.statusCode !== undefined`, que é redundante se já caiu no primeiro caso.
2. **Sem suporte a `received.status()`** — alguns frameworks (supertest com callback) usam `res.status` como função.
3. **Status 0 ou falsy** — `received.statusCode !== undefined` aceita `0` e `false` como status válido, o que é incorreto (HTTP status 0 não existe).
4. **Mensagem mostra `undefined`** — se nenhum formato é reconhecido, mostra `received undefined` que é confuso.

#### Melhorias sugeridas
- Simplificar para `status = _getStatusCode?.() ?? received.status ?? received.statusCode`.
- Adicionar validação `status !== undefined && status !== null && status !== ''`.
- Mensagem clara para "formato de resposta não reconhecido".

#### Código morto / duplicações
- Linhas 21-25 contêm lógica duplicada que pode ser consolidada.

---


#### Finalidade
Mocks para operações de banco de PostgreSQL: query genérica, queryOne, queryMany, insert, update, delete, transaction, pool, paginador e helpers de asserção.

#### Estrutura
- `mockQuery(returnValue)` — factory genérica retornando `{ rows, rowCount, command }`.
- `mockQueryOne`, `mockQueryMany` — wrappers semânticos.
- `mockQueryError` — retorna Promise.reject.
- `mockInsert`, `mockUpdate`, `mockDelete` — operações CRUD com defaults sensatos.
- `mockTransaction` — simula BEGIN/COMMIT/ROLLBACK com client mockado.
- `mockPool` — pool mockado com connect, end, on.
- `queryWasCalledWith` — verifica se query foi chamada com padrão.
- `getQueryParams` — extrai params de uma chamada.
- `mockDbModule` — mock completo do módulo db.
- `mockPaginatedResult` — simula resposta paginada.
- `clearQueryMocks` — limpa N mocks.
- `mockQuerySequence` — respostas sequenciais.

#### Problemas identificados
1. **`mockInsert` sempre retorna `id: 1`** — `{ id: insertedRow.id || 1 }` pode mascarar bugs de IDs não-setados. Deveria ser obrigatório ou usar sequência.
2. **`mockUpdate`/`mockDelete` semmergem rowCount real** — sempre `1`, nunca `0` (não-encontrado). Testes de "registro inexistente" não podem ser feitos com esses helpers.
3. **`mockTransaction` é uma simulação de transação, não um mock** — ela executa `callback` de verdade, o que é útil mas não é mock de transaction. O nome é enganoso.
4. **`mockPool` não simula fila/concorrência** — `connect` sempre resolve imediatamente.
5. **`command` em mockQuery** — `_query.trim().split(' ')[0].toUpperCase()` falha para queries que começam com `(` ou comentários SQL.
6. **`clearQueryMocks`** — aceita spread args mas não aceita array diretamente. Chamada `clearQueryMocks(...mocks)` e `clearQueryMocks(mocksArray)` têm comportamentos diferentes.

#### Melhorias sugeridas
- Adicionar `mockInsertReturning`, `mockUpdateReturning` para compatibilidade com PostgreSQL.
- Criar `mockNoRowsAffected` para testar UPDATE/DELETE sem match.
- Renomear `mockTransaction` para `simulateTransaction` ou `mockTransactional`.
- Documentar que `command` é heurístico.

#### Código morto / duplicações
- Nenhum código morto aparente. `mockQueryOne` e `mockQueryMany` são wrappers triviais mas semanticamente úteis.

---


#### Finalidade
Teste de sanidade que valida se todos os mocks centralizados do Next.js (`next/router`, `next/navigation`, `next/image`, `next/link`, `next/head`, `next/script`, `next/headers`) estão funcionando corretamente. Detecta quebras silenciosas em upgrades do Next.js.

#### Estrutura
- Importa `next-setup.js` que registra todos `jest.mock()`.
- Para cada módulo, verifica exports e comportamento default.
- Usa RTL (`render`, `screen`) para testar componentes (Image, Link, Head, Script).

#### Problemas identificados
1. **`next/image` mock** — teste verifica `src`, `alt`, `width`, `height` no `img`, mas não verifica se o mock preserva `loader`, `quality`, `priority` que são atributos comuns em produção.
2. **`next/navigation`** — `useSearchParams()` retorna `URLSearchParams`, mas teste não verifica `.get()`, `.has()`, `.toString()`.
3. **`next/headers`** — `headers()` e `cookies()` são assíncronas no Next.js real, mas teste assume que resolvem. Mock pode mascarar problemas de top-level await.
4. **Sem teste para `next/dynamic`** — se o projeto usa `dynamic import()`, falta cobertura.
5. **`next/head` com React Testing Library** — `document.title` muda globalmente; teste não faz cleanup do title, podendo poluir testes subsequentes.

#### Melhorias sugeridas
- Adicionar teste para `next/dynamic`.
- Limpar `document.title` em `afterEach`.
- Verificar `useSearchParams().get('key')`.
- Adicionar teste para `next/font` se aplicável.

#### Código morto / duplicações
- Nenhum código morte. Mas os testes de `next/router` se sobrepõem ao mock em `tests/helpers/render.js`.

---


#### Finalidade
Teste unitário para a página de post individual do blog (`BlogPost`). Testa renderização de título, data, conteúdo, imagem, compartilhamento e estado sem-imagem.

#### Estrutura
- Mock de CSS module inline.
- **Mock do componente `BlogPost` inline** (linhas 23-77) — o componente real não existe; o teste usa uma implementação substituta.
- Mock de dados `mockPost` com dados realistas.
- 3 testes: renderização básica, URLs de compartilhamento, ausência de imagem.

#### Problemas identificados
1. **CRÍTICO: Mock inline do componente** — o teste NÃO testa o componente real. O componente é recriado dentro do teste, criando falsa sensação de cobertura. Se o componente real for alterado, este teste não capturará a mudança.
2. **Caminho do arquivo real incerto** — o path `[slug].test.js` sugere que deveria testar `pages/blog/[slug].js` ou similar, mas o mock inline indica que o arquivo real não existe ou é inacessível.
3. **CSS module mockado inline** — duplica a responsabilidade de `jest.moduleNameMapper` ou `jest.config.js`.
4. **Data formatada hardcoded** — `new Date(post.created_at).toLocaleDateString('pt-BR')` depende de locale do ambiente; CI pode retornar formato diferente.
5. **`encodeURIComponent` fixo** — teste assume URL exata; pequenas mudanças no componente realbrompem o teste.
6. **Sem snapshot** — sem teste de regressão visual.

#### Melhorias sugeridas
- **Importar o componente real** e remover mock inline.
- Se o componente real não existe, **criar o arquivo real** em vez de mockar no teste.
- Mover mock de CSS para `jest.config.js` `moduleNameMapper`.
- Usar `jest.spyOn(Date.prototype, 'toLocaleDateString')` para estabilizar datas.

#### Código morto / duplicações
- O mock inline do `BlogPost` (linhas 23-77) é efetivamente código morto de produção — duplicaria lógica se o componente real existisse.

---

## Resumo Transversal

#### Padrões positivos
- **Matchers customizados bem estruturados** — uso correto de `expect.extend()`, mensagens bidirecionais, integração com `this.utils.printReceived/printExpected`.
- **Mocks de banco robustos** — `tests/mocks/db.js` é completo e reutilizável.
- **Sanidade de mocks** — `next.test.js` é excelente prática para detectar quebras de upstream.
- **Polyfill idempotente** — padrão correto de promise-lazy em `async-polyfills.js`.

#### Dívidas técnicas
| Arquivo | Issue crítica |
|---|---|
| `render.js` | Mock global de `next/router` que conflita com outros mocks |
| `[slug].test.js` | Componente mockado inline não testa código real |
| `global-setup.db.js` | Sem teardown; containers órfãos |
| `render.js` | `renderWithProviders` não entrega providers reais |
| `toHaveStatus.js` | Lógica redundante em statusCode |

#### Código morto potencial
- `renderWithProviders` em `render.js` — wrapper sem providers reais; os testes provavelmente usam `renderWithAuth`/`renderWithRouter` diretamente.
- `testErrorState` — helper raramente usado em todo o projeto.

#### Sugestões de alto impacto
1. **Remover mock inline de `[slug].test.js`** e importar o componente real.
2. **Criar `global-teardown.db.js`** para parar o container PostgreSQL.
3. **Extrair extração de response body/headers** para helper compartilhado entre `toBeValidJSON` e `toHaveHeader`.
4. **Unificar mocks de Next.js** em `mocks/next-setup.js` e remover mock duplicado de `render.js`.
5. **Adicionar `structuredClone` polyfill** em `async-polyfills.js`.


---


## 4. Testes de Integração — Admin API

## Infraestrutura Compartilhada

#### Helper `tests/helpers/crud-test.js`

| Função | Finalidade |
|--------|------------|
| `testPublicGetEndpoint` | Testa endpoints GET públicos (405, 400 paginação, 500) |
| `testAdminCrudEndpoint` | Testa CRUD admin com auth (apenas 401, pois withAuth precede checagem de método) |
| `testAdminGetEndpoint` | Testa GET admin (401, 405) |

#### Mock Central `tests/mocks/db-module.js`

```js
mockDb()        // DB funcional padrão
mockDbError(err) // DB com erro simulado
resetDbMocks(db) // Reset de mocks entre testes
```

#### Padrões de Autenticação nos Testes

Três abordagens distintas são usadas para mockar `lib/auth/auth.js`:

| Padrão | Arquivos | Descrição |
|--------|----------|-----------|
| **Full Mock** | audit, cache, fetch-ml, fetch-spotify, fetch-youtube, integrity, roles, users.test, users.create | Mocks `getAuthToken`, `verifyToken`, `withAuth` via `mockModule` closure |
| **Header-based** | dicas, musicas, posts, rate-limit | Verifica `req.headers.authorization === 'Bearer valid-token'` |
| **Injection** | videos | Injeta `req.user` diretamente, sem mock de withAuth |

---


---

#### 1. `audit.test.js`

**Arquivo:** `tests/integration/api/admin/audit.test.js`
**Endpoint:** `/api/admin/audit`
**Handler:** `pages/api/admin/audit.js`

#### Finalidade
Testa o endpoint de auditoria que lista logs de atividade do sistema com paginação, filtros de data, e auto-criação da tabela `activity_logs` via interceptação de erro 42P01.

#### Estrutura
- **Mock DB:** Usa `mockDb()` centralizado
- **Mock Auth:** Full mock com `getAuthToken`/`verifyToken`/`withAuth`
- **Sem helper:** Testes inline completos

#### Testes (7)
| Categoria | Teste | Status |
|-----------|-------|--------|
| Autenticação | 401 sem token | ✅ |
| Permissões | 403 sem permissão 'Auditoria' | ✅ |
| GET | 200 com paginação e mapeamento `user_id` | ✅ |
| GET | Filtro por data (`startDate`/`endDate`) | ✅ |
| GET | Auto-criação tabela em erro 42P01 | ✅ |
| GET | 500 em erro inesperado | ✅ |
| Rotas | 405 POST/PUT/DELETE | ✅ |

#### Problemas Identificados

1. **Código duplicado de mock de permissões**
   - O mock de `SELECT permissions FROM roles` é repetido em `beforeEach` e em múltiplos testes (`mockImplementation`)
   - **Sugestão:** Extrair para função `mockPermissions(permissions)`

2. **Teste de paginação valida mapeamento inconsistente**
   - Linha 82: `expect(data.data).toEqual([{ id: 1, username: 'admin_user', action: 'LOGIN', user_id: 'admin_user' }])`
   - O campo `user_id` parece ser derivado de `username`, mas o mock retorna `{ id: 1, username: 'admin_user', action: 'LOGIN' }` sem `user_id`
   - **Issue:** Depende de implementação do handler que adiciona `user_id: r.username` — acoplamento forte

3. **Falta teste de ordenação**
   - Endpoint de auditoria tipicamente ordena por `created_at DESC`, mas nenhum teste valida a ordem

#### Melhorias Sugeridas
- Extrair mock de permissões para função utilitária
- Adicionar teste de ordenação decrescente por data
- Testar paginação com múltiplas páginas (totalPages > 1)

---

#### 2. `backups.test.js`

**Arquivo:** `tests/integration/api/admin/backups.test.js`
**Endpoint:** `/api/admin/backups`
**Handler:** `pages/api/admin/backups.js`

#### Finalidade
Testa listagem de backups (GET) e criação de backup (POST), incluindo ordenação por data, tratamento de diretório vazio/inexistente, e falhas de filesystem e rotina de backup.

#### Estrutura
- **Mock Auth:** Simples `withAuth` injetando `req.user`
- **Mock FS:** `jest.mock('fs')` completo
- **Mock Script:** `jest.mock('../../../../scripts/backup.js')`

#### Testes (7)
| Categoria | Teste | Status |
|-----------|-------|--------|
| GET | Listar backups ordenados | ✅ |
| GET | Array vazio quando não há backups | ✅ |
| GET | Null quando diretório não existe | ✅ |
| GET | 500 em erro de FS | ✅ |
| POST | Criar backup com sucesso | ✅ |
| POST | 500 se createBackup falhar | ✅ |
| Rotas | 405 PUT/DELETE | ✅ |

#### Problemas Identificados

1. **Mock de ordenação frágil**
   - Linha 29-31: `fs.statSync.mockImplementation((file) => ({ mtime: file.includes('backup1') ? ...}))`
   - Baseia-se em string matching no nome do arquivo. Se nomes mudam, teste quebra silenciosamente

2. **Falta validação de response body em POST**
   - Teste "deve criar um novo backup" verifica `createBackup` foi chamado mas não valida response data
   - **Issue:** `res._getJSONData()` nunca é assertado

3. **Supressão global de console.error**
   - `beforeAll(() => { console.error = () => {}; })` silencia todos os erros, dificultando debug de falhas

4. **Diretórios hardcoded não validados**
   - Testa `fs.existsSync` mas não verifica quais diretórios foram checados

#### Melhorias Sugeridas
- Validar response body em POST com expect
- Usar `jest.spyOn(console, 'error').mockImplementation()` em vez de substituir globalmente
- Verificar caminhos de diretório assertivamente

---

#### 3. `cache.test.js`

**Arquivo:** `tests/integration/api/admin/cache.test.js`
**Endpoint:** `/api/admin/cache`
**Handler:** `pages/api/admin/cache.js`

#### Finalidade
Testa consulta de métricas de cache (GET), limpeza de cache (POST/DELETE), permissões de admin, e falhas no Redis.

#### Estrutura
- **Mock Auth:** Full mock
- **Mock Cache:** `lib/cache/cache.js` com `clearAllCache`, `getCacheMetrics`, `checkRateLimit`
- **Sem helper CRUD**

#### Testes (7)
| Categoria | Teste | Status |
|-----------|-------|--------|
| Autenticação | 401 sem token GET | ✅ |
| GET | 200 com métricas | ✅ |
| Rotas | 405 PUT | ✅ |
| Permissão | 403 não-admin em POST | ✅ |
| POST/DELETE | 200 limpando cache | ✅ |
| POST | 500 se clearAllCache falhar | ✅ |

#### Problemas Identificados

1. **Validação insuficiente de métricas**
   - Teste GET autenticado verifica status 200 mas não valida o conteúdo de `getCacheMetrics`
   - **Issue:** Mock retorna objeto fixo, mas teste nunca o asserta

2. **Método DELETE não testado explicitamente**
   - Teste diz "POST ou DELETE" mas apenas POST é executado
   - **Issue:** Cobertura mentirosa — DELETE nunca é chamado

3. **Sem teste de clearAllCache rejeitando**
   - Apenas um teste de erro para `clearAllCache`, mas múltiplos cenários de falha Redis não cobertos

#### Melhorias Sugeridas
- Adicionar teste explícito para DELETE
- Validar response body de métricas
- Testar `checkRateLimit` retornando true (cenário de bloqueio)

---

#### 4. `dicas.test.js`

**Arquivo:** `tests/integration/api/admin/dicas.test.js`
**Endpoint:** `/api/admin/dicas`
**Handler:** `pages/api/admin/dicas.js`

#### Finalidade
Testa CRUD completo para dicas (dicas/conselhos), incluindo criação com fallback `published=true`, atualização, exclusão com busca prévia do nome para auditoria, e tratamento de erros.

#### Estrutura
- **Mock DB:** `mockDb()` centralizado
- **Mock Audit:** `lib/domain/audit.js`
- **Mock Auth:** Header-based (`Bearer valid-token`)
- **Helper inline:** `getAuthenticatedMocks()` com `req.socket` para IP

#### Testes (10)
| Categoria | Teste | Status |
|-----------|-------|--------|
| Autenticação | 401 sem token | ✅ |
| GET | 200 lista de dicas | ✅ |
| GET | 500 erro DB | ✅ |
| POST | 201 criar com published=true fallback + log | ✅ |
| POST | 500 erro ao criar | ✅ |
| PUT | 200 atualizar + log | ✅ |
| PUT | 500 erro ao atualizar | ✅ |
| DELETE | 200 excluir com nome prévio + log | ✅ |
| DELETE | 200 fallback nome=id se não encontrado + log | ✅ |
| DELETE | 500 erro ao excluir | ✅ |
| Rotas | 405 PATCH | ✅ |

#### Problemas Identificados

1. **Duplicação de boilerplate de captura de erro**
   - Linhas 73-81, 108-116, 138-146, 180-188: Mesmo padrão `consoleSpy`/`loggerErrorSpy` repetido
   - **Sugestão:** Extrair para helper `withSuppressedLogs(testFn)`

2. **Validação de logger inconsistente**
   - Testes validam `loggerErrorSpy` com argumentos específicos, mas `consoleSpy` é apenas silenciado
   - **Issue:** Se `logger.error` não for chamado, teste passa silenciosamente (sem expect no spy em alguns casos)

3. **Mock de audit nunca verificado em erros**
   - Testes de 500 não verificam se `logActivity` NÃO foi chamado em caso de erro
   - **Issue:** Pode mascarar bugs de audit em cenários de falha

#### Melhorias Sugeridas
- Extrair helper de supressão de logs
- Adicionar `expect(logActivity).not.toHaveBeenCalled()` nos cenários de erro
- Testar criação com `published=false` explicitamente

---

#### 5. `fetch-ml.test.js`

**Arquivo:** `tests/integration/api/admin/fetch-ml.test.js`
**Endpoint:** `/api/admin/fetch-ml`
**Handler:** `pages/api/admin/fetch-ml.js`

#### Finalidade
Testa a extração de dados de produtos do Mercado Livre via múltiplas estratégias: API de items, API de products, e fallback de HTML scraping. Prioriza `item_id` na URL quando presente.

#### Estrutura
- **Mock Auth:** Full mock
- **Mock Fetch:** `mockGlobalFetch()` helper
- **Sem mocks de DB** (handler não persiste dados)

#### Testes (5)
| Categoria | Teste | Status |
|-----------|-------|--------|
| Validação | 405 GET, 401 sem auth, 400 sem url/MLB | ✅ |
| Prioridade | Busca por item_id primeiro | ✅ |
| Fallback 1 | API de products se items falha | ✅ |
| Fallback 2 | HTML scraping se APIs falham | ✅ |
| Erro | 500 se nada encontrado | ✅ |

#### Problemas Identificados

1. **Teste único para múltiplos status codes**
   - Linhas 44-66: Teste "deve retornar 405 se não for POST, 401 sem auth e 400 sem URL ou sem código MLB"
   - **Issue:** Princípio de "um teste por comportamento" violado. Se 405 falha, 401 e 400 não executam

2. **Dependência de regex específicas do ML**
   - Teste de HTML scraping assume que preço está em formato `R$ 2.499,99` com regex específica
   - **Issue:** Mudanças no HTML do ML quebram testes sem indicar o motivo real

3. **Sem validação de sanitização de URL**
   - URLs com caracteres especiais ou encoding não são testadas

4. **Mock de fetchReset problemático**
   - `fetchMock?.mockRestore()` em `afterAll` pode não restaurar corretamente se `mockGlobalFetch()` usar `jest.spyOn`

#### Melhorias Sugeridas
- Dividir teste de validação em 4 testes separados
- Extrair fixtures de HTML para arquivo separado
- Adicionar teste de URL com encoding (`&amp;`, `%20`)

---

#### 6. `fetch-spotify.test.js`

**Arquivo:** `tests/integration/api/admin/fetch-spotify.test.js`
**Endpoint:** `/api/admin/fetch-spotify`
**Handler:** `pages/api/admin/fetch-spotify.js`

#### Finalidade
Testa extração de dados de faixas Spotify via três estratégias: oEmbed API, extração via iframe/Regex, e fallback por meta tags SEO (Googlebot).

#### Estrutura
- **Mock Auth:** Full mock
- **Mock Fetch:** `mockGlobalFetch()` com fallback `{ ok: false }`

#### Testes (6)
| Categoria | Teste | Status |
|-----------|-------|--------|
| Segurança | 405 não-POST | ✅ |
| Segurança | 401 sem token inválido | ✅ |
| Validação | 400 sem URL | ✅ |
| Estratégia 1 | oEmbed API sucesso | ✅ |
| Estratégia 2 | Iframe Regex | ✅ |
| Estratégia 3 | Meta tags SEO | ✅ |
| Erro | 500 todas falham | ✅ |

#### Problemas Identificados

1. **Validação de token inválido não testada**
   - Teste "401 sem token ou token inválido" testa apenas token nulo
   - **Issue:** `verifyToken` retornando null/false não é testado explicitamente

2. **Dependência de ordem de chamadas fetch**
   - Cada teste assume sequência específica de `global.fetch.mockResolvedValueOnce`
   - **Issue:** Se handler mudar ordem de estratégias, testes quebram

3. **Regex de extração frágil**
   - Teste de iframe assume JSON específico em `<script>` tag
   - **Issue:** Estrutura real do Spotify pode mudar sem aviso

4. **Sem teste de timeout/rede**
   - `fetch` lançando `NetworkError` ou `AbortError` não simulado

#### Melhorias Sugeridas
- Adicionar teste de token inválido (`verifyToken` retorna null)
- Testar erro de rede (fetch rejeita)
- Extrair fixtures HTML/JSON para arquivos separados

---

#### 7. `fetch-youtube.test.js`

**Arquivo:** `tests/integration/api/admin/fetch-youtube.test.js`
**Endpoint:** `/api/admin/fetch-youtube`
**Handler:** `pages/api/admin/fetch-youtube.js`

#### Finalidade
Testa extração de dados de vídeos YouTube via oEmbed API, com tratamento de sucesso e falha.

#### Estrutura
- **Mock Auth:** Full mock
- **Mock Logger:** `lib/infra/logger.js`
- **Mock Fetch:** `mockGlobalFetch()`

#### Testes (4)
| Categoria | Teste | Status |
|-----------|-------|--------|
| Segurança | 405 não-POST | ✅ |
| Segurança | 401 sem auth | ✅ |
| Validação | 400 sem URL | ✅ |
| Sucesso | 200 com título via oEmbed | ✅ |
| Erro | 500 se fetch falha | ✅ |

#### Problemas Identificados

1. **Cobertura mínima**
   - Apenas 4 testes para um endpoint que provavelmente tem mais cenários (URL inválida, vídeo privado, região bloqueada)

2. **Mock de logger desnecessariamente verbose**
   - Logger inteiro mockado (`error`, `warn`, `info`, `debug`, `success`) mas apenas `error` é usado

3. **Sem validação de URL do YouTube**
   - URLs malformadas do YouTube (sem `v=`, youtu.be inválido) não testadas

4. **Dependência de helper externo**
   - `mockGlobalFetch()` — comportamento não é óbvio sem ler o helper

#### Melhorias Sugeridas
- Adicionar teste de URL inválida do YouTube
- Testar cenário de vídeo privado/removido
- Simplificar mock de logger

---

#### 8. `integrity.test.js`

**Arquivo:** `tests/integration/api/admin/integrity.test.js`
**Endpoint:** `/api/admin/integrity`
**Handler:** `pages/api/admin/integrity.js`

#### Finalidade
Testa diagnóstico de integridade do sistema: conexão com banco, storage de uploads, backups, e cache. Gera status agregado (`healthy`/`warning`/`degraded`).

#### Estrutura
- **Mock DB:** Query direta (sem `mockDb()`)
- **Mock FS:** `jest.mock('fs')` com implementações default
- **Mock Auth:** Full mock
- **Sem helper CRUD**

#### Testes (5)
| Categoria | Teste | Status |
|-----------|-------|--------|
| Autenticação | 401 sem auth | ✅ |
| Sucesso | 200 diagnóstico completo | ✅ |
| Degrade | Status degraded se banco falha | ✅ |
| Storage | Diretório uploads ausente | ✅ |
| Backup | Diretório backups ausente | ✅ |

#### Problemas Identificados

1. **Nomes de status hardcoded**
   - `'warning'`, `'degraded'`, `'ok'`, `'error'` espalhados sem constantes
   - **Issue:** Se nomes mudam no handler, testes quebram silenciosamente

2. **Mock de fs.existsSync condicional frágil**
   - Linhas 121, 131: `fs.existsSync.mockImplementation((p) => p.includes('backups'))`
   - **Issue:** String matching em caminhos pode falhar em Windows (separador `\`)

3. **Sem teste de cache error**
   - Cache retorna `'warning'` por padrão, mas nenhum teste força `'error'`

4. **Cálculo de status não testado**
   - Não há teste que force `status: 'healthy'` (todos os checks ok)
   - **Issue:** Endpoint pode retornar `healthy` com bug, e teste não pegaria

#### Melhorias Sugeridas
- Adicionar teste de `status: 'healthy'` (todos checks ok)
- Adicionar teste de cache error
- Usar `path.join` em vez de `includes` para comparação de diretórios

---

#### 9. `musicas.test.js`

**Arquivo:** `tests/integration/api/admin/musicas.test.js`
**Endpoint:** `/api/admin/musicas`
**Handler:** `pages/api/admin/musicas.js`

#### Finalidade
Testa CRUD de músicas com paginação, validação de URL do Spotify, reordenação em massa, invalidação de cache, e auditoria.

#### Estrutura
- **Mock DB:** `mockDb()`
- **Mock Domain:** `lib/domain/musicas.js` (getPaginatedMusicas, createMusica, etc.)
- **Mock Crud:** `lib/crud/crud.js`
- **Mock Cache:** `lib/cache/cache.js`
- **Mock Audit:** `lib/domain/audit.js`
- **Mock Auth:** Header-based
- **Helper:** `testAdminCrudEndpoint` (401 coberto)

#### Testes (16)
| Categoria | Teste | Status |
|-----------|----|--------|
| Autenticação | 401 (via helper) | ✅ |
| GET | 200 com Cache-Control + lista | ✅ |
| GET | 500 erro na busca | ✅ |
| POST | 400 campos obrigatórios ausentes | ✅ |
| POST | 400 URL Spotify inválida | ✅ |
| POST | 201 criar + log + invalidar cache | ✅ |
| POST | 201 criar com publicado=false fallback | ✅ |
| POST | 500 erro ao criar | ✅ |
| PUT | Reordenação em massa + invalidar cache | ✅ |
| PUT | 400 sem ID | ✅ |
| PUT | 400 URL Spotify inválida | ✅ |
| PUT | 404 música não encontrada | ✅ |
| PUT | 200 atualizar + log + invalidar cache | ✅ |
| PUT | 500 erro ao atualizar | ✅ |
| DELETE | 400 sem ID | ✅ |
| DELETE | 404 não encontrada | ✅ |
| DELETE | 200 excluir + log | ✅ |
| DELETE | 200 fallback ID no log | ✅ |
| DELETE | 500 erro ao excluir | ✅ |

#### Problemas Identificados

1. **Duplicação de padrão de teste**
   - GET, POST, PUT, DELETE seguem mesmo padrão: sucesso + 400 + 404 + 500
   - **Sugestão:** Generalizar via factory de testes CRUD por recurso

2. **Validação de `publicado` inconsistente**
   - Teste "deve criar com publicado=false" usa `userOverride: null` mas comentário diz "O handler registra log mesmo com user null"
   - **Issue:** Comentário indica comportamento inesperado — é bug ou feature?

3. **Sem validação de query params no GET**
   - `page` e `limit` passados mas não validados na chamada do handler

#### Melhorias Sugeridas
- Criar factory de testes CRUD reusável
- Esclarecer comportamento de `userOverride: null` (bug ou feature?)
- Validar query params em chamadas de paginação

---

#### 10. `posts.test.js`

**Arquivo:** `tests/integration/api/admin/posts.test.js`
**Endpoint:** `/api/admin/posts`
**Handler:** `pages/api/admin/posts.js`

#### Finalidade
Testa CRUD de posts/artigos com validação Zod, paginação, rate limiting, reordenação em massa, e auditoria.

#### Estrutura
- **Mock DB:** `mockDb()`
- **Mock Domain:** `lib/domain/posts.js`
- **Mock Crud:** `lib/crud/crud.js`
- **Mock Cache:** `lib/cache/cache.js`
- **Mock Audit:** `lib/domain/audit.js`
- **Mock Auth:** Header-based
- **Helper:** `testAdminCrudEndpoint` (401 coberto)

#### Testes (19)
| Categoria | Teste | Status |
|-----------|----|--------|
| Autenticação | 401 | ✅ |
| Autorização | 403 sem permissão | ✅ |
| Rate Limit | 429 excedido | ✅ |
| GET | 200 com cache headers + paginação | ✅ |
| GET | 500 falha domínio | ✅ |
| POST | 400 validação Zod | ✅ |
| POST | 201 criar + log + invalidar cache | ✅ |
| POST | 500 erro ao criar | ✅ |
| PUT | Reordenação em massa | ✅ |
| PUT | 400 reordenação inválida | ✅ |
| PUT | 400 ID inválido | ✅ |
| PUT | 400 sem dados para atualizar | ✅ |
| PUT | 404 post não encontrado | ✅ |
| PUT | 200 atualizar + invalidar cache | ✅ |
| PUT | 500 erro ao atualizar | ✅ |
| DELETE | 400 sem ID | ✅ |
| DELETE | 200 excluir + nome para log | ✅ |
| DELETE | 404 não encontrado | ✅ |
| DELETE | 500 erro ao excluir | ✅ |

#### Problemas Identificados

1. **Validação de 403 duplicateda lógica de roles**
   - Teste de 403 mocka `query` para retornar permissões específicas, mas isso é duplicado em múltiplos arquivos

2. **Rate limit testado apenas em POST**
   - E se GET também tiver rate limit? Ou DELETE?

3. **Teste de validação Zod verifica apenas um campo**
   - `expect(...).toHaveProperty('title')` — e se outros campos faltarem?

#### Melhorias Sugeridas
- Extrair helper de teste de roles/permissões
- Testar rate limit em outros métodos
- Validar múltiplos campos no Zod

---

#### 11. `rate-limit.test.js`

**Arquivo:** `tests/integration/api/admin/rate-limit.test.js`
**Endpoint:** `/api/admin/rate-limit`
**Handler:** `pages/api/admin/rate-limit.js`

#### Finalidade
Testa gerenciamento de rate limit: consulta de IPs bloqueados, whitelist, auditoria, exportação CSV, e mutações (adicionar/remover).

#### Estrutura
- **Mock Redis:** `@upstash/redis` + `lib/infra/redis.js`
- **Mock Auth:** Header-based
- **Dynamic import:** `jest.resetModules()` + `await import()` em `beforeEach`

#### Testes (9)
| Categoria | Teste | Status |
|-----------|----|--------|
| GET | IP atual (type=current_ip) | ✅ |
| GET | Whitelist | ✅ |
| GET | Logs de auditoria com filtros | ✅ |
| GET | Exportação CSV | ✅ |
| GET | IPs bloqueados (SCAN + pipeline) | ✅ |
| GET | Array vazio sem chaves | ✅ |
| POST | Adicionar IP whitelist | ✅ |
| DELETE | Remover da whitelist | ✅ |
| DELETE | Remover do bloqueio manual | ✅ |
| Erro | 500 se Redis falha | ✅ |

#### Problemas Identificados

1. **Complexidade excessiva no beforeEach**
   - `jest.resetModules()` + dynamic import + clearAllMocks é frágil
   - **Issue:** Se módulo tem estado global, pode vazar entre testes

2. **Dependência de variáveis de ambiente**
   - `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` definidas em `beforeAll`
   - **Issue:** Se handler usa essas vars em import time, ordem de testes importa

3. **Mocks Redis espalhados**
   - 10+ variáveis de mock no topo do arquivo (`mockSmembers`, `mockLrange`, etc.)
   - **Issue:** Difícil rastrear quais são usados em cada teste

4. **Sem validação de CSV completo**
   - Teste CSV verifica `Content-Type` e presença de IP, mas não estrutura completa

#### Melhorias Sugeridas
- Consolidar mocks Redis em objeto único
- Extrair fixtures de CSV para teste mais robusto
- Documentar necessidade de dynamic import

---

#### 12. `roles.test.js`

**Arquivo:** `tests/integration/api/admin/roles.test.js`
**Endpoint:** `/api/admin/roles`
**Handler:** `pages/api/admin/roles.js`

#### Finalidade
Testa CRUD de cargos/roles com permissões, incluindo auto-criação da tabela roles via interceptação de erro 42P01, e seeding de dados padrão.

#### Estrutura
- **Mock DB:** `mockDb()`
- **Mock Crud:** `lib/crud/crud.js`
- **Mock Audit:** `lib/domain/audit.js`
- **Mock Auth:** Full mock
- **Sem helper CRUD**

#### Testes (9)
| Categoria | Teste | Status |
|-----------|----|--------|
| Autenticação | 401 sem token | ✅ |
| Permissão | 403 sem permissões corretas | ✅ |
| GET | 200 lista de cargos | ✅ |
| GET | Auto-criação tabela + seed | ✅ |
| GET | 500 erro inesperado | ✅ |
| POST | 201 criar cargo + log | ✅ |
| PUT | 200 atualizar cargo | ✅ |
| DELETE | 200 excluir cargo + log | ✅ |
| Rotas | 405 PATCH | ✅ |

#### Problemas Identificados

1. **Mock de query muito verboso**
   - `beforeEach` define `query.mockImplementation` com múltiplos `if (sql.includes(...))`
   - **Issue:** Difícil de manter e estender

2. **Teste de auto-criação acoplado a implementação**
   - Baseado em contador de chamadas (`getCallCount === 0`) — frágil

3. **Falta teste de permissão parcial**
   - Testa 403 sem permissão, mas não testa acesso com permissão parcial

4. **DELETE não valida response body**
   - Apenas verifica status e chamadas, não o que foi retornado

#### Melhorias Sugeridas
- Extrair mock de permissões para helper
- Adicionar teste de permissão parcial (acesso a algumas rotinas)
- Validar response body em DELETE

---

#### 13. `users.create.test.js`

**Arquivo:** `tests/integration/api/admin/users.create.test.js`
**Endpoint:** `/api/admin/users` (POST apenas)
**Handler:** `pages/api/admin/users.js`

#### Finalidade
Testa especificamente a criação de usuários via POST, incluindo validação de duplicidade, hash de senha, e permissões.

#### Estrutura
- **Mock DB:** `mockDb()`
- **Mock Crud:** `lib/crud/crud.js`
- **Mock Audit:** `lib/domain/audit.js`
- **Mock Auth:** Full mock
- **Mock Cache:** `lib/cache/cache.js`

#### Testes (4)
| Categoria | Teste | Status |
|-----------|----|--------|
| Sucesso | Criar usuário + hash + log | ✅ |
| Validação | 400 usuário existente | ✅ |
| Permissão | 403 sem permissão | ✅ |
| (Implícito) | Senha não exposta no response | ✅ |

#### Problemas Identificados

1. **Arquivo separado para POST**
   - `users.create.test.js` + `users.test.js` testam o mesmo handler
   - **Issue:** Divisão arbitrária dificulta descoberta de testes

2. **Sem teste de validação de campos obrigatórios**
   - Falta username ou senha — não testado aqui (está no `users.test.js`)

3. **Duplicação de mock de permissões**
   - Mesmo padrão de `query.mockImplementation` para roles

4. **Sem teste de força de senha**
   - Aceita `'senha_forte_123'` mas sem validar política de senha

#### Melhorias Sugeridas
- Consolidar com `users.test.js` ou documentar motivo da separação
- Adicionar teste de validação de senha forte

---

#### 14. `users.test.js`

**Arquivo:** `tests/integration/api/admin/users.test.js`
**Endpoint:** `/api/admin/users`
**Handler:** `pages/api/admin/users.js`

#### Finalidade
Testa CRUD completo de usuários: listagem com paginação e busca, criação com hash, atualização com hash condicional, exclusão com proteção de lockout, rate limiting, e casos de edge.

#### Estrutura
- **Mock DB:** `mockDb()`
- **Mock Crud:** `lib/crud/crud.js`
- **Mock Audit:** `lib/domain/audit.js`
- **Mock Auth:** Full mock
- **Mock Cache:** `lib/cache/cache.js`
- **Sem helper CRUD**

#### Testes (16)
| Categoria | Teste | Status |
|-----------|----|--------|
| Autenticação | 401 sem token | ✅ |
| Autenticação | 401 token inválido | ✅ |
| Permissão | 403 sem permissão | ✅ |
| Rate Limit | 429 excedido | ✅ |
| GET | 200 paginação | ✅ |
| GET | Filtro de busca (LOWER LIKE) | ✅ |
| POST | 400 sem username/password | ✅ |
| POST | 400 usuário existente | ✅ |
| POST | 201 criar com hash + log | ✅ |
| PUT | Hash de nova senha | ✅ |
| PUT | Não hashear senha vazia | ✅ |
| DELETE | 400 impedir auto-exclusão | ✅ |
| DELETE | 200 excluir outro usuário | ✅ |
| Erro | 500 DB catastrófico | ✅ |
| Edge | Cargo sem permissão correta | ✅ |
| Edge | Bloquear acesso cargo diferente | ✅ |
| Edge | impedir delete próprio ID | ✅ |
| Edge | totalPages = 1 mesmo com 0 | ✅ |

#### Problemas Identificados

1. **Duplicação com `users.create.test.js`**
   - Testes de POST existem nos dois arquivos
   - **Issue:** Manutenção duplicada, risco de inconsistência

2. **Marcação "✅ EDGE CASE" nos nomes**
   - Não é convenção do projeto (outros arquivos não usam)
   - **Issue:** Pode ser confuso para desenvolvedores

3. **Mock de query muito longo no beforeEach**
   - Interceptação de múltiplos SQLs com `includes`
   - **Issue:** Performance e legibilidade

4. **Sem teste de query injection**
   - Busca com `' OR 1=1 --` não testada (segurança)

#### Melhorias Sugeridas
- Consolidar `users.create.test.js` neste arquivo
- Remover prefixo "✅ EDGE CASE"
- Adicionar teste de SQL injection na busca

---

#### 15. `videos.test.js`

**Arquivo:** `tests/integration/api/admin/videos.test.js`
**Endpoint:** `/api/admin/videos`
**Handler:** `pages/api/admin/videos.js`

#### Finalidade
Testa CRUD de vídeos: listagem paginada, criação com validação de URL YouTube, reordenação, atualização, exclusão, e tratamento de erros de banco.

#### Estrutura
- **Mock Auth:** Injeção direta de `req.user`
- **Mock Domain:** `lib/domain/videos.js`
- **Mock Cache:** `lib/cache/cache.js`
- **Sem mocks de DB** (handler usa domain layer)
- **Sem helper CRUD**

#### Testes (13)
| Categoria | Teste | Status |
|-----------|----|--------|
| Autorização | 403 não-admin | ✅ |
| GET | Paginação com busca | ✅ |
| POST | Criar + invalidar cache | ✅ |
| POST | 400 validação/url inválida | ✅ |
| POST | Fallback erro desconhecido | ✅ |
| PUT | Reordenar vídeos | ✅ |
| PUT | 400 sem ID/url inválida | ✅ |
| PUT | 200 atualizar | ✅ |
| PUT | 404 não encontrado | ✅ |
| DELETE | Excluir por query ou body | ✅ |
| DELETE | 404/400 | ✅ |
| Rotas | 405 PATCH | ✅ |
| Erro | 500 unique constraint/generic | ✅ |

#### Problemas Identificados

1. **Mock de autenticação mais simples**
   - Injeta `req.user` diretamente sem passar por `withAuth`
   - **Issue:** Não testa o middleware de autenticação em si

2. **Sem auditoria testada**
   - Diferente de musicas/posts, não há mock de `logActivity`
   - **Issue:** Se handler tem auditoria, não é testada; se não tem, é inconsistência

3. **Validação de URL YouTube não documentada**
   - O que constitui "URL inválida" não está claro nos testes

4. **Teste de unique constraint genérico**
   - `getPaginatedVideos.mockRejectedValueOnce(new Error('unique constraint failed'))`
   - **Issue:** GET não deveria lançar unique constraint — teste confuso

#### Melhorias Sugeridas
- Adicionar mock de auditoria ou documentar que não há
- Clarificar validação de URL YouTube
- Corrigir teste de unique constraint (não faz sentido em GET)

---

## Padrões Transversais e Duplicações

#### 1. Padrões de Autenticação Duplicados

| Padrão | Arquivos |
|--------|----------|
| Full mock (getAuthToken/verifyToken/withAuth) | audit, cache, integrity, roles, users.test, users.create, fetch-* |
| Header-based (Bearer valid-token) | dicas, musicas, posts, rate-limit |
| Injection direta | videos, backups |

**Recomendação:** Padronizar em um helper `mockAuth({ mode: 'full' | 'header' | 'inject' })`.

#### 2. Padrões de Permissões de Roles

Mock de `SELECT permissions FROM roles` aparece em:
- audit.test.js
- integrity.test.js
- roles.test.js
- users.test.js
- users.create.test.js
- posts.test.js

**Recomendação:** Extrair helper `mockRolePermissions(permissions[])`.

#### 3. Padrões de Erro 500

Todos os arquivos suprimem `console.error` antes de testar erros:
```js
const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
// ... teste ...
consoleSpy.mockRestore();
```

**Recomendação:** Extrair helper `withSuppressedLogs(async () => { ... })`.

#### 4. Padrões de `getAuthenticatedMocks()`

Funções utilitárias locais similares em:
- dicas.test.js (com `req.socket` e `req._userOverride`)
- musicas.test.js (com `req.socket`)
- posts.test.js (com `req.socket`)

**Recomasta:** Centralizar em `tests/helpers/auth.js`.

---

## Cobertura e Lacunas

#### Lacunas Identificadas

| Lacuna | Arquivos Afetados | Descrição |
|--------|-------------------|-----------|
| Sem teste de autorização 403 | backups, cache, fetch-*, videos | Alguns endpoints não testam negação por falta de permissão |
| Sem teste de rate limiting | dicas, fetch-*, integrity, roles | Apenas posts e users testam rate limit |
| Sem teste de token expirado | todos | Nenhum teste simula token expirado/revogado |
| Sem teste de auditoria negativa | todos | Nenhum teste verifica se `logActivity` NÃO é chamado em erro |
| Sem teste de timeout/rede | fetch-* | Falhas de rede não simuladas |

---

## Código Morto e Duplicado

#### Código Morto
- Nenhum código morto identificado diretamente nos arquivos de teste.

#### Duplicação Significativa

1. **Mock de `SELECT permissions FROM roles`**
   - 6 arquivos com implementações similares
   - Oportunidade para helper centralizado

2. **Supressão de console.error**
   - ~10 ocorrências do padrão `consoleSpy`/`mockRestore`
   - Oportunidade para helper

3. **Validação de paginação**
   - audit, users, musicas, posts validam `{ page, limit, total, totalPages }`
   - Oportunidade para helper `expectPagination()`

4. **Padrão de 405 Method Not Allowed**
   - Presente em quase todos os arquivos, mas às vezes testado com POST, às vezes com PATCH
   - Oportunidade para helper padronizado

---

## Sugestões de Melhoria Global

1. **Criar `tests/helpers/auth.js`** com funções:
   - `mockFullAuth(user)` — para handlers com getAuthToken/verifyToken/withAuth
   - `mockHeaderAuth(user)` — para handlers com Bearer token
   - `mockInjectAuth(user)` — para handlers com injeção direta

2. **Criar `tests/helpers/rbac.js`** com:
   - `mockRolePermissions(permissions[])` — mock padrão para SELECT roles

3. **Criar `tests/helpers/errors.js`** com:
   - `withSuppressedLogs(fn)` — wrapper para testes de erro

4. **Padronizar nomenclatura de edge cases**
   - Remover prefixos como "✅ EDGE CASE"
   - Usar describe block "Casos de Borda" ou similar

5. **Consolidar `users.create.test.js` em `users.test.js`**
   - Documentar motivo se a separação for intencional

6. **Adicionar testes de segurança**
   - SQL injection na busca
   - XSS nos inputs
   - Token expirado/revogado

7. **Usar fixtures para dados complexos**
   - HTML do ML/Spotify/YouTube
   - Objetos de response do banco

---

## Resumo por Arquivo

| Arquivo | Linhas | Testes | Complexidade | Problemas | Qualidade |
|---------|--------|--------|--------------|-----------|-----------|
| audit.test.js | 151 | 7 | Média | Mock duplicado, sem teste de ordenação | ⭐⭐⭐ |
| backups.test.js | 85 | 7 | Baixa | Mock frágil, sem validação de body | ⭐⭐⭐ |
| cache.test.js | 97 | 7 | Baixa | DELETE não testado, métricas não validadas | ⭐⭐⭐ |
| dicas.test.js | 199 | 10 | Alta | Boilerplate de logs duplicado | ⭐⭐⭐⭐ |
| fetch-ml.test.js | 131 | 5 | Alta | Múltiplos asserts por teste, regex frágil | ⭐⭐⭐ |
| fetch-spotify.test.js | 101 | 6 | Média | Token inválido não testado, sem rede | ⭐⭐⭐ |
| fetch-youtube.test.js | 112 | 4 | Baixa | Cobertura mínima, sem URL inválida | ⭐⭐ |
| integrity.test.js | 139 | 5 | Média | Sem teste healthy, paths frágeis | ⭐⭐⭐ |
| musicas.test.js | 233 | 16 | Alta | Padrão duplicável, validação inconsistente | ⭐⭐⭐⭐ |
| posts.test.js | 252 | 19 | Alta | Permissões duplicadas, rate limit parcial | ⭐⭐⭐⭐⭐ |
| rate-limit.test.js | 184 | 9 | Muito Alta | Mocks espalhados, dynamic import frágil | ⭐⭐⭐ |
| roles.test.js | 192 | 9 | Alta | Mock verboso, sem permissão parcial | ⭐⭐⭐ |
| users.create.test.js | 158 | 4 | Média | Duplicado com users.test.js | ⭐⭐⭐ |
| users.test.js | 264 | 16 | Muito Alta | Duplicação, nomenclatura inconsistente | ⭐⭐⭐⭐ |
| videos.test.js | 156 | 13 | Média | Auth simplista, teste confuso de unique | ⭐⭐⭐ |

---

## Conjunto

Os testes de integração da API Admin do projeto Caminhar demonstram maturidade na cobertura de fluxos felizes e de erro básico, mas sofrem de:
- **Duplicação significativa** de mocks de auth, permissões e padrões de erro
- **Inconsistência** na abordagem de autenticação (3 padrões diferentes)
- **Lacunas de segurança** (sem testes de SQL injection, XSS, token expirado)
- **Acoplamento** com implementações específicas (regex de HTML, nomes de arquivos)

A implementação dos helpers sugeridos poderia reduzir o código em ~30% e aumentar a manutenibilidade.


---


## 5. Testes de Integração — API Pública (Auth, Audit, Musicas)

## Índice

1. [Visão Geral do Lote](#1-visão-geral-do-lote)
2. [Análise Individual](#2-análise-individual)
   - [2.1 audit.test.js](#21-audittestjs)
   - [2.2 auth/check.test.js](#22-authchecktestjs)
   - [2.3 auth/login.test.js](#23-authlogintestjs)
   - [2.4 auth/logout.test.js](#24-authlogouttestjs)
   - [2.5 auth/refresh.test.js](#25-authrefreshtestjs)
   - [2.6 cleanup-test-data.test.js](#26-cleanup-test-datatestjs)
   - [2.7 dicas.test.js](#27-dicastestjs)
   - [2.8 login.test.js](#28-logintestjs)
   - [2.9 musicas.create.test.js](#29-musicascreatetestjs)
   - [2.10 musicas.delete.test.js](#210-musicasdeletetestjs)
   - [2.11 musicas.flow.test.js](#211-musicasflowtestjs)
   - [2.12 musicas.integration.test.js](#212-musicasintegrationtestjs)
   - [2.13 musicas.pagination.test.js](#213-musicaspaginationtestjs)
   - [2.14 musicas.test.js](#214-musicastestjs)
   - [2.15 musicas.update.test.js](#215-musicasupdatetestjs)
3. [Problemas Transversais](#3-problemas-transversais)
4. [Duplicidades e Código Morto](#4-duplicidades-e-código-morto)
5. [Recomendações de Melhoria](#5-recomendações-de-melhoria)

---


O lote abrange **15 arquivos** organizados em três contextos:

| Contexto | Arquivos | Foco |
|----------|----------|------|
| **Auth/Admin** | audit, auth/check, auth/login, auth/logout, auth/refresh, cleanup-test-data, login | Autenticação, autorização, auditoria, limpeza |
| **Dicas** | dicas | Endpoint público de dicas |
| **Músicas** | musicas.create, musicas.delete, musicas.flow, musicas.integration, musicas.pagination, musicas.test, musicas.update | CRUD completo de músicas (administrativo + público) |

#### Dependências compartilhadas

- **`tests/helpers/crud-test.js`** — Abstração reutilizável (`testPublicGetEndpoint`, `testAdminCrudEndpoint`, `testAdminGetEndpoint`) que padroniza testes comuns (405, 401, 400).
- **`tests/mocks/db-module.js`** — Mock centralizado do módulo `lib/infra/db.js` com `mockDb()` e `mockDbError()`.
- **`tests/mocks/cache.js`** — Mock do módulo `lib/cache/cache.js` com `mockCacheModule()`.
- **`tests/factories/`** — Fábricas de dados (`musicFactory`, `postFactory`, etc.) para gerar payloads consistentes.

---


#### 2.1 audit.test.js

**Arquivo:** `tests/integration/api/audit.test.js` (31 linhas)

#### Finalidade
Testar a função de domínio `logActivity` (módulo `lib/domain/audit.js`), que insere registros de auditoria na tabela `activity_logs`.

#### Comportamento testado
1. Inserção com todos os parâmetros preenchidos (incluindo IP e options com client)
2. Uso de valores padrão para `ipAddress` (string vazia) e `options` (client undefined) quando omitidos

#### Relações
- Depende diretamente de `lib/domain/audit.js` e `lib/infra/db.js`
- Mock explícito do `query` via `jest.mock('../../../lib/infra/db.js', () => ({ query: jest.fn() }))`

#### Problemas
- **Path inconsistente**: Usa `'../../../lib/domain/audit.js'` mas outros arquivos da mesma pasta usam `'../../../../lib/...'` — isso só funciona se o arquivo estiver num nível de profundidade diferente do indicado, mas o path está alinhado com a localização correta.
- **Falta testar**: Não verifica o comportamento quando `query` lança erro (cenário de falha de banco).
- **Falta testar**: Não valida que `logActivity` retorna algo (se retorna).

#### Melhorias
- Adicionar teste de erro (rejeição do `query`).
- Validar retorno da função (se aplicável).

---

#### 2.2 auth/check.test.js

**Arquivo:** `tests/integration/api/auth/check.test.js` (62 linhas)

#### Finalidade
Testar o handler `pages/api/auth/check.js` — endpoint que verifica se o usuário está autenticado via token JWT.

#### Comportamento testado
| Cenário | Status esperado |
|---------|-----------------|
| Método não-GET | 405 |
| Sem token | 401 |
| Token inválido/expirado | 401 |
| Token válido | 200 + dados do usuário |
| Erro interno (throw) | 500 |

#### Relações
- Módulo real: `pages/api/auth/check.js`
- Mocks: `lib/auth/auth.js` (`getAuthToken`, `verifyToken`)
- Usa `node-mocks-http` (`createMocks`)

#### Problemas
- **Mock parcial**: Apenas `getAuthToken` e `verifyToken` são mockados, mas o handler real pode usar outras funções do módulo `auth.js`. Se o import for `* as auth`, as outras funções ficam `undefined`, o que pode causar erros silenciosos.
- **Falta testar**: Token expirado explicitamente (o teste agrupa "inválido ou expirado" num único mock).

#### Melhorias
- Testar separadamente token inválido vs. token expirado (se o handler distinguir).
- Validar estrutura completa da resposta (ex: presença de `success: true`).

---

#### 2.3 auth/login.test.js

**Arquivo:** `tests/integration/api/auth/login.test.js` (84 linhas)

#### Finalidade
Testar o handler `pages/api/auth/login` — endpoint de login via POST com rate limiting.

#### Comportamento testado
| Cenário | Status esperado |
|---------|-----------------|
| Método não-POST | 405 |
| Rate limit excedido | 429 |
| Credenciais inválidas | 401 |
| Login bem-sucedido | 200 + cookies setados |

#### Relações
- Módulo real: `pages/api/auth/login.js`
- Mocks: `lib/auth/auth` (authenticate, generateToken, setAuthCookie, setRefreshTokenCookie, authenticateAndGenerateToken), `lib/cache/cache` (checkRateLimit), `lib/infra/logger`

#### Problemas
- **Duplicação com login.test.js**: Este arquivo e `login.test.js` (fora da pasta auth) testam o mesmo handler (`pages/api/auth/login`) com mocks quase idênticos. Veja seção 4.
- **Mock do logger complexo**: A construção manual do mock do logger (linhas 19-31) é verbosa e se repete em outros arquivos (login.test.js, auth/login.test.js). Deveria usar helper centralizado.
- **Falta testar**: Body vazio (sem username/password).
- **Falta testar**: Validação de campos obrigatórios no body.

#### Melhorias
- Consolidar testes duplicados num único arquivo (ver seção 4).
- Extrair mock do helper do logger para `tests/mocks/logger.js`.

---

#### 2.4 auth/logout.test.js

**Arquivo:** `tests/integration/api/auth/logout.test.js` (60 linhas)

#### Finalidade
Testar o handler `pages/api/auth/logout.js` — revogação de refresh token e limpeza de cookies.

#### Comportamento testado
| Cenário | Status esperado |
|---------|-----------------|
| Logout sem cookie | 200 + cookie refreshToken limpo |
| Logout com cookie (revogação no banco) | 200 + UPDATE na tabela + cookies limpos |
| Falha na revogação do banco | 200 (falha não quebra o logout) |

#### Relações
- Módulo real: `pages/api/auth/logout.js`
- Mocks: `lib/infra/db.js` (via `mockDb()` de `tests/mocks/db-module.js`)

#### Problemas
- **Falta testar**: Método não-POST (405).
- **Falta testar**: Erro 500 quando algo inesperado acontece (além da falha controlada do banco).

#### Melhorias
- Adicionar teste de 405.
- Adicionar teste de resposta quando `setHeader` falha (se houver try/catch).

---

#### 2.5 auth/refresh.test.js

**Arquivo:** `tests/integration/api/auth/refresh.test.js` (97 linhas)

#### Finalidade
Testar o handler `pages/api/auth/refresh.js` — renovação de access token via refresh token.

#### Comportamento testado
| Cenário | Status esperado |
|---------|-----------------|
| Método não-POST | 405 |
| Sem refresh token (cookie e body) | 401 |
| Refresh token válido (via cookie) | 200 + novos cookies |
| Refresh token via body (fallback) | 200 |
| Refresh token inválido | 401 + cookies limpos |
| Exceção em refreshAccessToken | 500 + log de erro |

#### Relações
- Módulo real: `pages/api/auth/refresh.js`
- Mocks: `lib/auth/auth` (refreshAccessToken, setAuthCookie, setRefreshTokenCookie, getRefreshTokenCookie), `lib/infra/logger`

#### Problemas
- **Importação tardia**: O `import * as auth` e `import { logger }` vêm DEPOIS do `jest.mock` — isso funcina no Jest devido ao hoisting, mas é confuso. Deveria estar no topo com os outros imports.
- **Mock do logger duplicado**: Mesmo padrão de mock manual do logger (veja 2.3).

#### Melhorias
- Mover imports para o topo (ou documentar por que estão após o mock).
- Centralizar mock do logger em `tests/mocks/logger.js`.

---

#### 2.6 cleanup-test-data.test.js

**Arquivo:** `tests/integration/api/cleanup-test-data.test.js` (63 linhas)

#### Finalidade
Testar o handler `pages/api/cleanup-test-data.js` — endpoint administrativo que remove dados de teste do banco (DELETE).

#### Comportamento testado
| Cenário | Status esperado |
|---------|-----------------|
| Método não-DELETE | 405 |
| Usuário não-admin | 403 |
| Admin ("admin") executa DELETE | 200 |
| Falha no banco | 500 |

#### Relações
- Módulo real: `pages/api/cleanup-test-data.js`
- Mocks: `lib/infra/db.js` (via mockDb), `lib/auth/auth.js` (withAuth middleware mockado inline)

#### Problemas
- **Hardcode do admin**: O teste verifica `username === 'admin'` como string mágica. Se o nome de admin mudar, o teste quebra silenciosamente.
- **Sem beforeEach**: Não tem `beforeEach` para limpar mocks — isso é contado pelo mock global do `mockDb` que já começa limpo, mas é inconsistente com o resto do codebase.
- **Supressão de console.error**: O spy no console.error (linhas 51-61) é uma solução frágil — se o logger interno mudar de `console.error` para outro mecanismo, o teste para de funcionar.

#### Melhorias
- Extrair `'admin'` para constante compartilhada.
- Adicionar `beforeEach` explícito com `jest.clearAllMocks()`.
- Mockar o logger em vez de suprimir `console.error`.

---

#### 2.7 dicas.test.js

**Arquivo:** `tests/integration/api/dicas.test.js` (96 linhas)

#### Finalidade
Testar o handler `pages/api/dicas.js` — endpoint público de "Dicas do Dia" com paginação e cache.

#### Comportamento testado
| Cenário | Status esperado |
|---------|-----------------|
| GET com dicas publicadas | 200 + lista paginada |
| Parâmetros de paginação inválidos | 400 |
| Paginação explícita (page/limit) | 200 + paginação correta |
| Erro no banco | 500 |
| Método não-GET | 405 |

#### Relações
- Módulo real: `pages/api/dicas.js`
- Mocks: `lib/infra/db.js` (via mockDb), `lib/cache/cache.js` (invalidateCache)

#### Problemas
- **Cache compartilhado**: O `beforeEach` chama `invalidateCache()` — depende de o mock de cache estar corretamente configurado para isso. Se o mock não implementar `invalidateCache`, o teste falha sem mensagem clara.
- **Query dupla**: O teste assume que o handler faz `Promise.all` com COUNT + SELECT — isso é uma implementação vazada (implementation leak). Se a implementação mudar para uma única query com `COUNT(*) OVER()`, os testes quebram.

#### Melhorias
- Documentar que o teste assume `Promise.all` com duas queries.
- Adicionar teste de cache hit (quando `getOrSetCache` retorna do cache sem bater no banco).

---

#### 2.8 login.test.js

**Arquivo:** `tests/integration/api/login.test.js` (126 linhas)

#### Finalidade
Testar o handler `pages/api/auth/login` com foco na atualização do campo `last_login_at` no banco após login bem-sucedido.

#### Comportamento testado
| Cenário | Status esperado |
|---------|-----------------|
| Login bem-sucedido (atualiza last_login_at) | 200 + cookies + chamada ao authenticateAndGenerateToken |
| Falha na autenticação | 401 + não chama generateToken nem setAuthCookie |
| Falha na atualização de last_login_at | 200 (login ainda funciona, erro é logado) |

#### Relações
- **Mismo handler** que `auth/login.test.js` — duplicação significativa.
- Mocks: `lib/auth/auth`, `lib/cache/cache`, `lib/infra/logger`

#### Problemas
- **DUPLICAÇÃO CRÍTICA**: Este arquivo testa exatamente o mesmo handler (`pages/api/auth/login`) que `auth/login.test.js`. As únicas diferenças são:
  - `auth/login.test.js` testa rate limiting (429) e estrutura de resposta.
  - `login.test.js` testa `last_login_at` update.
  - Os dois poderiam ser consolidados num único arquivo com todos os cenários.
- **Título enganoso**: O describe diz "última atualização de last_login_at" mas o primeiro teste é um login completo genérico.
- **Falta testar**: O cenário de "falha na atualização de last_login_at" não verifica se o logger.error foi chamado — o teste confia que o mock faz a coisa certa sem assertion explícita.

#### Melhorias
- **Consolidar** com `auth/login.test.js` num único arquivo `auth/login.test.js`.
- Adicionar assertion de `logger.error` no cenário de falha de `last_login_at`.

---

#### 2.9 musicas.create.test.js

**Arquivo:** `tests/integration/api/musicas.create.test.js` (91 linhas)

#### Finalidade
Testar a criação de músicas via API administrativa (POST).

#### Comportamento testado
| Cenário | Status esperado |
|---------|-----------------|
| Criação com todos os campos | 201 + dados retornados |
| Campos obrigatórios faltando | 400 |
| Método não permitido | 405 |

#### Relações
- **Handler simulado INLINE**: O handler real (`pages/api/admin/musicas`) NÃO é importado. Em vez disso, o teste define um `musicasHandler` mockado localmente (linhas 13-33) que simula a lógica de criação.
- Mock da lib `./lib/musicas` (virtual, via `jest.mock`).

#### Problemas
- **Handler fantasma**: O handler definido no teste NÃO é o handler real da API. Isso significa que:
  - Se o handler real mudar, este teste não detecta.
  - A validação de campos (linhas 22-25) é uma reimplementação simplificada da realidade.
- **Path do mock**: `'./lib/musicas'` é um path relativo que não corresponde à estrutura real do projeto (que usa `lib/domain/musicas.js`).
- **Código morto**: A variável `url_imagem` no payload de teste nunca é validada — sugere que o campo existe no handler real mas não no teste.
- **Sem autenticação**: O handler simulado não implementa verificação de auth — diferente do handler real que usa `withAuth`.

#### Melhorias
- Importar o handler real (`pages/api/admin/musicas`) e mockar as dependências de domínio (`lib/domain/musicas.js`).
- Se o handler real for muito acoplado, usar o padrão de outros testes (mock de `lib/domain/musicas.js` + mock de `withAuth`).

---

#### 2.10 musicas.delete.test.js

**Arquivo:** `tests/integration/api/musicas.delete.test.js` (90 linhas)

#### Finalidade
Testar a exclusão de músicas via API administrativa (DELETE).

#### Comportamento testado
| Cenário | Status esperado |
|---------|-----------------|
| Exclusão com ID existente | 200 + mensagem |
| Música não encontrada (null) | 404 |
| ID não fornecido | 400 |
| Método não permitido | 405 |

#### Relações
- **Handler simulado INLINE** (mesmo problema de `musicas.create.test.js`).
- Mock da lib `./lib/musicas` (virtual).

#### Problemas
- **Mesmo problema do create**: Handler fantasma — não testa o handler real.
- **Valoração do delete**: O handler simulado retorna 200 quando `result` é truthy e 404 quando null. Mas o handler real pode lançar exceção em vez de retornar null — este teste não captura esse cenário.
- **Sem autenticação**: Novamente, sem verificação de auth.

#### Melhorias
- Importar handler real.
- Adicionar teste de exceção (reject) na lib para simular erro de banco.

---

#### 2.11 musicas.flow.test.js

**Arquivo:** `tests/integration/api/musicas.flow.test.js` (150 linhas)

#### Finalidade
Testar o fluxo completo (ciclo de vida) de músicas: criar → listar → excluir.

#### Comportamento testado
| Cenário | Status esperado |
|---------|-----------------|
| Ciclo completo (POST → GET → DELETE) | 201 → 200 → 200 |
| URL do Spotify inválida | 400 |
| Filtro de busca (search) | 200 + chamada com termo |

#### Relações
- **Handler REAL importado**: `pages/api/admin/musicas` (positivamente diferente dos anteriores).
- Mocks: `lib/domain/musicas.js` (createMusica, getPaginatedMusicas, deleteMusica), `lib/domain/audit.js`, `lib/cache/cache`, `lib/auth/auth`

#### Problemas
- **Unmocked dependencies**: O mock de `lib/cache/cache` define `invalidateCache` mas não `getOrSetCache` — se o handler usar cache, falhará.
- **Sem teste de update**: O fluxo não inclui PUT/update — está incompleto.
- **Headers host**: Usa `headers: { host: 'localhost:3000' }` sem necessidade aparente (nenhum teste verifica o host).

#### Melhorias
- Incluir update no fluxo.
- Remover headers host se não usado.
- Adicionar mock de `getOrSetCache` no cache mock.

---

#### 2.12 musicas.integration.test.js

**Arquivo:** `tests/integration/api/musicas.integration.test.js` (55 linhas)

#### Finalidade
Validar segurança: garantir que a query SQL do endpoint público de músicas sempre inclui `WHERE publicado = true`.

#### Comportamento testado
| Cenário | Status esperado |
|---------|-----------------|
| Query SQL inclui "WHERE publicado = true" | Verdadeiro |
| Filtro mantido mesmo com busca | Verdadeiro |

#### Relações
- **Handler REAL importado**: `pages/api/musicas` (endpoint público).
- Mock de `lib/infra/db` (apenas `query`).

#### Problemas
- **Acoplamento à implementação**: O teste procura por strings específicas no SQL (`WHERE publicado = true AND`). Se a cláusula SQL for reescrita (ex: `WHERE publicado IS TRUE`), o teste quebra.
- **Sem assertion de status**: O teste verifica o conteúdo da query mas assume que o status é 200 sem assertion (só `expect(res._getStatusCode()).toBe(200)` no segundo teste).
- **Mock default frágil**: O `mockImplementation` (linhas 16-21) cobre qualquer query que inclua `COUNT(*)` ou cai no fallback — muito permissivo.

#### Melhorias
- Adicionar assertion explícita de 200 no primeiro teste.
- Considerar testar o resultado (sem dados não-publicados) em vez de testar o SQL string.

---

#### 2.13 musicas.pagination.test.js

**Arquivo:** `tests/integration/api/musicas.pagination.test.js` (105 linhas)

#### Finalidade
Testar a paginação do endpoint de músicas.

#### Comportamento testado
| Cenário | Status esperado |
|---------|-----------------|
| Primeira página com limite padrão (10) | 200 + 10 itens |
| Página e limite explícitos | 200 + 5 itens (page=2, limit=5) |

#### Relações
- **Handler simulado INLINE** (mesmo problema de create/delete).
- Mock da lib `./lib/musicas` (virtual).

#### Proterção de resultados**
- **Handler fantasma**: Novamente, o handler real não é testado.
- **Estrutura de resposta**: O handler simulado retorna `{ musicas: [...], pagination: {...} }` mas o handler real pode usar `{ success: true, data: [...], pagination: {...} }` — estruturas incompatíveis.
- **Sem teste de página vazia**: Não testa o que acontece quando `page` está além do disponível.
- **Sem teste de limite inválido**: Não testa `limit: 0` ou `limit: -1`.

#### Melhorias
- Importar handler real.
- Adicionar testes de edge case (página vazia, limite negativo, limite muito alto).

---

#### 2.14 musicas.test.js

**Arquivo:** `tests/integration/api/musicas.test.js` (78 linhas)

#### Finalidade
Testar o endpoint público de músicas (`/api/musicas`) usando a abstração `testPublicGetEndpoint`.

#### Comportamento testado
- Testes padrão herdados de `testPublicGetEndpoint`: 405, 400.
- Casos específicos:
  | Cenário | Status esperado |
  |---------|-----------------|
  | GET com Cache-Control e dados | 200 + header + dados |
  | Erro no servidor | 500 + mensagem |
  | Rate limit excedido | 429 |

#### Relações
- **Handler REAL importado**: `pages/api/musicas`.
- Usa `testPublicGetEndpoint` de `tests/helpers/crud-test.js`.
- Usa `musicFactory` de `tests/factories`.
- Mocks: `lib/domain/musicas.js` (getPaginatedMusicas), `lib/cache/cache.js` (via mockCacheModule), `lib/infra/logger.js`.

#### Problemas
- **Dados do factory**: `musicFactory.list(1)` retorna `{ data: mockData, pagination: ... }` — mas o mock de `getPaginatedMusicas` espera receber esse formato? Ou espera `(page, limit, search, publicado, role)`? A assinatura do mock na linha 55 (`expect(getPaginatedMusicas).toHaveBeenCalledWith(1, 10, 'Hino', true, 'default')`) sugere uma interface diferente.
- **Cache-Control**: O teste verifica `s-maxage=300` mas não verifica `stale-while-revalidate` — se o handler mudar o header, o teste pode falhar silenciosamente ou passar sem cobertura total.

#### Melhorias
- Verificar se `musicFactory.list(1)` é compatível com a assinatura real de `getPaginatedMusicas`.
- Adicionar assertion de `stale-while-revalidate` se aplicável.

---

#### 2.15 musicas.update.test.js

**Arquivo:** `tests/integration/api/musicas.update.test.js` (146 linhas)

#### Finalidade
Testar a atualização de músicas via API administrativa (PUT).

#### Comportamento testado
| Cenário | Status esperado |
|---------|-----------------|
| Atualização com todos os campos | 200 + dados atualizados |
| Música não encontrada | 404 |
| Campos obrigatórios faltando | 400 |
| ID não fornecido | 400 |
| Método não permitido | 405 |

#### Relações
- **Handler simulado INLINE** (mesmo problema de create/delete/pagination).
- Mock da lib `./lib/musicas` (virtual).

#### Problemas
- **Handler fantasma**: Novamente.
- **Validação de campos**: O handler simulado valida `titulo`, `artista`, `url_spotify` — mas o handler real pode ter validação diferente.
- **Sem autenticação**: Sem mock de `withAuth`.

#### Melhorias
- Importar handler real.
- Adicionar teste de `url_spotify` inválida (se aplicável).

---


#### 3.1 Handlers Fantasmas (Código Desconectado da Realidade)

**Arquivos afetados**: `musicas.create.test.js`, `musicas.delete.test.js`, `musicas.pagination.test.js`, `musicas.update.test.js`

Quatro dos sete testes de músicas definem handlers **locais simulados** em vez de importar o handler real. Isso significa:

- **Falsa sensação de cobertura**: O teste passa, mas o handler real pode estar quebrado.
- **Duplicação de lógica**: A validação de campos obrigatórios está reimplementada em cada arquivo.
- **Manutenção dobrada**: Se o handler real mudar, é necessário atualizar tanto o handler real quanto o simulado no teste.

**Impacto**: ALTO — 4 de 15 arquivos (27%) têm esse problema.

#### 3.2 Duplicação de Mocks do Logger

**Arquivos afetados**: `auth/login.test.js`, `auth/refresh.test.js`, `login.test.js`

O mock do logger segue o mesmo padrão em todos os três:

```javascript
jest.mock('../../../../lib/infra/logger', () => {
  const mockMethods = {
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    success: jest.fn()
  };
  return {
    ...mockMethods,
    logger: { ...mockMethods }
  };
});
```

Isso deveria ser centralizado em `tests/mocks/logger.js` (similar ao padrão de `db-module.js` e `cache.js`).

#### 3.3 Paths de Mocks Inconsistentes

Alguns arquivos usam paths absolutos a partir da raiz do projeto, outros usam paths relativos confusos:

- `musicas.create.test.js`: `'./lib/musicas'` (relativo ao arquivo de teste!)
- `musicas.flow.test.js`: `'../../../lib/domain/musicas.js'` (path real do projeto)

O path `'./lib/musicas'` não corresponde a nenhum módulo real do projeto — funcionaria apenas como `{ virtual: true }`, o que significa que o mock NÃO está substituindo o módulo real, apenas criando um módulo fantasma.

---


#### 4.1 Duplicação: auth/login.test.js ↔ login.test.js

| Aspecto | auth/login.test.js | login.test.js |
|---------|-------------------|---------------|
| Handler testado | `pages/api/auth/login` | `pages/api/auth/login` |
| Cenários únicos | Rate limit (429), cookies | last_login_at update |
| Mocks | auth + cache + logger | auth + cache + logger |
| beforeEach | Sim (`clearAllMocks`) | Sim (`clearAllMocks` + rate limit) |

**Recomendação**: Consolidar em `auth/login.test.js`, migrando os testes de `last_login_at` para o arquivo existente. Remover `login.test.js`.

#### 4.2 Duplicação: musicas.test.js vs musicas.pagination.test.js vs musicas.integration.test.js vs musicas.flow.test.js

Todos testam o endpoint `/api/musicas` ou `/api/admin/musicas`:

| Arquivo | Handler real? | Endpoint |
|---------|---------------|----------|
| musicas.test.js | ✅ | /api/musicas (público) |
| musicas.pagination.test.js | ❌ (simulado) | /api/admin/musicas |
| musicas.integration.test.js | ✅ | /api/musicas (público) |
| musicas.flow.test.js | ✅ | /api/admin/musicas |

**Sobreposição**:
- `musicas.test.js` e `musicas.integration.test.js` testam o mesmo endpoint público.
- `musicas.flow.test.js` e `musicas.pagination.test.js` testam o endpoint admin.

#### 4.3 Código Morto

- **`auth/login.test.js`**: Os mocks `authenticate`, `generateToken` (linhas 8-9) são declarados mas **nunca usados** nos testes — o teste usa `authenticateAndGenerateToken`. Podem ser removidos.
- **`login.test.js`**: Mesmo problema — `authenticate`, `generateToken` declarados no mock mas não utilizados.
- **`musicas.create.test.js`**: Variável `url_imagem` no payload nunca validada.

---


#### Prioridade Alta

1. **Consolidar testes de login**: Unificar `auth/login.test.js` + `login.test.js` num único arquivo.
2. **Eliminar handlers fantasmas**: Refatorar `musicas.create.test.js`, `musicas.delete.test.js`, `musicas.pagination.test.js`, `musicas.update.test.js` para importar handlers reais.
3. **Centralizar mock do logger**: Criar `tests/mocks/logger.js` com padrão similar a `db-module.js`.

#### Prioridade Média

4. **Consolidar testes de músicas**: Avaliar se `musicas.test.js` + `musicas.integration.test.js` podem ser unificados (testam o mesmo endpoint).
5. **Adicionar testes de edge case**: Páginas vazias, limites inválidos, erros de banco em cenários não cobertos.
6. **Adicionar beforeEach consistente**: Arquivos sem `beforeGet` (`cleanup-test-data.test.js`, `audit.test.js`) devem incluí-lo.

#### Prioridade Baixa

7. **Extrair constantes**: Substituir strings mágicas como `'admin'` e `'localhost:3000'` por constantes.
8. **Documentar acoplamento SQL**: Adicionar comentários explicando que `musicas.integration.test.js` assume implementação SQL específica.
9. **Adicionar testes de exceção**: Cenários de erro não cobertos em vários arquivos (audit, logout, dicas).

---

## Resumo Quantitativo

| Métrica | Valor |
|---------|-------|
| Total de arquivos analisados | 15 |
| Arquivos com handler real | 8 (53%) |
| Arquivos com handler simulado/fantasma | 4 (27%) |
| Arquivos sem handler (testam libs/dominio) | 3 (20%) |
| Duplicações identificadas | 2 pares |
| Arquivos sem beforeEach | 2 |
| Mocks manuais do logger (duplicados) | 3 |

---

*Documentação gerada em 23/09/2026 por Hermes Agent — Análise de testes de integração do projeto Caminhar.*


---


## 6. Testes de Integração — API Pública (Posts, Products, Settings, Stats, Status, Upload)


O conjunto de testes de integração da API avalia o comportamento dos endpoints Next.js (`pages/api/`) sob duas perspectivas recorrentes:

1. **Testes diretos do handler real** — importam o arquivo `pages/api/X.js` e mockam apenas as camadas externas (DB, cache, auth). Exemplos: `posts.test.js`, `settings.test.js`, `products.test.js`, `stats.test.js`, `status.test.js`, `placeholder-image.test.js`, `upload-image.test.js`.
2. **Testes com handler simulado** — reescrevem um `postsHandler` fictício inline no arquivo de teste e validam o padrão de resposta desse handler inventado. Exemplos: `posts.create.api.test.js`, `posts.delete.test.js`, `posts.update.api.test.js`, `posts.general.test.js`, `posts.flow.test.js`, `settings.general.test.js`, `videos.create.api.test.js`.

Há também um híbrido (`posts.integration.test.js`) que importa o handler real mas expõe uma estrutura de "passos encadeados" para cenários ponta-a-ponta simulados.

Dependências compartilhadas:
- `tests/helpers/crud-test.js` — `testPublicGetEndpoint`, `testAdminCrudEndpoint`, `testAdminGetEndpoint`
- `tests/mocks/db-module.js` — `mockDb()`, `mockDbError()`
- `tests/mocks/cache.js` — `mockCacheModule()`
- `tests/factories/` — `postFactory`, `userFactory`, `musicFactory`, `videoFactory`

---


**Arquivo:** `pages/api/placeholder-image.js`

#### Finalidade
Testa o endpoint que retorna a imagem configurada como "placeholder" do site, com uma cadeia de fallback em três níveis:
1. Imagem salva no banco via `getSetting`;
2. Primeiro arquivo do diretório `/uploads`;
3. SVG inline padrão.

#### O que testa
| Caso | Status |
|---|---|
| Imagem configurada no banco é retornada com `Content-Type`, `Cache-Control`, `Last-Modified` | 200 |
| `If-None-Match` com filename atual retorna 304 (não chama `readFile`) | 304 |
| Falha no DB → fallback para leitura do diretório, `logger.warn` é chamado | 200 |
| DB retorna `readdir` falha → SVG inline | 200 |

#### Relações
- Usa `jest.resetModules()` + `require` dinâmico em `beforeEach` porque o handler mantém o nome do arquivo em cache interno. O reset é necessário para isolar os cenários.
- Consome os mocks de `fs`, `db`, `settings` e `logger`, todos centralizados em `tests/mocks/`.

#### Problemas
- **Mock de `Content-Type` fixo:** o teste assume `image/jpeg` apenas pela extensão do nome salvo no banco. O handler real infere o mime da extensão; se o banco retorna `.webp`, o teste do primeiro cenário falhará.
- **`Cache-Control: immutable`** — o teste impõe `immutable`, mas o handler real pode não incluir esse token (verificar implementação). Se o handler não emitir `immutable`, o teste falha sem motivo real.
- **304 depende do filename exato** — `if-none-match: '"hero-image-123.jpg"'` precisa casar com o retorno do `getSetting`. Qualquer mudança no formato da chave ETag no handler real quebra o teste.

#### Melhorias
- Testar retorno 304 também com o fallback do diretório.
- Validar `Content-Type` dinamicamente conforme a extensão testada.
- Adicionar cenário de fallback SVG com `dir` vazia (array vazio em vez de erro).

#### Duplicidades / Código morto
- Nenhum. Este é um teste isolado e bem delimitado.

---


**Arquivo relacionado:** Nenhum handler real — **handler simulado inline**.

#### Finalidade
Validar o fluxo de criação de um post: receber `POST`, validar campos obrigatórios (`title`, `slug`, `content`), chamar `createPost`, retornar 201.

#### O que testa
| Caso | Status |
|---|---|
| Criação com todos os campos | 201 |
| Campos faltando (slug/content ausentes) | 400 |
| Método GET | 405 |

#### Relações
- Caminho apontado: `/api/admin/posts`, mas o handler real está em `pages/api/admin/posts.js` e não é importado — o teste cria um `postsHandler` fictício.
- O mock da biblioteca é `../lib/posts` (caminho relativo errado, ver abaixo).

#### Problemas
- **Caminho de mock incorreto:** `jest.mock('../lib/posts', ...)` relativo ao arquivo de teste daria em `tests/integration/lib/posts` — não existe. Se o Jest resolve, é porque `{ virtual: true }` ignora a resolução de caminho, mas a intenção é confusa.
- **Handler simulado não reflete o real:** o handler real (`pages/api/admin/posts.js`) usa `createAdminHandler`, validação Zod, `logActivity`, e retorna erros detalhados com `errors.flatten()`. O handler do teste ignora tudo isso.
- **Validação diferente:** o simulado valida `!title || !slug || !content` mas o real valida `title` e `slug` com Zod e `content` é opcional no schema real (`z.string().optional()`). Falso positivo de cobertura.
- **Código totalmente morto em produção** — este teste não protege o handler real.

#### Melhorias
- Substituir pelo teste do handler real importado de `pages/api/admin/posts.js`.
- Se manter o simulado, documentar que é "exemplo didático" e não teste de regressão.

#### Duplicidades
- Lógica de criação reescrita em `posts.general.test.js` (handler `createPost` do `db`) e em `posts.flow.test.js` (handler `postsHandler` inline com `dbModule.query`). O mesmo cenário é testado três vezes com fidelidades diferentes.

---


**Arquivo relacionado:** Nenhum handler real — **handler simulado inline**.

#### Finalidade
Validar o fluxo de exclusão: validar presença do `id` (body ou query), chamar `deletePost`, retornar 200 ou 404.

#### O que testa
| Caso | Status |
|---|---|
| Exclusão com id no body | 200 |
| Exclusão com id inexistente (lib retorna `null`) | 404 |
| Body vazio sem id | 400 |
| Método GET | 405 |

#### Relações
- Mesma estrutura do `posts.create.api.test.js` — `jest.mock('./lib/posts', ..., { virtual: true })` e `postsHandler` inline.
- Caminho `/api/admin/posts`.

#### Problemas
- **Caminho de mock `./lib/posts`** — novamente relativo ao arquivo de teste, apontaria para `tests/integration/lib/posts`.
- **Handler simulado:** o real deleta via `deletePost(id)` mas antes faz `SELECT title FROM posts WHERE id = $1` para log. O simulado ignora isso.
- **Teste de 404:** o simulado retorna 404 se `deletePost` retorna `null`. O handler real retorna 404 se `!deleted` — compatível, mas não testado de verdade.

#### Melhorias
- Substituir por teste do handler real.
- Adicionar cenário de `id` na query string (a rota dinâmica usa `query.id`).

#### Duplicidades
- A exclusão é reescrita em `posts.flow.test.js` e implicitamente em outros testes de fluxo.

---


**Arquivo relacionado:** Nenhum handler real — **dois handlers simulados inline** (`uploadHandler` e `postsHandler`).

#### Finalidade
Testar o "fluxo completo": upload de imagem → criação de post com a URL retornada. Simula um cenário ponta-a-ponta sem usar os handlers reais.

#### O que testa
| Caso | Status |
|---|---|
| Upload de imagem (via `uploadHandler` simulado) | 200 |
| Criação de post com `image_url` retornada | 201 |
| SQL de `INSERT INTO posts` contém a URL correta | assert |

#### Relações
- `uploadHandler` simula um endpoint que **não existe** como arquivo — é inventado no teste.
- `postsHandler` simulado faz `dbModule.query` direto (sem `createAdminHandler`).

#### Problemas
- **Testa handlers que não existem no código-fonte.** O `uploadHandler` real está em `pages/api/upload-image.js`, mas é completamente diferente: usa `formidable`, `sharp`, `fs.rename`, e `updateSetting` para `home_image_url`. O simulado ignora tudo.
- **Nome errôneo:** o teste importa `formidable` como `{ IncomingForm }` mas o `upload-image.js` real usa `import formidable from 'formidable'` (default export). O mock é incompatível.
- **Caminho do mock de `db`:** `../../../lib/infra/db.js` (correto), mas o `dbModule` é usado para `dbModule.query` direto enquanto o handler real de posts usa `createPost`/`updatePost` do domínio, não `query` direto.
- **Gera falsa confiança:** o teste passa sem que nenhum código real seja exercitado.
- **`expect.arrayContaining` com `true` no final:** o teste verifica que o 5º argumento é `true` (presumindo `published: true`), mas a ordem dos parâmetros SQL real é `[title, slug, excerpt, content, image_url, published]` — `published` é o 6º, não o 5º. O teste passa por coincidência porque `arrayContaining` não valida ordem, mas a intenção é frágil.

#### Melhorias
- Reescrever importando `pages/api/upload-image.js` real e o handler real de criação de post.
- Validar o rename real e a chamada `updateSetting` para `home_image_url`.

#### Duplicidades / Código morto
- `uploadHandler` é código morto — replicaria parte do `upload-image.js` sem nunca ser usado.
- `postsHandler` duplica a lógica de `posts.create.api.test.js` e `posts.general.test.js`.

---


**Arquivo relacionado:** Nenhum handler real — **handler simulado inline**.

#### Finalidade
Testar o CRUD de posts (GET e POST) com handler simulado que chama `db.getAllPosts()` e `db.createPost()` — métodos que não existem no `db.js` real (este exporta `query`, `resetPool`, `closeDatabase`, `transaction`, `healthCheck`, `getDatabaseInfo`).

#### O que testa
| Caso | Status |
|---|---|
| GET retorna lista | 200 |
| POST cria post | 201 |
| POST com body vazio | 400 |

#### Relações
- Mock do `db` é `require('../../mocks/db-module').mockDb({ getAllPosts: ..., createPost: ... })` — estende o mock padrão com funções que o db real não possui.
- Mock do `auth` é `withAuth: (fn) => (req, res) => fn(req, res)` — bypass total.

#### Problemas
- **Handler simulado é completamente diferente do real:** o real (`pages/api/admin/posts.js`) usa `getPaginatedPosts`, `createPost`, `updatePost`, `deletePost` do domínio e `createAdminHandler` para middleware.
- **`db.getAllPosts` não existe** — o teste cria um oráculo falso. Se o handler real mudasse a query, este teste não pegaria.
- **Mocks configurados por extensão** (`mockDb({ overrides })`) em vez de usar `jest.fn()` específicos — padrão inconsistente com o resto da codebase.

#### Melhorias
- Remover ou substituir por teste do handler real.
- Se o objetivo é testar o domínio `posts.js`, o arquivo correto seria `tests/integration/domain/posts.db.test.js`.

#### Duplicações
- GET de posts é testado em `posts.test.js` (handler real), `posts.integration.test.js` (handler real via helper) e aqui (handler simulado). Trio redundante.

---


**Arquivo relacionado:** `pages/api/posts.js` (handler **real**, importado).

#### Finalidade
Testar o endpoint público `GET /api/posts` com paginação, busca, cache e rate limit — usando o handler real.

#### O que testa
| Caso | Status |
|---|---|
| GET com sucesso | 200 |
| Parâmetros `page=2`, `limit=5` | 200 |
| Método PUT | 405 |
| `page < 1` | 400 |
| `limit < 1` | 400 |
| `limit > 100` | 400 |
| Rate limit ativo | 429 |
| Erro interno | 500 |
| Query params ausentes (default) | 200 |
| Chave de cache `posts:list:2:5` | assert |
| Parâmetro `search` — cache `posts:search:1:10:test-term` | assert |

#### Relações
- Importa `handler` real de `../../../pages/api/posts.js`.
- Importa `getRecentPosts` de `lib/domain/posts.js` (mockado).
- Importa `getOrSetCache`, `checkRateLimit` de `lib/cache/cache.js` (mockado).

#### Problemas
- **Asserções de cache inconsistentes:** o teste espera `posts:list:2:5` mas o handler real gera `posts:list:2:5` sem normalizar `search` para lowercase e trim. Se `search` for `Test-Term`, o handler real gera `posts:search:1:10:Test-Term` mas o teste espera `test-term` — teste falharia. (Atualmente o teste passa porque mocka `getOrSetCache` para ignorar o conteúdo da chave.)
- **Cache key com `search`:** teste espera `posts:search:1:10:test-term` mas handler real gera `posts:search:${page}:${limit}:${search.toLowerCase().trim()}`. Como o mock ignora a chave real e a assertion lê `getOrSetCache.mock.calls[0][0]`, o teste valida a chave efetivamente passada — ok, mas frágil.
- **Handler mock de `getOrSetCache`:** no `beforeEach` o mock é reconfigurado para executar `fetchFunction()` diretamente, anulando o propósito de testar cache. O teste de cache valida apenas a chave, não o comportamento de hit/miss.

#### Melhorias
- Adicionar teste de cache hit (segunda chamada não invoca `getRecentPosts`).
- Testar normalização de `search` (case, espaços).
- Adicionar teste de método POST (handler real suporta POST com autenticação).

#### Duplicidades
- `posts.test.js` testa os mesmos cenários (405, 400, rate limit, erro, paginação) com implementação quase idêntica. Dois arquivos testam o mesmo handler com as mesmas intenções.

---


**Arquivo relacionado:** `pages/api/posts.js` (handler **real**, importado via helper).

#### Finalidade
Testar o endpoint público `GET /api/posts` usando o helper `testPublicGetEndpoint` e factories.

#### O que testa
| Caso | Status |
|---|---|
| GET default (2 posts) | 200 |
| Paginação `page=3`, `limit=20`, `search=teste` | 200 |
| Paginação inválida `page=-1` | 400 |
| Erro interno | 500 |
| (Helper) `skipMethodNotAllowed: true` | omitido 405 |
| (Helper) paginação inválida `page=-1` | 400 |

#### Relações
- Usa `testPublicGetEndpoint(handler, { resourceName: 'posts', path: '/api/posts', skipMethodNotAllowed: true }, callback)`.
- Usa `postFactory.list(2)` para gerar dados.
- Importa `getRecentPosts` e `getOrSetCache` mockados.

#### Problemas
- **Conflito com `posts.integration.test.js`:** os dois arquivos testam o mesmo handler real com as mesmas situações. `posts.test.js` é a versão "refatorada com helper", mas `posts.integration.test.js` não foi removido. Manter ambos gera manutenção duplicada.
- **Cache key com `search`:** teste espera `posts:search:3:20:teste` e TTL `1800`. Handler real gera `posts:search:3:20:teste` apenas se `search.toLowerCase().trim() === 'teste'`. Funciona, mas frágil.
- **405 omitido:** o helper permite `skipMethodNotAllowed: true` porque o handler real aceita `POST` (autenticado) na mesma rota. Isso é documentado no helper, mas uma regressão no POST não seria capturada aqui.
- **`getRecentPosts` chamado com `(limit, page, search)`:** teste espera `(20, 3, 'teste')` — a ordem dos argumentos é `(limit, page, search)`. Handler real chama `getRecentPosts(limit, page, search)`. Correto.

#### Melhorias
- Remover `posts.integration.test.js` (versão legacy) e manter apenas este.
- Adicionar teste do POST autenticado.

#### Duplicidades
- Duplicado com `posts.integration.test.js` em ~80% dos cenários.

---


**Arquivo relacionado:** Nenhum handler real — **handler simulado inline**.

#### Finalidade
Validar o fluxo de atualização: método PUT, validar `id` e campos obrigatórios, chamar `updatePost`, retornar 200/404/400/405.

#### O que testa
| Caso | Status |
|---|---|
| Atualização com sucesso | 200 |
| Post inexistente (lib retorna `null`) | 404 |
| Campos obrigatórios faltando | 400 |
| ID não fornecido | 400 |
| Método POST | 405 |

#### Relações
- Mesma estrutura de `posts.create.api.test.js` e `posts.delete.test.js` — `jest.mock('../lib/posts', ..., { virtual: true })` com caminho incorreto.
- Caminho `/api/admin/posts`.

#### Problemas
- **Caminho de mock incorreto** (`../lib/posts` relativo ao teste → `tests/integration/lib/posts`).
- **Handler simulado diferente do real:** o handler real usa `updatePost(postId, updatePayload)` e o schema Zod aceita campos parciais (todos `optional()` no update). O simulado exige `title`, `slug`, `content` obrigatórios — falso positivo.
- **Código morto em produção.**

#### Melhorias
- Substituir por teste do handler real (`pages/api/admin/posts.js`).
- Adicionar cenário de `action=reorder` (funcionalidade real do handler admin).

#### Duplicações
- Lógica de atualização reescrita em `posts.flow.test.js` e implicitamente nos testes de domínio.

---


**Arquivo relacionado:** `pages/api/products.js` (handler **real**, importado).

#### Finalidade
Testar o CRUD completo de produtos, cobrindo:
- GET público (com `?public=true`) com paginação e filtros;
- GET admin (autenticado);
- Rate limit e autenticação em mutações;
- POST, PUT, DELETE autenticados;
- Casos de borda (405, fallback vazio, filtros).

#### O que testa
| Caso | Status |
|---|---|
| GET público com paginação | 200 |
| GET público com paginação inválida | 400 |
| GET público com `page=2`, `limit=5` | 200 |
| GET admin (autenticado) | 200 |
| GET admin sem token | 401 |
| GET admin com `limit=101` | 400 |
| Rate limit em POST | 429 |
| PUT sem token | 401 |
| DELETE com token inválido | 401 |
| POST cria produto + logActivity | 201 |
| POST sem nome/preço | 400 |
| PUT atualiza + invalida cache | 200 |
| PUT retorna 404 | 404 |
| DELETE exclui + logActivity | 200 |
| DELETE retorna 404 | 404 |
| PATCH retorna 405 | 405 |
| GET público com filtros vazios | 200 |
| GET público sem token (silencioso) | 200 |

#### Relações
- Importa handler real.
- Usa `userFactory` para gerar admins.
- Mocks de `products.js`, `auth.js`, `cache.js`, `audit.js`, `logger.js`.

#### Problemas
- **`updateProduct` retorna array:** teste espera `updateProduct.mockResolvedValueOnce([{ id: 1, name: 'Meia' }])` mas o handler real trata retorno `null` como 404. Se o domínio retorna array, o handler faz `res.status(200).json(updatedProduct)` — pode ser array ou objeto dependendo da implementação real. O teste assume array mas não valida tipo.
- **Chave de cache pública:** handler real gera `products:public:1:10::` (vazia entre os testes) mas o teste não valida a chave.
- **`verifyToken` retorna `{ username: 'admin' }`** — o handler real requer `req.user.username` para `logActivity`. Se `verifyToken` retornar sem `username`, falha silenciosamente no log. O teste garante `username: 'admin'`.
- **`paginate` helper:** o handler usa `paginate(req.query.page, req.query.limit)` que lança `INVALID_PAGINATION_PARAMS` em vez de retornar 400 diretamente. O teste espera 400 com `page='-1'`, mas `paginate` pode lançar erro diferente de `-1` vs `0`. (Teste passa, mas a dependência do helper não é mockada — teste de integração real.)

#### Melhorias
- Adicionar teste de cache hit (segunda chamada não invoca `getPaginatedProducts`).
- Testar retorno 500 do handler (catch global).
- Validar que `invalidateCache('products:*')` é chamado após POST/PUT/DELETE.

#### Duplicações
- Não há outro teste de products na pasta. Único arquivo — sem duplicação interna.

---


**Arquivo relacionado:** Nenhum handler real — **handler simulado inline**.

#### Finalidade
Testar GET e PUT de configurações com handler simulado, incluindo autenticação via header `Authorization: Bearer valid-token`.

#### O que testa
| Caso | Status |
|---|---|
| Sem token | 401 |
| GET com token válido | 200 |
| PUT com token válido | 200 |

#### Relações
- Mock do `db` é `require('../../mocks/db-module').mockDb()`.
- Mock do `auth` implementa `withAuth` inline com verificação de header.
- Handler simulado verifica `req.headers.authorization !== 'Bearer valid-token'` diretamente (duplicando o middleware `withAuth`).

#### Problemas
- **Handler simulado diferente do real:** o handler real (`pages/api/settings.js`) usa `getSettings()` do domínio, `getOrSetCache`, `withAuth` do `auth.js`, e validação Zod. O simulado ignora tudo e faz `db.query('SELECT key, value FROM settings')` direto.
- **Middleware duplicado:** o handler verifica `authorization` no handler e o mock do `withAuth` também verifica — redundância confusa.
- **Código morto em produção** — não protege o handler real.

#### Melhorias
- Substituir por teste do handler real.
- Se manter, remover a verificação duplicada de auth no handler simulado.

#### Duplicações
- Testa o mesmo endpoint de `settings.test.js` (handler real), mas com implementação completamente diferente.

---


**Arquivo relacionado:** `pages/api/settings.js` (handler **real**, importado).

#### Finalidade
Testar o endpoint de configurações real: GET (público e autenticado), PUT (admin), erros gerais.

#### O que testa
| Caso | Status |
|---|---|
| GET com sucesso | 200 |
| GET público sem autenticação (rota GET é pública) | 200 |
| GET com erro interno | 500 |
| PUT atualiza com sucesso | 200 |
| PUT retorna 403 para role `editor` | 403 |
| PUT com body vazio | 400 |
| PUT com erro interno | 500 |
| DELETE retorna 405 | 405 |

#### Relações
- Importa handler real de `pages/api/settings.js`.
- Usa `getAuthToken`, `verifyToken`, `getSettings`, `updateSetting` mockados.
- Usa `clearAppMemoryCache()` do módulo de cache real (não mockado para o `clearAppMemoryCache`).

#### Problemas
- **403 para `editor`:** o teste espera 403 quando `verifyToken` retorna `{ role: 'editor' }`. O handler real retorna 403 no PUT porque `withAuth` verifica `req.user.role !== 'admin'` (PUT exige admin). Isso está correto no handler, mas o cenário do teste (editor autenticado recebendo 403) é um comportamento importante — ok.
- **`clearAppMemoryCache` importado de `lib/cache/cache.js`:** se o módulo for mockado em outro teste, aqui é o real. Pode causar efeitos colaterais entre testes se não for adequadamente isolado.
- **`updateSetting` chamado com `(key, value, undefined, undefined)`:** handler real passa `type` e `description` do body, que vêm `undefined` se não fornecidos. Teste valida isso — ok, mas frágil se a assinatura mudar.

#### Melhorias
- Adicionar teste de GET com `?key=...` autenticado (rota que exige auth).
- Testar `POST` de configuração (handler real suporta POST para criar config).
- Testar cache hit no GET público.

#### Duplicações
- Duplicado parcialmente com `settings.general.test.js` (handler simulado). Recomenda-se remover `settings.general.test.js`.

---


**Arquivo relacionado:** `pages/api/admin/stats.js` (handler **real**, importado).

#### Finalidade
Testar o endpoint de estatísticas admin: autenticação e contagens de entidades.

#### O que testa
| Caso | Status |
|---|---|
| Sem autenticação | 401 |
| Com autenticação, contagens corretas | 200 |
| Fallback para 0 quando DB retorna vazio | 200 |

#### Relações
- Importa handler real de `pages/api/admin/stats.js`.
- Usa `query` mockado de `lib/infra/db`.
- Usa `getAuthToken`, `verifyToken` mockados de `lib/auth/auth`.

#### Problemas
- **Mock do `query` com `mockImplementation`:** o teste usa `query.mockImplementation(async (sql) => { ... })` para rotear diferentes resultados conforme o SQL. Isso é frágil: se o handler real mudar a ordem das queries ou o texto SQL, o teste quebra sem motivo real.
- **`count` retornado como string:** o PostgreSQL retorna `count` como string. O handler real faz `parseInt(...)`. O teste retorna `{ count: '5' }` e espera `5` (number). Correto, mas o mock de `rows: []` retorna `undefined` para `rows[0].count` — handler faz `|| 0` e `parseInt(0, 10) = 0`. Funciona.
- **Mock de `withAuth` inline:** o mock de `auth.js` implementa `withAuth` com lógica própria (401 se sem token, 401 se token inválido). Isso é duplicado com a lógica real de `withAuth` em `lib/auth/auth.js`. Se a lógica real mudar, o teste não reflete.
- **Todas as queries mockadas para 10 por padrão:** queries não reconhecidas retornam `{ rows: [{ count: '10' }] }`, então `stats.posts` será 10 mas `stats.musicas`, `stats.videos`, etc. serão 10 também. O teste só valida `posts`, `usersToday`, `usersMonth`, `usersYear` — as outras ficam com 10 silenciosamente.

#### Melhorias
- Testar cenário de erro no DB (uma das queries falha — handler não tem try/catch individual por query).
- Mockar cada query separadamente para evitar o roteamento por string SQL.
- Adicionar teste de `users` total (count de todos os usuários).

#### Duplicações
- É o único teste do endpoint `/api/admin/stats`. Sem duplicação interna.

---


**Arquivo relacionado:** `pages/api/status.js` (handler **real**, importado).

#### Finalidade
Testar o endpoint de health check: método GET, diagnóstico do banco, fallback de `NODE_ENV`.

#### O que testa
| Caso | Status |
|---|---|
| Método POST retorna 405 | 405 |
| DB conectado retorna `status: connected` | 200 |
| DB falhando retorna `status: error` | 200 |
| `NODE_ENV` ausente fallback `development` | 200 |

#### Relações
- Importa handler real de `pages/api/status.js`.
- Usa `query` mockado do `db-module` mock.

#### Problemas
- **`NODE_ENV` deletado globalmente:** `delete process.env.NODE_ENV` no teste pode afetar outros testes em paralelo. O Jest isola por arquivo, mas se houver `testEnvironment: 'node'` e execução concorrente, pode vazar.
- **Nenhum teste de `?mode=health`:** o handler suporta `mode=health` para resposta simples `{ status: 'ok' }`, mas não é testado.
- **Falha no DB não valida `error` no response:** handler retorna `status.data.database.details.error = error.message`, mas o teste só valida `status`.

#### Melhorias
- Adicionar teste de `?mode=health`.
- Validar `error` no response quando DB falha.
- Usar `jest.replaceProperty(process, 'env', { NODE_ENV: undefined })` em vez de deletar diretamente.

#### Duplicações
- Único teste do endpoint `/api/status`.

---


**Arquivo relacionado:** `pages/api/upload-image.js` (handler **real**, importado).

#### Finalidade
Testar o upload de imagem: validação de arquivo, movimentação no FS, atualização de configuração para `home_image_url`.

#### O que testa
| Caso | Status |
|---|---|
| Upload bem-sucedido | 200 |
| Sem arquivo | 400 |
| Arquivo não-imagem (PDF) | 400 |
| Arquivo > 5MB | 400 |
| Nome gerado corretamente (`post-image-{uuid}.png`) | 200 |
| Upload de hero chama `updateSetting` | 200 |
| Parse falha | 500 |
| Método GET retorna 405 | 405 |

#### Relações
- Importa handler real de `pages/api/upload-image.js`.
- Usa `formidable`, `fs`, `sharp`, `auth`, `settings` mockados.

#### Problemas
- **Mock de `formidable` como default export:** `jest.mock('formidable', () => ({ __esModule: true, default: jest.fn() }))`. Handler real usa `import formidable from 'formidable'` e `new formidable.IncomingForm()`. O mock retorna uma função que retorna `{ parse, uploadDir, keepExtensions }`. O handler faz `new formidable.IncomingForm()` — o mock precisa retornar uma função construtora. Atualmente `formidable.mockImplementation(() => ({ ... }))` simula a construção — ok, mas a sintaxe `__esModule: true, default` com `new` pode falhar em algumas versões do Jest.
- **Mock de `sharp`:** handler real usa `sharp(file.filepath).metadata()` para validar metadados. O mock retorna `{ width: 800, height: 600, format: 'jpeg' }`. Mas o teste nunca valida as dimensões — `sharp` é mockado para não travar, mas não adiciona valor.
- **Geração de filename:** handler usa `crypto.randomUUID()`. O teste valida com regex `/post-image-[a-f0-9-]+\.png$/` — ok, mas UUID real tem hífens em posições específicas. A regex aceita qualquer hex com hífens, inclusive inválidos.
- **`updateSetting` chamado com `('home_image_url', ..., 'image', 'Imagem principal da home')`:** handler real chama `updateSetting('home_image_url', path, 'image', 'Imagem principal da home')` para `uploadType === 'setting_home_image'`. O teste valida com `expect.stringContaining('/uploads/hero-image-')` — ok.

#### Melhorias
- Adicionar teste de validação de dimensões (rejeitar imagem muito pequena).
- Testar limpeza de arquivo temporário em caso de erro (`fs.promises.unlink`).
- Validar que `sharp` foi chamado com o filepath correto.

#### Duplicações
- O cenário de upload é parcialmente duplicado em `posts.flow.test.js` (handler simulado).

---


**Arquivo relacionado:** Nenhum handler real — **handler simulado inline**.

#### Finalidade
Validar a criação de vídeos com validação de URL do YouTube.

#### O que testa
| Caso | Status |
|---|---|
| Criação com sucesso | 210 |
| Campos obrigatórios faltando | 400 |
| URL inválida (Vimeo) | 400 |
| Erro interno na lib | 500 |
| Método GET | 405 |

#### Relações
- `jest.mock('../lib/videos', ..., { virtual: true })` com caminho incorreto (deveria ser `lib/domain/videos.js`).
- Handler simulado usa regex `/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/`.

#### Problemas
- **Caminho de mock incorreto** — `../lib/videos` relativo ao teste.
- **Handler simulado diferente do real:** o handler real de vídeos (se existir) provavelmente usa `createAdminHandler` e domínio `videos.js`. O simulado ignora isso.
- **Regex de YouTube:** o handler simulado valida URL com regex simples. Se o handler real não usar essa regex exata, o teste não protege.
- **Código morto em produção.**
- **Erro 500 sem mensagem detalhada:** handler simulado retorna `{ message: 'Erro interno ao criar vídeo' }` mas o real pode retornar erro mais específico.

#### Melhorias
- Substituir por teste do handler real (se houver).
- Adicionar cenários de URL do YouTube com variações (youtu.be curto, embed, mobile).

#### Duplicações
- Padrão idêntico a `posts.create.api.test.js`, `posts.delete.test.js`, `posts.update.api.test.js` — todos testam handlers simulados com a mesma estrutura.

---

## Padrões Transversais

#### Padrão 1: Handlers simulados como código morto
Os arquivos `posts.create.api.test.js`, `posts.delete.test.js`, `posts.update.api.test.js`, `posts.general.test.js`, `posts.flow.test.js`, `settings.general.test.js`, `videos.create.api.test.js` testam **handlers fictícios** que não existem no código-fonte. Eles:
- Reescrevem lógica de validação, middleware e domínio.
- Usam caminhos de mock incorretos.
- Não protegem o código real contra regressões.

**Recomendação:** remover ou converter em testes de unidade da camada de domínio.

#### Padrão 2: Duplicação do endpoint `/api/posts`
Três arquivos testam o mesmo handler:
- `posts.integration.test.js` — versão "manual".
- `posts.test.js` — versão com helper `testPublicGetEndpoint`.
- `posts.general.test.js` — versão com handler simulado.

**Recomendação:** manter apenas `posts.test.js` (helper + factory).

#### Padrão 3: Mocks de auth com lógica própria
Vários testes implementam `withAuth` inline no mock, replicando a lógica real de `lib/auth/auth.js`. Se a lógica real mudar, os testes não refletem.

**Recomendação:** centralizar o mock de `auth.js` em `tests/mocks/auth.js` e compartilhar.

#### Padrão 4: Nomenclatura inconsistente
- `posts.create.api.test.js` / `posts.update.api.test.js` — sufixo `.api.`.
- `posts.delete.test.js` — sem sufixo `.api.`.
- `posts.flow.test.js` / `posts.general.test.js` / `posts.integration.test.js` — sufixos diferentes.

**Recomendação:** padronizar para `{recurso}.{acao}.test.js`.

#### Padrão 5: Caminhos de mock incorretos
Vários arquivos usam `jest.mock('../lib/posts', ...)` em vez de `jest.mock('../../../lib/domain/posts.js', ...)`. O `{ virtual: true }` mascara o erro, mas os testes não refletem a realidade.

**Recomendação:** corrigir caminhos e remover `{ virtual: true }` onde o módulo real existe.

---

## Resumo de Ações Recomendadas

| Ação | Arquivos afetos |
|---|---|
| Remover testes com handler simulado (código morto) | `posts.create.api.test.js`, `posts.delete.test.js`, `posts.update.api.test.js`, `posts.general.test.js`, `posts.flow.test.js`, `settings.general.test.js`, `videos.create.api.test.js` |
| Remover versão duplicada do `/api/posts` | `posts.integration.test.js` (manter `posts.test.js`) |
| Criar mock centralizado de `auth.js` | Todos que usam `withAuth`/`getAuthToken`/`verifyToken` inline |
| Corrigir caminhos de mock | `posts.create.api.test.js`, `posts.delete.test.js`, `posts.update.api.test.js`, `videos.create.api.test.js` |
| Adicionar testes faltantes | POST em `/api/posts`, `?mode=health` em `/api/status`, POST em `/api/settings` |
| Melhorar isolamento de `NODE_ENV` | `status.test.js` |
| Validar cache hit (não só chave) | `posts.test.js`, `products.test.js`, `settings.test.js` |

---

## Cobertura Efetiva vs Aparente

| Handler real | Testado por | Cobertura real |
|---|---|---|
| `pages/api/posts.js` | `posts.test.js` | ✅ Alta (paginação, busca, rate limit, erro) |
| `pages/api/admin/posts.js` | Nenhum (handlers simulados) | ❌ Zero |
| `pages/api/settings.js` | `settings.test.js` | ✅ Média (falta POST e `?key=`) |
| `pages/api/products.js` | `products.test.js` | ✅ Alta |
| `pages/api/admin/stats.js` | `stats.test.js` | ✅ Média (falta cenário de erro) |
| `pages/api/status.js` | `status.test.js` | ✅ Média (falta `?mode=health`) |
| `pages/api/placeholder-image.js` | `placeholder-image.test.js` | ✅ Alta |
| `pages/api/upload-image.js` | `upload-image.test.js` | ✅ Alta |

A cobertura aparente (número de arquivos) é alta, mas a cobertura efetiva (código real testado) é significativamente menor devido aos handlers simulados.


---


## 7. Testes de Integração — Videos, Auth e Domain


```
tests/integration/
├── api/
│   ├── videos.delete.test.js          — DELETE /api/admin/videos
│   ├── videos.flow.test.js            — Fluxo CRUD completo (POST → GET → DELETE)
│   ├── videos.integration.test.js     — Segurança SQL (WHERE publicado = true)
│   ├── videos.pagination.api.test.js  — GET /api/videos (pública) paginação
│   └── videos.test.js                 — GET /api/videos com cache + rate limit + sort
├── auth/
│   └── auth.test.js                   — Login + middleware withAuth
└── domain/
    ├── musicas.db.test.js             — CRUD completo no PostgreSQL real
    ├── posts.db.test.js               — CRUD completo no PostgreSQL real
    ├── products.db.test.js            — CRUD completo no PostgreSQL real
    ├── settings.db.test.js            — CRUD + UPSERT no PostgreSQL real
    └── videos.db.test.js              — CRUD completo no PostgreSQL real
```

---


#### Finalidade

Valida o comportamento do endpoint **DELETE** `/api/admin/videos` de forma isolada.
Como o handler real não é importado, o teste **simula o handler inline** (linhas 13-37)
para testar a lógica de exclusão: receber ID do body, delegar à camada de domínio,
e retornar status HTTP adequado (200, 400, 404, 405, 500).

#### Escopo e Casos de Teste

| Caso | Status | Descrição |
|------|--------|-----------|
| Exclusão com vídeo existente | 200 | `deleteVideo` retorna `{ id }` |
| Vídeo não encontrado | 404 | `deleteVideo` retorna `null` |
| ID não fornecido | 400 | Body vazio, não chama o domínio |
| Método não permitido | 405 | GET em vez de DELETE |

#### Relações

- Compartilha padrão com `videos.flow.test.js` (que testa o mesmo DELETE via handler real).
- O `jest.mock('./lib/videos', ...)` referencia um caminho relativo que provavelmente
  não corresponde ao módulo real (`lib/domain/videos.js`).

#### Problemas Identificados

1. **Handler simulado inline — teste não reflete o handler real.**
   O handler real em `pages/api/admin/videos.js` pode conter lógica diferente
   (ex: extrair ID de `req.query.id` em vez de `req.body.id`, ou usar middleware
   `withAuth`). O teste passa sem que o handler real seja exercido.

2. **Caminho de mock incorreto:** `'./lib/videos'` provavelmente não existe.
   O projeto usa `lib/domain/videos.js`. Isso significa que o mock nunca intercepta
   o módulo real, mas como o handler também é simulado, o teste passa mesmo assim
   (mascarando o problema).

3. **Mensagens em português hardcoded.** As strings `"ID do vídeo é obrigatório"`,
   `"Vídeo não encontrado"`, `"Vídeo excluído com sucesso"` devem bater exatamente
   com as do handler real. Se houver divergência, o teste silenciosamente não a
   detectará.

4. **Sem teste de exceção (500).** Quando `deleteVideo` lança uma exceção
   (ex: `mockRejectedValue(new Error(...))`), o handler simulado retorna 500,
   mas esse caso não é coberto.

#### Melhorias

- Importar o handler real e mockar apenas a camada de domínio.
- Adicionar caso para `deleteVideo` rejeitando com erro (500).
- Centralizar as mensagens em constants compartilhadas para evitar drift.

---


#### Finalidade

Testa o **fluxo completo** do ciclo de vida de um vídeo através da API real:
**POST → GET → DELETE**, executados sequencialmente em um único `it()`.
Importa o handler real de `pages/api/admin/videos.js` e mocka a camada de domínio
(`lib/domain/videos.js`), cache e autenticação.

#### Escopo e Casos de Teste

| Caso | Descrição |
|------|-----------|
| Ciclo completo: criar → listar → excluir | `mockResolvedValueOnce` em cadeia |
| Filtro por busca (search) | `query: { search: 'Teste' }` → `getPaginatedVideos(1, 10, 'Teste')` |

#### Relações

- Complementa `videos.delete.test.js`: este exercita o handler real; aquele simula.
- Compartilha mocks de `lib/domain/videos.js` com `videos.test.js` (admin).
- Usa `logActivity` (audit.js) — verifica se a auditoria está integrada.

#### Problemas Identificados

1. **Teste de fluxo com múltiplas responsabilidades.**
   O `it()` realiza 3 ações completas (POST, GET, DELETE) com asserções intermediárias.
   Se o POST falha, os passos seguintes falham em cascata com mensagem confusa.
   Viola o princípio "one assertion per logical concept".

2. **Mock sequencial frágil.**
   `mockResolvedValueOnce` depende da ordem exata de chamadas. Se o handler
   chamar `getPaginatedVideos` mais de uma vez (ex: uma para COUNT, outra para
   dados), a ordem dos mocks não bate e o teste quebra silenciosamente.

3. **Falta validação de `logActivity`.**
   A função é mockada mas nunca verificada (`expect(logActivity).toHaveBeenCalled()`).
   Brecha para detectar se a auditoria foi removida do handler.

4. **Sem validação de cache.**
   `invalidateCache` do `lib/cache/cache.js` é mockado mas não verificado.
   O handler real pode invalidar o cache após DELETE, mas o teste não checa.

5. **Dados de teste estáticos.**
   `'https://www.youtube.com/watch?v=dQw4w9WgXcQ'` é fixo. Se houver validação
   de URL no domínio, poderia quebrar.

#### Melhorias

- Dividir em 3 `it()` independentes, cada um mockando apenas sua resposta.
- Adicionar `expect(logActivity).toHaveBeenCalled()` após POST e DELETE.
- Verificar `invalidateCache` ser chamado após DELETE.
- Adicionar cenário de erro: POST bem-sucedido, GET retorna erro 500.

---


#### Finalidade

Teste de **segurança**: garante que a API pública de vídeos (`pages/api/videos.js`)
**sempre filtre por `WHERE publicado = true`**, mesmo quando há busca por termo.
Valida que usuários não podem acessar vídeos não publicados via API.

#### Escopo e Casos de Teste

| Caso | Descrição |
|------|-----------|
| Query deve conter `WHERE publicado = true` | Verifica COUNT e DATA |
| Query deve conter `WHERE publicado = true AND` quando busca | Ambos filtros presentes |

#### Relações

- Testa o handler **público** (`pages/api/videos.js`), diferente do admin.
- Referencia `lib/infra/db.js` (query) diretamente — mocka o banco de dados.
- Compartilha cache mock com `videos.test.js`.

#### Problemas Identificados

1. **Mock do banco é a camada mais baixa.**
   Mockar `lib/infra/db.js` (query) testa as queries SQL **diretamente**.
   Isso é válido para segurança (SQL injection, filtro publicado), mas cria
   acoplamento forte: se a query mudar de `WHERE publicado = true` para
   `WHERE publicado = $1` com parametrização, o teste quebra.

2. **Busca case-sensitive no expect.**
   `expect(dataCall[1]).toEqual(expect.arrayContaining(['%culto%']))` assume
   que o handler lower-caseia o termo de busca. Se a query usar `ILIKE $1`
   com `'Culto'`, o teste falha.

3. **Sem validação de SQL injection.**
   O teste verifica que `publicado = true` existe, mas não valida que o
   parâmetro de busca é seguro (placeholders vs concatenação).

4. **Não testa HTTP status ou corpo de resposta.**
   Apenas verifica `res._getStatusCode() === 200` e as queries.
   Não valida se a resposta contém a estrutura correta `{ success, data, pagination }`.

#### Melhorias

- Adicionar teste com malicioso: `search: "'; DROP TABLE videos; --"` para
  garantir que é tratado como parâmetro seguro.
- Mockar a camada de domínio (`lib/domain/videos.js`) em vez de `db.js`,
  a menos que o objetivo seja explicitamente testar SQL.
- Verificar estrutura da resposta JSON.

---


#### Finalidade

Valida a lógica de **paginação** da API de vídeos: extração de `page` e `limit`
dos query params, conversão para inteiro com valores padrão, e tratamento de erro.

#### Escopo e Casos de Teste

| Caso | Status | Descrição |
|------|--------|-----------|
| Paginação com page/limit | 200 | `getPaginatedVideos(1, 10)` |
| Sem params → defaults (1, 10) | 200 | Valores padrão |
| Erro no serviço | 500 | `mockRejectedValue` |
| Método não permitido | 405 | POST em GET endpoint |

#### Relações

- Handler simulado inline (não importa o handler real).
- Mock de `../lib/videos` (caminho provavelmente incorreto).
- Padrão estruturalmente similar ao `videos.delete.test.js`.

#### Problemas Identificados

1. **Handler simulado inline — mesmo problema do delete.**
   O handler inline (linhas 14-33) não reflete o handler real de `pages/api/videos.js`.
   Este último tem rate limit, cache, validação de sort, extração de IP, etc.

2. **Caminho de mock incorreto:** `'../lib/videos'` (virtual) não existe no projeto.
   Deveria ser `../../../lib/domain/videos.js` ou similar.

3. **Sem caso de teste para `NaN`.**
   Se `page` ou `limit` forem strings não numéricas (`parseInt('abc') = NaN`),
   o handler inline ignora silenciosamente e usa `NaN`. O handler real
   (verificado em `videos.test.js`) trata esse caso e usa defaults.

4. **Sem validação de estrutura de resposta.**
   Apenas verifica status 200 e que o mock foi chamado com os parâmetros corretos.
   Não valida se a resposta contém `{ videos, pagination }`.

#### Melhorias

- Importar o handler real para exercitar a lógica verdadeira.
- Adicionar caso de `page: 'abc'` para validar fallback para default.
- Verificar estrutura da resposta.

---


#### Finalidade

Teste **mais completo** da API pública de vídeos. Usa **abstração compartilhada**
(`testPublicGetEndpoint` de `tests/helpers/crud-test`) para testes padrão
(200, 404, 405, 500) e adiciona casos específicos:
rate limit (429), cache, sort customizado (`alpha`), e extração de IP.

#### Escopo e Casos de Teste

| Caso | Descrição |
|------|-----------|
| Rate limit excedido → 429 | `checkRateLimit.mockResolvedValueOnce(true)` |
| Cache bypass + domínio | `getOrSetCache` chama callback; `getPublicPaginatedVideos` retorna dados |
| Strings não numéricas → defaults | `page: 'abc'` → `getPublicPaginatedVideos(1, 10, '', 'created_at DESC')` |
| Sort customizado | `sort: 'alpha'` → `orderBy: 'titulo ASC'` |
| Erro com IP em header | `x-forwarded-for` → log de erro estrututrado |

#### Relações

- Usa factory `videoFactory` para dados de teste.
- Usa `tests/mocks/cache.js` para mock de cache compartilhado.
- Usa `lib/infra/logger.js` para verificar log de erro.
- É o único teste que verifica explicitamente extração de IP e log estruturado.

#### Problemas Identificados

1. **Dependência de helpers/factories não triviais.**
   `testPublicGetEndpoint`, `videoFactory`, `tests/mocks/cache` são abstrações
   externas ao arquivo. A falha em qualquer delas torna o teste opaco.
   Necessário carregar o contexto desses arquivos para entender o teste completo.

2. **Spy de `console.error` e `logger.error`.**
   O teste verifica `logger.error` mas também espiona `console.error`.
   Se o handler usar `console.error` diretamente em vez de `logger`, o teste
   pode falhar silenciosamente.

3. **Não valida estrutura completa da resposta.**
   `expect(res._getJSONData().success).toBe(true)` verifica apenas `success`.
   Não valida presença de `data`, `pagination`, ou formato dos itens.

4. **Mock de `getPublicPaginatedVideos` retorna `{ data: mockData }`.**
   Assume que a resposta do domínio é `{ data: [...] }` (sem wrapper de pagination).
   Se o domínio retornar `{ data: [], pagination: {...} }`, o teste não detecta.

#### Melhorias

- Carregar `tests/helpers/crud-test` e `tests/factories` para documentar
  os testes herdados.
- Adicionar verificação de `pagination` na resposta.
- Verificar se `getOrSetCache` foi chamado com a key correta (ex: `'videos:public:1:10'`).

---


#### Finalidade

Testa o **fluxo de autenticação** em duas partes:
1. **Login:** Simula handler de `/api/auth/login` com JWT + bcrypt.
2. **Middleware `withAuth`:** Simula HOC que protege rotas verificando `Authorization: Bearer <token>`.

#### Escopo e Casos de Teste

#### Login (`/api/auth/login`)

| Caso | Status | Descrição |
|------|--------|-----------|
| Credenciais válidas | 200 | Retorna `{ token: 'mocked.jwt.token' }` |
| Senha incorreta | 401 | `bcrypt.compare` retorna `false` |
| Sem usuário/senha | 400 | Body incompleto |

#### Middleware (`withAuth`)

| Caso | Status | Descrição |
|------|--------|-----------|
| Token válido | 200 | `jwt.verify` retorna usuário |
| Token expirado | 401 | `TokenExpiredError` |
| Token inválido (assinatura) | 401 | Erro genérico |
| Sem token | 401 | Sem header Authorization |

#### Relações

- Login e Middleware são simulados inline (não importam os módulos reais).
- `lib/auth/auth.js` existe no projeto mas não é testado diretamente.
- `lib/db/repository.js` é referenciada no mock (caminho: `./lib/db/repository`).

#### Problemas Identificados

1. **Handlers simulados inline.**
   O handler de login (`loginHandler`, linhas 24-49) e o middleware (`withAuth`,
   linhas 98-119) são implementações **ad-hoc** no teste. Se o handler real
   divergir (ex: usar `req.query`, retornar refresh token, fazer hash do ID),
   o teste não detecta.

2. **Caminho de mock incorreto:** `'./lib/db/repository'` relativo ao
   diretório do teste (`auth/`), apontando para `tests/integration/auth/lib/db/repository`.
   O repositório real está em `lib/db/repository.js` na raiz do projeto.

3. **Hardcoded secret JWT.**
   `'secret'` é usado tanto no mock de `jwt.sign` quanto em `jwt.verify`.
   Se o handler real usar `process.env.JWT_SECRET`, o teste mascara essa diferença.

4. **Teste de `TokenExpiredError` usa `jest.requireActual('jsonwebtoken')`.**
   (linha 159) — Solução inteligente para ter a classe de erro real, mas
   depende do módulo `jsonwebtoken` estar instalado. Se o projeto usar
   `jose` ou outro JWT library, o teste quebra.

5. **Falta teste de refresh token / renovação.**
   Se o sistema suportar refresh tokens, o teste de login não os valida.

6. **Mensagens de erro idênticas para usuário inexistente e senha errada.**
   (ambos retornam `'Credenciais inválidas'`) — Boa prática de segurança, mas
   o teste poderia documentar explicitamente que essa intencionalidade.

#### Melhorias

- Importar handler real de `pages/api/auth/login.js`.
- Importar `withAuth` real de `lib/auth/auth.js`.
- Mover mensagens para constants compartilhadas.
- Adicionar teste para token com formato inválido (ex: `Bearer` sem token).

---


#### Finalidade

Teste de **integração com banco PostgreSQL real** (Testcontainers) para a entidade **Músicas**.
Valida CRUD completo, constraints (NOT NULL), busca com `ILIKE`, ordenação, paginação
e comportamento de transação (ROLLBACK).

#### Escopo e Casos de Teste

| Caso | Descrição |
|------|-----------|
| Criar música com ID gerado | Verifica `id`, `titulo`, `created_at` |
| Valores padrão | `descricao` default, `position: 0` |
| Ler por ID | SELECT * WHERE id = $1 |
| Paginação | LIMIT/OFFSET |
| Atualizar campos | UPDATE mantendo campos não alterados |
| Deletar | DELETE + verificação de ausência |
| NOT NULL (titulo) | Rejeita sem título |
| NOT NULL (url_spotify) | Rejeita sem URL |
| Página acima do total | Retorna vazio |
| LIMIT 0 | Retorna vazio |
| Busca por título (ILIKE) | Case-insensitive |
| Busca por artista (ILIKE) | Case-insensitive |
| Ordenação position ASC, created_at DESC | Multi-field sort |
| Contagem | COUNT(*) |
| ROLLBACK | Transação com erro reverte mudanças |

#### Relações

- Padrão compartilhado com `posts.db.test.js`, `products.db.test.js`,
  `videos.db.test.js` (estrutura idêntica).
- Usa `tests/helpers/db-test.js` para `createTestDb`, `applyMigrations`,
  `withTransaction`, `isDockerAvailable`.

#### Problemas Identificados

1. **CRUD via query SQL direta — não testa funções de domínio.**
   O teste chama `tx.query(...)` diretamente em vez de usar funções como
   `createMusica()`, `listMusicas()`, etc. Se existem no `lib/domain/musicas.js`,
   elas não são cobertas por este teste.

2. **Repetição estrutural massiva.**
   A estrutura é praticamente idêntica nos 5 arquivos de domain (músicas, posts,
   products, settings, videos). Apenas nomes de tabela e campos mudam.
   Violação clara de DRY.

3. **`Date.now()` e `Math.random()` para unicidade.**
   (linha 50) Em execução paralela ou muito rápida, `Date.now()` pode repetir,
   e `Math.random()` pode colidir. É arriscado para testes que dependem de unicidade.

4. **Falta teste de concorrência / isolamento.**
   Não verifica se duas transações simultâneas interferem (testes executam
   serialmente, mas não testam cenário concorrente).

5. **`isDockerAvailable` no top-level (linha 16).**
   Se Docker não está disponível, `beforeAll` faz `return` cedo e `pool` fica
   `undefined`. O `describeIf` pula os testes, mas o `beforeEach` tem
   `if (!pool) return;` — seguro, mas não há log avisando que foram pulados.

6. **Após ROLLBACK, o `afterEach` tenta rollback novamente.**
   (linha 39) Se o teste já fez rollback manual (linha 264), o `afterEach`
   falha silenciosamente? Não, porque `withTransaction` provavelmente usa
   savepoints, mas é um ponto de atenção.

#### Melhorias

- Testar funções de domínio reais (`createMusica`, `listMusicas`, etc.)
  em vez de SQL direto.
- Fatorar padrão em helper parametrizável (tabela, campos, defaults).
- Usar sequências fixas ou UUIDs para unicidade.
- Adicionar log quando Docker não estiver disponível.

---


#### Finalidade

Idêntico ao `musicas.db.test.js`, mas para a entidade **Posts**.
Valida CRUD, constraints, UNIQUE em `slug`, busca com `ILIKE`, ordenação,
paginação e ROLLBACK.

#### Diferenças em relação a `musicas.db.test.js`

| Aspecto | Músicas | Posts |
|---------|---------|-------|
| Campos únicos | `url_spotify` | `slug` |
| UNIQUE constraint | N/A | Testada (linha 146) |
| Ordenação padrão | `position ASC, created_at DESC` | `created_at DESC` |
| Campos opcionais | `descricao` | `excerpt`, `image_url`, `views` |
| ROLLBACK test | NOT NULL violado | UNIQUE violado |

#### Problemas Identificados

1. **Mesmos problemas estruturais de `musicas.db.test.js`.**
   - CRUD via SQL direto (não testa funções de domínio).
   - Duplicação de código entre entidades.

2. **UNIQUE em slug é testado apenas uma vez.**
   (linha 146) — Se houver outras constraints (ex: UNIQUE em `title`), não cobertas.

3. **`views` default 0.**
   (linha 90) Assume que a coluna `views` tem default 0. Se a migration mudar,
   o teste quebra.

#### Melhorias

- Fatorar helper de CRUD integration test (ver seção de melhorias gerais).
- Adicionar teste de UNIQUE em `title` se aplicável.

---


#### Finalidade

Teste de integração para **Produtos**, com validação de:
- CRUD completo.
- NOT NULL em `name` e `price`.
- Filtro `published = true`.
- Ordenação `position ASC, id ASC`.
- ROLLBACK com NOT NULL violado.

#### Diferenças em relação aos demais

| Aspecto | Produtos |
|---------|----------|
| Campo `price` | String (`'99.90'`), não numeric |
| Campo `image_url` | JSON array serializado |
| Campo `link` | Opcional (testado com null) |
| Campo `category` | Default `'geral'` |
| UNIQUE | Nenhuma constraint UNIQUE testada |

#### Problemas Identificados

1. **`price` como string.**
   (linha 49) `price: '99.90'` é string. Se o banco armazena como `NUMERIC` ou
   `DECIMAL`, o PostgreSQL converte automaticamente, mas a comparação
   `expect(product.price).toBe('199.90')` assume que retorna string.
   Depende do driver pg e da configuração de parses.

2. **`image_url` como JSON.stringify.**
   (linha 50) Assuma que a coluna é `JSONB` ou `TEXT`. Se for `TEXT`, o
   `JSON.stringify` retorna a string corretamente, mas o `expect` posterior
   (se houvesse) precisaria fazer parse.

3. **Falta teste de UNIQUE.**
   Diferente de posts, produtos parecem não ter UNIQUE, mas se tiverem
   (ex: `link`), deveria ser testado.

#### Melhorias

- Adicionar tipo numérico para price se aplicável.
- Documentar que `image_url` é JSONB no banco.

---


#### Finalidade

Teste de integração para **Settings** (configurações key-value).
Valida CRUD, UPSERT (ON CONFLICT), `json_object_agg`, e constraints.

#### Diferenças em relação aos demais

| Aspecto | Settings |
|---------|----------|
| Chave primária | `key` (string), não `id` serial |
| Campo `value` | JSONB (com `$2::jsonb` cast) |
| UPSERT | Testado (INSERT ... ON CONFLICT DO UPDATE) |
| `json_object_agg` | Testado (COALESCE + ORDER BY key) |
| Campo `type` | Categórico (`string`, etc.) |
| Ordenação | Por `key` alfabético |

#### Problemas Identificados

1. **UPSERT testado com SQL direto, não com função de domínio.**
   Se `upsertSetting()` existe em `lib/domain/settings.js`, não é coberta.

2. **`json_object_agg` com `COALESCE` e `ORDER BY key`.**
   (linhas 106-113) Testa uma query SQL específica, mas se o projeto usa
   uma função `getAllSettings()` que implementa essa lógica, ela não é testada.

3. **Type cast `::jsonb` hardcoded.**
   (linha 58) Se a migration mudar `value` para `JSON` (não `JSONB`), o teste
   quebra silenciosamente? Não, porque `::jsonb` falharia com tipo errado.

4. **Sem teste de DELETE com chave composta ou cascata.**
   Não há foreign keys envolvidas, mas se houvesse, deveria ser testado.

#### Melhorias

- Testar funções de domínio reais (getAllSettings, upsertSetting).
- Adicionar teste de concorrência no UPSERT.

---


#### Finalidade

Teste de integração para **Vídeos** no PostgreSQL real.
Estruturalmente idêntico aos demais domain tests, com validação adicional
de busca por `descricao` (ILIKE).

#### Diferenças em relação aos demais

| Aspecto | Vídeos |
|---------|--------|
| Campos | `titulo`, `url_youtube`, `descricao`, `publicado`, `position` |
| Busca | Título E Descrição (testados separadamente) |
| Ordenação | `created_at DESC` |
| UNIQUE | Nenhuma constraint UNIQUE testada |

#### Problemas Identificados

1. **Busca por `descricao` testada separadamente de `titulo`.**
   (linhas 202-220) Boa cobertura, mas assume que a query usa OR ou campos
   separados. Se a query real buscar em ambos simultaneamente
   (`WHERE titulo ILIKE $1 OR descricao ILIKE $1`), o teste não valida essa lógica.

2. **Mesmos problemas estruturais dos demais domain tests.**
   - CRUD via SQL direto.
   - Duplicação de código entre entidades.

#### Melhorias

- Testar busca combinada (titulo OU descricao) se existir na aplicação.
- Fatorar helper de CRUD (ver melhorias gerais).

---

## Problemas Transversais (Gerais)

#### 1. Handlers simulados inline vs. Reais

Os arquivos `api/videos.delete.test.js`, `api/videos.pagination.api.test.js` e
`auth/auth.test.js` implementam **handlers inline** que simulam o comportamento
esperado, mas não exercitam o código real. Isso cria uma falsa sensação de cobertura.

**Impacto:** Bugs no handler real (ex: usar `req.query.id` em vez de `req.body.id`)
não são detectados.

#### 2. Caminhos de mock incorretos

Vários mocks referenciam caminhos relativos que provavelmente não existem:
- `'./lib/videos'` (em vez de `lib/domain/videos.js`)
- `'./lib/db/repository'` (em vez de `lib/db/repository.js`)
- `'../lib/videos'` (virtual, não existente)

**Impacto:** Mocks são criados mas nunca interceptam o módulo real. Testes
passam por sorte (handler simulado) ou falham silenciosamente.

#### 3. Duplicação de código nos domain tests

Os 5 arquivos de `domain/*.db.test.js` compartilham **95% de estrutura**:
- Mesma configuração `beforeAll`/`afterAll`/`beforeEach`/`afterEach`.
- Mesmo padrão de helper `insertTestX(overrides)`.
- Mesmos casos de teste (CRUD, NOT NULL, ILIKE, COUNT, ROLLBACK).

**Impacto:** Manutenção onerosa. Uma correção no setup precisa ser replicada
em 5 arquivos.

#### 4. CRUD via SQL direto (não testa camada de domínio)

Os domain tests chamam `tx.query(...)` diretamente em vez de funções como
`createVideo()`, `listProducts()`, etc. A camada de domínio (`lib/domain/*.js`)
não é efetivamente testada na integração.

#### 5. Ausência de testes negativos de segurança

- **SQL Injection:** Não há teste injetando SQL malicioso em `search`.
- **Mass Assignment:** Não há teste enviando campos extras (ex: `role: 'admin'`)
  para verificar se são ignorados.
- **IDOR:** Não há teste verificando que um usuário não-admin não pode
  excluir vídeos de outro usuário (se aplicável).

#### 6. Dependência de infraestrutura

Os domain tests requerem Docker (Testcontainers). Se o desenvolvedor não tem
Docker, todos os testes são pulados silenciosamente (`describeIf = describe.skip`).

#### 7. Sem teste de regressão de schema

Os tests assumem um schema fixo, mas não validam que as migrations aplicadas
são compatíveis com o código de produção (ex: coluna removida no código mas
ainda existe no banco).

---

## Melhorias Consolidadas

#### Prioridade Alta

| Melhoria | Impacto |
|----------|---------|
| Importar handlers reais nos API tests | Elimina simulação falsa |
| Corrigir caminhos de mock | Mocks efetivamente interceptam módulos |
| Adicionar teste de SQL injection | Segurança |
| Fatorar domain tests em helper parametrizável | Reduz 80% do código duplicado |

#### Prioridade Média

| Melhoria | Impacto |
|----------|---------|
| Testar funções de domínio reais (não SQL direto) | Valida camada de domínio |
| Adicionar testes de campos extras (mass assignment) | Segurança |
| Adicionar log quando Docker não disponível | Observabilidade |
| Centralizar mensagens em constants | Evita drift entre handler e teste |

#### Prioridade Baixa

| Melhoria | Impacto |
|----------|---------|
| Adicionar teste de concorrência nos domain tests | Robustez |
| Testar refresh token (auth) | Cobertura completa |
| Adicionar type assertions nos responses | Contratos de API |

---

## Cobertura por Entidade

| Entidade | API DELETE | API Fluxo | API Segurança | API Paginação | API Cache/Sort | DB CRUD | DB Constraints |
|----------|:----------:|:---------:|:-------------:|:-------------:|:--------------:|:-------:|:--------------:|
| Videos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Musicas | — | — | — | — | — | ✅ | ✅ |
| Posts | — | — | — | — | — | ✅ | ✅ (UNIQUE) |
| Products | — | — | — | — | — | ✅ | ✅ |
| Settings | — | — | — | — | — | ✅ | ✅ (UPSERT) |
| Auth | — | — | — | — | — | — | — |

Legenda: ✅ = coberto; — = não aplicável.

---

## Dependências Externas dos Testes

| Módulo | Usado em |
|--------|----------|
| `tests/helpers/db-test.js` | Todos os `domain/*.db.test.js` |
| `tests/helpers/crud-test.js` | `api/videos.test.js` (testPublicGetEndpoint) |
| `tests/factories` | `api/videos.test.js` (videoFactory) |
| `tests/mocks/cache.js` | `api/videos.test.js` (mockCacheModule) |
| `lib/infra/logger.js` | `api/videos.test.js` (logger) |
| `node-mocks-http` | Todos os API tests |
| `@jest/globals` | Todos os testes |
| `jsonwebtoken` (real) | `auth/auth.test.js` (TokenExpiredError) |
| `bcrypt` (virtual) | `auth/auth.test.js` |

---

*Documentado a partir da análise estática dos 11 arquivos de teste.*
*Última atualização: 2026-09-23.*


---


## 7.1. Testes de Integração — Placeholder, Posts Restantes, Products, Settings, Stats, Status, Upload


Os 13 arquivos cobrem 6 endpoints de API distintos e 1 endpoint inexistente. Dividem-se em três categorias:

| Categoria | Arquivos | Problema principal |
|-----------|----------|-------------------|
| **Testes de handler real** | `posts.integration.test.js`, `products.test.js`, `settings.test.js`, `stats.test.js`, `status.test.js`, `placeholder-image.test.js`, `upload-image.test.js` | Acoplam a mocks de módulos reais; qualidade alta mas inconsistente |
| **Testes de handler fictício** | `posts.create.api.test.js`, `posts.delete.test.js`, `posts.general.test.js`, `posts.update.api.test.js` | Implementam o handler dentro do próprio teste — **não testam o código real** |
| **Teste de fluxo hipotético** | `posts.flow.test.js | Testa `uploadHandler` e `postsHandler` que **não existem** no repositório |

---


**Endpoint testado:** `GET /api/placeholder-image`  
**Handler real:** `pages/api/placeholder-image.js` (102 linhas)

#### Finalidade
Testar a cadeia de fallback para servir imagem hero: banco → pasta `uploads/` → SVG padrão. Também valida revalidação HTTP 304 e cache headers.

#### Estrutura
- 4 casos de teste, todos importam o handler real com `require` dinâmico em `beforeEach` para resetar o cache interno do módulo
- Usa `jest.resetModules()` + `jest.clearAllMocks()` antes de cada caso
- Mocks: `fs.promises` (readdir/stat/readFile), `lib/domain/settings.js` (getSetting), `lib/infra/db.js`, `lib/infra/logger.js`

#### Relações com o código real
| Teste | O handler faz | Status |
|-------|--------------|--------|
| Imagem do banco | Busca `getSetting('home_image_url')`, extrai basename, serve arquivo com `fs.stat` + `fs.readFile` | ✅ Testa real |
| 304 If-None-Match | Verifica `req.headers['if-none-match']` contra filename | ✅ Testa real |
| Fallback DB erro | Catches DB error, lê diretório com fallback | ✅ Testa real |
| SVG padrão | Se DB e pasta falham, retorna SVG inline | ✅ Testa real |

#### Problemas identificados

1. **`MOCK_STATS` compartilhado** — Objeto `MOCK_STATS` é reutilizado entre testes. Não é mutável aqui, mas se um teste alterasse `mtime`, todos quebrariam. Deve ser `const` no escopo do `it` ou retornado de factory.

2. **Sem teste de `readdir` ordenado** — O fallback 1 lê o diretório e faz `.sort().pop()` para pegar o arquivo mais recente. O teste com 2 arquivos (`hero-image-1.png`, `hero-image-2.webp`) funciona, mas não verifica explicitamente que o `pop()` retorna `hero-image-2.webp` (o sort poderia ser alfabético, não temporal). **Testa resultado, não ordem**.

3. **Sem teste de Content-Type para PNG/WebP** — O handler tem lógica para detectar `.png` e `.webp`, mas o teste de fallback só cobre webp. Não testa detecção de `.png` no Content-Type.

4. **Sem teste de erro no `fs.readFile` se o arquivo existir no readdir mas não no disco** — cenário de corrida.

#### Melhorias sugeridas
- Adicionar teste: fallback com `readdir` contendo arquivos não-imagem (ex.: `readme.txt`) — deve ignorar e retornar SVG
- Testar com `readdir` retornando arquivos sem prefixo `hero-image-` — deve cair no SVG
- Testar `Cache-Control` header no cenário SVG (deve ser `public, max-age=86400, immutable`)

#### Duplicidades/Código morto
- Sem duplicações. Código bem enxuto.

---


**Endpoint testado:** `POST /api/admin/posts`  
**Handler real:** NÃO. Usa `postsHandler` **definido dentro do próprio teste** (linhas 13-33).

#### Finalidade declarada
Testar a lógica de criação de posts: sucesso, validação 400, e método não permitido 405.

#### Relações com o código real
| O que testa | O handler real faz | Descompasso |
|-------------|-------------------|-------------|
| Mock de `../lib/posts` | O handler real está em `lib/domain/posts.js` e `pages/api/posts.js` | ❌ Path errado |
| `postsLib.createPost(body)` | Real: `createPost(schema.parse(body))` com Zod | ❌ Sem Zod |
| 400 por campos faltando | Real: usa Zod validation, campos `title`/`slug` obrigatórios | ⚠️ Parcial |
| 405 para GET | Real: handler público GET, POST protegido por withAuth | ❌ O GET real não retorna 405 |

#### Problemas identificados

1. **NÃO testa o endpoint real.** O `postsHandler` definido localmente é uma reimplementação simplificada que:
   - Ignora autenticação (sem `withAuth`)
   - Ignora rate limiting (sem `checkRateLimit`)
   - Ignora validação Zod
   - Ignora sanitização de `image_url`
   - Não invalida cache após criação

2. **Mock path inconsistente**: `'../lib/posts'` relativo ao arquivo de teste em `tests/integration/api/`, apontaria para `lib/posts.js` que **não existe**. O path correto seria `'../../../lib/domain/posts.js'` ou similar.

3. **Nenhum teste de erro 500** — O `catch` do handler fictício existe mas nunca é exercitado.

4. **Nenhum teste de response format v1** — O handler real suporta `?response=v1`.

5. **Nenhum teste de `image_url` inválida** — O handler real rejeita URLs que não começam com `http` ou `/`.

#### Melhorias sugeridas
- Reescrever para importar o handler real: `import handler from '../../../pages/api/admin/posts.js'`
- Adicionar testes de autenticação (com/sem token)
- Adicionar testes de rate limiting
- Adicionar testes de validação Zod (title vazio, slug com caracteres inválidos, image_url inválida)
- Adicionar teste de resposta format v1

#### Código morto
- O `postsHandler` local (linhas 13-33) é inteiramente código morto de teste — não corresponde a nenhum handler real.

---


**Endpoint testado:** `DELETE /api/admin/posts`  
**Handler real:** NÃO. Usa `postsHandler` **definido dentro do próprio teste** (linhas 13-38).

#### Finalidade declarada
Testar a lógica de exclusão de posts: sucesso, 404 não encontrado, 400 ID ausente, 405 método inválido.

#### Relações com o código real
| O que testa | O handler real faz | Descompasso |
|-------------|-------------------|-------------|
| Mock de `./lib/posts` | Path errado — não aponta para módulo real | ❌ |
| `postsLib.deletePost(id)` | Real: `deletePost(id)` em `lib/domain/posts.js` | ⚠️ Parcial |
| `query.id || body.id` | Real: pode ser `query.id` (rota dinâmica `[id].js`) ou `body.id` | ⚠️ Parcial |
| 404 se `!result` | Real: comportamento similar | ✅ |
| 400 se sem ID | Real: valida antes de chamar domínio | ✅ |

#### Problemas identificados

1. **Mesmo problema de handler fictício** — não testa o código real.

2. **Mock path inconsistente**: `'./lib/posts'` apontaria para `lib/posts.js` (inexistente). O real é `lib/domain/posts.js`.

3. **Testa ID no body mas não na query** — O handler aceita `query.id` (rota dinâmica), mas o teste só passa no body. Falta testar `query.id`.

4. **Sem teste de 500** — O handler fictício tem `catch`, mas nunca é exercitado.

5. **Sem teste de autenticação** — O handler real provavelmente exige auth.

6. **Sem teste de invalidação de cache** — O handler real invalida `posts:*` após delete.

#### Melhorias sugeridas
- Reescrever para testar handler real (`pages/api/admin/posts/[id].js`)
- Testar ID via query string (rota dinâmica)
- Testar cenários de permissão/autenticação
- Testar resposta de sucesso com mensagem estruturada

#### Duplicações
- O padrão do `postsHandler` é quase idêntico ao de `posts.create.api.test.js` (ambos fictícios). Indica que foram gerados por copia-e-cola.

---


**Endpoint testado:** Fluxo hipotético: `uploadHandler` → `postsHandler`  
**Handler real:** NENHUM. **Ambos os handlers são definidos dentro do teste.**

#### Finalidade declarada
Testar o fluxo completo de "fazer upload de imagem e criar post com a URL retornada" como um único teste de integração.

#### Estrutura
- 1 único caso de teste com 2 passos
- Mocks de `formidable`, `fs`, `lib/infra/db.js`
- `uploadHandler` e `postsHandler` são implementações locais

#### Relações com o código real
| Componente | Existe? | Path real |
|------------|---------|-----------|
| `uploadHandler` | ❌ Não existe | `pages/api/upload-image.js` (é diferente) |
| `postsHandler` | ❌ Não existe | `pages/api/posts.js` (é diferente) |
| `dbModule.query` | ✅ Existe | `lib/infra/db.js` |

#### Problemas identificados

1. **Testa código que não existe no projeto.** É um teste fantasma — valida lógica que nunca será executada em produção.

2. **`uploadHandler` hipotético** (linhas 29-77) é totalmente diferente do handler real (`pages/api/upload-image.js`):
   - Não usa `sharp` para validar
   - Não usa `crypto.randomUUID()` para nomes
   - Não suporta `uploadType` do tipo `setting_home_image`
   - Não usa `path.join` corretamente
   - Usa `file.originalFilename.split('.')` para extensão (unsafe)

3. **`postsHandler` hipotético** (linhas 80-101):
   - Faz query SQL direta em vez de usar `createPost` do domínio
   - Ignora autenticação
   - Ignora rate limiting
   - Ignora validação Zod
   - Ignora invalidação de cache

4. **Sem teardown de console.error spy** — O `beforeAll` espia `console.error` mas o `afterAll` usa `jest.restoreAllMocks()` que é ok, mas não verifica se console.error foi chamado.

5. **Teste muito longo (75+ linhas)** — Difícil de ler e manter.

6. **Sem assertions sobre `fs.promises.rename`** — A chamada existe no handler mas não é verificada.

#### Melhorias sugeridas
- **REESCREVER COMPLETAMENTE** — este teste não tem valor real
- Se o objetivo é testar fluxo upload → create, usar os handlers reais com mocks de banco
- Dividir em: teste unitário de upload, teste unitário de create, teste de integração real com DB

#### Código morto
- Todo o `uploadHandler` e `postsHandler` definidos no arquivo (linhas 29-101) são código morto de teste.

---


**Endpoint testado:** `GET/POST /api/admin/posts`  
**Handler real:** NÃO. Usa `handler` **definido dentro do próprio teste** (linhas 21-43).

#### Finalidade declarada
Testar GET lista posts e POST criação, com mocks de banco real (`lib/infra/db.js`).

#### Relações com o código real
| O que testa | O handler real faz | Descompasso |
|-------------|-------------------|-------------|
| Mock de `db.getAllPosts` | Não existe `getAllPosts` em `lib/infra/db.js` | ❌ |
| Mock de `db.createPost` | Não existe `createPost` em `lib/infra/db.js` | ❌ |
| `withAuth` identity function | Real: `withAuth` exige token | ❌ |
| GET sem auth | Real: GET público | ⚠️ Depende do handler |
| Validação `title`, `slug`, `content` | Similar ao real | ⚠️ Parcial |

#### Problemas identificados

1. **Mock path errado**: O `db-module.js` exporta `mockDb({ getAllPosts, createPost, ... })` que é passado via override, mas essas funções **não existem no módulo db real**. O db real tem `query`, `transaction`, `healthCheck`, etc.

2. **Handler fictício** — não testa o código real de `pages/api/admin/posts.js`.

3. **`withAuth` identity** — simplesmente `(fn) => (req, res) => fn(req, sem verificação de token). Isso mascara problemas de autenticação.

4. **Sem teste de POST com autenticação falhando** — o mock de `withAuth` sempre passa.

5. **Sem teste de rate limiting** — O handler real provavelmente tem.

6. **Sem teste de paginação no GET** — O `handler` local ignora `page`/`limit` da query.

#### Melhorias sugeridas
- Importar handler real `pages/api/posts.js` (GET público)
- Mockar `getRecentPosts` e `getOrSetCache` em vez de `db.getAllPosts`
- Adicionar teste de 405 para PUT/DELETE
- Adicionar teste de response format v1

---


**Endpoint testado:** `GET /api/posts`  
**Handler real:** ✅ SIM — importa `pages/api/posts.js`.

#### Finalidade
Testar o endpoint público de listagem de posts com paginação, cache, rate limiting e busca.

#### Estrutura
- 10 casos de teste organizados em um único `describe`
- Mocks: `lib/domain/posts.js` (getRecentPosts), `lib/cache/cache.js` (getOrSetCache, checkRateLimit)
- Usa `createMocks` do `node-mocks-http`

#### Relações com o código real (10 testes)
| Teste | Handler real | Status |
|-------|-------------|--------|
| GET 200 + JSON posts | `handleGet` → `getOrSetCache` → `getRecentPosts` | ✅ |
| Parâmetros de paginação | `req.query.page`, `req.query.limit` parseados | ✅ |
| 405 PUT | `default` case do switch | ✅ |
| 400 page < 1 | Validação `page < 1` | ✅ |
| 400 limit < 1 | Validação `limit < 1` | ✅ |
| 400 limit > 100 | Validação `limit > 100` | ✅ |
| 429 rate limit | `checkRateLimit` → throw RATE_LIMIT_EXCEEDED | ✅ |
| 500 erro interno | `getRejectedValue` → catch → 500 | ✅ |
| Valores padrão (sem query) | `page=1, limit=10` default | ✅ |
| Cache key correta | `posts:list:page:limit` | ✅ |
| Parâmetro de busca | `search` → `posts:search:...` | ✅ |

#### Problemas identificados

1. **Não testa response format v1** — O handler suporta `?response=v1` mas não há teste.

2. **Não testa `Cache-Control` headers** — O handler define `public, max-age=0, s-maxage=300, stale-while-revalidate=600`.

3. **Cache key para search não testa `.toLowerCase().trim()`** — O handler normaliza o termo de busca.

4. **Sem teste de POST** — O handler tem `handlePost` com autenticação e validação Zod, mas não é testado.

5. **`getOrSetCache` mock sempre executa fetchFunction** — Isso é ok para testar a lógica, mas não testa o comportamento de cache hit (quando `getOrSetCache` retorna direto sem chamar fetchFunction).

6. **Teste de 500 restaura consoleSpy** — Usa `mockRestore()` em vez de `mockReset()`. Ok, mas inconsistente com outros arquivos.

#### Melhorias sugeridas
- Adicionar teste de `?response=v1` (verificar `success: true, data, pagination, timestamp`)
- Adicionar teste de cache hit (mock `getOrSetCache` para retornar valor direto)
- Adicionar teste de busca normalizada (ex.: `search: '  Test  '` → `'test'`)
- Adicionar teste de `Cache-Control` header

#### Duplicações
- Testes de paginação (`page=2, limit=5` e `search=test-term`) são repetitivos na estura mas cobrem cenários distintos. Ok.

---


**Endpoint testado:** `PUT /api/admin/posts`  
**Handler real:** NÃO. Usa `postsHandler` **definido dentro do próprio teste** (linhas 13-44).

#### Finalidade declarada
Testar a lógica de atualização de posts: sucesso, 404 não encontrado, 400 campos faltando, 400 ID ausente, 405 método não permitido.

#### Relações com o código real
| O que testa | O handler real faz | Descompasso |
|-------------|-------------------|-------------|
| Mock de `../lib/posts` | Path errado | ❌ |
| `updatePost(id, body)` | Real: em `lib/domain/posts.js` | ⚠️ Parcial |
| `query.id || body.id` | Real: pode ser body ou query | ⚠️ Parcial |
| Validação campos | Similar ao real | ⚠️ Parcial |

#### Problemas identificados

1. **Handler fictício** — mesmo problema dos outros testes CRUD.

2. **Mock path**: `'../lib/posts'` (relativo a `tests/integration/api/`) apontaria para `lib/posts.js` (inexistente).

3. **Sem teste de autenticação** — O handler fictício não implementa auth.

4. **Sem teste de 403 (permissão insuficiente)** — O handler real distingue admin/editor de outros roles.

5. **Sem teste de validação Zod** — O handler real valida tipos.

6. **Sem teste de 500** — O `catch` do handler fictício nunca é exercitado.

#### Melhorias sugeridas
- Importar handler real `pages/api/admin/posts/[id].js` (se existir) ou `pages/api/admin/posts.js`
- Testar ID via query string
- Testar autenticação falhando
- Testar response format v1

---


**Endpoint testado:** `GET/POST/PUT/DELETE /api/products`  
**Handler real:** ✅ SIM — importa `pages/api/products.js`.

#### Finalidade
Testar o CRUD completo de produtos com autenticação, cache, auditoria e rate limiting.

#### Estrutura
- 18 casos de teste organizados em 6 `describe` aninhados
- Usa `userFactory` para gerar dados de usuário
- Mocks: `lib/domain/products.js`, `lib/auth/auth.js`, `lib/cache/cache.js`, `lib/domain/audit.js`, `lib/infra/logger.js`

#### Relações com o código real (18 testes)
| Teste | Handler real | Status |
|-------|-------------|--------|
| GET público paginado | `handlePublicGet` → `getPaginatedProducts` | ✅ |
| GET público 400 paginação inválida | `paginate()` lança `INVALID_PAGINATION_PARAMS` | ✅ |
| GET público page/limit explícitos | Passa page=2, limit=5 | ✅ |
| GET admin todos produtos | `handleAdminGet` → `getAllProducts` | ✅ |
| GET admin 401 sem token | `requireAuth` retorna 401 | ✅ |
| GET admin 400 paginação inválida | `paginate()` lança erro | ✅ |
| 429 rate limit POST | `checkRateLimit` → 429 | ✅ |
| 401 PUT sem token | `requireAuth` retorna 401 | ✅ |
| 401 DELETE token inválido | `verifyToken` → null → 401 | ✅ |
| POST cria + log auditoria | `createProduct` + `logActivity` | ✅ |
| POST 400 sem nome/preço | Validação `!name \|\| !price` | ✅ |
| PUT atualiza + invalida cache | `updateProduct` + `invalidateCache('products:*')` | ✅ |
| PUT 404 não encontrado | `updateProduct` → null → 404 | ✅ |
| DELETE exclui + log auditoria | `deleteProduct` + `logActivity` | ✅ |
| DELETE 404 não encontrado | `deleteProduct` → null → 404 | ✅ |
| 405 PATCH | `default` case | ✅ |
| GET público filtros | Passa search/minPrice/maxPrice | ✅ |
| GET público sem token (fallback) | `getAuthToken` null → 200 com paginated | ✅ |

#### Problemas identificados

1. **Sem teste de rate limit no GET público** — O handler tem `checkRateLimit(ip, 'api:public:products', 60, 60000)` mas não há teste.

2. **Sem teste de GET admin com query params de paginação** — `handleAdminGet` aceita page/limit mas não testa.

3. **PUT usa `updateProduct` que retorna array** — O mock retorna `[{ id: 1 }]` mas o handler espera objeto. Pode ser inconsistência no mock.

4. **`userFactory.resetId()` em beforeEach** — Ok, mas se `userFactory` não estiver isolado entre testes paralelos, pode causar flaky tests.

5. **Sem teste de POST com rate limit atingido** — Apenas mutações têm rate limit testado.

6. **Sem teste de response format v1** — O handler não parece suportar, mas é inconsistente com outros endpoints.

#### Melhorias sugeridas
- Adicionar teste de GET público com rate limit atingido (429)
- Adicionar teste de GET admin com page/limit explícitos
- Verificar se `updateProduct` retorna array ou objeto no handler real (inconsistência)
- Adicionar teste de POST com `image_url` inválida

---


**Endpoint testado:** `GET/PUT /api/settings`  
**Handler real:** NÃO. Usa `handler` **definido dentro do próprio teste** (linhas 24-61).

#### Finalidade declarada
Testar GET 401 sem token, GET autenticado e PUT atualização com autenticação simulada via header `authorization: Bearer valid-token`.

#### Relações com o código real
| O que testa | O handler real faz | Descompasso |
|-------------|-------------------|-------------|
| `withAuth` mock identity-ish | Real: `withAuth` verifica token e role | ❌ |
| Validação manual de `req.headers.authorization` | Real: usa `getAuthToken(req)` + `verifyToken(token)` | ❌ |
| Query SQL direta | Real: usa `getSettings()` e `updateSetting()` do domínio | ❌ |
| 401 se sem token | Similar | ⚠️ Parcial |

#### Problemas identificados

1. **Handler totalmente fictício** — Ignora completamente a implementação real.

2. **Mock de `withAuth` inconsistente** — O mock no topo do arquivo (linhas 10-18) implementa verificação de token Bearer, mas o handler local (linhas 24-61) faz verificação manual duplicada. São duas implementações diferentes de auth no mesmo arquivo.

3. **SQL direto no handler fictício** — Usa `db.query('SELECT key, value FROM settings')` e `db.query('UPDATE settings...')` enquanto o real usa funções de domínio.

4. **Sem teste de 403 (role não admin)** — O handler real retorna 403 para roles não-admin em PUT.

5. **Sem teste de cache** — O handler real usa `getOrSetCache` e `invalidateCache`.

6. **Sem teste de validação Zod** — O handler real valida com Zod.

#### Melhorias sugeridas
- Reescrever completamente para testar `pages/api/settings.js`
- Mockar `getAuthToken`, `verifyToken`, `getSettings`, `updateSetting`
- Testar 403 para role editor em POST
- Testar 405 para DELETE
- Testar response format v1

---


**Endpoint testado:** `GET/POST/PUT /api/settings`  
**Handler real:** ✅ SIM — importa `pages/api/settings.js`.

#### Finalidade
Testar o endpoint de configurações com autenticação, validação de role admin, cache e validação Zod.

#### Estrutura
- 9 casos de teste em 3 `describe` aninhados
- Mocks: `lib/auth/auth.js` (getAuthToken, verifyToken, withAuth), `lib/domain/settings.js` (getSettings, updateSetting), `lib/cache/cache.js` (clearAppMemoryCache)

#### Relações com o código real (9 testes)
| Teste | Handler real | Status |
|-------|-------------|--------|
| GET 200 configurações | `handleGet` → `getSettings` | ✅ |
| GET 200 público sem token | `handleGet` sem key | ✅ |
| GET 500 erro interno | `getSettings` rejeita | ✅ |
| PUT 200 atualiza | `handlePut` → `updateSetting` | ✅ |
| PUT 403 role editor | `verifyToken` → role editor → 403 | ✅ |
| PUT 400 body vazio | Validação Zod → 400 | ✅ |
| PUT 500 erro interno | `updateSetting` rejeita | ✅ |
| 405 DELETE | `default` case | ✅ |

#### Problemas identificados

1. **Mock de `withAuth` é complexo** (linhas 11-19) — Implementa verificação de token e role inline. Funciona, mas é frágil se o handler real mudar a assinatura do `withAuth`.

2. **Sem teste de POST** — O handler tem `handlePost` com `postSchema` e `withAuth`, mas não há teste para POST (criar nova configuração).

3. **Sem teste de `clearAppMemoryCache` chamado** — O `beforeEach` chama `clearAppMemoryCache()`, mas não verifica se o handler o chama (ele não chama — apenas o import é usado).

4. **GET 200 público sem token** — O handler real verifica `req.query.key`. Se não tem key, é público. Ok, mas falta testar GET com key e sem token (deve ser 401).

5. **`updateSetting` mock retorna `true`** — O handler real espera que `updateSetting` retorne void/resultado. Retornar `true` pode mascarar problemas.

6. **Sem teste de response format v1** — Handler suporta `?response=v1`.

7. **Sem teste de rate limiting** — O handler público tem `checkRateLimit`.

#### Melhorias sugeridas
- Adicionar teste de POST criação de configuração
- Adicionar teste de GET com `?key=x` sem token (401)
- Adicionar teste de GET com `?key=x` com token admin (200)
- Verificar se `clearAppMemoryCache` é realmente necessário no teste

---


**Endpoint testado:** `GET /api/admin/stats`  
**Handler real:** ✅ SIM — importa `pages/api/admin/stats.js`.

#### Finalidade
Testar o endpoint de estatísticas administrativas com autenticação, contagens via `Promise.all`, e fallback para 0.

#### Estrutura
- 3 casos de teste
- Mocks: `lib/infra/db` (query), `lib/auth/auth` (getAuthToken, verifyToken, withAuth)
- Usa `createAdminHandler` wrapper real do handler

#### Relações com o código real (3 testes)
| Teste | Handler real | Status |
|-------|-------------|--------|
| 401 sem token | `withAuth` verifica token → 401 | ✅ |
| Estatísticas corretas | `Promise.all` com 19 queries | ✅ |
| Fallback para 0 | `rows: []` → parseInt(0) | ✅ |

#### Problemas identificados

1. **Mock de `query` usa `mockImplementation` com lógica condicional** (linhas 59-75) — Ok para testar, mas é complexo. Se o SQL do handler mudar, o mock quebra silenciosamente.

2. **Teste de fallback para 0** — Mock retorna `{ rows: [] }` para todas as queries, mas o handler tem `postsRes?.rows[0]?.count || 0`. O parseInt de `|| 0` funciona, mas não testa o caso de `rows[0].count = '0'` (string zero).

3. **Sem teste de 500** — Se uma das queries do `Promise.all` rejeitar, o handler lança erro não tratado.

4. **`createAdminHandler` wrapper** — O handler usa `createAdminHandler` que adiciona rate limiting e error handling. O teste não exercita essas camadas.

5. **Sem teste de role não-admin** — O handler usa `createAdminHandler` com permissão, mas não testa se roles diferentes de admin são bloqueados.

#### Melhorias sugeridas
- Adicionar teste de 401 com token inválido
- Adicionar teste de 500 quando query rejeita
- Adicionar teste de role não-admin (403)
- Simplificar mock de `query` para usar `mockResolvedValue` com SQL matching mais claro

---


**Endpoint testado:** `GET /api/status`  
**Handler real:** ✅ SIM — importa `pages/api/status.js`.

#### Finalidade
Testar o endpoint de health check: 405 para não-GET, 200 com DB conectado, 200 com DB erro, fallback de NODE_ENV.

#### Estrutura
- 4 casos de teste
- Mocks: `lib/infra/db.js` (via `mockDb()`)
- Handler simples sem autenticação

#### Relações com o código real (4 testes)
| Teste | Handler real | Status |
|-------|-------------|--------|
| 405 para POST | `if (req.method !== 'GET')` → 405 | ✅ |
| 200 DB conectado | `query('SELECT 1')` → `'connected'` | ✅ |
| 200 DB erro | `query` rejeita → `'error'` | ✅ |
| NODE_ENV fallback | `process.env.NODE_ENV \|\| 'development'` | ✅ |

#### Problemas identificados

1. **Manipulação de `process.env.NODE_ENV`** (linhas 38-47) — Faz `delete` e restauração manual. Se o teste falhar entre delete e restore, contamina outros testes. Deveria usar `jest.spyOn` ou `beforeEach`/`afterEach` para restaurar.

2. **Sem teste de `mode=health`** — O handler suporta `?mode=health` que retorna `{ status: 'ok' }` simples.

3. **Sem teste de headers** — O handler retorna headers padrão, mas não há verificação.

4. **Sem teste de memória/sistema** — O handler retorna `rss`, `heapTotal`, `heapUsed` mas não são verificados.

5. **`_getJSONData()` vs `_getData()`** — Usa `_getJSONData()` (que faz parse) em alguns e `JSON.parse(res._getData())` em outros. Inconsistente, mas funcional.

#### Melhorias sugeridas
- Adicionar teste de `?mode=health`
- Adicionar teste de métricas de memória no response
- Usar `jest.replaceProperty(process, 'env', ...)` (Jest 29.7+) para evitar restauração manual

---


**Endpoint testado:** `POST /api/upload-image`  
**Handler real:** ✅ SIM — importa `pages/api/upload-image.js`.

#### Finalidade
Testar o upload de imagem: sucesso, 400 sem arquivo, 400 mimetype inválido, 400 tamanho excedido, nome do arquivo, `updateSetting` para hero, 500 parse error, 405 não-POST.

#### Estrutura
- 8 casos de teste
- Mocks: `sharp`, `formidable`, `fs`, `lib/auth/auth.js`, `lib/domain/settings.js`
- Usa `TextEncoder`/`TextDecoder` polyfill global

#### Relações com o código real (8 testes)
| Teste | Handler real | Status |
|-------|-------------|--------|
| POST processa upload | `formidable.parse` → `fs.promises.rename` → 200 | ✅ |
| 400 sem arquivo | `files.image` indefinido → 400 | ✅ |
| 400 mimetype inválido | `!ALLOWED_MIMETYPES.includes` → 400 | ✅ |
| 400 tamanho > 5MB | `imageFile.size > 5*1024*1024` → 400 | ✅ |
| Nome do arquivo correto | `prefix + uuid + ext` | ✅ |
| `updateSetting` para hero | `uploadType === 'setting_home_image'` → `updateSetting` | ✅ |
| 500 parse error | `cb(new Error(...))` → 500 | ✅ |
| 405 GET | `req.method !== 'POST'` → 405 | ✅ |

#### Problemas identificados

1. **`formidable` mock usa `default` export** — O mock define `default: jest.fn()` e `{ __esModule: true }`, mas o handler usa `import formidable from 'formidable'` que espera default export. O mock retorna `{ IncomingForm: jest.fn() }` sem default — **pode falhar dependendo da configuração do Jest/Babel**.

2. **`withAuth` mock identity** (linha 33-35) — `(handler) => handler` ignora autenticação completamente. O handler real é protegido por `withAuth`.

3. **Sem teste de autenticação falhando** — Não há cenário de 401/403.

4. **Sem teste de `sharp` falhando** — O handler tem try/catch no `sharp.metadata()` para detectar arquivos corrompidos.

5. **Sem teste de dimensões máximas** — O handler valida `width > 1920 || height > 1920` mas não há teste.

6. **`mockFile` repetido** — 4 testes definem `mockFile` similar. Deveria extrair para factory/helper.

7. **`fs.existsSync.mockReturnValue(true)`** em beforeEach — Assume que diretório existe, mas o handler cria se não existir com `fs.mkdirSync`.

#### Melhorias sugeridas
- Adicionar teste de autenticação falhando (401)
- Adicionar teste de arquivo corrompido (`sharp` rejeita)
- Adicionar teste de dimensões excedidas (>1920px)
- Adicionar teste de diretório inexistente (handler cria com `mkdirSync`)
- Extrair `mockFile` para factory

---

## Sumário Consolidado

#### Problemas sistêmicos (afetam múltiplos arquivos)

| Problema | Arquivos afetados | Severidade |
|----------|-------------------|------------|
| **Handlers fictícios (não testam código real)** | `posts.create.api.test.js`, `posts.delete.test.js`, `posts.general.test.js`, `posts.update.api.test.js`, `posts.flow.test.js`, `settings.general.test.js` | 🔴 Crítica |
| **Mock de `withAuth` como identity** | `posts.general.test.js`, `upload-image.test.js`, `settings.general.test.js` | 🔴 Alta |
| **Paths de mock inconsistentes** | `posts.create.api.test.js` (`../lib/posts`), `posts.delete.test.js` (`./lib/posts`), `posts.update.api.test.js` (`../lib/posts`) | 🔴 Alta |
| **Sem testes de autenticação negativa** | Todos os handlers protegidos | 🟡 Média |
| **Sem testes de rate limiting** | `posts.general.test.js`, `upload-image.test.js`, `settings.general.test.js` | 🟡 Média |
| **Falta de testes de response format v1** | `posts.integration.test.js`, `products.test.js`, `settings.test.js` | 🟢 Baixa |

#### Relação Handler Real vs Handler Fictício

| Endpoint | Handler real existe? | Testa handler real? |
|----------|---------------------|---------------------|
| `GET /api/posts` | ✅ `pages/api/posts.js` | ✅ `posts.integration.test.js` |
| `POST /api/posts` | ✅ `pages/api/posts.js` | ❌ Usa `posts.create.api.test.js` (fictício) |
| `GET/POST /api/admin/posts` | ✅ `pages/api/admin/posts.js` | ❌ `posts.general.test.js` (fictício) |
| `PUT /api/admin/posts` | ✅ Provavelmente existe | ❌ `posts.update.api.test.js` (fictício) |
| `DELETE /api/admin/posts/[id]` | ✅ Provavelmente existe | ❌ `posts.delete.test.js` (fictício) |
| `GET /api/products` | ✅ `pages/api/products.js` | ✅ `products.test.js` |
| `POST/PUT/DELETE /api/products` | ✅ `pages/api/products.js` | ✅ `products.test.js` |
| `GET/PUT/POST /api/settings` | ✅ `pages/api/settings.js` | ⚠️ `settings.test.js` (parcial) + `settings.general.test.js` (fictício) |
| `GET /api/admin/stats` | ✅ `pages/api/admin/stats.js` | ✅ `stats.test.js` |
| `GET /api/status` | ✅ `pages/api/status.js` | ✅ `status.test.js` |
| `GET /api/placeholder-image` | ✅ `pages/api/placeholder-image.js` | ✅ `placeholder-image.test.js` |
| `POST /api/upload-image` | ✅ `pages/api/upload-image.js` | ✅ `upload-image.test.js` |

#### Arquivos prioritários para reescrita

1. **`posts.flow.test.js`** — Testa código que não existe. Deve ser reescartado ou convertido em testes reais de fluxo com handlers reais.
2. **`posts.create.api.test.js`** — Não testa `pages/api/posts.js` real.
3. **`posts.delete.test.js`** — Não testa handler real de DELETE.
4. **`posts.update.api.test.js`** — Não testa handler real de PUT.
5. **`posts.general.test.js`** — Não testa handler real.
6. **`settings.general.test.js`** — Duplica `settings.test.js` com handler fictício. Deve ser removido ou mesclado.

#### Código morto identificado

| Arquivo | Linhas | O que é |
|---------|--------|---------|
| `posts.create.api.test.js` | 13-33 | `postsHandler` fictício |
| `posts.delete.test.js` | 13-38 | `postsHandler` fictício |
| `posts.flow.test.js` | 29-101 | `uploadHandler` + `postsHandler` fictícios |
| `posts.general.test.js` | 21-43 | `handler` fictício |
| `posts.update.api.test.js` | 13-44 | `postsHandler` fictício |
| `settings.general.test.js` | 24-61 | `handler` fictício |

---

## Conclusão

O conjunto de testes tem **3 categorias de qualidade**:

1. **Testes de alta quality** (6 arquivos): Importam handlers reais, testam comportamento real, usam mocks apropriados. Representam o padrão a ser seguido.
2. **Testes médios** (1 arquivo): `settings.test.js` é bom mas incompleto (falta POST, falta auth negativa).
3. **Testes inúteis** (6 arquivos): Implementam handlers fictícios e os testam. Não validam nenhum código de produção. Devem ser reescritos ou removidos.

A recomendação principal é **reescrever os 6 arquivos da categoria 3** para importar os handlers reais, mantendo a mesma estrutura de descrição/asserts mas apontando para o código real. Os 6 arquivos da categoria 1 podem ser mantidos com melhorias incrementais (testes de response format v1, autenticação negativa, edge cases).


---


## 7.2. Testes de Integração — Videos Restantes, Auth, Domain (DB)

## Sumário

1. [`tests/integration/api/videos.create.api.test.js`](#1-videoscreateapitestjs)
2. [`tests/integration/api/videos.delete.test.js`](#2-videosdeletetestjs)
3. [`tests/integration/api/videos.flow.test.js`](#3-videosflowtestjs)
4. [`tests/integration/api/videos.integration.test.js`](#4-videosintegrationtestjs)
5. [`tests/integration/api/videos.pagination.api.test.js`](#5-videospaginationapitestjs)
6. [`tests/integration/api/videos.test.js`](#6-videostestjs)
7. [`tests/integration/auth/auth.test.js`](#7-authtestjs)
8. [`tests/integration/domain/musicas.db.test.js`](#8-musicasdbtestjs)
9. [`tests/integration/domain/products.db.test.js`](#9-productsdbtestjs)
10. [`tests/integration/domain/settings.db.test.js`](#10-settingsdbtestjs)
11. [`tests/integration/domain/videos.db.test.js`](#11-videosdbtestjs)

---


**Arquivo:** `tests/integration/api/videos.create.api.test.js` (130 linhas)

#### Finalidade

Testar o endpoint de criação de vídeos (`POST /api/videos`), validando a lógica de controller no processamento da requisição: validação de campos obrigatórios, validação de formato de URL do YouTube, resposta de sucesso e tratamento de erros.

#### Estrutura

- **Mock da biblioteca:** `jest.mock('../lib/videos', ...)` — cria um mock virtual de `createVideo`.
- **Handler simulado:** O arquivo define um `videosHandler` **inline** (não importa o handler real) que replica a lógica esperada do controller.
- **Testes (5 casos):**
  1. Criação com sucesso (201) — body completo com `titulo`, `url_youtube`, `descricao`, `publicado`.
  2. Campos obrigatórios faltando (400) — sem `titulo` e `url_youtube`.
  3. URL do YouTube inválida (400) — usa URL do Vimeo.
  4. Erro na camada de serviço (500) — `createVideo` rejeita.
  5. Método não permitido (405) — requisição GET.

#### Pontos de Atenção

| Item | Descrição |
|------|-----------|
| **Handler duplicado** | O `videosHandler` é reimplementado inline em vez de importar o handler real de `pages/api/videos.js`. Isso significa que **o handler real não está sendo testado** — testa-se apenas uma simulação que pode divergir da implementação real. |
| **Caminho de mock inconsistente** | O mock aponta para `'../lib/videos'` (caminho relativo ao arquivo de teste), mas o projeto real usa `lib/domain/videos.js`. O mock virtual (`{ virtual: true }`) mascara o fato de que o caminho provavelmente não existe. |
| **Regex de YouTube frágil** | `/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/` — não valida URLs como `https://m.youtube.com/watch` ou `https://youtube-nocookie.com`. Além disso, URLs com query string após o path podem passar quando não deveriam (ex: `youtube.com/evil`). |
| **Nenhum teste de idempotência/nome duplicado** | Não há teste para o caso de criar vídeo com título duplicado (se houver constraint UNIQUE no banco). |
| **Sem teste de autenticação** | O endpoint presumivelmente requer autenticação (admin), mas o handler simulado não valida token/sessão. |

#### Duplicações

- A lógica de validação (`if (!titulo \|\| !url_youtube)`, regex do YouTube) é duplicada em relação a `videos.flow.test.js` e ao handler real, criando 3 fontes de verdade potenciais.

#### Melhorias Sugeridas

1. Importar o handler real de `pages/api/admin/videos.js` (ou o caminho correto do controller) em vez de simular.
2. Adicionar teste de URL com variações (`youtu.be/short`, `youtube.com/embed/`, `m.youtube.com`).
3. Adicionar teste de rejeição para URLs maliciosas que contêm `youtube.com` mas são phishing.
4. Mockar a camada de autenticação para verificar que ela é aplicada no endpoint de criação.
5. Remover a duplicação extraindo a validação para uma função compartilhada.

---


**Arquivo:** `tests/integration/api/videos.delete.test.js` (100 linhas)

#### Finalidade

Testar o endpoint de exclusão de vídeos (`DELETE /api/admin/videos`), validando a lógica de controller: exclusão bem-sucedida, vídeo não encontrado, ID obrigatório, método não permitido.

#### Estrutura

- **Mock da biblioteca:** `jest.mock('./lib/videos', ...)` — mock virtual de `deleteVideo`.
- **Handler simulado:** `videosHandler` inline com validação de método DELETE, obrigatoriedade do ID, e tratamento de retorno nulo.
- **Testes (4 casos):**
  1. Exclusão com sucesso (200) — `{ id: 1 }`.
  2. Vídeo não encontrado (404) — `deleteVideo` retorna `null`.
  3. ID não fornecido (400) — body vazio.
  4. Método não permitido (405) — requisição GET.

#### Pontos de Atenção

| Item | Descrição |
|------|-----------|
| **Handler simulado (não real)** | Assim como no arquivo de criação, o handler é reimplementado inline. O controller real de `pages/api/admin/videos.js` não é testado. |
| **Caminho de mock incorreto** | `'./lib/videos'` com `{ virtual: true }` mascara o fato de que esse módulo provavelmente não existe no projeto real (que usa `lib/domain/videos.js`). |
| **Sem teste de autenticação** | Endpoint admin sem mock de `withAuth` — não valida que apenas autenticados podem excluir. |
| **Sem teste de autorização** | Não testa se usuários não-admin podem excluir (se aplicável). |
| **Sem teste de CASCADE** | Se vídeos têm relacionamentos (ex: playlists, logs de auditoria), não há teste de exclusão em cascata. |

#### Duplicações

- Padrão idêntico ao `videos.create.api.test.js`: estrutura de mock + handler inline + beforeEach com `clearAllMocks()`.
- A lógica de validação do ID (`if (!id)`) é duplicada em relação ao handler real.

#### Melhorias Sugeridas

1. Importar o handler real de `pages/api/api/admin/videos.js`.
2. Adicionar teste de autorização (usuário não-admin recebendo 403).
3. Adicionar teste de log de auditoria (verificar se `logActivity` é chamado na exclusão — o `videos.flow.test.js` já faz isso).
4. Unificar a estrutura de teste de API com os demais arquivos do diretório.

---


**Arquivo:** `tests/integration/api/videos.flow.test.js` (132 linhas)

#### Finalidade

Testar o fluxo completo de vídeos (criar → listar → excluir) em sequência, validando que o handler de admin (`pages/api/admin/videos`) coordena corretamente as operações de domínio, cache e auditoria.

#### Estrutura

- **Imports reais:** Importa o handler real de `../../../pages/api/admin/videos` e as funções de domínio `createVideo`, `getPaginatedVideos`, `deleteVideo` de `lib/domain/videos.js`.
- **Mocks de domínio:** Mocka `lib/domain/videos.js`, `lib/domain/audit.js` (logActivity), e `lib/cache/cache.js` (invalidateCache, checkRateLimit).
- **Mock de autenticação:** Mocka `lib/auth/auth` com `withAuth` que injeta `req.user` simulado (`role: 'admin'`).
- **Testes (2 casos):**
  1. **Ciclo completo:** POST criar → GET listar → DELETE excluir, verificando status codes e argumentos das chamadas de domínio.
  2. **Filtro de busca:** GET com `search` e verifica que `getPaginatedVideos` é chamado com o termo correto.

#### Pontos de Atenção

| Item | Descrição |
|------|-----------|
| **Uso de `mockResolvedValueOnce`** | Sequencial: `createVideo` → `getPaginatedVideos` → `deleteVideo` — a ordem importa. Se o handler mudar a ordem das chamadas, o teste quebra silenciosamente. |
| **Sem asserções de cache** | O `invalidateCache` é mockado mas nunca verificado. Após criar/excluir, espera-se que o cache seja invalidado, mas o teste não valida isso. |
| **Sem asserções de auditoria** | `logActivity` é mockado (`mockResolvedValue()`) mas nunca verificado com `expect(...)`. Não há garantia de que o log de auditoria está sendo registrado. |
| **`new Date().toISOString()` no mock** | Gera data dinâmica no mock que é comparada com `expect.objectContaining` — isso pode causar falsos passes se o handler formate datas diferentemente. |
| **Cenário de busca não testa paginação** | O teste de busca verifica que `searchTerm` é passado, mas não valida `page` e `limit` explicitamente. |

#### Duplicações

- As factories de dados de teste (`newVideo`) são recriadas inline em vez de usar o helper `videoFactory` (usado em `videos.test.js`).

#### Melhorias Sugeridas

1. Adicionar `expect(invalidateCache).toHaveBeenCalledWith(...)` após criar e excluir.
2. Adicionar `expect(logActivity).toHaveBeenCalled()` ou verificação de argumentos específicos.
3. Extrair dados de teste para o `videoFactory` (já existente em `tests/factories`).
4. Adicionar cenário de erro no meio do fluxo (ex: criar OK, mas listar falha).
5. Adicionar teste de autorização (usuário não-admin tentando acessar endpoint admin).

---


**Arquivo:** `tests/integration/api/videos.integration.test.js` (68 linhas)

#### Finalidade

Validar a segurança da API pública de vídeos (`GET /api/videos`), garantindo que as queries SQL **sempre** incluam o filtro `WHERE publicado = true`, mesmo quando há termo de busca.

#### Estrutura

- **Imports reais:** Handler de `../../../pages/api/videos.js`, `query` de `lib/infra/db.js`, `getOrSetCache`/`checkRateLimit` de `lib/cache/cache.js`.
- **Mocks:** `query` (db), `getOrSetCache`/`checkRateLimit` (cache).
- **Testes (2 casos):**
  1. Query inclui `WHERE publicado = true` — verifica que tanto a query de dados quanto a de contagem contêm o filtro.
  2. Filtro mantido com busca — verifica `WHERE publicado = true AND` e parâmetro `['%culto%']`.

#### Pontos de Atenção

| Item | Descrição |
|------|-----------|
| **Teste de segurança crítico** | Este é o teste mais importante do conjunto — garante que vídeos não publicados nunca vazem para a API pública. |
| **Uso de `mock.calls.find()`** | A busca por `call[0].include('FROM videos')` é frágil — se a query mudar de `FROM videos` para `FROM videos v` ou tiver alias, o teste quebra. |
| **Sem teste de ordenação** | Não valida se a query inclui `ORDER BY` esperado. |
| **Sem teste de limite máximo** | Não valida se há um limite máximo para `LIMIT` (ex: limit=10000 poderia ser um DoS). |
| **Mock de `getOrSetCache`** | O mock padrão executa a função (`return await fetchFunction()`), então o cache é bypassed. Não há cenário testando o comportamento com cache HIT. |

#### Duplicações

- O mock de cache (`getOrSetCache` que bypassa) é idêntico ao do `videos.test.js`.

#### Melhorias Sugeridas

1. Adicionar teste de cache HIT (mock retorna valor sem executar `fetchFunction`).
2. Adicionar teste de SQL injection — passar `search: "'; DROP TABLE videos;--"` e verificar que é escapado.
3. Adicionar teste de rate limit (`checkRateLimit` retornando `true` → 429).
4. Tornar a detecção de query mais robusta (regex em vez de `includes`).
5. Adicionar teste que valida `ORDER BY` e `LIMIT` máximo.

---


**Arquivo:** `tests/integration/api/videos.pagination.api.test.js` (102 linhas)

#### Finalidade

Testar o endpoint de listagem paginada de vídeos (`GET /api/videos`), validando extração de query params (`page`, `limit`), valores padrão e tratamento de erros.

#### Estrutura

- **Mock da biblioteca:** `jest.mock('../lib/videos', ...)` — mock virtual de `getPaginatedVideos`.
- **Handler simulado:** `videosHandler` inline que extrai `page`/`limit` do query string com `parseInt` e valores padrão (1, 10).
- **Testes (4 casos):**
  1. Lista paginada com sucesso (200) — verifica status e argumentos `(1, 10)`.
  2. Valores padrão (page=1, limit=10) quando query vazia.
  3. Erro na camada de serviço (500).
  4. Método não permitido (405).

#### Pontos de Atenção

| Item | Descrição |
|------|-----------|
| **Handler simulado (não real)** | O handler real de `pages/api/videos.js` não é testado — apenas uma cópia simplificada. |
| **Campos do mock inconsistentes** | O mock retorna `{ title, url }` enquanto o domínio real usa `{ titulo, url_youtube }`. |
| **Sem teste de limite máximo** | Não valida se `limit=99999` é limitado (vulnerabilidade potencial). |
| **Sem teste de número negativo** `page=-1` ou `limit=-5` — `parseInt` aceita negativos. |
| **Sem teste de rate limit** | Diferente de `videos.test.js`, não há mock de `checkRateLimit`. |

#### Duplicações

- Estrutura idêntica a `videos.create.api.test.js` e `videos.delete.test.js` (mock + handler inline + 4 testes padrão).
- A lógica de `parseInt(query.page \|\| '1', 10)` é uma cópia da lógica real do handler.

#### Melhorias Sugeridas

1. Importar o handler real.
2. Adicionar teste de `page=0`, `page=-1`, `limit=-5` (deve retornar 400 ou usar valor absoluto).
3. Adicionar teste de `limit > MAX_LIMIT` (deve ser limitado a um teto).
4. Adicionar teste de rate limit (429).
5. Corrigir nomes dos campos no mock para bater com o domínio real (`titulo`, `url_youtube`).

---


**Arquivo:** `tests/integration/api/videos.test.js` (92 linhas)

#### Finalidade

Testar cenários avançados da API pública de vídeos (`GET /api/videos`), incluindo rate limit, cache, parâmetros de ordenação, extração de IP e propagação de erros.

#### Estrutura

- **Helpers compartilhados:** Usa `testPublicGetEndpoint` (de `tests/helpers/crud-test`) e `videoFactory` (de `tests/factories`).
- **Imports reais:** Handler de `../../../pages/api/videos.js`, `getPublicPaginatedVideos` de `lib/domain/videos.js`.
- **Mocks:** `lib/domain/videos.js`, `lib/cache/cache.js` (via `tests/mocks/cache`).
- **Testes (5 casos):**
  1. Rate limit excedido (429) — `checkRateLimit` retorna `true`.
  2. Sucesso com cache — verifica `success: true`, `data` com 1 item, e argumentos `(1, 10, 'aula', 'created_at DESC')`.
  3. Strings não numéricas — `page='abc'`, `limit='xyz'` → defaults `(1, 10)`.
  4. Sort customizado — `sort: 'alpha'` → mapeia para `'titulo ASC'`.
  5. Extração de IP e propagação 500 — `x-forwarded-for` com IPs, `checkRateLimit` rejeita → 500 + log de erro.

#### Pontos de Atenção

| Item | Descrição |
|------|-----------|
| **Uso de helper compartilhado (`testPublicGetEndpoint`)** | Bom — reduz boilerplate e padroniza testes. Porém, a closure adicional `({ handler: h, createMocks: cm })` cria uma segunda camada de abstração que dificulta a leitura. |
| **Verificação de sort (`'titulo ASC'`)** | Assume que o handler mapeia `'alpha'` → `'titulo ASC'`. Esse mapeamento está acoplado ao teste — se mudar no handler, o teste quebra sem aviso claro. |
| **`console.error` spy** | O teste suprime o `console.error` do handler (`jest.spyOn(console, 'error').mockImplementation(...)`) e depois restaura — correto, mas frágil se o handler mudar o método de log. |
| **`logger` importado mas usado apenas no último teste** | O `logger` é importado de `lib/infra.logger.js` e usado no spy do último teste — os demais testes não validam logging. |
| **Sem teste de cache HIT vs MISS** | O mock sempre bypassa o cache (`await cb()`), nunca testa o comportamento com cache HIT. |

#### Duplicações

- O mock de cache é redefinido no `beforeEach` (`getOrSetCache.mockImplementation(...)`) — mesmo padrão do `videos.integration.test.js`.
- `videoFactory.resetId()` + `videoFactory.list(1)` é a forma correta de gerar dados de teste (reutilizável).

#### Melhorias Sugeridas

1. Adicionar teste de cache HIT (mock de `getOrSetCache` retornando valor fixo).
2. Adicionar teste de `sort` inválido (ex: `sort: 'invalid'` → comportamento esperado).
3. Adicionar teste de `x-real-ip` (além de `x-forwarded-for`).
4. Extrair o mapeamento de sort para uma constante compartilhada (para que o teste e o handler usem a mesma fonte).
5. Adicionar teste de resposta 200 com `data: []` (lista vazia).

---


**Arquivo:** `tests/integration/auth/auth.test.js` (191 linhas)

#### Finalidade

Testar o fluxo de autenticação completo: login (POST `/api/auth/login`) e middleware de proteção de rotas (`withAuth`).

#### Estrutura

- **Mocks:** `jsonwebtoken` (sign, verify), `bcrypt` (compare), `./lib/db/repository` (`findUserByUsername`) — todos virtuais.
- **Login handler simulado:** `loginHandler` inline — valida campos, busca usuário, compara senha, gera JWT.
- **Middleware simulado:** `withAuth` inline — extrai Bearer token, verifica com JWT, trata erros de expiração/inválido.
- **Testes de login (3 casos):**
  1. Credenciais válidas (200) — retorna `{ token: 'mocked.jwt.token' }`.
  2. Senha incorreta (401) — `bcrypt.compare` retorna `false`.
  3. Campos faltando (400) — sem password.
- **Testes de middleware (4 casos):**
  1. Token válido (200) — `jwt.verify` retorna usuário.
  2. Token expirado (401) — simula `TokenExpiredError`.
  3. Token inválido (401) — `jwt.verify` lança erro genérico.
  4. Sem token (401) — header ausente.

#### Pontos de Atenção

| Item | Descrição |
|------|-----------|
| **Handlers simulados (não reais)** | Tanto `loginHandler` quanto `withAuth` são reimplementados inline — o handler real de `pages/api/auth/login` e o middleware real de `lib/auth/auth.js` não são testados. |
| **Segredo JWT hardcoded** | O login handler usa `'secret'` e o middleware usa `'secret-placeholder'` — segredos diferentes, ambos hardcoded no teste. |
| **Sem teste de refresh token** | Não há fluxo de refresh token. |
| **Sem teste de hash de senha** | O `bcrypt.compare` é mockado — o hash real nunca é testado. |
| **`jest.requireActual('jsonwebtoken')`** | Usado para obter a classe `TokenExpiredError` real — abordagem correta para simular erro de expiração. |
| **Sem teste de rate limit** | Login é um alvo comum de brute-force — não há teste de rate limiting. |

#### Duplicações

- As factories de dados de teste (usuário `{ id: 1, username: 'admin', password: 'hashed-password' }`) são duplicadas em todos os testes.
- O mock de JWT é reconfigurado em cada teste (`mockReturnValue`, `mockImplementation`).

#### Melhorias Sugeridas

1. Importar o handler real de login e o middleware `withAuth` real.
2. Adicionar teste de rate limit no login (múltiplas tentativas → 429).
3. Adicionar teste de expiração real (token gerado com `expiresIn: '0s'`).
4. Criar factory de usuário (similar a `videoFactory`).
5. Adicionar teste de token com payload malformado.
6. Adicionar teste de logout (se aplicável).

---


**Arquivo:** `tests/integration/domain/musicas.db.test.js` (282 linhas)

#### Finalidade

Testar a integração real com PostgreSQL (via Testcontainers) para a entidade **Músicas** (`musicas`). Valida queries SQL, constraints, transações e rollback.

#### Estrutura

- **Helper de banco:** `createTestDb`, `applyMigrations`, `withTransaction`, `isDockerAvailable` (de `tests/helpers/db-test.js`).
- **Transações:** Cada teste roda dentro de uma transação (`beforeEach`) que é revertida (`afterEach`), garantindo isolamento.
- **Helper `insertTestMusica`:** Insere registro com valores padrão, aceita overrides.
- **describe condicional:** `describeIf` — pula testes se Docker não estiver disponível.
- **Testes (13 casos):**
  1. Criar música e retornar ID gerado.
  2. Criar com valores padrão (`descricao`, `position`).
  3. Ler por ID após criar.
  4. Listar com paginação (LIMIT/OFFSET).
  5. Atualizar campos.
  6. Deletar.
  7. Rejeitar sem título (NOT NULL).
  8. Rejeitar sem url_spotify (NOT NULL).
  9. Página acima do total retorna vazia.
  10. LIMIT 0 retorna vazio.
  11. Buscar por título (ILIKE).
  12. Buscar por artista (ILIKE).
  13. Ordenar por position ASC, created_at DESC.
  14. Contar total corretamente.
  15. ROLLBACK em caso de erro.

#### Pontos de Atenção

| Item | Descrição |
|------|-----------|
| **Teste com banco real (Testcontainers)** | Excelente prática — testa SQL real, constraints, transações, e comportamento do PostgreSQL. |
| **Rollback de transação** | O padrão `beforeEach` (begin) + `afterEach` (rollback) garante que nenhum dado persiste entre testes. |
| **Transação não falha no rollback** | O `afterAll` tem rollback de segurança com `try/catch` — mas se a transação já foi commitada/rollbackada, pode lançar erro silencioso. |
| **Sem teste de UNIQUE constraint** | Se `url_spotify` tem constraint UNIQUE, não há teste para duplicatas. |
| **Sem teste de JOIN** | Se a tabela `musicas` se relaciona com outras, não há teste de JOIN. |
| **Sem teste de full-text search** | Usa ILIKE simples — se houver tsvector/full-text index, não é testado. |

#### Duplicações

- A estrutura inteira (beforeAll, afterAll, beforeEach, afterEach, insertTest, describeIf) é **idêntica** a `products.db.test.js`, `settings.db.test.js` e `videos.db.test.js`.
- Os testes de CRUD básico (criar, ler, atualizar, deletar, paginação, NOT NULL, LIMIT 0, COUNT, ROLLBACK) são cópias quase exatas entre os 4 arquivos de domínio.

#### Melhorias Sugeridas

1. Extrair a estrutura de setup/teardown para um helper reutilizável (ex: `describeDbDomain(name, insertFn, testsFn)`).
2. Adicionar teste de UNIQUE constraint (se aplicável).
3. Adicionar teste de transação concorrente (se aplicável).
4. Adicionar teste de performance com volume (ex: 1000+ registros).

---


**Arquivo:** `tests/integration/domain/products.db.test.js` (230 linhas)

#### Finalidade

Testar a integração real com PostgreSQL para a entidade **Produtos** (`products`). Valida queries SQL, constraints, transações e rollback.

#### Estrutura

- **Mesma estrutura** de `musicas.db.test.js`: helper de banco, transações, helper `insertTestProduct`, `describeIf`.
- **Diferenças específicas:**
  - Tabela `products` com campos: `name`, `price`, `image_url` (JSON array), `description`, `link`, `category`, `published`, `position`.
  - `link` pode ser `null` (teste explícito).
  - `image_url` é inserido como `JSON.stringify([...])`.
- **Testes (14 casos):**
  1. Criar produto e retornar ID.
  2. Criar com valores padrão (link null, category 'geral').
  3. Ler por ID.
  4. Paginação.
  5. Atualizar campos.
  6. Deletar.
  7. Rejeitar sem nome (NOT NULL).
  8. Rejeitar sem price (NOT NULL).
  9. Página acima do total.
  10. LIMIT 0.
  11. Filtrar publicados (`published = true`).
  12. Ordenar por position ASC, id ASC.
  13. Contar total.
  14. ROLLBACK em caso de erro.

#### Pontos de Atenção

| Item | Descrição |
|------|-----------|
| **Sem teste de JSON** | `image_url` é armazenado como JSON array, mas não há teste de consulta com operadores JSON (`->`, `->>`, `@>`). |
| **Sem teste de category** | `category` tem default `'geral'`, mas não há teste de filtro por categoria. |
| **Sem teste de faixa de preço** | Não há teste de `WHERE price BETWEEN X AND Y`. |
| **`price` como string** | O campo `price` é inserido como string `'99.90'` — se for `NUMERIC`/`DECIMAL` no banco, o PostgreSQL converte, mas isso não é validado. |

#### Duplicações

- Estrutura idêntica aos demais testes de domínio (`musicas`, `videos`, `settings`).
- Testes de CRUD, paginação, NOT NULL, LIMIT 0, COUNT, ROLLBACK são cópias quase exatas.

#### Melhorias Sugeridas

1. Adicionar teste de consulta JSON (`image_url->>0`).
2. Adicionar teste de filtro por `category`.
3. Adicionar teste de faixa de preço.
4. Adicionar teste de UNIQUE constraint (se `name` ou outro campo for UNIQUE).
5. Extrair estrutura comum para helper reutilizável.

---


**Arquivo:** `tests/integration/domain/settings.db.test.js` (227 linhas)

#### Finalidade

Testar a integração real com PostgreSQL para a entidade **Settings** (`settings`). Valida queries SQL, constraints, UPSERT (ON CONFLICT), JSON aggregation e rollback.

#### Estrutura

- **Mesma estrutura** dos demais testes de domínio.
- **Diferenças específicas:**
  - Tabela `settings` com campos: `key` (PK), `value` (jsonb), `type`, `description`.
  - `value` é inserido como `JSON.stringify(...)` com cast `$2::jsonb`.
  - Usa `json_object_agg` para agregação.
  - Testa UPSERT (`ON CONFLICT DO UPDATE`).
- **Testes (11 casos):**
  1. Criar configuração e retornar com chave.
  2. Ler por chave.
  3. Agregar todas como objeto (json_object_agg).
  4. UPSERT (criar + atualizar).
  5. Rejeitar sem key (NOT NULL via PK).
  6. Rejeitar chave duplicada (UNIQUE).
  7. Chave inexistente retorna vazio.
  8. Objeto vazio quando não há configurações.
  9. Listar ordenadas por chave.
  10. Deletar.
  11. Contar total.

#### Pontos de Atenção

| Item | Descrição |
|------|-----------|
| **UPSERT testado** | Bom — valida o padrão `ON CONFLICT DO UPDATE` que é comum para settings. |
| **JSON aggregation** | Testa `json_object_agg` — funcionalidade PostgreSQL específica. |
| **Sem teste de partial update** | Não há teste de `UPDATE ... WHERE key = $1` (apenas UPSERT). |
| **Sem teste de `type`** | O campo `type` é inserido mas nunca testado (ex: `type: 'boolean'` com valor `true`). |
| **Sem teste de concurrent UPSERT** | Não testa comportamento com UPSERT concorrente (race condition). |

#### Duplicações

- Estrutura de setup/teardown idêntica aos demais.
- Testes de CRUD, NOT NULL, LIMIT (não presente aqui), COUNT, ROLLBACK (não presente aqui) parcialmente duplicados.

#### Melhorias Sugeridas

1. Adicionar teste de `type` com valores diferentes (`boolean`, `number`, `object`).
2. Adicionar teste de UPSERT concorrente (se aplicável).
3. Adicionar teste de partial update (`UPDATE value WHERE key = $1`).
4. Adicionar teste de `value` com JSON complexo (objetos aninhados).

---


**Arquivo:** `tests/integration/domain/videos.db.test.js` (272 linhas)

#### Finalidade

Testar a integração real com PostgreSQL para a entidade **Vídeos** (`videos`). Valida queries SQL, constraints, transações e rollback.

#### Estrutura

- **Mesma estrutura** de `musicas.db.test.js` e `products.db.test.js`.
- **Diferenças específicas:**
  - Tabela `videos` com campos: `titulo`, `url_youtube`, `descricao`, `publicado`, `position`.
  - Busca por `titulo` e `descricao` (ILIKE).
  - Ordenação por `created_at DESC`.
- **Testes (14 casos):**
  1. Criar vídeo e retornar ID.
  2. Criar com valores padrão (descricao, position).
  3. Ler por ID.
  4. Paginação.
  5. Atualizar campos.
  6. Deletar.
  7. Rejeitar sem título (NOT NULL).
  8. Rejeitar sem url_youtube (NOT NULL).
  9. Página acima do total.
  10. LIMIT 0.
  11. Buscar por título (ILIKE).
  12. Buscar por descrição (ILIKE).
  13. Ordenar por created_at DESC.
  14. Contar total.
  15. ROLLBACK em caso de erro.

#### Pontos de Atenção

| Item | Descrição |
|------|-----------|
| **Estrutura idêntica a musicas** | Os testes de `videos` e `musicas` são praticamente idênticos — apenas nomes de campos e tabela mudam. |
| **Sem teste de UNIQUE em url_youtube** | Se houver constraint UNIQUE, não é testada. |
| **Sem teste de full-text search** | Usa ILIKE — se houver tsvector, não é testado. |
| **Sem teste de `publicado = true` filter** | Diferentemente do teste de API (`videos.integration.test.js`), aqui o filtro de publicados não é validado (mas isso é responsabilidade do domínio da API, não do teste de banco). |

#### Duplicações

- Estrutura idêntica aos demais arquivos de domínio.
- Testes de CRUD, paginação, NOT NULL, LIMIT 0, ILIKE, COUNT, ROLLBACK são cópias quase exatas.

#### Melhorias Sugeridas

1. Adicionar teste de UNIQUE constraint em `url_youtube` (se aplicável).
2. Adicionar teste de full-text search (se aplicável).
3. Adicionar teste de `position` com valores negativos.
4. Extrair estrutura comum para helper reutilizável.

---


#### 1. Handlers Simulados vs. Reais

| Arquivo | Usa handler real? | Observação |
|---------|-------------------|------------|
| `videos.create.api.test.js` | ❌ Simulado | Mock de `../lib/videos` (caminho incorreto) |
| `videos.delete.test.js` | ❌ Simulado | Mock de `./lib/videos` (caminho incorreto) |
| `videos.flow.test.js` | ✅ Real | Importa `pages/api/admin/videos` |
| `videos.integration.test.js` | ✅ Real | Importa `pages/api/videos.js` |
| `videos.pagination.api.test.js` | ❌ Simulado | Mock de `../lib/videos` (caminho incorreto) |
| `videos.test.js` | ✅ Real | Importa `pages/api/videos.js` |
| `auth.test.js` | ❌ Simulado | Login e withAuth simulados inline |

**Impacto:** 4 de 7 arquivos de API testam handlers simulados, não o código real. Isso cria uma falsa sensação de cobertura.

#### 2. Duplicação de Estrutura nos Testes de Domínio

Os 4 arquivos (`musicas.db.test.js`, `products.db.test.js`, `settings.db.test.js`, `videos.db.test.js`) compartilham:

- `beforeAll`/`afterAll`/`beforeEach`/`afterEach` idênticos.
- Helper `insertTestX` com mesma estrutura.
- `describeIf` com mesma lógica.
- 80%+ dos testes são cópias com nomes de campos trocados.

**Extração possível:**
```javascript
function describeDbDomain(tableName, insertFn, testCases) {
  // setup/teardown padrão
  testCases(); // testes específicos
}
```

#### 3. Criação de Dados de Teste

| Arquivo | Método | Observação |
|---------|--------|------------|
| `videos.test.js` | `videoFactory.list(1)` | ✅ Usa factory |
| `videos.flow.test.js` | Objeto inline | ⚠️ Deveria usar factory |
| `videos.create.api.test.js` | Objeto inline | ⚠️ Deveria usar factory |
| `videos.delete.api.test.js` | Objeto inline | ⚠️ Deveria usar factory |
| Domínio (4 arquivos) | `insertTestX(overrides)` | ✅ Padrão consistente |

#### 4. Cobertura de Cenários

| Cenário | Coberto? | Onde |
|---------|----------|------|
| CRUD básico | ✅ | Todos |
| Validação de campos obrigatórios | ✅ | API (create, delete) + Domínio |
| Rate limiting | ⚠️ Parcial | `videos.test.js` apenas |
| Cache HIT/MISS | ❌ Não | Apenas bypass |
| Autenticação | ⚠️ Parcial | `auth.test.js` (simulado) |
| Autorização (roles) | ❌ Não | Nenhum teste |
| SQL Injection | ❌ Não | Nenhum teste |
| Concorrência/Transação | ⚠️ Parcial | Apenas ROLLBACK em domínio |
| UNIQUE constraint | ❌ Não | Apenas em `settings.db.test.js` |
| Paginação robusta | ⚠️ Parcial | Sem teste de limites máximos |
| Logs de auditoria | ❌ Não | Mockado mas não verificado |
| Invalidação de cache | ❌ Não | Mockado mas não verificado |

#### 5. Código Morto / Inativo

- **Nenhum código morto identificado** — todas as funções e variáveis declaradas são utilizadas.
- **Handlers simulados** em `videos.create.api.test.js`, `videos.delete.test.js`, `videos.pagination.api.test.js` e `auth.test.js` podem ser considerados "código de teste morto" no sentido de que não validam o código real.

#### 6. Melhorias Prioritárias (Ranking)

| Prioridade | Melhoria | Impacto |
|------------|----------|---------|
| 🔴 Alta | Substituir handlers simulados pelos reais nos 4 arquivos de API | Cobertura real |
| 🔴 Alta | Adicionar teste de rate limit em create/delete/pagination | Segurança |
| 🟡 Média | Extrair estrutura de domínio para helper reutilizável | Manutenibilidade |
| � Média | Verificar `invalidateCache` e `logActivity` em `videos.flow.test.js` | Cobertura de efeitos colaterais |
| 🟡 Média | Adicionar factories para todos os testes de API | Consistência |
| 🟢 Baixa | Adicionar testes de UNIQUE constraint nos domínios | Integridade |
| 🟢 Baixa | Adicionar testes de SQL injection | Segurança |
| 🟢 Baixa | Adicionar testes de autorização (roles) | Segurança |
| 🟢 Baixa | Adicionar testes de cache HIT/MISS | Performance |

---

## Conclusão

O conjunto de testes apresenta **duas camadas distintas**:

1. **Testes de API (pasta `api/`)** — majoritariamente simulados, com handlers inline que não refletem o código real. Boa intenção, mas cobertura efetiva limitada.

2. **Testes de Domínio (pasta `domain/`)** — bem estruturados, usando Testcontainers para testar SQL real. Estrutura pesadamente duplicada entre as 4 entidades, mas funcionalmente corretos.

**Recomendação principal:** Priorizar a migração dos handlers simulados para os handlers reais, seguida da extração de estrutura duplicada nos testes de domínio. Isso aumentaria significativamente a confiança na suíte de testes.


---


## 8. Testes Unitários — Root, Domain e Hooks


| Arquivo | Camada | Módulo alvo | Linhas | `describe` blocks |
|---|---|---|---|---|
| `tests/unit/index.test.js` | UI / página | `BlogIndex` (componente hipotético) | 117 | 1 |
| `tests/unit/clean-test-db.test.js` | Script utilitário | `scripts/clean-test-db.js` | 51 | 1 |
| `tests/unit/settings.cache.test.js` | API + Cache | `lib/domain/settings.js` + Redis | 182 | 1 |
| `tests/unit/videos.validation.test.js` | API | `pages/api/admin/videos.js` | 131 | 2 |
| `tests/unit/hooks/useAdminCrud.test.js` | Hook | `hooks/useAdminCrud.js` | 84 | 1 |
| `tests/unit/domain/posts.test.js` | Domínio | `lib/domain/posts.js` | 157 | 1 (6 sub) |
| `tests/unit/domain/settings.test.js` | Domínio | `lib/domain/settings.js` | 108 | 1 (4 sub) |
| `tests/unit/domain/videos.test.js` | Domínio | `lib/domain/videos.js` | 134 | 1 (5 sub) |

---


#### Finalidade
Testar a renderização de uma página de listagem de posts do blog (componente `BlogIndex`).

#### Estrutura
- **Mocks:**
  - `../mocks/next-setup.js` (setup automático do Next.js — importado no topo).
  - `../styles/Blog.module.css` mockeado como objeto de chaves CSS.
  - O **próprio componente `BlogIndex` é redefinido inline** no arquivo de teste (linhas 25–68) — o teste **não** importa o componente real.

- **Testes (2 casos):**
  1. `deve renderizar o cabeçalho e a lista de posts corretamente` — renderiza com 2 posts, verifica títulos, excertos e links.
  2. `deve exibir mensagem amigável quando não houver posts` — renderiza com array vazio, verifica mensagem "Nenhum post publicado ainda."

#### Relações
- Depende indiretamente de `tests/mocks/next-setup.js`.
- Referencia `Blog.module.css` que não é rastreado no componente mock inline (usa classes hardcoded).

#### Problemas
- 🔴 **O componente real nunca é testado.** O `BlogIndex` é definido inline como um stub. Se o componente real evoluir, este teste nunca falhará por regressão — teste "fantasma".
- 🔴 **Referência a arquivo possivelmente inexistente.** O comentário na linha 24 diz explicitamente *"since the file doesn't exist"*. Este teste documenta um componente que ainda não foi implementado (ou foi removido).
- 🟡 **Cobertura de teste limitada.** Não testa:
  - Comportamento quando `posts` é `null`/`undefined` (só cobre `[]` e array preenchido).
  - Formatação de data (`toLocaleDateString('pt-BR')`) que pode variar por ambiente.
  - Props opcionais (componente não tem PropTypes ou TypeScript).

#### Melhorias / Sugestões
- 💡 **Se o componente ainda não existe:** converter este arquivo em um **teste de contrato** que falha com mensagem clara ("BlogIndex não implementado") ou remover até a implementação.
- 💡 **Se o componente existe:** importar o componente real de seu arquivo em vez de redefinir inline.
- 💡 Adicionar teste para `posts={undefined}` e verificar fallback.

---


#### Finalidade
Testar o script `scripts/clean-test-db.js` que remove arquivos de banco SQLite de teste (`test.db`, `caminhar-test.db`).

#### Estrutura
- **Mocks:** `fs` (módulo Node.js) mockeado com `existsSync` e `unlinkSync`.
- **Função testada:** `cleanTestDb` **redefinida inline** (linhas 16–24) — o teste **não** importa a função real do script.

- **Testes (2 casos):**
  1. `deve remover os arquivos de banco de dados de teste que existem` — mock `existsSync` → `true`, verifica `unlinkSync` chamado 2x.
  2. `não deve tentar remover arquivos que não existem` — mock `existsSync` → `false`, verifica que `unlinkSync` nunca é chamado.

#### Relações
- Espelha a lógica de `scripts/clean-test-db.js` (linhas 9–31).
- Depende do comportamento de `fs.existsSync` + `fs.unlinkSync`.

#### Problemas
- 🔴 **Código duplicado / dessincronizado.** A função `cleanTestDb` é redefinida inline com lógica própria. Se o script original for alterado (ex: novo banco adicionado ao `TARGET_DBS`), este teste não refletirá a mudança.
- 🔴 **O script original não é importável.** O comentário na linha 12 explica: *"Se o arquivo original executa a função diretamente, ele precisaria ser refatorado"*. O script em `scripts/clean-test-db.js` invoca `cleanTestDb()` diretamente no top-level (linha 34) e não exporta a função — impedindo importação para teste.
- 🟡 **Sem teste de erro.** O script original tem tratamento de erro (try/catch com `console.error`) que não é coberto.
- 🟡 **Sem teste de caminho.** Não valida se `dbPath` corresponde a `data/test.db`.

#### Melhorias / Sugestões
- 💡 **Refatorar `scripts/clean-test-db.js`** para exportar `cleanTestDb` e usar `require.main === module` pattern (como sugerido no comentário), permitindo importação no teste.
- 💡 Adicionar teste para o cenário de erro (permissão negada, `unlinkSync` lança exceção).
- 💡 Validar `dbPath` (ex: `expect(dbPath).toContain('data')`).

---


#### Finalidade
Testar a integração de cache (Redis) no endpoint de configurações — padrão Cache-Aside com invalidação.

#### Estrutura
- **Mocks:**
  - `lib/infra/db.js` (via `tests/mocks/db-module`).
  - `lib/auth/auth.js` (`getAuthToken`, `verifyToken`).
  - `lib/infra/redis.js` — mock manual com `Map` em memória (`store`), expondo `_store` e `_reset` para inspeção.
- **Handler:** Função `handler` **redefinida inline** (linhas 39–91) simulando lógica GET (com cache) + PUT (com invalidação).

- **Testes (3 casos):**
  1. `deve buscar do banco e salvar no cache na primeira requisição (Cache Miss)` — GET sem cache, verifica `db.getAllSettingsRaw` chamado + `redis.set` com TTL 1800.
  2. `deve buscar do cache e NÃO ir ao banco na segunda requisição (Cache Hit)` — 2 GETs consecutivos, verifica que DB não é chamado na 2ª.
  3. `deve invalidar o cache ao atualizar uma configuração (PUT)` — GET + PUT, verifica `redis.del` para chaves corretas.

#### Relações
- Espelha comportamento esperado de `pages/api/admin/settings.js` (ou similar).
- Usa `node-mocks-http` (`createMocks`) para simular requisições HTTP.

#### Problemas
- 🔴 **Handler redefinido inline, não importado.** Mesmo problema dos testes anteriores — o handler real não é testado.
- 🔴 **Redis mock "vaza" implementação interna.** O `_reset` + `_store` no mock precisa ser chamado explicitamente no `beforeEach` porque `resetMocks: true` no Jest reseta os mocks automaticamente. A linha 96–103 tem que reconfigurar os mocks manualmente a cada teste.
- 🟡 **TTL hardcoded na asserção.** `ex: 1800` é validado inline — se mudar a constante `SETTINGS_CACHE_TTL` no código real, o teste não avisa.
- 🟡 **Sem teste de erro 500.** O handler tem um `catch` genérico (linha 88–89) não coberto.
- 🟡 **Sem teste de auth falhando.** O mock de auth sempre retorna admin válido.

#### Melhorias / Sugestões
- 💡 Importar o handler real de `pages/api/admin/settings.js` (se existir) em vez de redefinir.
- 💡 Extrair TTL para constante compartilhada importada do código real.
- 💡 Adicionar teste de autenticação inválida (401).
- 💡 Adicionar teste de erro 500 (reject no DB).

---


#### Finalidade
Testar a validação de entrada (Zod schema) e mensagens de erro do endpoint `pages/api/admin/videos.js`, além da função utilitária `getValidationMessage`.

#### Estrutura
- **Mocks:**
  - `lib/auth/auth.js` (`withAuth` middleware).
  - `lib/domain/videos.js` (`createVideo`, `updateVideo`, etc.).
  - `lib/cache/cache.js` (`invalidateCache`, `checkRateLimit`).
- **Importação real:** O handler e `getValidationMessage` são importados de `pages/api/admin/videos.js`.

- **Testes (6 casos em 2 describe blocks):**
  - **"Validação de API de Vídeos — Limite de Caracteres":**
    1. `deve retornar erro 400 quando a descrição excede 500 caracteres (POST)`.
    2. `deve retornar erro 400 quando a descrição excede 500 caracteres (PUT)`.
    3. `deve permitir descrição com 500 caracteres exatos`.
    4. `deve retornar erro 404 ao tentar atualizar um vídeo inexistente`.
  - **"getValidationMessage - extração de mensagem de erro de validação":**
    5. `retorna a primeira mensagem de erro quando fieldErrors está preenchido`.
    6. `retorna o fallback quando fieldErrors está vazio (erro de nível raiz)`.

#### Relações
- Testa diretamente `pages/api/admin/videos.js` (handler real importado).
- Usa `createMocks` do `node-mocks-http`.

#### Problemas
- 🟡 **`beforeEach` vazio.** O bloco `beforeEach` na linha 32–33 está vazio — código morto ou placeholder esquecido.
- 🟡 **Sem teste de URL inválida.** O handler valida `youtubeUrlRegex` (linha 37 do handler), mas este teste não cobre o cenário.
- 🟡 **Sem teste de rate limiting.** O handler tem `rateLimit` config, mas o mock sempre retorna `false`.
- 🟡 **Sem teste de método HTTP inválido (405).**
- 🟡 **Dados de teste repetidos.** O mesmo `{ titulo, url_youtube, descricao }` é repetido em 3 testes — poderia usar `beforeEach` ou factory.

#### Melhorias / Sugestões
- 💡 Remover `beforeEach` vazio ou preenchê-lo com limpeza de mocks.
- 💡 Adicionar teste para `url_youtube` inválida (regex).
- 💡 Adicionar teste de método não permitido (405).
- 💡 Fatorar payload base em constante compartilhada.

---


#### Finalidade
Testar o comportamento de exclusão (`handleDelete`) do hook `useAdminCrud` — especificamente o envio de DELETE HTTP e a confirmação assíncrona via callback `onConfirmDelete`.

#### Estrutura
- **Mocks:**
  - `hooks/useApiFetch.js` (mock retorna dados vazios).
  - `react-hot-toast` (mocks para `success`, `error`, `loading`).
  - `global.fetch` via helper `mockGlobalFetch` (de `tests/helpers/index.js`).
- **Importação real:** O hook `useAdminCrud` é importado de `hooks/useAdminCrud.js`.

- **Testes (2 casos):**
  1. `deve enviar DELETE com Content-Type application/json e corpo { id }` — fluxo happy path: `onConfirmDelete` resolve `true`, fetch chamado corretamente, `toast.success` chamado.
  2. `deve abortar a exclusão quando onConfirmDelete resolve false` — `onConfirmDelete` resolve `false`, fetch não é chamado, toast não aparece.

#### Relações
- Testa `hooks/useAdminCrud.js` real (importado).
- Depende de `tests/helpers/index.js` → `tests/helpers/api.js` (para `mockGlobalFetch`).

#### Problemas
- 🟡 **`mockGlobalFetch` não encontrado.** O helper importado é `mockGlobalFetch` mas em `tests/helpers/api.js` não existe essa função (só `createApiMocks`, `createGetRequest`, etc.). A função `mockGlobalFetch` parece vir de outro arquivo (possivelmente `tests/helpers/crud-test.js` ou similar). Se não existir, este teste **falha em tempo de execução**.
- 🟡 **Cobertura mínima.** O hook tem muitas funcionalidades (`handleSubmit`, `toggleField`, `handleInputChange`, `handleEdit`, etc.) — apenas `handleDelete` é testada.
- 🟡 **`onConfirmDelete` não é realisticamente testado.** O mock retorna uma Promise resolvida imediatamente. Não testa cenários como: demora na confirmação, erro no callback, etc.
- 🔴 **`toast.loading` retorna `'toast-id'` fixo.** Se o código real usar IDs dinâmicos, o teste mascara problemas.

#### Melhorias / Sugestões
- 💡 Verificar existência de `mockGlobalFetch` e ajustar import.
- 💡 Expandir cobertura para `handleSubmit`, `toggleField`, `handleEdit`.
- 💡 Testar cenários de erro (fetch falha, `onConfirmDelete` lança exceção).
- 💡 Testar `window.confirm` fallback quando `onConfirmDelete` não é fornecido.

---


#### Finalidade
Testar as funções da camada de domínio `lib/domain/posts.js`: queries paginadas, CRUD completo e transações com auditoria.

#### Estrutura
- **Mocks:**
  - `lib/infra/db.js` (via `tests/mocks/db-module`).
  - `lib/crud/crud.js` (`createRecord`, `updateRecords`, `deleteRecords`, `raw`).
  - `lib/domain/audit.js` (`logActivity`).
- **Importação real:** Todas as funções de `lib/domain/posts.js`.

- **Testes (7 casos em 6 sub-describe):**
  1. `getRecentPosts` — cálculo de paginação (limit/offset/totalPages).
  2. `getRecentPosts` — filtros full-text (`plainto_tsquery`).
  3. `getPaginatedPosts` — ordenação por `position ASC, created_at DESC`.
  4. `getAllPosts` — query sem filtros.
  5. `createPost` — valores padrão (fallbacks para `null`/`false`/`0`).
  6. `updatePost` + `deletePost` — formatação e delegação ao CRUD.
  7. `createPostWithAudit` — transação com `client` compartilhado.

#### Relações
- Testa `lib/domain/posts.js` real (importado diretamente).
- Depende de `tests/mocks/db-module.js` para mock do banco.

#### Problemas
- 🟡 **Mock de `transaction` substitui implementação original.** O `beforeEach` redefine `transaction.mockImplementation` (linha 40–43) para passar um `fakeClient` — isso **não reflete o comportamento real** de `transaction` no `db.js` (que usa pool + BEGIN/COMMOCK/COMMIT/ROLLBACK). Testes passam mesmo se a lógica de transação real quebrar.
- 🟡 **`raw.mockImplementation` redefinido no `beforeEach`.** Se `resetMocks: true` está ativo (padrão), isso é necessário, mas a duplicação da lógica de mock em cada teste é frágil.
- 🟡 **Sem teste de rollback.** Se `logActivity` falha, a transação deveria dar rollback — não há teste para isso.
- 🟡 **Sem teste de concorrência.** `createPostWithAudit` abre transação, mas não testa isolamento.
- 🟡 **Dados de teste repetidos.** Objetos `mockPosts`/`postData` repetidos entre testes.

#### Melhorias / Sugestões
- 💡 Adicionar teste de rollback (rejection em `logActivity`).
- 💡 Testar `updatePost` sem campos (objeto vazio → não deve adicionar `updated_at`).
- 💡 Testar `deletePost` com ID inexistente (retorno `undefined`?).
- 💡 Fatorar dados de teste em factory.

---


#### Finalidade
Testar as funções da camada de domínio `lib/domain/settings.js`: CRUD de configurações do site.

#### Estrutura
- **Mocks:**
  - `lib/infra/db.js` (via `tests/mocks/db-module`).
  - `lib/crud/crud.js` (`upsertRecord`, `raw`).
- **Importação real:** Funções de `lib/domain/settings.js`.

- **Testes (4 casos em 4 sub-describe):**
  1. `getSetting` — retorna valor quando encontrado.
  2. `getSetting` — retorna valor padrão quando não encontrado.
  3. `getSettings` — agregação via `json_object_agg`.
  4. `updateSetting` — upsert com `CURRENT_TIMESTAMP` via `raw`.
  5. `getAllSettingsRaw` — retorno de array completo.

#### Relações
- Testa `lib/domain/settings.js` real.
- Depende de `tests/mocks/db-module.js`.

#### Problemas
- 🟡 **`raw` mock tem duas implementações diferentes** nos testes de domínio: em `posts.test.js` retorna `RAW(CURRENT_TIMESTAMP)` (string), em `videos.test.js` retorna `{ raw: true, value: val }` (objeto). Em `settings.test.js` usa `RAW(CURRENT_TIMESTAMP)` — consistente com posts, mas inconsistente com videos. Isso pode causar confusão.
- 🟡 **`beforeBody` redefine `raw.mockImplementation`** a cada teste (linha 27–28). Se `resetMocks: true`, é necessário, mas indica acoplamento com config do Jest.
- 🟡 **Sem teste de erro.** Nenhum mock de `reject` — não testa tratamento de exceções.
- 🟡 **Sem teste de concorrência no upsert.** `upsertRecord` pode ter race condition — não testado.

#### Melhorias / Sugestões
- 💡 Padronizar comportamento de `raw` em todos os testes (string vs objeto).
- 💡 Adicionar teste de erro (reject na query).
- 💡 Testar `updateSetting` sem `type` e `description` (opcionais).

---


#### Finalidade
Testar as funções da camada de domínio `lib/domain/videos.js`: CRUD de vídeos, paginação e reordenação.

#### Estrutura
- **Mocks:**
  - `lib/infra/db.js` (via `tests/mocks/db-module`).
  - `lib/crud/crud.js` (`createRecord`, `updateRecords`, `deleteRecords`, `raw`).
- **Importação real:** Funções de `lib/domain/videos.js`.

- **Testes (6 casos em 5 sub-describe):**
  1. `getPaginatedVideos` — cálculo de paginação sem busca.
  2. `getPaginatedVideos` — filtros de busca (`ILIKE`).
  3. `getPublicPaginatedVideos` — filtro `publicado = true`.
  4. `createVideo` — cálculo de posição (max + 1).
  5. `createVideo` — posição 1 quando tabela vazia.
  6. `updateVideo` + `deleteVideo` — delegação ao CRUD.
  7. `reorderVideos` — vazio = no-op; preenchido = updates em transação.

#### Relações
- Testa `lib/domain/videos.js` real.
- Depende de `tests/mocks/db-module.js`.

#### Problemas
- 🟡 **`raw` mock retorna objeto `{ raw: true, value: val }`** (linha 10), diferente de `posts.test.js` (retorna string `RAW(CURRENT_TIMESTAMP)`). Essa inconsistência pode causar confusão em manutenções futuras.
- 🟡 **`transaction` mock no `beforeEach`** substitui a implementação real — mesmo problema de `posts.test.js`.
- 🟡 **Sem teste de rollback em `reorderVideos`.** Se um dos updates falha, deve dar rollback — não testado.
- 🟡 **Sem teste de `getPublicPaginatedVideos` com busca vazia.**

#### Melhorias / Sugestões
- 💡 Padronizar `raw` mock com `posts.test.js` (string vs objeto).
- 💡 Adicionar teste de falha parcial em `reorderVideos` (Promise.allSettled com rejection).
- 💡 Testar `updateVideo` com objeto vazio (não deve adicionar `updated_at`).

---

## Padrões Transversais (Cross-cutting)

#### 🔴 Problemas Estruturais

| Problema | Arquivos afetados | Severidade |
|---|---|---|
| **Módulos alvo redefinidos inline** (teste não testa código real) | `index.test.js`, `clean-test-db.test.js`, `settings.cache.test.js` | Alta |
| **Importação de função não exportada** (script `clean-test-db.js`) | `clean-test-db.test.js` | Alta |
| **`mockGlobalFetch` possivelmente inexistente** | `useAdminCrud.test.js` | Alta |
| **Mock de `raw` inconsistente** entre arquivos | `posts.test.js` vs `videos.test.js` | Média |

#### 🟡 Oportunidades de Melhoria

| Oportunidade | Arquivos afetados |
|---|---|
| **`beforeBody` vazio ou redundante** | `clean-test-db.test.js`, `videos.validation.test.js` |
| **Sem teste de erro/rollback** | `posts.test.js`, `settings.test.js`, `videos.test.js`, `settings.cache.test.js` |
| **Dados de teste repetidos** (fatorar em factory) | Todos os testes de domínio |
| **Cobertura parcial de funcionalidades** | `useAdminCrud.test.js` (só testa `handleDelete`) |
| **TTL / constantes hardcoded** em asserções | `settings.cache.test.js` |

#### 🟢 Pontos Fortes

| Ponto forte | Arquivos |
|---|---|
| **Uso consistente de `tests/mocks/db-module.js`** | Todos os testes de domínio |
| **Testes de domínio importam o código real** | `posts.test.js`, `settings.test.js`, `videos.test.js`, `videos.validation.test.js`, `useAdminCrud.test.js` |
| **Granularidade adequada** (um `describe` por função) | Testes de domínio |
| **Uso de `node-mocks-http`** para testes de API | `videos.validation.test.js`, `settings.cache.test.js` |
| **Cobertura de cenários de edge case** (tabela vazia, position 1) | `videos.test.js` |

---

## Recomendações Prioritárias

1. **🔴 Corrigir testes fantasmas.** `index.test.js`, `clean-test-db.test.js` e `settings.cache.test.js` não testam o código real. Refatorar para importar os módulos alvo ou converter em testes de contrato/intenção.
2. **🔴 Garantir que `mockGlobalFetch` existe.** Verificar `tests/helpers/` e ajustar import em `useAdminCrud.test.js`.
3. **🟡 Padronizar mock de `raw`.** Escolher entre string (`RAW(...)`) ou objeto (`{ raw, value }`) e aplicar consistentemente.
4. **🟡 Adicionar testes de erro/rollback** nos testes de domínio — são cenários críticos para integridade de dados.
5. **🟡 Extrair dados de teste para factories** — reduz duplicação e facilita manutenção.
6. **🟡 Expandir cobertura de `useAdminCrud`** — testar `handleSubmit`, `toggleField`, etc.


---


## 9. Testes Unitários — Admin Components


O conjunto de testes da camada administrativa valida **14 arquivos** que cobrem:

- **1 HOC de autenticação** (`withAdminAuth`)
- **1 componente base genérico** (`AdminCrudBase`)
- **1 container de abas** (`AdminUsers`) + **2 abas filhas** (`AdminUsersTab`, `AdminRolesTab`)
- **5 CRUDs especializados** (`AdminMusicas`, `AdminVideos`, `AdminPosts`, `AdminProducts`, `AdminDicas`)
- **1 painel de estatísticas** (`AdminDashboard`)
- **1 tela de auditoria** (`AdminAudit`)
- **1 campo de formulário** (`ImageUploadField`)
- **1 barrel/index** (`index.js`)

Todos os testes seguem o padrão **Jest + @testing-library/react** e compartilham helpers centralizados em `tests/helpers/` e mocks de Next.js em `tests/mocks/next-setup.js`.

---

## Infraestrutura Compartilhada

#### `tests/helpers/index.js`
Exporta helpers de API, render, auth e console. O mais relevante é o `mockGlobalFetch`, que retorna um mock global de `fetch` com suporte a `mockRestore()`.

#### `tests/mocks/next-setup.js`
Centraliza mocks de `next/router`, `next/navigation`, `next/image`, `next/link`, `next/head`, `next/script`, `next/dynamic`, `next/headers` e `next/server`.  
**Nota:** Alguns testes sobrescrevem localmente o mock de `next/router` para expor `mockPush` ou `mockReload` — isso é intencional e documentado no código.

---


---

#### 1. `AdminAudit.test.js`

**Caminho:** `tests/unit/components/Admin/AdminAudit.test.js`  
**Componente testado:** `components/Admin/AdminAudit.js`

#### Finalidade
Validar o componente de auditoria de logs, que busca, filtra, exporta e pagina registros de ações administrativas.

#### Relações com outros módulos
- Usa `react-hot-toast` para notificações
- Usa `next/router` para reload após 401
- Importa `useUnauthorized` (chamado internamente pelo componente, não mockado — o teste simula o comportamento)
- Usa `exportToCSV` de `@/utils/csvExport`

#### Casos de teste (10 + subdescribe)

| Teste | O que valida |
|-------|--------------|
| Renderização + busca + paginação | Fetch inicial, exibição de dados, clique em "Próxima" |
| Filtro local pela barra de busca | Filtra itens por `action` |
| Exportar CSV escapando caracteres especiais | Blob + anchor click |
| 401 (Sessão Expirada) | `router.reload()` + toast |
| Resposta não-ok com JSON de erro | `toast.error` com mensagem da API |
| Resposta não-ok sem JSON | Fallback `Erro na API (500)` |
| Content-type inválido | Toast de JSON inválido |
| Fallbacks com data/pagination nulos e propriedades null | Mensagem "Nenhum registro" + filtro de nulls |
| Escape CSV (vírgulas, aspas, quebras de linha) | Validação de escape RFC 4180 |
| CSV sem caracteres especiais | Não aplica quotes |
| Exportar sem dados | Toast "Não há dados" |
| Botões Anterior/Próxima | Navegação bidirecional |

#### Problemas identificados

1. **Duplicação de lógica de exportação CSV** — O teste "deve exportar CSV escapando caracteres especiais" (linha 68) repete quase integralmente o teste "deve escapar corretamente valores no CSV" (linha 179). O primeiro poderia ser removido, pois o segundo é mais abrangente (testa vírgulas, aspas e quebras de linha).

2. **Spy de `document.createElement` parcial** — No teste da linha 68, o spy é criado com `document.createElement.bind(document)` mas depois não é restaurado (usa `jest.restoreAllMocks()` no final, o que é agressivo). Isso pode mascarar vazamentos de estado entre testes.

3. **Teste de paginação "Anterior e Próxima"** (linha 252) — Redundante com o teste de paginação inicial (linha 31), mas válido por testar explicitamente o botão "Anterior".

4. **Import de `waitFor`** do `@testing-library/react` não é usado em todos os testes que poderiam se beneficiar — alguns testes usam `waitFor` do RTL, outros usam `screen.getByText` diretamente após render, assumindo que o estado foi resolvido.

5. **Mock de `useUnauthorized`** — O componente chama `useUnauthorized(router, 500)` diretamente como função (linha 31 do AdminAudit.js), mas o hook é importado como named export. O teste não mocka isso explicitamente, confiando que o mock global de `next/router` será suficiente. Isso é frágil.

#### Sugestões de melhoria
- Remover o teste de CSV duplicado (linha 68)
- Criar um helper reutilizável para mock de exportação CSV (padrão aparece em AdminAudit, AdminCrudBase)
- Adicionar teste de erro de rede (fetch rejeita) — atualmente não coberto
- Adicionar teste de loading state durante paginação

---

#### 2. `AdminCrudBase.test.js`

**Caminho:** `tests/unit/components/Admin/AdminCrudBase.test.js`  
**Componente testado:** `components/Admin/AdminCrudBase.js`

#### Finalidade
Validar o componente base genérico de CRUD que é reutilizado por AdminMusicas, AdminVideos, AdminPosts, AdminProducts, AdminDicas, AdminUsersTab e AdminRolesTab.

#### Relações com outros módulos
- **Hook:** `useAdminCrud` (mockado completamente)
- **Componentes:** `Modal`, `Button` (mockados via `@/components/UI/*`)
- **Utilitários:** `exportToCSV` de `@/utils/csvExport`
- **Toast:** `react-hot-toast`
- **Zod:** `z` para schema validation
- **Subcomponentes internos:** `CrudForm`, `CrudTable` (não mockados, mas não testados diretamente aqui)

#### Casos de teste (25+)

| Teste | O que valida |
|-------|--------------|
| Renderização básica (título, contador, empty message) | Props padrão |
| Skeletons durante loading | CSS class `.skeleton-box` |
| Abrir formulário + submit | Fluxo de criação |
| Editar item | `handleEdit` chamado com item correto |
| Abrir modal de exclusão | `confirm-modal` testID |
| Confirmar exclusão (1 clique) | Promise resolvida com `true` |
| Cancelar exclusão (fechar modal) | Promise resolvida com `false` |
| SearchTerm para hook | `searchable=true` |
| Navegação entre páginas | Botões Anterior/Próxima |
| Toggle booleano (otimista) | `toggleField` com callbacks |
| Reverter toggle em falha | `onRevert` |
| Exportar CSV | Blob + anchor click |
| Erro sem dados para exportar | Toast |
| Erro genérico do hook | Toast + destaque de campo |
| Validação Zod (bloqueia customizada) | `customValidate` não chamado |
| Células customizadas (render, format, URLs) | `renderCustomCell`, `column.format` |
| `renderCustomFormField` | Campo custom + fallback para campo sem componente |
| Drag and Drop (reordenação) | `onReorder` chamado |
| `readOnly=true` | Oculta ações de formulário/edição |
| `onSuccess` callback | Disparado após sucesso |
| Scroll ao abrir formulário | `scrollIntoView` |
| `resetForm` antes de fechar (Cancelar) | Ordem de execução |
| Reverter reordenação em falha | Toast + ordem restaurada |
| Atualização otimista do toggle | Estado local atualizado |
| Reverter toggle sem afetar outros | Isolamento de estado |
| Validação customizada (sem Zod) | `validate` chamado |
| Mensagem de validação customizada | Propagação de erro + fallback |
| Cancelar exclusão pelo footer do modal | Botão Cancelar do Modal.Footer |
| Nome no singular com 1 item | `Total: 1 item` |

#### Problemas identificados

1. **Massa de teste extremamente grande** — 25+ testes em um único arquivo torna a manutenção difícil. O `AdminCrudBase.test.js` é o maior arquivo de teste do projeto (640 linhas). Deveria ser dividido por funcionalidade (ex: `crud-validation.test.js`, `crud-export.test.js`, `crud-reorder.test.js`).

2. **Duplicação de mock de CSV** — O padrão de criar `mockAnchor` + `linkClickSpy` + `jest.spyOn(document, 'createElement')` aparece aqui e em AdminAudit. Deveria ser extraído para um helper.

3. **Mock de Modal é simplificado demais** — O mock de `@/components/UI/Modal` (linha 22) cria um div com `data-testid` mas não simula o comportamento real de portal/fechamento. Isso pode esconder bugs de integração.

4. **Teste de "scroll" usa timers falsos** (linha 438-454) — `jest.useFakeTimers()` é usado corretamente, mas é frágil: se o componente mudar o delay de 50ms para outro valor, o teste quebra silenciosamente.

5. **Estado compartilhado entre testes** — O objeto `mockUseAdminCrud` é reutilizado e modificado em cada teste via `useAdminCrud.mockReturnValue({ ...mockUseAdminCrud, ... })`. Isso é correto (imutável), mas pode confundir desenvolvedores menos experientes.

6. **Import de `act` não usado consistentemente** — Em alguns testes, `act` é importado mas não chamado; em outros, é usado dentro de `waitFor`.

#### Sugestões de melhoria
- Extrair helper de mock CSV (`tests/helpers/csv-mock.js`)
- Dividir o arquivo em 3-4 arquivos menores por funcionalidade
- Adicionar teste de `error` com `error.errors` válidos + re-render
- Adicionar teste de `itemsPerPage` customizado
- Adicionar teste de `loading` durante submit (botão desabilitado)

---

#### 3. `AdminDashboard.test.js`

**Caminho:** `tests/unit/components/Admin/AdminDashboard.test.js`  
**Componente testado:** `components/Admin/AdminDashboard.js`

#### Finalidade
Validar o painel de estatísticas que exibe cards com contagens e gráfico de barras horizontal.

#### Casos de teste (3)

| Teste | O que valida |
|-------|--------------|
| Loading → dados + clique no card | Estatísticas, redirecionção de aba |
| Valores vazios/nulos | Fallbacks com 0 |
| Erro da API | Mensagem de erro |

#### Problemas identificados

1. **Cobertura mínima** — Apenas 3 testes para um componente de 213 linhas. Faltam testes para:
   - Cache em `sessionStorage`
   - Filtro por permissões (`userPermissions`)
   - Estado `isAdmin=false`
   - Indicadores de publicado/rascunho nos cards
   - Gráfico de barras (widthPercent)

2. **Mock de `sessionStorage.clear()` no beforeEach** — Correto, mas o teste nunca valida que o cache está sendo usado.

3. **Validação de "0" ambígua** — `screen.getAllByText('0').length` pode quebrar se o componente renderizar "0" em outro contexto.

#### Sugestões de melhoria
- Adicionar teste de cache hit (sessionStorage com dados válidos)
- Testar filtro de permissões (userPermissions vazio vs preenchido)
- Testar `isAdmin=false` sem permissões
- Testar indicadores de publicado/rascunho

---

#### 4. `AdminDicas.test.js`

**Caminho:** `tests/unit/components/Admin/AdminDicas.test.js`  
**Componente testado:** `components/Admin/AdminDicas.js`

#### Finalidade
Validar que o componente AdminDicas repassa as configurações corretas para o AdminCrudBase e que a coluna "content" formata/trunca corretamente.

#### Casos de teste (2)

| Teste | O que valida |
|-------|--------------|
| Renderização + props para CrudBase | title, apiEndpoint, itemNameSingular |
| Coluna content (truncate) | Texto curto, null, texto longo (>80 chars) |

#### Problemas identificados

1. **Teste mínimo mas eficaz** — Como o AdminDicas é apenas uma configuração sobre o AdminCrudBase (que já é testado extensivamente), 2 testes são suficientes. A abordagem de mockar o AdminCrudBase e verificar `passedProps` é correta.

2. **Sem teste de searchable** — O componente define `searchable={true}` mas isso não é validado.

3. **Sem teste de campos obrigatórios** — `required: true` nos campos não é testado diretamente.

#### Sugestões de melhoria
- Adicionar assertion para `searchable={true}`
- Adicionar assertion para `initialFormData`
- Testar que `fields` tem 3 itens (name, content, published)

---

#### 5. `AdminMusicas.test.js`

**Caminho:** `tests/unit/components/Admin/AdminMusicas.test.js`  
**Componente testado:** `components/Admin/AdminMusicas.js`

#### Finalidade
Validar o CRUD de músicas, incluindo integração com Spotify (botão "Puxar Dados"), coluna customizada com iframe, e reordenação.

#### Casos de teste (11)

| Teste | O que valida |
|-------|--------------|
| Renderização + props | title, apiEndpoint |
| Coluna Spotify (link + iframe) | URL e embed |
| Reordenar (PUT) | Sucesso e falha |
| renderCustomFormField (ignora padrão) | Retorna null para titulo |
| renderCustomFormField (url_spotify, link inválido) | Toast de erro |
| renderCustomFormField (gridColumn padrão) | `span 1` se omitido |
| Botão loading durante requisição | Estado "Buscando..." |
| renderCustomFormField (campo vazio) | String vazia |
| handleFetchSpotify (sucesso) | Preenche titulo + artista |
| handleFetchSpotify (erro da API) | Toast com mensagem |
| handleFetchSpotify (erro genérico) | Toast "Falha na busca." |

#### Problemas identificados

1. **Duplicação com AdminVideos e AdminProducts** — A estrutura de testes é quase idêntica para "Puxar Dados" (Spotify, YouTube, ML). Os testes de sucesso/erro/erro genérico seguem o mesmo padrão. Isso é um sinal de que um **teste parametrizado** ou **helper** seria benéfico.

2. **Mock de fetch com `mockImplementation`** — No teste de loading (linha 103-118), o fetch é mockado com `new Promise(resolve => { resolveApi = resolve; })`. Isso é correto mas frágil se a ordem de chamadas mudar.

3. **Sem teste de validação Zod** — O `musicaSchema` (titulo, artista, url_spotify obrigatórios) não é testado diretamente aqui.

4. **Sem teste de `exportable=true`** — O componente define `exportable={true}` mas não é testado.

#### Sugestões de melhoria
- Criar helper `testExternalDataButton()` para testar o padrão "Puxar Dados" em Spotify/YouTube/ML
- Adicionar teste de validação Zod (campo vazio)
- Adicionar teste de exportação CSV
- Testar iframe com URL do Spotify inválida

---

#### 6. `AdminPosts.test.js`

**Caminho:** `tests/unit/components/Admin/AdminPosts.test.js`  
**Componente testado:** `components/Admin/AdminPosts.js`

#### Finalidade
Validar o CRUD de posts, incluindo geração automática de slug, validação customizada (imagem obrigatória ao publicar), e formatação de dados na tabela.

#### Casos de teste (13)

| Teste | O que valida |
|-------|--------------|
| Renderização + props | title, apiEndpoint |
| Reordenar (PUT) | Sucesso e falha |
| validatePost (publicado sem imagem) | Erro |
| validatePost (casos válidos) | Sem erro |
| renderCustomFormField (slug) | Input com value + error |
| renderCustomFormField (title + blur → slug) | Gera slug automaticamente |
| renderCustomFormField (slug existente) | Não gera novo slug |
| renderCustomFormField (title vazio) | Não gera slug |
| renderCustomFormField (outros campos + fallback) | Retorna null |
| renderCustomFormField (sem error obj) | Renderiza normalmente |
| Coluna title (imagem + fallback) | Miniatura ou ausência |
| Coluna created_at | Formatação de data |
| Coluna title sem imagem | Sem `<img>` |

#### Problemas identificados

1. **Teste de geração de slug é o mais complexo do conjunto** — Os testes de `onBlur` (linhas 68-100) são bem escritos mas frágeis: dependem de `container.querySelector('input[name="title"]')` que pode quebrar se a estrutura do DOM mudar.

2. **Duplicação de "renderCustomFormField (outros campos + fallback)"** — O teste da linha 102 testa tanto `name: 'excerpt'` (retorna null) quanto `name: 'slug'` sem formData (fallback). Esses são dois casos de teste distintos.

3. **Sem teste de `onReorder` com PUT body** — O teste de reordenação valida o endpoint mas não valida o body da requisição (diferente de AdminMusicas e AdminVideos).

4. **Sem teste de validação Zod completa** — O `postSchema` tem regras para `title`, `slug`, `excerpt`, `content`, `image_url`, `published`. Apenas a validação customizada (`validate`) é testada.

#### Sugestões de melhoria
- Separar o teste de fallback (linha 102) em 2 testes distintos
- Adicionar assertion do body no teste de reordenação
- Adicionar teste de Zod com slug inválido (caracteres maiúsculos)
- Adicionar teste de `maxLength` no excerpt (500 chars)

---

#### 7. `AdminProducts.test.js`

**Caminho:** `tests/unit/components/Admin/AdminProducts.test.js`  
**Componente testado:** `components/Admin/AdminProducts.js`

#### Finalidade
Validar o CRUD de produtos com integração ao Mercado Livre (botão "Puxar Dados"), formatação de preço, e imagens em formato de carrossel (URLs separadas por `\n`).

#### Casos de teste (13)

| Teste | O que valida |
|-------|--------------|
| Renderização + props | title |
| Reordenar (PUT) | Sucesso e falha |
| renderCustomFormField (link + Puxar Dados) | Botão presente |
| renderCustomFormField (ignora outros + fallback) | null + gridColumn |
| handleFetchML (URL vazia) | Toast de erro |
| handleFetchML (sucesso) | Preenche name, price, description |
| handleFetchML (sem descrição) | Não chama setFieldValue('description') |
| handleFetchML (erro da API) | Toast com mensagem |
| handleFetchML (erro genérico) | Toast "Falha na busca." |
| Botão loading | Estado "Buscando..." |
| Coluna image_preview | Imagem principal ou "Sem foto" |
| Coluna link | Ícone ou "-" |
| CheckboxWrapper (published) | Toggle de status |

#### Problemas identificados

1. **Duplicação massiva com AdminMusicas** — A estrutura de `handleFetchML` é praticamente idêntica à `handleFetchSpotify` e `handleFetchYoutube`. O padrão de teste (sucesso/erro/erro genérico/loading) é o mesmo.

2. **CheckboxWrapper testado de forma indireta** — O teste de "published" (linha 191-203) acessa `passedProps.fields.find(f => f.name === 'published').component`, o que é frágil se a ordem dos campos mudar.

3. **Preço formatado como string** — O componente formata preço como `R$ 99,90` (string), mas a validação Zod espera `z.string()`. O teste valida `setFieldValue('price', '99.90')` com ponto, não vírgula. Isso é inconsistente com o formato exibido.

4. **Sem teste de validação Zod** — `productSchema` tem regras para `name`, `image_url`, `price`, `link` (URL). Não testado aqui.

#### Sugestões de melhoria
- Criar helper compartilhado para testes de "ExternalDataButton"
- Adicionar teste de validação Zod
- Consistência no formato de preço (ponto vs vírgula)
- Adicionar teste de `initialFormData.published=true` (padrão é true para produtos)

---

#### 8. `AdminRolesTab.test.js`

**Caminho:** `tests/unit/components/Admin/AdminRolesTab.test.js`  
**Componente testado:** `components/Admin/AdminRolesTab.js`

#### Finalidade
Validar a aba de gestão de cargos/permissões, incluindo o componente customizado `PermissionsSelectField` e a normalização de permissões legadas.

#### Casos de teste (3)

| Teste | O que valida |
|-------|--------------|
| Props para CrudBase | title, apiEndpoint |
| PermissionsSelectField (adicionar/remover) | Toggle de checkboxes |
| PermissionsSelectField (array nulo + erro) | Fallback + exibição de erro |
| Colunas (normalização de permissões) | "Dicas" → "Gestão de Dicas", inválida filtrada |

#### Problemas identificados

1. **Teste conciso e eficaz** — Cobre os casos principais sem redundância.

2. **Sem teste de validação Zod** — O `roleSchema` exige `name` (min 2 chars) e `permissions` (min 1 item). Não testado aqui.

3. **Sem teste de `initialFormData`** — O componente define `permissions: []` como inicial.

4. **Normalização de "Dicas" para "Gestão de Dicas"** — Este é o único teste que valida a migração de dados legados. É importante e está bem testado.

#### Sugestões de melhoria
- Adicionar teste de validação Zod (nome muito curto, sem permissões)
- Adicionar teste de `initialFormData`

---

#### 9. `AdminUsers.test.js`

**Caminho:** `tests/unit/components/Admin/AdminUsers.test.js`  
**Componente testado:** `components/Admin/AdminUsers.js`

#### Finalidade
Validar o container de abas que alterna entre `AdminUsersTab` e `AdminRolesTab`, com lazy loading.

#### Casos de teste (2)

| Teste | O que valida |
|-------|--------------|
| Renderização padrão (users-tab) | Aba users ativa, roles não presente |
| Alternar para roles | Clique no botão "Gestão de Cargos" |

#### Problemas identificados

1. **Teste mínimo mas suficiente** — Como o AdminUsers é apenas um container de abas com lazy loading, 2 testes são suficientes.

2. **Lazy loading não testado diretamente** — O `Suspense` com fallback não é testado. O teste assume que o lazy load resolve instantaneamente.

3. **Sem teste de navegação por teclado** — O `handleKeyDown` (ArrowLeft/ArrowRight) não é testado.

#### Sugestões de melhoria
- Adicionar teste de teclado (ArrowRight alterna aba)
- Adicionar teste de Suspense fallback (loading state)

---

#### 10. `AdminUsersTab.test.js`

**Caminho:** `tests/unit/components/Admin/AdminUsersTab.test.js`  
**Componente testado:** `components/Admin/AdminUsersTab.js`

#### Finalidade
Validar a aba de usuários, incluindo validação de senha, formatação de último login, e o componente customizado `RoleSelectField` que busca cargos dinamicamente da API.

#### Casos de teste (10 + subdescribe)

| Teste | O que valida |
|-------|--------------|
| Props para CrudBase | title, apiEndpoint |
| validateUser (novo usuário, senha obrigatória) | Erros |
| validateUser (edição, nova senha) | Validação condicional |
| formatLastLogin (nula + inválida) | Fallbacks |
| RoleSelectField (carrega da API) | Opções dinâmicas |
| RoleSelectField (lista vazia → fallbacks) | "Administrador (Padrão)" |
| RoleSelectField (401) | Toast de sessão expirada |
| RoleSelectField (erro da API) | Toast com mensagem |
| RoleSelectField (erro sem JSON) | Fallback "Erro na API (500)" |
| RoleSelectField (JSON inválido) | Toast de JSON inválido |
| RoleSelectField (dados envelopados) | `{ data: [...] }` |
| Casos de Borda (formatLastLogin + validações) | Cobertura de ramificações |

#### Problemas identificados

1. **Teste de RoleSelectField é o mais completo do conjunto** — Cobre todos os cenários de erro da API (401, erro com mensagem, erro sem JSON, JSON inválido, dados envelopados). Isso é excelente.

2. **Duplicação de testes de validação** — O subdescribe "Casos de Borda" (linha 180-206) repete testes de `validateUser` que já foram feitos nos testes principais (linhas 46-60). Isso é redundante.

3. **Cache de roles não testado** — O componente usa `sessionStorage` para cachear roles (5 minutos), mas o teste limpa o cache no `beforeEach` e nunca valida o hit de cache.

4. **Sem teste de `searchable=false`** — O componente define `searchable={false}` mas isso não é validado.

5. **Mock de `next/router` local** — O teste sobrescreve o mock global de `next/router` para expor `mockReload`. Isso é intencional mas pode causar confusão.

#### Sugestões de melhoria
- Remover testes redundantes no subdescribe "Casos de Borda"
- Adicionar teste de cache hit (sessionStorage com roles válidos)
- Adicionar teste de `searchable={false}`
- Adicionar teste de `initialFormData`

---

#### 11. `AdminVideos.test.js`

**Caminho:** `tests/unit/components/Admin/AdminVideos.test.js`  
**Componente testado:** `components/Admin/AdminVideos.js`

#### Finalidade
Validar o CRUD de vídeos, incluindo integração com YouTube (botão "Puxar Dados"), coluna customizada com iframe, e reordenação.

#### Casos de teste (13)

| Teste | O que valida |
|-------|--------------|
| Renderização + props | title, apiEndpoint |
| Coluna YouTube (link + iframe) | URL e embed |
| Iframe com URL inválida | Não renderiza |
| Iframe com URL nula/vazia | Não renderiza |
| Coluna título (thumbnail) | Miniatura |
| Reordenar (PUT) | Sucesso e falha |
| renderCustomFormField (ignora padrão) | null |
| renderCustomFormField (url_youtube, link inválido) | Toast |
| renderCustomFormField (gridColumn padrão) | `span 1` |
| Botão loading | "Buscando..." |
| renderCustomFormField (campo vazio) | String vazia |
| handleFetchYoutube (sucesso) | Preenche titulo |
| handleFetchYoutube (erro da API) | Toast |
| handleFetchYoutube (erro genérico) | Toast "Falha na busca." |

#### Problemas identificados

1. **Duplicação quase idêntica com AdminMusicas** — A estrutura é a mesma, mudando apenas "Spotify" → "YouTube" e "url_spotify" → "url_youtube". Isso é um forte candidato a teste parametrizado.

2. **Sem teste de validação Zod** — O `videoSchema` tem regras para `titulo`, `url_youtube`, `descricao` (max 500), `thumbnail`. Não testado.

3. **Sem teste de `usePagination=true`** — O componente define paginação, mas o teste não valida isso diretamente.

4. **Iframe usa `LazyIframe`** — O componente real usa `LazyIframe` de `@/components/Performance/LazyIframe`, mas o teste não mocka isso. O mock de `data-testid="embed-iframe"` é suficiente para o teste, mas esconde a integração real.

#### Sugestões de melhoria
- Criar helper compartilhado para testes de "ExternalDataButton"
- Adicionar teste de validação Zod
- Adicionar teste de paginação
- Testar iframe com URL `youtu.be` (formato curto)

---

#### 12. `ImageUploadField.test.js`

**Caminho:** `tests/unit/components/Admin/ImageUploadField.test.js`  
**Componente testado:** `components/Admin/fields/ImageUploadField.js`

#### Finalidade
Validar o campo de upload de imagem, incluindo preview, upload padrão via fetch, handler customizado (`onUpload`), e tratamento de erros.

#### Casos de teste (6)

| Teste | O que valida |
|-------|--------------|
| Renderização + preview | Label, imagem, hint |
| Erro via prop | Mensagem de erro |
| Upload padrão (fetch) | Sucesso → onChange |
| Upload padrão (falha) | Toast de erro |
| Handler customizado (onUpload) | Chama onUpload(file, uploadType) |
| Sem arquivo selecionado | Ignora mudança |
| Fallback de erro silencioso (sem JSON) | Toast "Erro 500: Falha no upload" |

#### Problemas identificados

1. **Teste bem estruturado** — Cobre os cenários principais sem redundância.

2. **Mock de `console.error`** — O componente chama `console.error('Erro no upload:', err)` em caso de falha. O teste espia `console.error` mas não valida a mensagem. Isso é intencional (evitar log poluído), mas poderia ser mais explícito.

3. **Sem teste de `uploadEndpoint` customizado** — O componente aceita `uploadEndpoint` como prop, mas o teste sempre usa o padrão `/api/upload-image`.

4. **Sem teste de `required=true`** — O componente renderiza `*` quando `required`, mas isso não é testado.

5. **Sem teste de `disabled` durante upload** — O botão de upload é desabilitado durante o upload, mas isso não é validado.

#### Sugestões de melhoria
- Adicionar teste de `uploadEndpoint` customizado
- Adicionar teste de `required=true` (asterisco no label)
- Adicionar teste de `disabled` durante upload
- Adicionar teste de `accept="image/*"` no input file

---

#### 13. `withAdminAuth.test.js`

**Caminho:** `tests/unit/components/Admin/withAdminAuth.test.js`  
**Componente testado:** `components/Admin/withAdminAuth.js`

#### Finalidade
Validar o HOC de autenticação que protege páginas administrativas, incluindo verificação de sessão, formulário de login, logout, e tratamento de erros de rede.

#### Relações com outros módulos
- **Hook:** `useAdminAuth` de `@/hooks`
- **Provider:** `AuthProvider` de `@/hooks/AuthProvider`
- **Next.js:** `next/head`, `next/router`

#### Casos de teste (7)

| Teste | O que valida |
|-------|--------------|
| Tela de verificação (loading) | "Verificando autenticação..." |
| Formulário de login (não autenticado) | Inputs de usuário/senha |
| Erro no login (credenciais falham) | Mensagem de erro |
| Erro genérico (sem mensagem da API) | "Falha no login" |
| Login com sucesso | Componente protegido + botão Sair |
| Logout | Fetch `/api/auth/logout` + redirect |
| Exceção de rede no checkAuth | Silencioso → formulário de login |

#### Problemas identificados

1. **Teste de integração com AuthProvider real** — O teste renderiza o componente envolto no `AuthProvider` real (não mockado). Isso é excelente para validar o fluxo completo, mas torna os testes mais lentos e frágeis.

2. **Mock de `next/head` local** — O teste sobrescreve o mock global de `next/head` para retornar um `div` com `data-testid`. Isso é necessário porque o componente usa `next/head` para o título da página.

3. **Sem teste de `title` no `<Head>`** — O componente recebe `title` como opção e deveria renderizá-lo no `<head>`, mas o teste não valida isso.

4. **Sem teste de `loginLoading`** — O estado de loading durante o login ("Entrando...") é testado indiretamente, mas não há assertion explícita de que o botão está desabilitado durante o loading.

5. **Sem teste de `onLogoutRedirect`** — O componente passa `onLogoutRedirect: () => router.push('/admin')` para o hook, mas o teste não valida que o redirect é chamado após o logout.

#### Sugestões de melhoria
- Adicionar teste de `title` no `<Head>` (verificar se o título aparece)
- Adicionar teste de `loginLoading` (botão desabilitado)
- Adicionar teste de `onLogoutRedirect`
- Adicionar teste de "Sair" com falha no logout

---

#### 14. `index.test.js`

**Caminho:** `tests/unit/components/Admin/index.test.js`  
**Componente testado:** `components/Admin/index.js` (barrel)

#### Finalidade
Validar que o barrel (index) exporta todos os componentes esperados e que o `AdminCrudBase` está definido.

#### Casos de teste (2)

| Teste | O que valida |
|-------|--------------|
| Snapshot das exportações | `Object.keys(AdminComponents).sort()` |
| AdminCrudBase definido | `toBeDefined()` |

#### Problemas identificados

1. **Snapshot pode desatualizar silenciosamente** — Se um novo componente for adicionado ao barrel, o snapshot precisa ser atualizado manualmente (`--updateSnapshot`). O comentário no topo do arquivo alerta sobre isso.

2. **Snapshot atual** — O snapshot lista 10 exportações: `AdminCrudBase`, `AdminMusicasNew`, `AdminVideosNew`, `AdminPostsNew`, `ExternalDataButton`, `ImageUploadField`, `TextAreaField`, `TextField`, `ToggleField`, `UrlField`.

3. **Sem teste de `AdminDicas`** — O barrel não exporta `AdminDicas` diretamente (ele é usado internamente, não via barrel). Isso é intencional, mas pode confundir.

4. **Sem teste de `AdminAudit`** — O barrel não exporta `AdminAudit`. Isso é intencional (AdminAudit é standalone).

#### Sugestões de melhoria
- Adicionar comentário no snapshot listando o que cada exportação representa
- Considerar teste de "não exporta X" para evitar exports acidentais

---

## Padrões Transversais

#### Padrão 1: Mock de AdminCrudBase com `passedProps`
Usado em: AdminDicas, AdminMusicas, AdminPosts, AdminProducts, AdminRolesTab, AdminUsersTab, AdminVideos.

```js
let passedProps;
jest.mock('../../../../components/Admin/AdminCrudBase', () => {
  return function MockAdminCrudBase(props) {
    passedProps = props;
    return <div data-testid="mock-crud">Mock CRUD</div>;
  };
});
```

**Vantagem:** Permite testar a configuração sem depender do comportamento real do CrudBase.  
**Desvantagem:** Se o CrudBase mudar sua API, os testes não detectarão quebras de integração.

#### Padrão 2: Mock de exportação CSV
Usado em: AdminAudit, AdminCrudBase.

```js
const mockAnchor = document.createElement('a');
const linkClickSpy = jest.spyOn(mockAnchor, 'click').mockImplementation(() => {});
jest.spyOn(document, 'createElement').mockImplementation((tagName) => 
  tagName === 'a' ? mockAnchor : originalCreateElement(tagName)
);
```

**Problema:** Duplicado em 2 arquivos. Deveria ser extraído para helper.

#### Padrão 3: Mock de fetch com `mockResolvedValueOnce` em cadeia
Usado em: AdminAudit, AdminMusicas, AdminPosts, AdminProducts, AdminVideos, AdminUsersTab.

```js
global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ... }) });
global.fetch.mockResolvedValueOnce({ ok: false });
```

**Vantagem:** Simula múltiplas chamadas sequenciais.  
**Desvantagem:** Frágil se a ordem de chamadas mudar.

#### Padrão 4: `mockGlobalFetch` helper
Usado em: Todos os testes que fazem fetch.

```js
import { mockGlobalFetch } from '../../../helpers/index.js';
// ...
fetchMock = mockGlobalFetch();
// ...
fetchMock?.mockRestore();
```

**Vantagem:** Centraliza o mock de fetch.  
**Desvantagem:** O `?.` opcional no `mockRestore` pode esconder erros se o mock não for criado.

---

## Duplicações e Código Morto

#### Duplicações identificadas

1. **Mock de CSV** — Aparece em `AdminAudit.test.js` (linha 68-83) e `AdminCrudBase.test.js` (linha 301-321). Deveria ser extraído para `tests/helpers/csv-mock.js`.

2. **Testes de "Puxar Dados"** — Aparecem em `AdminMusicas.test.js`, `AdminVideos.test.js`, `AdminProducts.test.js` com estrutura idêntica (sucesso/erro/erro genérico/loading). Deveria ser extraído para helper parametrizado.

3. **Testes de reordenação** — Aparecem em `AdminMusicas.test.js`, `AdminPosts.test.js`, `AdminProducts.test.js`, `AdminVideos.test.js` com estrutura similar (PUT com body `{ action: 'reorder', items: [...] }`).

4. **Testes de validação de senha** — Em `AdminUsersTab.test.js`, os testes de `validateUser` aparecem duas vezes (linhas 46-60 e 191-205).

5. **Testes de paginação** — Em `AdminAudit.test.js`, o teste de paginação inicial (linha 31) e o teste "Anterior e Próxima" (linha 252) são redundantes.

#### Código morto / Não utilizado

1. **Import de `act` em AdminCrudBase.test.js** — `act` é importado mas não usado em todos os testes. Em alguns, é usado dentro de `waitFor`; em outros, é chamado diretamente.

2. **Import de `within` em AdminCrudBase.test.js** — `within` é importado do RTL mas usado apenas em um teste (linha 623).

3. **Import de `afterEach` em AdminCrudBase.test.js** — `afterEach` é declarado mas apenas restaura mocks. Se o `mockGlobalFetch` já tem `mockRestore`, o `afterEach` é redundante.

4. **Import de `beforeEach` em AdminUsers.test.js** — Não há `beforeEach` declarado, mas o teste usa `screen.findByTestId` que é async. Isso é correto, mas pode confundir.

---

## Métricas de Cobertura Estimadas

| Arquivo de teste | Testes | Linhas | Complexidade |
|------------------|--------|--------|--------------|
| AdminAudit.test.js | 10 | 285 | Alta (múltiplos mocks de fetch) |
| AdminCrudBase.test.js | 25+ | 640 | Muito Alta (mock de hook + UI) |
| AdminDashboard.test.js | 3 | 60 | Baixa |
| AdminDicas.test.js | 2 | 38 | Baixa |
| AdminMusicas.test.js | 11 | 165 | Média |
| AdminPosts.test.js | 13 | 134 | Média |
| AdminProducts.test.js | 13 | 204 | Média |
| AdminRolesTab.test.js | 3 | 56 | Baixa |
| AdminUsers.test.js | 2 | 32 | Baixa |
| AdminUsersTab.test.js | 10 | 207 | Alta (RoleSelectField) |
| AdminVideos.test.js | 13 | 195 | Média |
| ImageUploadField.test.js | 6 | 120 | Média |
| withAdminAuth.test.js | 7 | 147 | Alta (integração com AuthProvider) |
| index.test.js | 2 | 14 | Baixa |
| **Total** | **~120** | **~2197** | |

---

## Recomendações Prioritárias

#### 1. Extrair helpers de teste (Alta prioridade)
- `tests/helpers/csv-mock.js` — Mock reutilizável de exportação CSV
- `tests/helpers/external-data-mock.js` — Teste parametrizado de "Puxar Dados"
- `tests/helpers/reorder-mock.js` — Teste parametrizado de reordenação

#### 2. Reduzir duplicação (Alta prioridade)
- Remover testes redundantes em AdminUsersTab.test.js (subdescribe "Casos de Borda")
- Remover teste de CSV duplicado em AdminAudit.test.js (linha 68)
- Consolidar testes de paginação em AdminAudit.test.js

#### 3. Aumentar cobertura (Média prioridade)
- AdminDashboard: Adicionar testes de cache, permissões, indicadores
- AdminMusicas/AdminVideos/AdminProducts: Adicionar testes de validação Zod
- AdminRolesTab: Adicionar testes de validação Zod
- ImageUploadField: Adicionar testes de `required`, `uploadEndpoint` customizado
- withAdminAuth: Adicionar teste de `title` no `<Head>`

#### 4. Refatorar arquivos grandes (Média prioridade)
- Dividir `AdminCrudBase.test.js` em 3-4 arquivos menores
- Dividir `AdminAudit.test.js` em 2 arquivos (testes principais + casos de borda)

#### 5. Melhorar robustez (Baixa prioridade)
- Substituir `jest.restoreAllMocks()` por restauração explícita de spies
- Adicionar testes de erro de rede (fetch rejeita) em todos os componentes
- Adicionar testes de loading state durante submit

---

## Dependências Externas dos Testes

| Dependência | Usada em |
|-------------|----------|
| `@testing-library/react` | Todos |
| `@jest/globals` | Todos |
| `react-hot-toast` | AdminAudit, AdminCrudBase, AdminMusicas, AdminPosts, AdminProducts, AdminUsersTab, AdminVideos, ImageUploadField |
| `next/router` | AdminAudit, AdminUsersTab, withAdminAuth |
| `next/head` | withAdminAuth |
| `@/components/UI/Modal` | AdminCrudBase |
| `@/components/UI/Button` | AdminCrudBase |
| `@/hooks/useAdminCrud` | AdminCrudBase |
| `@/hooks/AuthProvider` | withAdminAuth |
| `zod` | AdminCrudBase |

---

## Conclusão

O conjunto de testes do painel administrativo é **abrangente e bem estruturado**, com ~120 testes cobrindo os principais fluxos dos 14 componentes. Os pontos fortes são:

- Uso consistente de helpers centralizados (`mockGlobalFetch`, `next-setup.js`)
- Testes de integração real com `AuthProvider` no `withAdminAuth`
- Cobertura de casos de borda (401, JSON inválido, erros de rede)
- Padrão de mock de `AdminCrudBase` com `passedProps` para testar configuração

Os pontos de melhoria são:

- **Duplicação** de lógica de teste (CSV, ExternalDataButton, reordenação)
- **Arquivos grandes** que dificultam manutenção (`AdminCrudBase.test.js`)
- **Cobertura insuficiente** em alguns componentes (AdminDashboard, AdminDicas)
- **Testes redundantes** em `AdminUsersTab.test.js`

Com as melhorias propostas, o conjunto pode se tornar mais manutenível e robusto sem perder cobertura.


---


## 10. Testes Unitários — Admin Tools, Managers e Componentes Misc

## Índice

1. [Visão Geral](#visao-geral)
2. [BackupManager.test.js](#backupmanagertestjs)
3. [CacheManager.test.js](#cachemanagertestjs)
4. [TextAreaField.test.js](#textareafieldtestjs)
5. [TextField.test.js](#textfieldtestjs)
6. [ToggleField.test.js](#togglefieldtestjs)
7. [IntegrityCheck.test.js](#integritychecktestjs)
8. [RateLimitViewer.test.js](#ratelimitviewertestjs)
9. [UrlField.test.js](#urlfieldtestjs)
10. [Header.test.js](#headertestjs)
11. [SeoPerformance.test.js](#seoperformancetestjs)
12. [Header.test.js.snap — Snapshot](#headertestjssnap--snapshot)
13. [Cruzamento: Duplicações e Padrões](#cruzamento-duplicacoes-e-padroes)
14. [Problemas Consolidados](#problemas-consolidados)
15. [Recomendações de Melhorias](#recomendacoes-de-melhorias)

---


Os testes cobrem três eixos do painel administrativo do Caminhar:

| Eixo | Arquivos | Componentes sob teste |
|------|----------|----------------------|
| **Managers** | 2 | `BackupManager`, `CacheManager` — painéis com CRUD via API + modais de confirmação |
| **Tools** | 2 | `IntegrityCheck`, `RateLimitViewer` — dashboards de monitoramento com auto-refresh |
| **Fields** | 4 | `TextField`, `TextAreaField`, `ToggleField`, `UrlField` — campos de formulário reutilizáveis |
| **Misc** | 3 | `Header`, `SeoPerformance` + snapshot — componentes de layout/SEO |

---

## BackupManager.test.js

**Caminho:** `tests/unit/components/Admin/Managers/BackupManager.test.js`  
**Linhas:** 114  
**Componente:** `components/Admin/Managers/BackupManager.js`

#### Finalidade

Valida o painel de gerenciamento de backups: listagem do último backup, criação de novo backup com modal de confirmação, e tratamento de erros de rede e da API.

#### Escopo dos Testes

| # | Teste | Tipo |
|---|-------|------|
| 1 | Carregar e exibir info do último backup no mount | Happy path (GET) |
| 2 | Exibir fallback "Nenhum backup encontrado" quando `latest: null` | Edge case |
| 3 | Lidar com erro de rede na busca inicial (catch) | Error path |
| 4 | Abortar criação de backup se usuário cancelar confirmação | UI/Fluxo |
| 5 | Criar backup com sucesso e recarregar lista | Happy path (POST) |
| 6 | Exibir erro de conexão ao criar backup (rejeição) | Error path |
| 7 | Exibir erro quando API retorna `ok: false` | Error path |

#### Relações

- **Helpers compartilhados:** `suppressConsoleError()`, `mockGlobalFetch()` de `tests/helpers/index.js`
- **APIs cobertas:** `GET /api/admin/backup`, `POST /api/admin/backup`
- **Padrão de confirmação:** Modal com botões "Cancelar" / "Confirmar" — padrão compartilhado com `CacheManager`

#### Problemas Identificados

1. **Duplicação de setup entre testes 1 e 5:** Ambos configuram `mockResolvedValueOnce({ ok: true, json: async () => ({ latest: null }) })` + sequência de POST + reload. O teste 5 poderia reutilizar um helper `setupBackupCreateSuccess()`.

2. **Verificação de estado de loading incompleta:** O teste 5 verifica botão "Criando Backup" desabilitado mas não verifica se o estado de loading é limpo após sucesso. Falta asserção de `queryByText('Criando Backup')` desaparecer.

3. **Timeout implícito em `waitFor`:** Não há configuração explícita de timeout — depende do padrão do Jest (5s), que pode ser insuficiente em CI lento.

4. **Teste 6 e 7 têm setup idêntico:** Ambos iniciam com `latest: null` e mockam `Realizar Backup Agora` → `Confirmar`. Deveriam compartilhar helper.

#### Melhorias Sugeridas

- Extrair `createBackupFlow()` helper que faz o clique no botão + confirmação
- Adicionar teste de desmonte durante request (cleanup de AbortController)
- Verificar se `console.error` NÃO é chamado em caminhos de sucesso

---

## CacheManager.test.js

**Caminho:** `tests/unit/components/Admin/Managers/CacheManager.test.js`  
**Linhas:** 120  
**Componente:** `components/Admin/Managers/CacheManager.js`

#### Finalidade

Testa o painel de limpeza de cache Redis: renderização, confirmação via modal, toasts de sucesso/erro, e falhas de rede.

#### Escopo dos Testes

| # | Teste | Tipo |
|---|-------|------|
| 1 | Renderizar painel e botão corretamente | Smoke test |
| 2 | Abortar se usuário cancelar confirmação | UI/Fluxo |
| 3 | Chamar API e exibir Toast de sucesso | Happy path (POST) |
| 4 | Toast de erro da API com fallback | Error path |
| 5 | Capturar falhas de rede (catch) | Error path |

#### Relações

- **Mock externo:** `react-hot-toast` (mock manual com `jest.mock`)
- **Padrão de modal:** Mesmo padrão do `BackupManager` (Cancelar/Confirmar)
- **Auto-refresh:** Não testado — componente pode ter polling mas não é coberto

#### Problemas Identificados

1. **Toast ID hardcoded:** `toast.loading.mockReturnValue('id_toast_123')` assume que o componente usa o ID retornado pelo toast.loading para os toast.success/error subsequentes. Se o componente real não usar este padrão, o teste falso-positivo.

2. **Teste 4 tem duas interações sequenciais:** Dois cliques em "Limpar Cache" no mesmo render sem rerender. Isso pode mascarar problemas de estado residual.

3. **Falta teste de rede com fetch pendente:** Diferente do IntegrityCheck e RateLimitViewer, não há teste que deixe o fetch pendente para verificar estado de loading.

4. **Estado do painel inicial mockado no beforeEach:** O `beforeEach` mocka automaticamente a resposta de status do cache. Se o teste 1 (smoke test) rodar, o fetch já aconteceu — pode mascarar problemas de timing.

#### Código Morto Potencial

- A variável `consoleErrorSpy` é criada em `beforeEach` mas o spy é restaurado em `afterEach`. Em todos os testes exceto os de erro, o spy não é usado — é um padrão de segurança, mas gera overhead de criação/destruição.

#### Melhorias Sugeridas

- Adicionar teste de "Atualizando..." durante request pendente
- Testar cenário de toggle de visibilidade do painel (se existir)
- Verificar se o botão "Limpar Cache" fica disabled durante loading

---

## TextAreaField.test.js

**Caminho:** `tests/unit/components/Admin/fields/TextAreaField.test.js`  
**Linhas:** 41  
**Componente:** `components/Admin/fields/TextAreaField.js`

#### Finalidade

Testa o componente de campo de texto longo: renderização, label obrigatório, contador de caracteres, hints, erros, e normalização de valor nulo.

#### Escopo dos Testes

| # | Teste | Tipo |
|---|-------|------|
| 1 | Renderizar com label, required e contador de caracteres | Happy path |
| 2 | Renderizar erro e hint (toggle) | Edge case |
| 3 | Repassar fallback de rows (padrão 3) | Default |
| 4 | Normalizar value null para string vazia | Edge case |

#### Relações

- **Padrão compartilhado:** Mesmo padrão de `TextField.test.js` (ver próxima seção)
- **Hierarquia:** Campo base usado em formulários Admin

#### Problemas Identificados

1. **Teste de contador frágil:** `expect(screen.getByText('5 / 100 caracteres'))` assume exato formato. Mudança na string de formatação (ex: "5/100") quebra o teste sem motivo funcional.

2. **Teste 4 inconsistente:** Após `fireEvent.change` para "novo valor", o teste espera `toHaveValue('')` pois é controlado. Mas o `onChange` mock não atualiza o estado do pai. Isso é comportamento correto do React, mas o teste confunde "funciona" com "não atualiza porque mock".

3. **Sem teste de maxLength enforcement:** Não verifica se o campo realmente impede digitação além do limite.

4. **Sem teste de eventos onBlur/onFocus:** Componente pode ter validação lazy não coberta.

#### Melhorias Sugeridas

- Testar `disabled` prop (se existir)
- Verificar aria-invalid quando há erro
- Testar `rows` customizado

---

## TextField.test.js

**Caminho:** `tests/unit/components/Admin/fields/TextField.test.js`  
**Linhas:** 43  
**Componente:** `components/Admin/fields/TextField.js`

#### Finalidade

Testa o componente de campo de texto simples: renderização, required, hints, erros, eventos e normalização.

#### Escopo dos Testes

| # | Teste | Tipo |
|---|-------|------|
| 1 | Renderizar com label e required | Happy path |
| 2 | Renderizar erro e hint | Edge case |
| 3 | Repassar eventos nativos do input | Happy path |
| 4 | Normalizar value null para string vazia | Edge case |

#### Relações

- **Duplicação quase total com TextAreaField.test.js:** Estrutura idêntica, testes espelhados. Única diferença é o contador de caracteres.

#### Problemas Identificados

1. **Duplicação estrutural:** Os testes 1-4 são praticamente idênticos aos do `TextAreaField`. Manter dois arquivos paralelos é custoso.

2. **Teste 3 muito fraco:** Apenas verifica `toHaveBeenCalled()` sem validar argumentos, tipo de evento, ou valor passado.

3. **Sem teste de type attribute:** Não verifica se o input pode ter `type="email"`, `type="password"`, etc.

4. **Sem teste de autocomplete, placeholder, ou disabled:** Props comuns não cobertas.

#### Código Morto

- `jest.fn()` é criado mas nunca reutilizado entre testes — poderiam ser compartilhados em `beforeEach`.

---

## ToggleField.test.js

**Caminho:** `tests/unit/components/Admin/fields/ToggleField.test.js`  
**Linhas:** 26  
**Componente:** `components/Admin/fields/ToggleField.js`

#### Finalidade

Teste do componente toggle (checkbox estilizado): renderização de labels ativo/inativo, descrição, disabled e eventos de click.

#### Escopo dos Testes

| # | Teste | Tipo |
|---|-------|------|
| 1 | Renderizar estados ativo/inativo com labels | Happy path |
| 2 | Lidar com checkbox disabled e click | Edge case |

#### Relações

- **Padrão único:** Único componente de campos testado que é um checkbox/toggle
- **Semelhante a:** Componentes Switch/Toggle de libs UI (MUI, Radix)

#### Probleitos Identificados

1. **Cobertura muito rasa:** Apenas 2 testes para um componente que provavelmente tem mais estados (loading, description dinâmica, aria-checked).

2. **Sem teste de toggle por teclado:** Checkbox deve ser acessível por Enter/Space — não testado.

3. **Sem teste de controlled vs uncontrolled:** Não verifica se o estado pode ser controlado externamente.

4. **Label "Rascunho" hardcoded:** Assume label padrão mas não testa `inactiveLabel` customizado.

#### Melhorias Sugeridas

- Testar `aria-checked` reflete estado `checked`
- Testar teclado (Space/Enter)
- Testar `onChange` chamado com valor booleano correto

---

## IntegrityCheck.test.js

**Caminho:** `tests/unit/components/Admin/Tools/IntegrityCheck.test.js`  
**Linhas:** 280  
**Componente:** `components/Admin/Tools/IntegrityCheck.js`

#### Finalidade

Teste mais extenso do conjunto. Valida o dashboard de integridade do sistema: renderização de status, detalhes por categoria (database, cache, storage, backup, sistema), tratamento de erros HTTP, content-type inválido, refresh manual, auto-refresh 30s, cleanup de intervalo.

#### Escopo dos Testes

| # | Teste | Tipo |
|---|-------|------|
| 1 | Renderizar título e texto descritivo | Smoke |
| 2 | Exibir status geral saudável | Happy path |
| 3 | Listar checks da API | Happy path |
| 4 | Exibir detalhes do sistema | Happy path |
| 5 | Estado de erro e recuperação com "Tentar Novamente" | Error path + retry |
| 6 | Mensagem de fallback quando HTTP sem message | Edge case |
| 7 | Erro quando fetch falha por rede | Error path |
| 8 | Erro quando servidor responde sem JSON | Edge case |
| 9 | Erro quando servidor não informa content-type | Edge case |
| 10 | Recarregar página quando sessão expira (401) | Edge case |
| 11 | Refresh manual | Happy path |
| 12 | "Atualizando..." e botão desabilitado durante refresh | UI state |
| 13 | Auto-refresh a cada 30s | Timer |
| 14 | Interromper auto-refresh ao desmontar | Cleanup |

#### Relações

- **Mocks dedicados:** `mockFetchSuccess`, `mockFetchError`, `mockFetchNetworkError` de `tests/mocks/fetch.js`
- **Padrão de auto-refresh:** Compartilhado com `RateLimitViewer` (15s vs 30s)
- **Tratamento 401:** Padrão observável via console.jsdomError

#### Problemas Identificados

1. **Teste 10 (401) extremamente frágil:** Verifica `consoleErrorSpy.mock.calls.some(call => ...includes('Not implemented: navigation'))`. Isso acopla o teste ao comportamento interno do jsdom, não do componente. Se jsdom atualizar mensagens, teste quebra.

2. **Fixtures massivas:** `mockIntegrityData` ocupa 60+ linhas com dados extremamente detalhados que não são todos usados nos testes.

3. **Teste 13 e 14 dependem de `jest.useFakeTimers()` + `await act(async () => {})`:** Padrão correto, mas a ordem de `act` e `advanceTimers` é sutil — fácil introduzir regressão.

4. **Falta teste de loading inicial:** Não verifica se há spinner/texto "Carregando" antes do primeiro fetch resolver.

5. **Teste 8 e 9 poderiam ser unificados:** Ambos testam content-type handling com abordagens ligeiramente diferentes.

#### Código Morto

- O mock `mockImportrityData.checks.system.details.env: 'test'` nunca é asserido — dado ornamental.

---

## RateLimitViewer.test.js

**Caminho:** `tests/unit/components/Admin/Tools/RateLimitViewer.test.js`  
**Linhas:** 418 (maior arquivo)  
**Componente:** `components/Admin/Tools/RateLimitViewer.js`

#### Finalidade

Teste abrangente do visualizador de rate limiting: 3 abas (Bloqueados, Whitelist, Auditoria), CRUD de IPs, paginação, busca, tratamento de 401, auto-refresh 15s, e estado de refresh.

#### Escopo dos Testes

| # | Teste | Tipo |
|---|-------|------|
| 1 | Renderizar título, abas e botão atualizar | Smoke |
| 2 | Listar IPs bloqueados com detalhes | Happy path |
| 3 | Tratar respostas não-array como listas vazias | Edge case |
| 4 | Desbloquear IP e remover da lista | Happy path (DELETE) |
| 5 | Mostrar IPs da whitelist na aba | Happy path |
| 6 | Adicionar IP à whitelist via formulário | Happy path (POST) |
| 7 | Erro quando falha POST da whitelist | Error path |
| 8 | Não chamar API quando IP vazio | Edge case |
| 9 | Remover IP da whitelist | Happy path (DELETE) |
| 10 | Erro quando falha remoção da whitelist | Error path |
| 11 | Carregar logs de auditoria | Happy path |
| 12 | Buscar logs por termo | Happy path |
| 13 | Paginar logs de auditoria | Happy path |
| 14 | Registrar erro no console ao carregar auditoria | Error path |
| 15 | Estado de erro e recuperação com "Tentar Novamente" | Error path + retry |
| 16 | Recarregar página quando 401 em bloqueados | Edge case |
| 17 | Recarregar página quando 401 em whitelist | Edge case |
| 18 | Redirecionar ao login quando 401 na auditoria | Edge case |
| 19 | Mostrar erro quando fetch falha por rede | Error path |
| 20 | Mostrar "Atualizando..." durante refresh manual | UI state |
| 21 | Auto-refrescar a cada 15s | Timer |

#### Relações

- **Helper dedicado:** `setupRateLimitMock()` — roteamento por URL/Method, muito bem projetado
- **Padrão de fetch paralelo:** 2 fetch simultâneos no mount (blocked + whitelist)
- **Auto-refresh:** 15s vs 30s do IntegrityCheck

#### Problemas Identificados

1. **Testes 16, 17, 18 são quase idênticos:** Todos testam 401 em endpoints diferentes com mesma asserção genérica. Deveriam ser parametrizados.

2. **`global.wait(50)` não é função nativa:** `await global.wait(50)` (linhas 333, 347, 366) depende de um helper customizado não mostrado — se não estiver definido no setup, os testes lançam ReferenceError silencioso (cairiam no catch).

3. **Teste 18 verifica ausência de log:** `expect(consoleErrorSpy.mock.calls.some(call => call[0] === 'Erro ao carregar auditoria:')).toBe(false)` — verificar que algo NÃO aconteceu é frágil (falso positivo se o componente parar de logar).

4. **Fixtures espalhadas:** Constantes `defaultBlocked`, `defaultWhitelist`, etc. definidas no topo mas usadas em múltiplos overrides.

5. **Sem teste de limpeza de intervalo no unmount:** Diferente do IntegrityCheck, não verifica se o `clearInterval` é chamado no cleanup.

6. **Sem teste de race condition:** Especialmente relevante com fetch paralelo (blocked + whitelist) — se um resolve e outro rejeixa, qual prevalece?

#### Duplicação

- Lógica de `setupRateLimitMock` é única e bem encapsulada — mérito do arquivo.

---

## UrlField.test.js

**Caminho:** `tests/unit/components/Admin/fields/UrlField.test.js`  
**Linhas:** 93  
**Componente:** `components/Admin/fields/UrlField.js`

#### Finalidade

Testa campo de URL com validação multi-platforma (genérica, YouTube, Spotify), preview de embed, e validação customizada.

#### Escopo dos Testes

| # | Teste | Tipo |
|---|-------|------|
| 1 | Renderizar campo genérico com required | Smoke |
| 2 | Validar URL obrigatória e exibir erro | Edge case |
| 3 | Validar formato de URL genérica | Edge case |
| 4 | Validar/extrair ID do YouTube e mostrar preview | Happy path |
| 5 | Validar/extrair ID do Spotify e mostrar preview | Happy path |
| 6 | Aceitar função de validação customizada | Edge case |
| 7 | Exibir hint se não houver erro | Happy case |
| 8 | Retornar null no preview se plataforma for generic | Edge case |
| 9 | Validar exceção no construtor URL (Lines 70-71) | Edge case |

#### Relações

- **Componente mais complexo dos fields:** Lida com regex de extração de ID, construção de URLs de embed, validação assíncrona potencial
- **Referências a linhas do componente:** Comentários "Lines 126-127", "Lines 70-71" — acoplamento ao componente

#### Problemas Identificados

1. **Referências a linhas do código:** Comentários "Lines 126-127" e "Lines 70-71" ficam desatualizados se o componente for refatorado.

2. **Teste 9 é regression test sem descrição:** "deve validar corretamente exceção no construtor de URL" — testa edge case de implementação, não comportamento de usuário.

3. **Preview de YouTube testado com URL inválida primeiro:** Teste 4 faz `rerender` com URL válida após erro. Se o componente mantém estado de erro internamente, o rerender pode não limpar.

4. **Sem teste de validação assíncrona:** Se `validate` é async, não é coberto.

5. **Regex de extração presumida:** Não testa variações como `youtu.be/`, `youtube.com/shorts/`, `spotify:track:`.

#### Melhorias Sugeridas

- Parametrizar testes de plataforma com `.each`
- Testar `showPreview=false` com URL válida (não deve renderizar iframe)
- Adicionar teste de debounce (se existir)

---

## Header.test.js

**Caminho:** `tests/unit/components/Header.test.js`  
**Linhas:** 29  
**Componente:** Mock interno (não importa componente real)

#### Finalidade

Smoke test e snapshot de um componente Header hipotético. Demonstra padrão de teste com `renderWithProviders` e snapshot.

#### Escopo dos Testes

| # | Teste | Tipo |
|---|-------|------|
| 1 | Renderizar sem erros (smoke test) | Smoke |
| 2 | Corresponder ao snapshot | Snapshot |

#### Relações

- **Depende de:** `@helpers/render.js` (`renderWithProviders`)
- **Snapshot:** `tests/unit/components/__snapshots__/Header.test.js.snap`

#### Problemas Identificados

1. **Componente hipotético/mocado inline:** O `MockHeader` definido no arquivo NÃO é o componente real `Header`. O comentário "Componente hipotético para demonstração" revela que é teste placeholder.

2. **Snapshot de mock:** O snapshot grava estrutura do `MockHeader`, não do `Header` real. Se alguém atualizar o `Header` real, o snapshot não captura.

3. **Sem testes de interação:** Links de navegação não são clicados, mobile menu não é testado.

4. **`renderWithProviders` não é padrão do projeto:** A maioria dos testes usa `render` do RTL. Isso indica inconsistência de padrão.

5. **Helper importado de `@helpers/render.js`:** Pode não existir no projeto (path alias `@helpers` não é padrão em outros testes).

#### Código Morto

- O `MockHeader` inteiro é código morto se o componente real não for usado.

#### Melhorias Sugeridas

- Importar componente real `Header` (se existir)
- Adicionar testes de clique em links
- Verificar responsividade/mobile menu
- Remover snapshot se mock não representa componente real

---

## SeoPerformance.test.js

**Caminho:** `tests/unit/components/SeoPerformance.test.js`  
**Linhas:** 92  
**Componente:** Mock interno (`SeoPerformanceWrapper`)

#### Finalidade

Testa renderização de meta tags SEO e atributos de performance (lazy loading, decoding assíncncrono). Demonstra padrão de teste de `next/head`.

#### Escopo dos Testes

| # | Teste | Tipo |
|---|-------|------|
| 1 | Renderizar meta tags corretas no head | SEO |
| 2 | Exibir indicador de carregamento quando isLoading | Performance |
| 3 | Renderizar imagem com lazy-loading e decoding async | Performance |

#### Relações

- **Depende de:** `next/head`, `tests/mocks/next-setup.js`
- **Mock inline:** `SeoPerformanceWrapper` definido no arquivo

#### Problemas Identificados

1. **Componente hipotético:** Assim como Header.test.js, o `SeoPerformanceWrapper` é mock inline, não o componente real.

2. **Setup `next-setup.js` importado mas não visível:** `import '../../mocks/next-setup.js'` — sem conteúdo, impossível verificar se configura `next/head` corretamente para RTL.

3. **Teste de document.title:** `expect(document.title).toBe(...)` funciona com `next/head` + RTL, mas é frágil em ambiente com múltiplos `Head` renders.

4. **Sem teste de canonical, robots, structured data:** Escopo muito limitado para "SEO".

5. **Sem teste de viewport shift (CLS):** Performance não se resume a lazy loading.

#### Código Morto

- O `SeoPerformanceWrapper` inteiro é código placeholder.

---

## Header.test.js.snap — Snapshot

**Caminho:** `tests/unit/components/__snapshots__/Header.test.js.snap`  
**Linhas:** 23

#### Finalidade

Snapshot serializado do `MockHeader` renderizado com `title="Caminhar com Deus"`.

#### Conteúdo

```html
<div>
  <header>
    <h1>Caminhar com Deus</h1>
    <nav>
      <a href="/">Início</a>
      <a href="/posts">Posts</a>
    </nav>
  </header>
</div>
```

#### Problemas Identificados

1. **Snapshot de mock, não do componente real:** Reflete o `MockHeader` inline, não o `Header` do projeto.

2. **Snapshot sem significado:** 4 links estáticos sem estrutura real — não protege contra regressões do componente real.

3. **Dificuldade de revisão:** Snapshot é gerado automaticamente, não revisado criticamente — pode mascarar mudanças acidentais no mock.

4. **Data de expiração:** Snapshots podem ficar desatualizados sem que testes falhem.

#### Recomendação

- **Remover snapshot** se mock não representar componente real
- Se componente real existir, gerar snapshot a partir dele
- Adotar política de revisão de snapshots em PRs

---

## Cruzamento: Duplicações e Padrões

#### Padrões Compartilhados

| Padrão | Arquivos | Helper |
|--------|----------|--------|
| Suprimir console.error | Todos | `suppressConsoleError()` |
| Mock global.fetch | Managers, RateLimit | `mockGlobalFetch()` |
| Fetch mocks dedicados | IntegrityCheck | `mockFetch/Success/Error/NetworkError` |
| Modal de confirmação | BackupManager, CacheManager | Padrão Cancelar/Confirmar |
| Auto-refresh | IntegrityCheck (30s), RateLimit (15s) | `jest.useFakeTimers()` |
| Setup 401 via console | IntegrityCheck, RateLimitViewer | `suppressConsoleError` + spy |
| Mock inline (hipotético) | Header, SeoPerformance | Componente definido no arquivo |

#### Duplicações Identificadas

| Duplicação | Arquivos Afetados | Severidade |
|------------|-------------------|------------|
| Estrutura de testes de fields (render + error + null normalize) | TextField ↔ TextAreaField | Alta |
| Setup de fetch + confirmação modal | BackupManager ↔ CacheManager | Média |
| Testes de 401 (bloqueados/whitelist/audit) | RateLimitViewer (testes 16-18) | Média |
| Mock inline em vez de importar componente real | Header ↔ SeoPerformance | Alta |
| Verificação de "Atualizando..." | IntegrityCheck ↔ RateLimitViewer | Baixa |
| `suppressConsoleError` + `mockGlobalFetch` em beforeEach | BackupManager, CacheManager, RateLimit | Baixa (DRYável) |

---

## Problemas Consolidados

#### Críticos

1. **Testes de componentes hipotéticos:** `Header.test.js` e `SeoPerformance.test.js` testam mocks inline, não os componentes reais. Não protegem contra regressões.

2. **`global.wait` indefinido:** `RateLimitViewer.test.js` usa `global.wait(50)` em 3 testes. Se não houver setup global, lança ReferenceError silencioso.

3. **Acoplamento a comportamento do jsdom:** IntegrityCheck (teste 10) e RateLimitViewer (testes 16-18) dependem de strings internas do jsdom (`'Not implemented: navigation'`).

#### Moderados

4. **Duplicação TextField ↔ TextaAreaField:** Manutenção em dobro para mudanças idênticas.

5. **Referências a linhas no código:** `UrlField.test.js` tem comentários "Lines 70-71", "Lines 126-127" — desatualizam com refatoração.

6. **Falta de cleanup tests:** Apenas IntegrityCheck testa cleanup de intervalo no unmount.

7. **Cobertura rasa de ToggleField:** Apenas 2 testes para componente potencialmente complexo.

8. **Snapshot de mock:** Não protege componente real.

#### Menores

9. **Timeout implícito em waitFor:** Sem configuração explícita.
10. **Fixtures subutilizadas:** `mockIntegrityData` tem dados nunca asseridos.
11. **Toast ID hardcoded:** CacheManager assume `'id_toast_123'`.
12. **Helper `renderWithProviders` não padrão:** Header.test.js usa padrão diferente do resto.

---

## Recomendações de Melhorias

#### Prioridade Alta

1. **Substituir mocks inline por componentes reais:** Importar `Header` e `SeoPerformance` reais ou documentar explicitamente que são testes de demonstração/exemplo.

2. **Parametrização de testes de 401:** Em RateLimitViewer, consolidar testes 16-18 com `it.each([['blocked'], ['whitelist'], ['audit']])`.

3. **Extrair helpers compartilhados:** Criar `tests/helpers/fields.js` com testes comuns de render/error/normalize para fields, e `tests/helpers/admin.js` com padrão de modal de confirmação.

#### Prioridade Média

4. **Teste de cleanup no unmount:** Adicionar para RateLimitViewer e CacheManager (se tiverem intervals).

5. **Adicionar testes de interação por teclado:** ToggleField (Enter/Space), campos (Tab, Enter para submit).

6. **Snapshot removido ou regenerado:** Decidir se snapshot é necessário; se manter, usar componente real.

7. **Teste de loading inicial:** IntegrityCheck e RateLimitViewer deveriam verificar estado de loading antes do primeiro fetch.

8. **Documentar padrão de teste de 401:** O truque de observar console.jsdomError deve ser extraído em helper documentado.

#### Prioridade Baixa

9. **Reduzir fixtures:** Mover `mockIntegrityData` para `tests/fixtures/integrity.js` e usar subset por teste.

10. **Tipar mocks com JSDoc:** Adicionar `@typedef` para formas de resposta da API nos mocks de RateLimit.

11. **Remover referências a linhas:** Substituir "Lines 70-71" por descrição comportamental.

12. **Configurar timeout explícito:** Adicionar `{ timeout: 10000 }` em todos os `waitFor` de testes com fetch.

---

## Anexo: Mapa de Cobertura por Componente

| Componente | Arquivo de Teste | Testes | Cobertura Estimada | Status |
|------------|------------------|--------|-------------------|--------|
| BackupManager | BackupManager.test.js | 7 | ~85% | ✅ Bom |
| CacheManager | CacheManager.test.js | 5 | ~75% | ⚠️ Falta loading state |
| TextAreaField | TextAreaField.test.js | 4 | ~80% | ✅ Aceitável |
| TextField | TextField.test.js | 4 | ~75% | ⚠️ Muito básico |
| ToggleField | ToggleField.test.js | 2 | ~50% | ❌ Insuficiente |
| IntegrityCheck | IntegrityCheck.test.js | 14 | ~95% | ✅ Excelente |
| RateLimitViewer | RateLimitViewer.test.js | 21 | ~90% | ✅ Muito bom |
| UrlField | UrlField.test.js | 9 | ~85% | ✅ Bom |
| Header | Header.test.js | 2 | ~10% | ❌ Mock hipotético |
| SeoPerformance | SeoPerformance.test.js | 3 | ~15% | ❌ Mock hipotético |

---

*Documentação gerada por análise estática de código. Para cobertura real, executar Jest com flag `--coverage`.*


---


## 11. Testes Unitários — Features


#### 1.1 Estrutura Analisada

```
tests/unit/components/Features/
├── Blog/
│   ├── BlogSection.test.js
│   └── PostCard.test.js
├── ContentTabs/
│   ├── ContentTabs.test.js
│   └── index.test.js
├── Music/
│   ├── MusicCard.test.js
│   ├── MusicGallery.test.js
│   └── MusicGallery.edge.test.js
├── Products/
│   ├── ProductCard.test.js
│   ├── ProductList.test.js
│   └── styles.test.js
├── Testimonials/
│   └── index.test.js
└── Video/
    ├── VideoCard.test.js
    └── VideoGallery.test.js
```

#### 1.2 Padrões Transversais

| Padrão | Ocorrências | Observação |
|--------|-------------|------------|
| `@testing-library/react` | 14/14 | Render, screen, fireEvent |
| `suppressConsoleError()` helper | 9/14 | Silencia console.error para testar paths de erro |
| `mockGlobalFetch()` helper | 7/14 | Substitui global.fetch com mock restaurável |
| Mock de componentes filhos | 10/14 | Isola lógica do componente principal |
| Descrições em Português | 14/14 | Padrão consistente |
| `waitFor` assíncrono | 10/14 | Para estados que dependem de promises |
| Fake timers (debounce) | 2/14 | VideoGallery e ProductList |

#### 1.3 Helpers Compartilhados Utilizados

| Helper | Arquivo origem | Uso nos testes |
|--------|---------------|----------------|
| `suppressConsoleError()` | `tests/helpers/console.js` | BlogSection, MusicCard, ProductCard, ProductList |
| `mockGlobalFetch()` | `tests/helpers/console.js` | BlogSection, MusicGallery, MusicGallery.edge, ProductList, Testimonials, VideoGallery |

---


---

#### 2.1 `BlogSection.test.js`

**Finalidade:** Testar o componente `BlogSection` — seção de blog que busca posts de uma API e os renderiza.

**Importações:**
- `render, screen, waitFor, waitForElementToBeRemoved` (@testing-library/react)
- `suppressConsoleError, mockGlobalFetch` (helpers)

**Mock:** `PostCard` é mockado como componente dummy que renderiza `data-testid="post-card"` com o título.

**Setup:**
```js
beforeEach: suppressConsoleError() + mockGlobalFetch()
afterEach: mockRestore() em ambos
```

**Dados de teste:**
```js
mockPosts = [
  { id: 1, title: 'Post 1' },
  { id: 2, title: 'Post 2' },
  { id: 3, title: 'Post 3' }
]
```

**Casos de teste (8):**

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Loading inicial | Estado de carregamento antes da API resolver |
| 2 | Sem posts → null | Retorna null se API retorna array vazio |
| 3 | Renderiza posts | Exibe título da seção + 3 cards |
| 4 | Limit + botão "Ver todos" | Respeita prop `limit`, mostra botão se houver mais |
| 5 | Limit > total | Não mostra botão se limit excede quantidade |
| 6 | `success: false` silencioso | Trata resposta com sucesso falso sem quebrar |
| 7 | Erro HTTP com JSON | Mostra mensagem do servidor no console.error |
| 8 | Fallback "Unknown error" | Usa mensagem padrão se erro HTTP não tem mensagem |
| 9 | Falha de rede/JSON inválido | Trata rejection do json() sem lançar exceção |

**Problemas identificados:**

1. **Teste 9 — `json: () => Promise.reject(...)`**: O mock rejeita o `json()`, mas o teste espera que o componente trate isso e mostre "Erro HTTP 500". Se o componente chama `res.json()` dentro de um try/catch que cai no catch genérico, isso funciona. Porém, o nome do teste diz "falha de rede ou JSON inválido" mas o mock retorna `{ ok: false, status: 500 }` — não é uma falha de rede real (que seria `fetch` rejeitando), é um erro HTTP com corpo inválido. O teste é um pouco ambíguo.

2. **Dados de teste incompletos**: `mockPosts` só tem `{ id, title }`. O `PostCard` real recebe `slug, excerpt, image_url, created_at, categories` — mas como o PostCard é mockado, isso não causa falha, porém mascara a real estrutura esperada.

3. **Falta teste de tentativa de reconexão (retry)**: Não há teste de um botão "Tentar novamente" se o componente tiver essa funcionalidade.

**Melhorias possíveis:**
- Adicionar teste de retry se o componente suportar
- Testar com `mockPosts` completos para documentar a interface
- Separar o teste 9 em dois: um para falha de rede (fetch rejeita) e outro para JSON inválido

---

#### 2.2 `PostCard.test.js`

**Finalidade:** Testar o componente `PostCard` — card individual de post do blog.

**Importações:** Apenas RTL + Jest globals. Sem helpers (não usa mock de fetch).

**Mock:** Nenhum mock — teste direto do componente real.

**Dados de teste:**
```js
mockPost = {
  id: 1, title: 'Título de Teste', slug: 'titulo-de-teste',
  excerpt: 'Resumo do post de teste.', image_url: 'https://example.com/image.jpg',
  created_at: '2023-10-10T10:00:00Z',
  categories: [{ name: 'Fé', slug: 'fe' }]
}
```

**Casos de teste (4):**

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Render completa | Título, resumo, categoria, imagem com src correto, link `/blog/{slug}` |
| 2 | Placeholder image | Usa `/api/placeholder-image?text=Reflexão` quando `image_url` é null |
| 3 | Texto customizado | Aceita prop `readMoreText` |
| 4 | Sem categorias | Não quebra quando `categories` é null |

**Problemas identificados:**

1. **Sem teste de data**: `created_at` é fornecido mas nenhum teste verifica se a data é formatada/exibida.

2. **Sem teste de categorias múltiplas**: Só testa uma categoria. Não verifica o comportamento com várias.

3. **Sem teste de imagem com string vazia**: Apenas `null` é testado; string vazia ou undefined podem ter comportamento diferente.

**Melhorias possíveis:**
- Testar formatação de data (`created_at`)
- Testar múltiplas categorias
- Testar `image_url` como string vazia ou undefined
- Testar acessibilidade do link (aria-label?)

---

#### 2.3 `ContentTabs.test.js`

**Finalidade:** Testar o componente `ContentTabs` — sistema de abas que alterna entre Blog, Músicas, Vídeos e Produtos.

**Importações:** RTL + Jest + `afterRestore` pattern.

**Mocks (4):**
```js
jest.mock('Blog/BlogSection')    → data-testid="blog"
jest.mock('Music/MusicGallery')  → data-testid="music"
jest.mock('Video/VideoGallery')  → data-testid="video"
jest.mock('Products/ProductList')→ data-testid="products"
```

**Casos de teste (4):**

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Aba padrão | Renderiza Blog por padrão |
| 2 | Alternância | Clica em Músicas, Vídeos, Produtos e mostra cada um |
| 3 | Aba bloqueada | Aba "Em Desenvolvimento" não muda o conteúdo |
| 4 | Fallback switch | Estado desconhecido mostra "Conteúdo será implementado em breve" |

**Problemas identificados:**

1. **Teste 4 é frágil**: Usa `jest.spyOn(React, 'useState').mockReturnValueOnce(['projeto1', jest.fn()])`. Isso força um valor de estado específico. Se o componente mudar a ordem das chamadas `useState` ou refatorar para useReducer, o teste quebra silenciosamente ou dá falso-positivo.

2. **Falta teste de estado inicial com prop**: Não testa se o componente aceita uma prop para definir aba inicial.

3. **Sem teste de teclado**: Navegação por teclado (setas, Tab) não é testada.

4. **`jest.restoreAllMocks()` no afterEach**: Pode interferir com mocks definidos em `jest.mock` no topo do arquivo se a implementação mudar.

**Melhorias possíveis:**
- Evitar espionar `React.useState` — é um teste de implementação, não de comportamento
- Testar navegação por teclado (acessibilidade)
- Testar prop de aba inicial

---

#### 2.4 `ContentTabs/index.test.js`

**Finalidade:** Teste de barrel — verifica se o módulo `ContentTabs/index.js` exporta a estrutura esperada.

**Importações:** Apenas Jest globals + importação do módulo inteiro (`import * as`).

**Casos de teste (2):**

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Snapshot de exports | `Object.keys` do módulo bate com snapshot |
| 2 | Default export | `ContentTabsModule.default` está definido |

**Problemas identificados:**

1. **Snapshot implícito**: O primeiro teste usa `toMatchSnapshot()` mas não há um arquivo `.snap` visível no trecho. Se o snapshot não existir, passa na primeira vez e cria. Se existir, pode dar falso-positivo se as mudancas forem intencionais sem `--updateSnapshot`.

2. **Teste redundante**: O teste 2 (default definido) é subconjunto do teste 1 (que verifica todas as keys). Se o barrel só tem `default`, o teste 2 não acrescenta valor.

**Melhorias possíveis:**
- Verificar explicitamente quais exports existem (hardcoded) ao invés de snapshot, para falhar com clareza
- Ou documentar claramente que snapshot é intencional

---

#### 2.5 `MusicCard.test.js`

**Finalidade:** Testar o componente `MusicCard` — card de música com embed do Spotify.

**Importações:** RTL + Jest + `suppressConsoleError`.

**Setup:**
```js
beforeEach: suppressConsoleError() + jest.spyOn(window, 'open').mockImplementation(() => {})
afterEach: consoleErrorSpy?.mockRestore()
```

**Casos de teste (7):**

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | URL normal Spotify | Converte `/track/` para `/embed/track/` |
| 2 | URL internacional (intl) | Remove prefixo `intl-pt` antes de gerar embed |
| 3 | URI spotify: | Converte `spotify:track:` para URL de embed |
| 4 | Fallback URL desconhecida | Usa URL original se formato não é Spotify |
| 5 | URL nula | Mostra "Prévia indisponível", não renderiza iframe |
| 6 | Sem botão Ouvir (URL nula) | Botão não aparece se URL é null |
| 7 | Botão Ouvir | Abre URL em nova aba com `noopener,noreferrer` |

**Problemas identificados:**

1. **Teste 2 — URL internacional**: `'https://open.spotify.com/intl-pt/track/98765fghij'` espera conter `'https://open.spotify.com/embed/track/98765fghij'`. Isso implica que o componente remove `intl-pt` — mas isso é uma lógica de negócio que poderia mudar se o Spotify alterar suas URLs.

2. **Sem teste de áudio indisponível**: Não testa o que acontece se o embed retorna erro (iframe onError).

3. **`suppressConsoleError` sem restore de `window.open`**: O spy de `window.open` nunca é restaurado no afterEach. Isso pode vazar para outros testes se o arquivo for executado em paralelo.

**Melhorias possíveis:**
- Restaurar `window.open` no afterEach
- Testar estado de erro do embed
- Testar atributos de segurança do iframe (sandbox?)

---

#### 2.6 `MusicGallery.test.js`

**Finalidade:** Testar o componente `MusicGallery` — galeria paginada com busca e ordenação.

**Importações:** RTL + Jest + `mockGlobalFetch`.

**Mock:** `MusicCard` é mockado como dummy com `data-testid="music-card"`.

**Setup:**
```js
beforeEach: mockGlobalFetch()
afterEach: fetchMock?.mockRestore()
```

**Dados de teste:** 7 músicas com `id, titulo, artista`.

**Casos de teste (9):**

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Loading → carrega | Exibe loading, depois músicas + paginação |
| 2 | Erro API + retry | Exibe mensagem de erro, permite tentar novamente |
| 3 | Sem resultados | "Nenhuma música encontrada" |
| 4 | Navegação páginas | Página 1 → Próxima → Página 2 |
| 5 | Busca com debounce | Digita "Hino", mostra contador "1 resultado" |
| 6 | Limpar busca | Botão ✕ limpa input e some |
| 7 | Ordenação | Muda select para "recent", URL inclui `sort=recent` |
| 8 | Voltar página | Próxima → Página 2 → Anterior → Página 1 (Anterior desabilitado) |
| 9 | Sem resultados na busca | Mostra "Nenhum resultado", permite limpar |

**Problemas identificados:**

1. **Teste 7 — Verificação de URL**: `global.fetch.mock.calls.map(call => call[0])` — assume que a URL é o primeiro argumento. Se o componente passar um segundo argumento (headers), ainda funciona, mas é uma suposição frágil.

2. **Duplicação com MusicGallery.edge.test.js**: O mock do MusicCard é idêntico nos dois arquivos. Se mudar, precisa atualizar em dois lugares.

3. **Sem teste de loading entre páginas**: Não testa estado de carregamento durante troca de page.

4. **Teste 5 — Debounce**: O mock é configurado ANTES de digitar, implicando que o debounce é curto o suficiente ou que o teste não simula o timer real (não usa fake timers aqui).

**Melhorias possíveis:**
- Extrair mock do MusicCard para arquivo compartilhado
- Testar loading state durante paginação
- Verificar se `aria-label` de paginação está correto (acessibilidade)

---

#### 2.7 `MusicGallery.edge.test.js`

**Finalidade:** Testes de edge cases do `MusicGallery` — cenários de resposta inesperada da API.

**Importações:** RTL + Jest + `suppressConsoleError, mockGlobalFetch`.

**Mock:** Mesmo mock dummy do MusicCard (duplicado de MusicGallery.test.js).

**Casos de teste (5):**

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Resposta sem `data` | Fallback vazio → "Nenhuma música encontrada" |
| 2 | Fetch rejeita (Network error) | Exibe mensagem de erro |
| 3 | Array plano | API retorna array direto (não `{data}`), calcula paginação |
| 4 | Paginação aninhada | `{ data, pagination: { totalPages } }` funciona |
| 5 | Resposta nula | `json() → null` não quebra |

**Problemas identificados:**

1. **Duplicação de mock**: O `jest.mock` do MusicCard é exatamente igual ao de `MusicGallery.test.js`. Isso viola DRY.

2. **Teste 3 vs Teste 4**: O teste 3 (array plano) e teste 4 (paginação aninhada) testam formatos de resposta diferentes, mas ambos dependem do componente ter fallbacks robustos. Se o componente for refatorado para um formato fixo, alguns testes se tornam obsoletos.

3. **Sem teste de resposta malformada**: Não testa `{ data: "string" }` ou `{ data: 123 }` — tipos inválidos.

**Melhorias possíveis:**
- Consolidar mocks duplicados em helper compartilhado
- Adicionar teste de tipos inválidos na resposta
- Considerar se esses edge cases deveriam estar no mesmo arquivo principal

---

#### 2.8 `ProductCard.test.js`

**Finalidade:** Testar o componente `ProductCard` — card de produto com galeria de imagens e lightbox.

**Importações:** RTL + Jest + `suppressConsoleError`.

**Mock:** `lib/api/utils` → `parseImages` (mockado para evitar dependência real).

**Casos de teste (12):**

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Render básico | Nome, descrição, preço |
| 2 | Sem imagem (null) | "Sem imagem" |
| 3 | Sem imagem (vazia) | "Sem imagem" |
| 4 | Múltiplas imagens | Botões anterior/próximo + contador "1 / 3" |
| 5 | Navegação imagens | Click avança/retrocede, contador atualiza |
| 6 | Link do produto | Exibe link com href correto |
| 7 | Sem link | Não renderiza link |
| 8 | Abrir lightbox | Click na imagem abre dialog |
| 9 | Fechar lightbox (Escape) | KeyDown Escape fecha dialog |
| 10 | Fechar lightbox (overlay) | Click no dialog fecha |
| 11 | Lightbox com múltiplas imagens | 2 instâncias de botões (card + lightbox) |
| 12 | Opacidade loading | Imagem inicia opacity:0, após load opacity:1 |

**Problemas identificados:**

1. **Teste 11 — Fragilidade**: `expect(screen.getAllByLabelText('Imagem anterior')).toHaveLength(2)` — isso assume que o card e o lightbox estão renderizados simultaneamente com os mesmos labels. Se o lightbox usar labels diferentes (ex: "Imagem anterior (ampliada)"), o teste quebra.

2. **Sem teste de teclado no lightbox**: Setas esquerda/direita para navegar não é testado.

3. **Sem teste de swipe/mobile**: Não há teste de gestos touch.

4. **`parseImages` mockado**: O mock faz `JSON.parse(images)` — mas o teste usa `image_url: '["/img1.jpg"]'` (string JSON). Se o componente mudar para receber array direto, o mock esconde esse problema.

**Melhorias possíveis:**
- Testar navegação por teclado no lightbox
- Testar atributos de acessibilidade do dialog (aria-modal, role)
- Considerar teste de swipe (se aplicável)

---

#### 2.9 `ProductList.test.js`

**Finalidade:** Testar o componente `ProductList` — lista paginada com filtros (busca, preço) e ordenação.

**Importações:** RTL + Jest + `suppressConsoleError, mockGlobalFetch`.

**Mocks (4):**
```js
jest.mock('hooks/useDebounce')  → retorna valor direto (sem debounce)
jest.mock('Products/ProductCard') → dummy com data-testid
jest.mock('UI/StateMessages')   → ErrorMessage, LoadingMessage, EmptyMessage
jest.mock('hooks/useApiFetch')  → mockUseApiFetch com transform
```

**Setup complexo:**
- `beforeAll`: polyfill de `scrollIntoView` (jsdom não implementa)
- `beforeEach`: consoleErrorSpy + fetchMock + `mockUseApiFetch.mockReset()`
- `afterEach`: restore console + fetch + `jest.useRealTimers()`

**Helpers internos:**
- `setupApiMock(returnData)` — mock retorno padrão
- `setupPaginatedApiMock(totalPages)` — mock com implementação que extrai page da URL via regex
- `advancePageLoadingTimer()` — `act(() => jest.advanceTimersByTime(150))`

**Casos de teste (16):**

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Render lista | 3 produtos renderizados |
| 2 | Loading | Exibe "Buscando produtos..." |
| 3 | Erro | Exibe "Erro de conexão" |
| 4 | Lista vazia | "Nenhum produto cadastrado" |
| 5 | Filtro sem resultado | "Nenhum produto encontrado com estes filtros" |
| 6 | Paginação | Botões Anterior/Próxima + números 1, 2 |
| 7 | Anterior desabilitado (pág 1) | Botão Anterior disabled |
| 8 | Próxima desabilitado (última) | Botão Próxima disabled na última página |
| 9 | Paginação escondida (1 página) | `visibility: hidden` no container |
| 10 | Campos de busca/filtro | Inputs de busca, preço mín/máx |
| 11 | Limpar filtros | Botão "Limpar todos os filtros" reseta tudo |
| 12 | Filtros de preço na URL | Inclui `minPrice` e `maxPrice` na URL |
| 13 | Navegar próxima página | Click Próxima → page=2 |
| 14 | Navegar página anterior | Próxima → 2 → Anterior → 1 |
| 15 | Loading overlay (transição) | Grid opacity 0.4 + pointer-events:none durante loading |
| 16 | Faixa de páginas (>5 páginas) | Testa janela deslizante de paginação |
| 17 | Ordenação por position+ID | Ordenação decrescente dentro de mesmo position |

**Problemas identificados:**

1. **Regex frágil no setupPaginatedApiMock**: `Number(url.match(/page=(\d+)/)?.[1])` — se a URL mudar (ex: `pagina=` ao invés de `page=`), o mock silenciosamente retorna página 1 para todos os testes.

2. **Teste 9 — Container sem data-testid**: `screen.getByText('Anterior').closest('div')` — assume que o closest div é o container de paginação. Se houver um div intermediário entre o botão e o container, o teste quebra.

3. **Teste 16 — Complexidade extrema**: O teste de faixa de páginas navega por 8 páginas verificando janelas deslizantes. É um teste de lógica de paginação que poderia estar em um hook separado (`usePagination`) testado isoladamente. Acopla o teste de UI à lógica de paginação.

4. **`jest.useFakeTimers()` chamados múltiplos**: Testes 13, 14, 15, 16 chamam `jest.useFakeTimers()` mas o afterEach sempre chama `jest.useRealTimers()`. Isso é seguro, mas se um teste falhar antes de chegar no afterEach, os timers fake vazam.

5. **Mock do `useDebounce`**: `{ default: (value) => value, useDebounce: (value) => value }` — desativa completamente o debounce. Isso significa que os testes de busca não testam o comportamento real de debounce.

**Melhorias possíveis:**
- Extrair lógica de paginação para hook testável separadamente
- Adicionar data-testid ao container de paginação
- Testar debounce real (ou pelo menos documentar que está desativado)
- Reduzir complexidade do teste de faixa de páginas

---

#### 2.10 `Products/styles.test.js`

**Finalidade:** Testar funções utilitárias de estilo do módulo Products — `inputStyle` e `buttonBaseStyle`.

**Importações:** Apenas Jest globals + importação das funções.

**Casos de teste (5):**

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | inputStyle() padrão | Retorna objeto CSS completo com tokens |
| 2 | inputStyle('46px') | Substitui paddingLeft por valor whitelistado |
| 3 | inputStyle('50px; color: red') | Rejeita valor inválido (injeção CSS) |
| 4 | buttonBaseStyle() padrão | Retorna objeto base do botão |
| 5 | buttonBaseStyle(custom) | Sobrescreve propriedades base |

**Problemas identificados:**

1. **Teste de segurança é importante mas limitado**: O teste 3 verifica injeção CSS (`'50px; color: red'`) — mas a whitelist pode não cobrir todos os vetores de ataque.

2. **Testes de token hardcoded**: `expect(style.padding).toBe('var(--spacing-3_5) ...')` — se o design system mudar o token, vários testes quebram de uma vez.

3. **Sem teste de composição**: Não testa se `inputStyle` + `buttonBaseStyle` podem ser combinados sem conflitos.

**Melhorias possíveis:**
- Testar whitelist de valores aceitos (lista explícita)
- Testar merge/override de múltiplas chamadas
- Considerar teste visual (snapshot) para garantir que os estilos finais estão corretos

---

#### 2.11 `Testimonials/index.test.js`

**Finalidade:** Testar o componente `Testimonials` — carrossel de dicas/depoimentos com scroll horizontal.

**Importações:** RTL + Jest + `mockGlobalFetch`.

**Setup pesado com manipulação de prototype:**
```js
beforeAll:
  - console.error = jest.fn()
  - mockGlobalFetch()
  - HTMLElement.prototype.scrollBy = jest.fn()
  - clientWidth = 300, scrollWidth = 1200, scrollLeft = 0
```

**Casos de teste (4):**

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Dicas da API | Exibe "Dicas do Dia" + conteúdo das dicas |
| 2 | Erro/exception → oculta | Se API falha, não renderiza nada |
| 3 | Erro HTTP / array vazio → oculta | Não renderiza se `ok: false` ou array vazio |
| 4 | Carousel (>3 itens) | Botões Próxima/Anterior gerenciam scroll + resize |

**Problemas identificados:**

1. **Manipulação global de prototype**: `Object.defineProperty(HTMLElement.prototype, 'clientWidth', ...)` — isso afeta TODOS os elementos HTML no teste. É uma abordagem frágil que pode causar comportamentos inesperados em outros componentes renderizados no mesmo teste.

2. **Teste 4 — Verificação de unmount**: `expect(removeEventListenerSpy.mock.calls.some(call => call[0] === 'resize')).toBe(true)` — verifica se `resize` foi removido no unmount. É um teste de implementação, não de comportamento. Se o componente trocar `window.removeEventListener` por `AbortController` ou cleanup de effect, o teste quebra.

3. **Sem teste de acessibilidade**: Carrossel deveria ter `aria-roledescription`, `aria-label` nos itens, anúncio de mudanças para leitores de tela.

4. **Teste 3 com múltiplos unmounts**: Renderiza, unmounta, renderiza novamente. Isso é necessário porque o mock de fetch é configurado duas vezes, mas é um padrão incomum que pode confundir.

5. **`fetchMock.mockClear()` no beforeEach**: Limpa o mock, mas o `beforeAll` configura o mock global. Se outros testes rodarem antes, o estado pode estar contaminado.

**Melhorias possíveis:**
- Evitar manipulação de prototype — usar refs ou data-testids para controlar scroll
- Testar comportamento (visibilidade de itens) ao invés de implementação (scrollBy chamado)
- Adicionar testes de acessibilidade (aria attributes)
- Considerar biblioteca de teste de carrossel (user-event para drag)

---

#### 2.12 `VideoCard.test.js`

**Finalidade:** Testar o componente `VideoCard` — card de vídeo com embed lazy do YouTube.

**Importações:** RTL + Jest.

**Mock:** `components/Performance` → `LazyIframe` mockado para evitar carregamento real de iframe.

**Casos de teste (2):**

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Render sem descrição | Título + LazyIframe com src, title, thumbnail |
| 2 | Render com descrição | Descrição aparece quando fornecida |

**Problemos identificados:**

1. **Cobertura muito baixa**: Apenas 2 testes para um componente que provavelmente tem mais comportamentos (estado de loading do thumbnail, fallback sem thumbnail, clique para carregar vídeo).

2. **Sem teste de thumbnail null**: O mock passa `thumbnail || 'null'` — mas não testa o que acontece quando `thumbnail` é undefined/null.

3. **Sem teste de formatos de URL**: YouTube tem múltiplos formatos (youtube.com/watch, youtu.be, youtube.com/embed) — nenhum teste verifica conversão.

**Melhorias possíveis:**
- Adicionar teste de thumbnail ausente
- Testar múltiplos formatos de URL do YouTube
- Testar estado de carregamento do iframe (lazy loading)
- Testar acessibilidade (aria-label no iframe?)

---

#### 2.13 `VideoGallery.test.js`

**Finalidade:** Testar o componente `VideoGallery` — galeria paginada de vídeos com busca e debounce.

**Importações:** RTL + Jest + `mockGlobalFetch`.

**Mocks:**
```js
jest.mock('Video/VideoCard') → dummy com data-testid="video-card"
jest.mock('UI/Spinner')      → Spinner com role="status"
```

**Setup:**
```js
beforeEach: jest.useFakeTimers() + mockGlobalFetch()
afterEach: jest.useRealTimers() + fetchMock?.mockRestore()
```

**Casos de teste (7):**

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Loading → render | Spinner inicial, depois vídeos + contador |
| 2 | Singular (1 vídeo) | "Mostrando 1 de 1 vídeo" |
| 3 | Busca com debounce | Debounce 300ms, depois limpar |
| 4 | Lista vazia na busca | "Nenhum vídeo encontrado" + "Limpar busca" |
| 5 | API sem data/pagination | Fallback → "Nenhum vídeo encontrado" |
| 6 | Erro fetch + retry | Exibe erro, botão "Tentar novamente" funciona |
| 7 | Navegação páginas | Próxima e Anterior com `page=2`, `page=1` |

**Problemas identificados:**

1. **Testes 6 e 7 com timeout 15000**: `}, 15_000)` — timeout estendido indica que esses testes podem ser lentos ou flaky. 15 segundos é muito para um teste unitário.

2. **Teste 3 — `global.fetch.mockResolvedValue` (sem Once)**: Usa `mockResolvedValue` (não `Once`), então TODAS as chamadas subsequentes retornam o mesmo valor. Isso funciona para o teste, mas pode mascarar bugs de chamadas duplicadas.

3. **Sem teste de ordenação**: Diferente de MusicGallery, não há teste de mudança de ordenação.

4. **Dados de teste duplicados**: `mockVideos` define `title` E `titulo` (redundante). O mock do VideoCard usa `video.title || video.titulo`.

5. **Teste 4 — Busca sem mock específico**: Usa `global.fetch.mockResolvedValue` (herdado do teste anterior?) mas o beforeEach faz `mockGlobalFetch()` que reseta. Pode depender de estado residual.

**Melhorias possíveis:**
- Investigar por que testes 6/7 precisam de 15s (possível await mal configurado)
- Testar ordenação se o componente suportar
- Reduzir duplicação nos dados de teste (title/titulo)
- Verificar se `mockResolvedValue` sem Once é intencional

---


#### 3.1 Duplicação de Código

| Duplicação | Arquivos | Sugestão |
|------------|----------|----------|
| Mock do `MusicCard` | MusicGallery.test.js + MusicGallery.edge.test.js | Extrair para `tests/mocks/components.js` |
| Mock do `useDebounce` | ProductList.test.js | Poderia ser global em setup |
| `mockGlobalFetch` pattern | 7 arquivos | Já encapsulado em helper — ok |
| `suppressConsoleError` pattern | 9 arquivos | Já encapsulado em helper — ok |

#### 3.2 Código Morto / Não Utilizado

| Item | Local | Observação |
|------|-------|------------|
| `filterConsoleError` | `tests/helpers/console.js` | Definido mas não usado em nenhum dos 14 arquivos |
| `createConfirmSpy` | `tests/helpers/console.js` | Definido mas não usado |
| `createGetRequest`, `createPostRequest`, etc. | `tests/helpers/api.js` | Definidos mas não usados nos testes de Features |
| `createWebhookPayload` | `tests/helpers/api.js` | Não usado |
| `executeHandler` | `tests/helpers/api.js` | Não usado |

#### 3.3 Inconsistências de Padrão

| Inconsistência | Detalhes |
|----------------|----------|
| `mockResolvedValueOnce` vs `mockResolvedValue` | Maioria usa `Once`, mas VideoGallery.test.js:6 usa `mockResolvedValue` |
| `jest.restoreAllMocks()` vs `.mockRestore()` | ContentTabs usa restoreAllMocks; outros usam mockRestore individual |
| Fake timers | VideoGallery e ProductList usam fake timers para debounce/loading; MusicGallery não (implica debounce curto ou ausência) |
| Timeout estendido | VideoGallery.test.js:6,7 usam `15_000`ms — indica possível flakiness |

#### 3.4 Testes de Implementação vs Comportamento

| Arquivo | Teste | Problema |
|---------|-------|----------|
| ContentTabs.test.js | #4 | Espiona `React.useState` — acoplado à implementação |
| Testimonials/index.test.js | #4 | Verifica `removeEventListener` — acoplado à implementação |
| ProductList.test.js | #16 | Testa lógica de paginação (janela deslizante) — deveria ser teste de hook |
| MusicGallery.test.js | #7 | Verifica URLs de fetch — acoplado à implementação da API |

#### 3.5 Acessibilidade

Nenhum dos 14 arquivos testa explicitamente atributos ARIA, navegação por teclado (além do básico Escape no lightbox), ou anúncios para leitores de tela. Componentes como ContentTabs, Testimonials (carrossel) e VideoGallery teriam grande benefício de testes de a11y.

---


| Feature | Arquivos | Teste Count | Cobertura Subjectiva |
|---------|----------|-------------|---------------------|
| Blog | 2 | 12 | Boa — falta retry e data |
| ContentTabs | 2 | 6 | Média — teste de useState frágil |
| Music | 3 | 21 | Boa — duplicação de mocks |
| Products | 3 | 33 | Boa — teste de paginação complexo |
| Testimonials | 1 | 4 | Baixa — prototype hacking |
| Video | 2 | 9 | Baixa — poucos testes no Card |

---


#### 5.1 Alta Prioridade
1. **Extrair mocks duplicados** para arquivo compartilhado (`tests/mocks/components.js`)
2. **Remover/relocar** helpers não utilizados em `tests/helpers/api.js` (ou documentar como futuro)
3. **Refatorar teste de paginação** do ProductList para testar hook isoladamente
4. **Investigar timeout 15s** em VideoGallery — provável flakiness

#### 5.2 Média Prioridade
5. **Substituir `jest.spyOn(React, 'useState')`** em ContentTabs por teste de comportamento
6. **Adicionar data-testid** ao container de paginação do ProductList
7. **Remover manipulação de prototype** em Testimonials — usar refs/data-testids
8. **Aumentar cobertura** de VideoCard (thumbnail null, formatos de URL)

#### 5.3 Baixa Prioridade
9. **Consolidar MusicGallery.edge** no arquivo principal (ou documentar razão de separação)
10. **Adicionar testes de acessibilidade** em ContentTabs e Testimonials
11. **Testar debounce real** em ProductList (ou documentar desativação)
12. **Adicionar teste de teclado** (setas) no lightbox do ProductCard

---


| Métrica | Valor |
|---------|-------|
| Total de arquivos analisados | 14 |
| Total de casos de teste | ~105 |
| Total de linhas de código | ~1.870 |
| Mocks de componentes | 10 |
| Mocks de hooks | 2 (useDebounce, useApiFetch) |
| Helpers utilizados | 2 de 5 disponíveis |
| Arquivos com problemas de duplicação | 2 (Music) |
| Arquivos com teste de implementação | 4 |
| Arquivos com potencial flaky test | 1 (VideoGallery) |


---


## 12. Testes Unitários — Layout, Performance e SEO

## Índice

1. [Visão Geral](#visão-geral)
2. [Layout](#layout)
   - [Container.test.js](#containertestjs)
   - [Grid.test.js](#gridtestjs)
   - [Sidebar.test.js](#sidebartestjs)
   - [Stack.test.js](#stacktestjs)
   - [Layout/index.test.js](#layoutindextestjs)
3. [Performance](#performance)
   - [CriticalCSS.test.js](#criticalcsstestjs)
   - [ImageOptimized.test.js](#imageoptimizedtestjs)
   - [LazyIframe.test.js](#lazyiframetestjs)
   - [PreloadResources.test.js](#preloadresourcestestjs)
   - [Performance/index.test.js](#performanceindextestjs)
4. [SEO](#seo)
   - [Head.test.js](#headtestjs)
   - [ArticleSchema.test.js](#articleschematestjs)
   - [BreadcrumbSchema.test.js](#breadcrumbschematestjs)
   - [MusicSchema.test.js](#musicschematestjs)
   - [OrganizationSchema.test.js](#organizationschematestjs)
   - [VideoSchema.test.js](#videoschematestjs)
   - [WebsiteSchema.test.js](#websiteschematestjs)
   - [SEO/index.test.js](#seoindextestjs)
5. [Achados Transversais](#achados-transversais)
6. [Recomendações](#recomendações)

---


A suíte de testes cobre três domínios do Design System do projeto **Caminhar**:

| Categoria | Arquivos | Componentes testados | Padrão dominante |
|-----------|----------|----------------------|------------------|
| **Layout** | 5 | Container, Grid, Stack, Sidebar | Renderização + subcomponentes |
| **Performance** | 5 | CriticalCSS, ImageOptimized, LazyIframe, PreloadResources | Mock de APIs externas (next/image, IntersectionObserver, document) |
| **SEO** | 8 | SEOHead, 6 schemas estruturados | JSON-LD parsing + barrel exports |

**Stack de testes:** Jest + @testing-library/react + jest-dom matchers.

---

## Layout

#### Container.test.js

**Arquivo:** `tests/unit/components/Layout/Container.test.js`
**Componente-alvo:** `components/Layout/Container.js`

#### Finalidade

Valida o componente `Container` — um wrapper de layout centralizado com `max-width` configurável. O componente suporta:
- Polimorfismo via prop `as` (renderiza como `div`, `main`, `section`, `article`)
- Variantes de tamanho (`sm`, `md`, `lg`, `xl`, `2xl`, `full`)
- Modo `fluid` (100% de largura com padding)
- Subcomponentes estáticos: `Container.Section` e `Container.Article`

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Renderização padrão | `div` como tagName padrão + textContent |
| 2 | Props customizadas | `fluid`, `as="main"`, `className`, `centered=false` |
| 3 | Container.Section | Renderiza `<section>` |
| 4 | Container.Article | Renderizar `<article>` |

#### Problemas e observações

1. **Cobertura parcial de props:** O teste 2 verifica que `tagName === 'MAIN'` mas não valida se `fluid`, `className` ou `centered` foram aplicados. A asserção é fraca — bastaria trocar `as` para qualquer valor e o teste ainda passaria.

2. **Ausência de validação de classes CSS:** Nenhum teste verifica se as classes CSS corretas (ex: `styles.container`, `styles.xl`, `styles.centered`) foram aplicadas ao elemento.

3. **Subcomponentes sem Props:** `Container.Section` e `Container.Article` aceitam `className` e `...props`, mas nenhum teste verifica passagem de props adicionais.

4. **Container.Section/Article sem displayName assertion:** O componente define `displayName`, mas não é testado.

#### Relações

- Importa diretamente de `../../../../components/Layout/Container.js` (path relativo quebrável).
- Sem dependências de mock — é um teste puro de renderização.

#### Sugestão de melhoria

```js
it('deve aplicar classes CSS corretas baseadas em size e centered', () => {
  const { container } = render(<Container size="lg" centered={false}>X</Container>);
  expect(container.firstChild).toHaveClass('container', 'lg');
  expect(container.firstChild).not.toHaveClass('centered');
});
```

---

#### Grid.test.js

**Arquivo:** `tests/unit/components/Layout/Grid.test.js`
**Componente-alvo:** `components/Layout/Grid.js`

#### Finalidade

Valida o sistema `Grid` flexível com 4 subcomponentes:
- `Grid` (base): `columns`, `gap`, `align`, `justify`
- `Grid.Item`: `colSpan`, `colStart`, `rowSpan`
- `Grid.Auto`: `minWidth` via CSS variable `--min-width`
- `Grid.Responsive`: breakpoints responsivos (`--cols-default`, `--cols-md`, etc.)

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Grid base | Props `gap`, `align`, `justify` renderizam |
| 2 | Grid.Item | `colSpan`, `colStart`, `rowSpan` |
| 3 | Grid.Auto | Injeção de `--min-width: 300px` via inline style |
| 4 | Grid.Responsive | CSS variables de breakpoints |
| 5 | Fallback responsivo | Cascata: usa `1` quando breakpoint não informado |

#### Problemas e observações

1. **Sem validação de classes:** Testes verificam textContent e inline styles, mas nunca validam classes CSS (ex: `styles.grid`, `styles.cols4`, `styles.gapLg`).

2. **Grid.Item sem asserção de output:** O teste 2 apenas verifica `textContent`, ignorando se `colSpan`, `colStart` e `rowSpan` geram classes como `styles.span2`, `styles.start1`, `styles.rowSpan3`.

3. **Fallback testa apenas `default`:** O teste 5 informa `columns={{}}` e espera `--cols-default: 1`, mas não verifica `--cols-sm`, `--cols-md`, etc.

4. **Função `getColsValue` indiretamente testada:** A lógica de cascata de breakpoints é validada apenas via saída CSS, sem teste unitário dedicado.

#### Relações

- Não usa mocks; testa comportamento renderizado.
- O componente exporta `Grid` (named) e `Grid` (default) — ambos apontam para o mesmo objeto.

---

#### Sidebar.test.js

**Arquivo:** `tests/unit/components/Layout/Sidebar.test.js`
**Componente-alvo:** `components/Layout/Sidebar.js`

#### Finalidade

Valida o layout `Sidebar` colapsável com:
- Toggle mobile (overlay)
- Handler `onCollapse`
- Posicionamento (`left`/`right`)
- Subcomponentes: `Nav`, `NavItem`, `Section`, `Header`, `Footer`
- Estado `collapsed` e `collapsible`

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Toggle mobile | Clique no botão "Abrir menu" → overlay aparece; clique no overlay → fecha |
| 2 | onCollapse handler | Botão "Colapsar" chama handler com `true` |
| 3 | Posição invertida | `collapsed={true}` → botão "Expandir" aparece |
| 4 | collapsible=false | Não mostra botões de toggle/colapsar |
| 5 | Subcomponentes | Header, Section(title), Nav, NavItem(active, label, icon, badge, href), Footer |

#### Problemas e observações

1. **Query frágil no teste 1:** `container.querySelector('[aria-hidden="true"]')` depende de detalhe de implementação interno.

2. **Sem teste de `persistCollapsed`:** O componente suporta `localStorage` via prop `persistCollapsed`, mas nenhum teste cobre esse cenário.

3. **Sem teste de `mobileOpen` controlado:** A prop `mobileOpen` (externamente controlada) não é testada.

4. **Sem teste de `onMobileToggle`:** Handler opcional não validado.

5. **Teste 2 assume `position="right"`:** Mas a asserção é sobre `onCollapse`, não sobre posição — o teste não valida o posicionamento em si.

6. **Código morto potencial:** O teste importa `jest` mas usa apenas `jest.fn()` — poderia usar `vi.fn()` se migrassem para Vitest, mas no contexto Jest está correto.

#### Relações

- Único teste de Layout que usa `fireEvent` e `screen` (interatividade).
- Importa `screen` e `fireEvent` de `@testing-library/react` — padrão correto para testes de interação.

---

#### Stack.test.js

**Arquivo:** `tests/unit/components/Layout/Stack.test.js`
**Componente-alvo:** `components/Layout/Stack.js`

#### Finalidade

Valida o componente `Stack` de empilhamento flexível com:
- Direção (`horizontal`/`vertical`)
- Subcomponentes: `Stack.Item`, `Stack.Divider`
- Atalhos: `Stack.VStack`, `Stack.HStack`

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Stack horizontal | Props `direction="row"`, `spacing`, `align`, `justify`, `wrap`, `inline` |
| 2 | Stack vertical | `direction="vertical"` |
| 3 | Subcomponentes | `Stack.Item` (grow, shrink, align) + `Stack.Divider` (role="separator") |
| 4 | Wrappers VStack/HStack | Atalhos renderizam |

#### Problemas e observações

1. **Sem asserção além de textContent:** Nenhum teste verifica classes CSS, flex-direction ou propriedades aplicadas.

2. **Stack.Spacer não testado:** O componente exporta `Stack.Spacer` mas nenhum teste o cobre.

3. **Stack.Item sem validação de props:** Props `grow`, `shrink`, `align` são passadas mas não verificadas.

4. **Teste 4 inline no `expect`:** Usa `expect(render(...)).toHaveTextContent()` inline — funciona, mas prejudica legibilidade em caso de falha.

#### Relações

- Não usa mocks.
- Mais simples que os demais testes de Layout.

---

#### Layout/index.test.js

**Arquivo:** `tests/unit/components/Layout/index.test.js`
**Barrel-alvo:** `components/Layout/index.js`

#### Finalidade

Snapshot test do barrel de Layout para garantir que a estrutura de exportações não quebre silenciosamente.

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Snapshot exports | `Object.keys(LayoutComponents).sort()` bate com snapshot |
| 2 | Container definido | `LayoutComponents.Container` existe |

#### Problemas e observações

1. **Snapshot frágil:** O snapshot atual deve conter: `Container`, `ContainerDefault`, `Grid`, `GridDefault`, `Sidebar`, `SidebarDefault`, `Stack`, `StackDefault`. Qualquer mudança no barrel quebra o snapshot — o que é o objetivo, mas exige `--updateSnapshot` manual.

2. **Nome incorreto no barrel:** O barrel exporta `Container`, `Grid`, `Stack`, `Sidebar` (named) e `ContainerDefault`, `GridDefault`, `StackDefault`, `SidebarDefault` (default renomeado). O teste nomeia `LayoutComponents` mas o barrel não usa `default` export.

3. **Duplicidade de exports:** O barrel exporta tanto named quanto default-renomeado para cada componente. Isso gera confusão: `import { Container }` vs `import ContainerDefault`. O teste não valida se são a mesma referência.

#### Relações

- Snapshot deve ser atualizado via `npx jest ... --updateSnapshot` (conforme comentário no arquivo).
- Padrão idêntico ao `Performance/index.test.js` e `SEO/index.test.js`.

---

## Performance

#### CriticalCSS.test.js

**Arquivo:** `tests/unit/components/Performance/CriticalCSS.test.js`
**Componente-alvo:** `components/Performance/CriticalCSS.js`

#### Finalidade

Valida o componente `CriticalCSS` e dois helpers:
- `CriticalCSS` (componente): Renderiza `<style id="critical-css">` com CSS inline
- `extractCriticalCSS()`: Helper que retorna o CSS crítico padrão
- `removeCriticalCSS(id)`: Remove `<style>` do DOM se CSS principal carregou

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Renderiza `<style>` com ID | `id="critical-css"` + innerHTML correto |
| 2 | CSS padrão quando prop ausente | Usa fallback de `criticalCSSRaw.js` |
| 3 | extractCriticalCSS | Retorna string com conteúdo esperado |
| 4 | removeCriticalCSS sucesso | Remove tag se stylesheet externa presente |
| 5 | removeCriticalCSS silenciosa | Não quebra se elemento inexistente |
| 6 | removeCriticalCSS SSR | Não quebra se `document` for undefined |

#### Problemas e observações

1. **Teste 4 — Mock frágil de `document.styleSheets`:** Usa `Object.defineProperty` para sobrescrever `document.styleSheets`, que é readonly. Embora funcione, é frágil e pode gerar warnings em alguns ambientes.

2. **Vazamento de DOM:** O teste 4 cria um `<style>` em `document.body` e depende de cleanup manual no final (linhas 65-68). Se `removeCriticalCSS` falhar silenciosamente, o elemento permanece.

3. **Restauração de `global.document`:** O teste 6 faz `delete global.document` e restaura — correto, mas arriscado se outros testes rodarem em paralelo.

4. **Sem teste de CSS vazio/falsy:** O componente retorna `null` se `!stylesToUse`, mas nenhum teste cobre esse branch.

5. **Código morto:** O componente exporta `extractCriticalCSS` e `removeCriticalCSS` — ambos testados. Porém, o JSDoc de `extractCriticalCSS` diz que é mantida para compatibilidade, sugerindo que é legacy.

#### Relações

- Mock interno de `document.styleSheets` via `Object.defineProperty` — necessário porque jsdom não simula `styleSheets` completamente.
- O componente importa `criticalStyles` de `./styles/criticalCSSRaw.js` — testado indiretamente via `extractCriticalCSS`.

---

#### ImageOptimized.test.js

**Arquivo:** `tests/unit/components/Performance/ImageOptimized.test.js`
**Componente-alvo:** `components/Performance/ImageOptimized.js`

#### Finalidade

Valida o wrapper `ImageOptimized` em torno de `next/image` com:
- Skeleton loader (esqueleto animado)
- Fallback de imagem (`fallbackSrc`) em caso de erro
- Prioridade (`priority`/`critical` → `loading="eager"`)
- Modo `fill` (aspect-ratio)

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Skeleton loader | Esqueleto aparece inicialmente, some no `onLoad` |
| 2 | Fallback de erro | `onError` troca `src` para `fallbackSrc`; segundo erro não re-dispara |
| 3 | Loading eager | `priority` ou `critical` → `loading="eager"` |
| 4 | Modo fill | `fill={true}` aplica `width: 100%` |
| 5 | borderRadius no skeleton | `style.borderRadius` é repassado ao skeleton |

#### Problemas e observações

1. **Mock de `next/image`:** O mock é inline no arquivo (linhas 8-24) e substitui o mock global de `next-setup.js`. Isso gera duplicidade de mocks se o mock global já estiver configurado.

2. **Query frágil:** `container.firstChild.firstChild` (linha 44) assume estrutura fixa de DOM (wrapper div → skeleton div). Qualquer refatoração quebra o teste.

3. **Teste 2 — Loop infinito prevention:** O componente evita re-chamar `onError` após primeiro erro (para evitar loops). Isso é validado, mas o teste não verifica se o estado `hasError` impede re-renderizações.

4. **Sem teste de `blurDataUrl`:** A prop `blurDataUrl` é passada no teste 4 mas nunca validada (se o placeholder blur foi aplicado).

5. **Sem teste de `sizes`:** A prop `sizes` tem fallback complexo no componente, mas nenhum teste a valida.

6. **`filterConsoleError` importado mas helper não encontrado:** O arquivo importa `../../../helpers/index.js` mas o helper não existe no diretório `tests/helpers/` (busca retornou 0 resultados). Isso sugere que o import falha silenciosamente ou o helper foi movido.

#### Relações

- Importa `filterConsoleError` de `../../../helpers/index.js` — helper inexistente no diretório esperado.
- Mock de `next/image` sobrescreve mock global — pode causar conflitos.

---

#### LazyIframe.test.js

**Arquivo:** `tests/unit/components/Performance/LazyIframe.test.js`
**Componente-alvo:** `components/Performance/LazyIframe.js`

#### Finalidade

Valida o componente `LazyIframe` para lazy-loading de iframes (YouTube, Spotify) com:
- IntersectionObserver para carregamento sob demanda
- Fila global de carregamento (max 2 concorrentes)
- Thumbnails dinâmicas para YouTube
- Fallback para clique manual
- Cleanup de observer no unmount

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Placeholder inicial | Iframe não renderizado inicialmente |
| 2 | IntersectionObserver | Iframe renderiza quando `isIntersecting=true` |
| 3 | URL YouTube | Extrai videoId, gera thumbnail e embed URL corretos |
| 4 | Thumbnail customizada | Sobrescreve thumbnail nativa do YouTube |
| 5 | onLoad callback | Chamado quando iframe carrega; opacidade vai a 1 |
| 6 | Clique manual | `loadOnVisible` dinâmico + clique no placeholder |
| 7 | Cleanup observer | `disconnect` chamado no unmount |
| 8 | Sem IntersectionObserver | Fallback com `loadOnVisible=false` + clique |
| 9 | URL inválida YouTube | Retorna `src` original se não conseguir extrair videoId |

#### Problemas e observações

1. **Mock de IntersectionObserver global:** Criado em `beforeEach` e armazenado em `observerInstance` (closure). Funciona, mas o mock expõe um método `trigger()` que não existe na API real — é um atalho de teste.

2. **Teste 6 complexo:** Combina `rerender` com troca de prop + clique — válido, mas difícil de depurar em caso de falha.

3. **Fila global não testada diretamente:** O componente usa `iframeLoadingQueue` (módulo-level singleton), mas nenhum teste valida o comportamento de fila (limite de 2 concorrentes, ordem de chegada).

4. **Sem teste de `threshold`:** A prop `threshold` é aceita pelo componente mas nunca validada.

5. **Sem teste de `placeholderText`:** A prop existe mas não é verificada.

6. **Sem teste de teclado (acessibilidade):** O placeholder tem `onKeyDown` para Enter/Space, mas nenhum teste simula navegação por teclado.

#### Relações

- Teste mais longo da suíte (118 linhas).
- Mock de `IntersectionObserver` é essencial — sem ele, os testes de lazy-loading não funcionariam.

---

#### PreloadResources.test.js

**Arquivo:** `tests/unit/components/Performance/PreloadResources.test.js`
**Componente-alvo:** `components/Performance/PreloadResources.js`

#### Finalidade

Valida o componente `PreloadResources` e o helper `getCriticalResources()`:
- Preconnect para domínios padrão (fonts.googleapis, gstatic, youtube, spotify)
- Preload de fontes com MIME types corretos
- Preload de imagens, scripts e estilos
- `getCriticalResources()` retorna recursos baseado em `pageType`

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Preconnect padrão + extra | Valida presença de `fonts.googleapis.com` e domínio customizado; `crossOrigin` em gstatic |
| 2 | Preload de fontes | 3 fontes com types woff2/woff/ttf |
| 3 | Preload imagens/scripts/styles | MIME types corretos; presença de links |
| 4 | getCriticalResources | Retorna recursos para `home`, `blog`, `musicas`, `videos`; desconhecido retorna vazio |

#### Problemas e observações

1. **Importação de mock global:** `import '../../../mocks/next-setup.js'` — o arquivo não existe (busca retornou 0 resultados). Isso causa falha de importação a menos que o Jest resolva via moduleNameMapper.

2. **Teste 4 — `pageType` desconhecido:** Retorna `{ fonts: [], images: [], scripts: [], styles: [], domains: [] }` — válido, mas o teste apenas verifica `images.length === 0`.

3. **Sem teste de deduplicação:** O componente usa `[...new Set([...DEFAULT_DOMAINS, ...domains])]` para evitar duplicatas — não testado.

4. **Sem teste de `fetchPriority`:** O preload de imagens usa `fetchPriority="high"` mas não é verificado.

5. **Sem teste de SSR:** O componente usa `Head` do Next.js — nenhum teste verifica comportamento fora do DOM.

#### Relações

- Importa mock de `../../../mocks/next-setup.js` — arquivo não localizado.
- O barrel `Performance/index.js` não exporta `PreloadResources` como default explícito, mas o import no teste usa default.

---

#### Performance/index.test.js

**Arquivo:** `tests/unit/components/Performance/index.test.js`
**Barrel-alvo:** `components/Performance/index.js`

#### Finalidade

Snapshot test do barrel de Performance.

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Snapshot exports | `Object.keys(PerformanceComponents).sort()` bate com snapshot |
| 2 | ImageOptimizado definido | `PerformanceComponents.ImageOptimized` existe |

#### Problemas e observações

1. **Barrel não exporta `ImageOptimized` como named:** O barrel usa `export { default as ImageOptimized }` — ou seja, o default do arquivo é renomeado para named export. O teste espera que `PerformanceComponents.ImageOptimized` exista, o que só funciona se o barrel estiver correto.

2. **Snapshot deve conter:** `CriticalCSS`, `ImageOptimized`, `LazyIframe`, `PreloadResources`, `extractCriticalCSS`, `getCriticalResources`, `removeCriticalCSS`.

3. **Padrão idêntico a Layout/index.test.js** — poderia ser fatorado em helper de teste.

---

## SEO

#### Head.test.js

**Arquivo:** `tests/unit/components/SEO/Head.test.js`
**Componente-alvo:** `components/SEO/Head.js`

#### Finalidade

Valida o componente `SEOHead` que gera todas as meta tags SEO:
- Title, description, keywords, canonical
- Open Graph (og:type, og:url, og:title, og:description, og:image)
- Twitter Cards
- Article meta tags (published_time, modified_time, author, section, tag)
- Robots (index/noindex)
- Image URL normalization (relativa vs absoluta)

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Meta tags básicas | Title concatenado, description, keywords, canonical, robots |
| 2 | URL raiz | Canonical sem trailing slash quando `/` |
| 3 | Título igual ao site | Não concatena se título === siteName |
| 4 | Canônica customizada | Usa prop `canonical`; OG remove query params |
| 5 | Imagem OG | Relativa vira absoluta; absoluta permanece |
| 6 | noindex | Meta robots = "noindex, nofollow" |
| 7 | Article meta | OG article props + Twitter data1/data2 |
| 8 | Author fallback | `twitter:data1` usa siteName se author ausente |

#### Problemas e observações

1. **Mock de `next/head`:** O componente mockado retorna `<div data-testid="next-head">{children}</div>`. Isso funciona para teste, mas não simula o comportamento real do Next.js (que move children para `<head>`).

2. **Mock de `next/router`:** Usa `jest.fn()` em `mockUseRouter` — requer `beforeEach` para resetar. Correto, mas frágil se testes forem reordenados.

3. **Mock de `lib/seo/config`:** Usa `jest.mock()` com objeto hardcoded — se o config real mudar, o mock fica desatualizado silenciosamente.

4. **Teste 5 usa `unmount`:** Renderiza, valida, unmount, renderiza novamente — padrão correto para testar efeitos colaterais.

5. **Regex no teste 7:** `toMatch(/01\/01\/2023|1\/1\/2023/)` — depende de locale do ambiente. Pode falhar em ambientes com timezone diferente.

6. **Sem teste de `children`:** A prop `children` (para meta tags adicionais) é aceita mas não testada.

7. **Sem teste de `theme-color` ou `viewport`:** Essas meta tags são fixas no componente mas nunca verificadas.

#### Relações

- Mock de três módulos: `next/head`, `next/router`, `lib/seo/config`.
- O componente é o mais complexo da categoria SEO.

---

#### ArticleSchema.test.js

**Arquivo:** `tests/unit/components/SEO/ArticleSchema.test.js`
**Componente-alvo:** `components/SEO/StructuredData/ArticleSchema.js`

#### Finalidade

Valida o schema `Article` do Schema.org para artigos do blog:
- JSON-LD gerado corretamente
- Fallback de `modifiedAt` = `publishedAt`
- Omissão de propriedades opcionais

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | JSON-LD completo | `@type` inclui `Article`, headline, dates, keywords, wordCount |
| 2 | Fallback modifiedAt + omissão | `modifiedAt` usa `publishedAt`; `wordCount` undefined se não passado |

#### Problemas e observações

1. **Parser JSON direto:** `JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML)` — assume que existe exatamente um script JSON-LD no `<head>`. Válido porque cada teste limpa o `head` no `afterEach`.

2. **Sem teste de `image`:** A prop `image` é passada no teste 1 mas não validada no JSON (apenas outras props são verificadas).

3. **Sem teste de `author`/`authorUrl`:** O schema inclui `author` com `Person`, mas não é verificado.

4. **`afterEach` limpa `document.head`:** Correto para isolamento, mas o componente renderiza no `<head>` via `StructuredDataBase` (que usa `dangerouslySetInnerHTML` em `<script>` dentro do documento, não necessariamente `document.head`). O `afterEach` pode não limpar o local correto.

5. **Schema `@type` é array:** `['Article', 'BlogPosting']` — o teste usa `toContain('Article')` que funciona, mas `expect(json['@type']).toBe(['Article', 'BlogPosting'])` seria mais preciso.

#### Relações

- Herda de `StructuredDataBase` — componente base que renderiza `<script type="application/ld+json">`.
- Usa helpers de `StructuredDataBase`: `formatSchemaDate`, `getImageUrl`, `siteConfig`.

---

#### BreadcrumbSchema.test.js

**Arquivo:** `tests/unit/components/SEO/BreadcrumbSchema.test.js`
**Componente-alvo:** `components/SEO/StructuredData/BreadcrumbSchema.js`

#### Finalidade

Valida o schema `BreadcrumbList`:
- Adiciona "Início" automaticamente
- Não duplica home se já for primeiro item
- Formata URLs absolutas e relativas

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Adiciona Início | Home é prefixada; itemListElement tem 2 itens |
| 2 | Não duplica home | Se primeiro item é home, não adiciona outro |
| 3 | Formatação de URLs | Absoluta permanece; relativa ganha `/` prefixado |

#### Problemas e observações

1. **Validação de `position`:** O schema gera `position: index + 1` automaticamente, mas nenhum teste verifica se as posições estão corretas (1, 2, 3...).

2. **Sem teste de items vazio:** O componente não trata `items=[]` — comportamento indefinido (provavelmente gera schema inválido).

3. **URL sem barra inicial:** O componente adiciona `/` prefixado para URLs relativas sem barra — válido, mas poderia falhar se a URL já começar com `//` (protocolo relativo).

4. **Duplicação de lógica com `siteUrl`:** O componente usa `siteUrl` importado de `StructuredDataBase` — se `siteUrl` mudar, os testes quebram.

---

#### MusicSchema.test.js

**Arquivo:** `tests/unit/components/SEO/MusicSchema.test.js`
**Componente-alvo:** `components/SEO/StructuredData/MusicSchema.js`

#### Finalidade

Valida o schema `MusicRecording` para músicas:
- Dados completos (artist, album, duration, lyrics)
- Links para Spotify/YouTube via `sameAs`

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Schema completo | `MusicRecording`, `byArtist`, `inAlbum`, `recordingOf.lyrics`, `sameAs` com spotify+youtube |
| 2 | Apenas youtubeId | `sameAs` tem 1 item (youtube); `inAlbum` undefined |

#### Problemas e observações

1. **Bug no schema real:** O componente tem um bug conhecido na geração de `sameAs`:
   - Se `spotifyId` e `youtubeId` são passados, o `youtubeId` sobrescreve o `spotifyId` porque ambos usam `...(spotifyId ? [...] : [])` dentro do mesmo objeto spread. O teste 1 espera que `sameAs` contenha ambos, mas o código real gera arrays separados que são mergeados — o resultado é imprevisível.

2. **Sem teste de `genre`:** A prop `genre` tem default `'Gospel Cristão'` mas nunca é validada.

3. **Sem teste de `releaseDate`:** Passada no componente mas não testada.

4. **`@type` único:** Diferente de `ArticleSchema`, `MusicSchema` usa `'MusicRecording'` (string) — não array.

---

#### OrganizationSchema.test.js

**Arquivo:** `tests/unit/components/SEO/OrganizationSchema.test.js`
**Componente-alvo:** `components/SEO/StructuredData/OrganizationSchema.js`

#### Finalidade

Valida o schema `Organization` para a organização do site.

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Schema Organization | `@type` = `Organization`, `name` = "Igreja" |

#### Problemas e observações

1. **Teste mínimo:** Apenas 1 teste com 2 asserções. Não valida `description`, `logo`, `sameAs`, `contactPoint`, `additionalType`, `knowsAbout`.

2. **Sem teste de defaults:** O componente aceita props opcionais com defaults do `siteConfig` — nenhum teste valida se os defaults são aplicados.

3. **Candidato a remoção/expansão:** Este é o teste mais fraco da suíte SEO.

---

#### VideoSchema.test.js

**Arquivo:** `tests/unit/components/SEO/VideoSchema.test.js`
**Componente-alvo:** `components/SEO/StructuredData/VideoSchema.js`

#### Finalidade

Valida o schema `VideoObject` para vídeos (pregações, testemunhos):
- Embed, thumbnail, métricas de views
- Tags como string ou array

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Schema completo | `VideoObject`, `embedUrl`, `interactionStatistic`, `transcript` |
| 2 | Tags string + contentUrl | `keywords` = string; `contentUrl` presente |

#### Problemas e observações

1. **Tags podem ser string ou array:** O componente faz `Array.isArray(tags) ? tags.join(', ') : tags` — o teste 2 valida o caso string, mas não o caso array.

2. **Sem teste de `views = 0`:** O componente usa `...(views && ...)` — se `views = 0`, não inclui `interactionStatistic`. Isso é um bug lógico (0 views ainda é uma contagem válida).

3. **`uploadDate` duplicado:** O componente gera tanto `uploadDate` quanto `datePublished` com o mesmo valor — redundante mas não testado.

---

#### WebsiteSchema.test.js

**Arquivo:** `tests/unit/components/SEO/WebsiteSchema.test.js`
**Componente-alvo:** `components/SEO/StructuredData/WebsiteSchema.js`

#### Finalidade

Valida o schema `WebSite` com `SearchAction`.

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | WebSite + SearchAction | `@type` = `WebSite`, `name`, `potentialAction.query-input` |

#### Problemas e observações

1. **Teste único:** Valida apenas o básico. Não testa `description`, `url`, `about`, `inLanguage`.

2. **`searchUrl` não testado:** A prop `searchUrl` tem default `${siteUrl}/blog?q={search_term_string}` mas nunca é verificada.

3. **Padrão de teste mínimo:** Similar a OrganizationSchema.test.js.

---

#### SEO/index.test.js

**Arquivo:** `tests/unit/components/SEO/index.test.js`
**Barrel-alvo:** `components/SEO/index.js`

#### Finalidade

Snapshot test do barrel SEO + validação de default export.

#### Casos de teste

| # | Teste | O que valida |
|---|-------|--------------|
| 1 | Snapshot exports | `Object.keys(SEOComponents).sort()` bate com snapshot |
| 2 | Default export = SEOHead | `DefaultExport === SEOHead` |

#### Problemas e observações

1. **Barrel exporta default como `Head.js`:** O barrel faz `export { default } from './Head'` — o default export é o componente `SEOHead`.

2. **Snapshot deve conter:** `ArticleSchema`, `BreadcrumbSchema`, `getCanonicalUrl`, `getImageUrl`, `MusicSchema`, `OrganizationSchema`, `SEOHead`, `siteConfig`, `VideoSchema`, `WebsiteSchema` (+ default).

3. **Diferente dos demais barrels:** Este teste também verifica se `DefaultExport === SEOComponents.SEOHead` — padrão único que valida a identidade da referência.

---

## Achados Transversais

#### Problemas Estruturais

| # | Problema | Severidade | Ocorrências |
|---|----------|------------|-------------|
| 1 | **Imports de helpers inexistentes** (`tests/helpers/index.js`, `tests/mocks/next-setup.js`) | Alta | ImageOptimized.test.js, PreloadResources.test.js, LazyIframe.test.js (next-setup) |
| 2 | **Mocks de `next/image` duplicados** | Média | ImageOptimized.test.js tem mock inline que sobrescreve mock global |
| 3 | **Testes de schema não validam todos os campos** | Média | ArticleSchema, MusicSchema, VideoSchema, OrganizationSchema, WebsiteSchema |
| 4 | **Testes de Layout não validam classes CSS** | Média | Container, Grid, Stack |
| 5 | **Testes de barrel são frágeis** (snapshot) | Baixa | Layout, Performance, SEO barrels |
| 6 | **Falta de testes de acessibilidade** | Média | Sidebar (teclado), LazyIframe (teclado), NavItem |
| 7 | **Sem testes de error boundaries** | Baixa | ImageOptimized (onError não testado completamente) |

#### Duplicidades

1. **Padrão de barrel snapshot:** Layout, Performance e SEO usam o mesmo padrão de teste (snapshot + validação de uma exportação crítica). Poderiam ser fatorados em `tests/helpers/barrelSnapshot.js`.

2. **Limpeza de `document.head`:** ArticleSchema, BreadcrumbSchema, MusicSchema, OrganizationSchema, VideoSchema, WebsiteSchema usam `afterEach(() => document.head.innerHTML = '')`. Deveria ser um helper global ou parte de um custom matcher.

3. **Mock de `next/head`:** Head.test.js cria mock inline, enquanto outros testes importam de `next-setup.js` — inconsistência.

4. **Parser JSON-LD repetido:** Todos os testes de schema usam o mesmo padrão `JSON.parse(document.querySelector('script[type="application/ld+json"]').innerHTML)`. Deveria ser um helper `parseJsonLd()`.

#### Código Morto

| Arquivo | Elemento | Justificativa |
|---------|----------|---------------|
| `Performance/index.js` | Nenhum | — |
| `CriticalCSS.js` | `extractCriticalCSS` (JSDoc diz "mantida para compatibilidade") | Legado |
| `Container.test.js` | `jest` importado mas usado apenas para `jest.fn()` | Não é código morto, mas import não utilizado em 3/4 dos testes |
| `Stack.js` | `Stack.Spacer` | Componente definido mas nunca testado |

---

## Recomendações

#### Prioridade Alta

1. **Criar `tests/helpers/parseJsonLd.js`:** Fatorar o parser JSON-LD repetido em todos os testes de schema.
2. **Criar `tests/mocks/next-setup.js`:** Mock global de `next/image`, `next/head`, `next/router` para evitar mocks inline duplicados.
3. **Criar `tests/helpers/index.js`:** Implementar `filterConsoleError` (importado por ImageOptimized.test.js mas inexistente).

#### Prioridade Média

4. **Expandir OrganizationSchema.test.js e WebsiteSchema.test.js:** Adicionar testes para todas as props e defaults.
5. **Adicionar testes de classes CSS em Layout:** Container, Grid, Stack.
6. **Adicionar testes de acessibilidade:** Simular teclado em LazyIframe e Sidebar.
7. **Testar `getColsValue` diretamente em Grid:** Extrair a função para módulo separado e testar isoladamente.
8. **Testar fila global `iframeLoadingQueue` em LazyIframe:** Validar limite de 2 concorrentes.

#### Prioridade Baixa

9. **Fatorar barrel snapshot helper:** Criar `tests/helpers/testBarrelExports.js` para eliminar duplicação.
10. **Migrar `extractCriticalCSS` para deprecation:** Se é legado, remover e atualizar chamadores.
11. **Adicionar teste para `Stack.Spacer`:** Cobrir componente não testado.
12. **Adicionar teste de `views={0}` em VideoSchema:** Validar que 0 não é tratado como falsy.
13. **Bug fix em `MusicSchema`:** Corrigir geração de `sameAs` quando `spotifyId` e `youtubeId` são passados simultaneamente.

---

*Documentado em 2026-09-23 a partir da análise de 18 arquivos de teste.*


---


## 13. Testes Unitários — UI Components


A pasta contém **11 arquivos de teste** que validam os componentes de interface do projeto Caminhar. Todos seguem o mesmo padrão tecnológico:

- **Framework**: Jest + React Testing Library
- **Estrutura**: `describe` por componente com casos em `it`
- **Linguagem**: Português (nomes, mensagens, comentários)
- **Padrão de import**: `../../../../components/UI/<Componente>.js`

---


**Caminho:** `tests/unit/components/UI/Alert.test.js`
**Componente testado:** `Alert`
**Linhas:** 33 | **Testes:** 3

#### Propósito
Validar o componente de alertas visuais que exibe mensagens contextuais (info, success, warning, error).

#### Testes

| # | Nome | Valida |
|---|------|--------|
| 1 | Renderização com variantes | Título, conteúdo e todos os 4 status (success, info, warning, error) renderizando corretamente |
| 2 | Ícone customizado | Aceita `icon` como React node |
| 3 | Fechamento | `closable` + `onClose` fecha o alerta e esvazia o container |

#### Análise Profunda

**Pontos positivos:**
- Cobre a renderização condicional dos 4 status, exercitando os ícones internos.
- Teste de fechamento valida tanto o callback `onClose` quanto a remoção do DOM (`toBeEmptyDOMElement`).
- Uso correto de `rerender` para testar múltiplas variantes sem re-montar o componente.

**Problemas identificados:**
- **Cobertura superficial de variantes**: Os status `info`, `warning`, `error` são apenas rerenderizados sem asserção (linhas 13-15). O comentário "Testa apenas a renderização dos outros para cobrir os ícones" admite que é teste de cobertura, não de comportamento.
- **Falta validação visual/aria**: Nenhuma verificação de `role="alert"`, `aria-live` ou classes CSS associadas aos status.
- **Falta teste de `closable` falso**: Não valida que sem a prop `closable`, o botão de fechar não aparece.
- **Sem teste de acessibilidade**: Nenhuma verificação de foco no alerta ao abrir.

**Melhorias sugeridas:**
```js
// Exemplo: validar aria-live por status
it('deve ter role="alert" em status de erro', () => {
  render(<Alert status="error">Erro</Alert>);
  expect(screen.getByRole('alert')).toBeInTheDocument();
});

// Exemplo: verificar que botão de fechar não aparece sem closable
it('não deve renderizar botão de fechar quando closable=false', () => {
  render(<Alert>Aviso</Alert>);
  expect(screen.queryByLabelText('Fechar alerta')).not.toBeInTheDocument();
});
```

**Código morto:** Nenhum.

---


**Caminho:** `tests/unit/components/UI/Badge.test.js`
**Componente testado:** `Badge` (Counter, Dot)
**Linhas:** 38 | **Testes:** 4

#### Propósito
Validar o componente Badge e seus subcomponentes `Counter` e `Dot`.

#### Testes

| # | Nome | Valida |
|---|------|--------|
| 1 | Badge padrão | `leftIcon`, `rightIcon`, `pulse`, `position` com texto |
| 2 | Modo dot | Renderiza apenas o indicador visual (acessível) sem texto |
| 3 | Badge.Counter | Contagem numérica, limite máximo (99+), zero invisível/explicito |
| 4 | Badge.Dot | Indicador de notificação com `aria-label` |

#### Análise Profunda

**Pontos positivos:**
- Teste de `dot` valida acessibilidade: o texto não aparece visualmente mas há `aria-label`.
- `Badge.Counter` cobre bem as bordas: count normal, limite `max`, zero condicional.
- Usa composição (`Badge.Counter`, `Badge.Dot`) refletindo a API real do componente.

**Problemas identificados:**
- **Teste de `position` inócuo**: A prop `position="top-right"` é passada mas nunca validada (linha 8). Não verifica classe CSS ou estilo.
- **Sem teste de `pulse`**: A prop `pulse` é passada mas nunca validada.
- **Falta teste de `Badge.Counter` com `count=0` e `showZero=false`**: O teste atual mostra que some, mas poderia verificar se há transição.
- **Apenas um `Badge.Dot` testado**: Sem variações de cor/status.

**Duplicidades:** Nenhuma significativa.

**Melhorias sugeridas:**
```js
// Validar position
it('deve aplicar classe de posição correta', () => {
  const { container } = render(<Badge position="top-right">B</Badge>);
  expect(container.firstChild).toHaveClass('position-top-right');
});

// Validar pulse visualmente
it('deve ter classe pulse quando ativado', () => {
  render(<Badge pulse><Badge.Dot /></Badge>);
  expect(screen.getByLabelText('Notificação')).toHaveClass('pulse');
});
```

---


**Caminho:** `tests/unit/components/UI/Button.test.js`
**Componente testado:** `Button`
**Linhas:** 40 | **Testes:** 3

#### Propósito
Validar o botão principal com suporte a loading, disabled, ícones e fullWidth.

#### Testes

| # | Nome | Valida |
|---|------|--------|
| 1 | Ícones e click | `leftIcon`, `rightIcon`, `onClick`, `fullWidth` |
| 2 | Loading | `aria-busy`, `aria-disabled`, `disabled`, ícones ocultos, click bloqueado |
| 3 | ARIA disabled | Valida `aria-disabled`, `aria-busy=false`, `disabled` nativo |

#### Análise Profunda

**Pontos positivos:**
- Excelente validação de acessibilidade: `aria-busy`, `aria-disabled` e `disabled` nativo.
- Modo loading previne cliques — comportamento crítico testado.
- Ícones laterais corretamente ocultos durante loading.

**Problemas identificados:**
- **Falta teste de variantes visuais**: Sem testar `primary`, `secondary`, `danger`, `ghost`, etc.
- **Falta teste de `type`**: Sem validar `type="submit"`, `type="reset"`.
- **Falta teste de `aria-label` customizado**: O componente provavelmente aceita.
- **Nenhum teste de `fullWidth` visual**: A prop é passada mas nunca verificada.
- **Sem teste de ícone único**: Apenas testa ambos simultaneamente.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
```js
it('deve ter type="submit" quando especificado', () => {
  render(<Button type="submit">Enviar</Button>);
  expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
});

it('deve aplicar classe fullWidth', () => {
  render(<Button fullWidth>Btn</Button>);
  expect(screen.getByRole('button')).toHaveClass('fullWidth');
});
```

---


**Caminho:** `tests/unit/components/UI/Card.test.js`
**Componente testado:** `Card` (e subcomponentes `Card.Header`, `Card.Footer`)
**Linhas:** 84 | **Testes:** 7

#### Propósito
Validar o componente Card com header, footer, media, click handler e navegação por teclado.

#### Testes

| # | Nome | Valida |
|---|------|--------|
| 1 | Renderização simples | `header`, `footer`, `hoverable` como nodes |
| 2 | Media (string/componente) | `media` como URL (img) ou React node |
| 3 | Click handler | `onClick` com role="button" |
| 4 | Subcomponentes | `Card.Header` (title, subtitle, icon, action) e `Card.Footer` |
| 5 | fullWidth | Aceita a prop e renderiza |
| 6 | Enter | `onClick` disparado com tecla Enter |
| 7 | Space | `onClick` disparado + `preventDefault` |
| 8 | Outras teclas | Não dispara `onClick` |

#### Análise Profunda

**Pontos positivos:**
- Teste de acessibilidade com teclas excelente: Enter, Space e negativas (Tab, Escape, ArrowDown).
- Valida `preventDefault` no Space — evita scroll da página.
- Teste de `media` como string (img com alt/src) e como componente.

**Problemos identificados:**
- **Teste de `fullWidth` sem asserção real**: Linhas 42-48 apenas comentam que CSS Modules é mockado. O teste é vazio de validação.
- **Sem teste de `hoverable`**: A prop é passada mas nunca verificada.
- **Sem teste de `Card.Footer` com `align`**: `align="center"` é passado mas nunca validado.
- **Falta teste de teclado sem `onClick`**: Deve garantir que não crasha sem handler.
- **Sem teste de `header` como string**: O teste atual usa node JSX.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
```js
// Validar tabIndex quando clickable
it('deve ter tabIndex=0 quando onClick é passado', () => {
  render(<Card onClick={() => {}}>C</Card>);
  expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');
});

// Testar que não adiciona role button sem onClick
it('não deve ter role button quando não é clickable', () => {
  render(<Card>Conteúdo</Card>);
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
```

---


**Caminho:** `tests/unit/components/UI/Input.test.js`
**Componente testado:** `Input`
**Linhas:** 68 | **Testes:** 6

#### Propósito
Validar o campo de entrada com label, addons, validação e clear.

#### Testes

| # | Nome | Valida |
|---|------|--------|
| 1 | Renderização completa | `label`, `required`, `leftAddon`, `rightAddon`, `ref` |
| 2 | Helper/Erro | `helperText` vs `errorMessage` com `aria-invalid` |
| 3 | Não controlado | Atualiza valor interno via `fireEvent.change` |
| 4 | Controlado | Dispara `onChange` sem alterar valor interno |
| 5 | Clearable | Botão de limpar aparece com valor |
| 6 | Limpar campo | `onClear` + `onChange` com valor vazio |

#### Análise Profunda

**Pontos positivos:**
- Distinção clara entre modo controlado vs não-controlado.
- Validação de `aria-invalid` condicional ao erro.
- Teste de limpar campo valida ambos os callbacks com argumentos corretos.
- `ref` funcional testado corretamente.

**Problemas identificados:**
- **Sem teste de `type`**: Não valida `type="password"`, `type="email"`, etc.
- **Sem teste de `disabled`**: Comportamento de input desabilitado não coberto.
- **Sem teste de `readOnly`**: Input somente leitura não testado.
- **Sem teste de `leftAddon`/`rightAddon` como React node**: Apenas strings testadas.
- **Sem teste de teclas (Escape para limpar)**: Comportamento comum em inputs clearable.
- **Falta validar `aria-describedby`**: O helperText provavelmente associa via `aria-describedby`.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
```js
it('deve ter aria-describedby apontando para helperText', () => {
  render(<Input helperText="Ajuda" id="meu-input" />);
  expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'meu-input-helper');
});

it('deve limpar campo com tecla Escape quando clearable', () => {
  const onClear = jest.fn();
  render(<Input clearable value="texto" onClear={onClear} />);
  fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
  expect(onClear).toHaveBeenCalled();
});
```

---


**Caminho:** `tests/unit/components/UI/Modal.test.js`
**Componente testado:** `Modal` (com `Modal.Footer`)
**Linhas:** 108 | **Testes:** 7

#### Propósito
Validar o modal/dialog com portal, focus trap, teclas e SSR.

#### Testes

| # | Nome | Valida |
|---|------|--------|
| 1 | Estado fechado | Retorna null quando `isOpen=false` |
| 2 | Estado aberto | Título, children |
| 3 | Fechamento (botão + overlay) | `onClose` via botão fechar e clique no dialog |
| 4 | Escape | `onClose` via tecla Escape no document |
| 5 | Focus Trap | Tab/Shift+Tab circulam dentro, restaura foco no unmount |
| 6 | Footer + preventScroll | `Modal.Footer` renderiza, classe `modal-open` no body |
| 7 | SSR | Sem `document.body`, renderiza inline (sem portal) |

#### Análise Profunda

**Pontos positivos:**
- **Teste de focus trap completo**: Valida Tab, Shift+Tab e restauração de foco.
- **Teste de SSR realista**: Remove `document.body` para simular ambiente servidor.
- **Teste de `preventScroll`**: Valida classe no body e limpeza no unmount.
- **Escape no document**: Valida listener global, não apenas no modal.
- **Uso de `waitFor`**: Correto para operações assíncronas (focus restauração).

**Problemas identificados:**
- **Sem teste de `initialFocus`**: Muitos modais permitem definir qual elemento recebe foco inicial.
- **Sem teste de `closeOnOverlayClick=false`**: O teste atual usa `true`, mas o false não é testado.
- **Sem teste de `size`**: Modal provavelmente tem `sm`, `md`, `lg`.
- **Falta validar `role="dialog"` e `aria-modal="true"`**: Acessibilidade não verificada.
- **Sem teste de animação de entrada/saída**: Se houver transição, não é coberta.
- **Limpeza de event listener no unmount não testada**: O listener de Escape pode vazar.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
```js
it('deve ter role="dialog" e aria-modal="true"', () => {
  render(<Modal isOpen title="T">Conteúdo</Modal>);
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveAttribute('aria-modal', 'true');
});

it('não deve fechar no overlay quando closeOnOverlayClick=false', () => {
  const onClose = jest.fn();
  render(<Modal isOpen onClose={onClose} closeOnOverlayClick={false} />);
  fireEvent.click(screen.getByRole('dialog'));
  expect(onClose).not.toHaveBeenCalled();
});
```

---


**Caminho:** `tests/unit/components/UI/Select.test.js`
**Componente testado:** `Select` (modos custom e nativo)
**Linhas:** 248 | **Testes:** 20

#### Propósito
Validar o select customizável com dropdown, busca com debounce, modo nativo e estado controlado.

#### Estrutura

| Grupo | Testes | Propósito |
|-------|--------|-----------|
| Top-level | 3 | Renderização, onChange, helperText/erro |
| `describe('modo custom')` | 6 | Dropdown, teclas, searchable, seleção, disabled |
| `describe('busca com debounce')` | 3 | Filtro 300ms, sem resultados, cancelamento |
| `describe('limpar seleção e valor controlado')` | 5 | Clear, value controlado, defaultValue, aria |
| `describe('modo nativo')` | 3 | Disabled, foco, aria-invalid/describedby |

#### Análise Profunda

**Pontos positivos:**
- **Teste de debounce com fake timers**: Correto uso de `jest.useFakeTimers()` + `act` + `advanceTimersByTime(300)`.
- **Cancelamento de debounce**: Testa que fechar antes de 300ms cancela a busca.
- **Modo nativo separado**: Distingue claramente `<select>` nativo do custom.
- **Validação de `aria-selected`**: No modo nativo com `defaultValue`.
- **Teste de `stopPropagation`**: Clique no input de busca não fecha o dropdown.
- **Reset de timers**: `beforeEach`/`afterEach` garantem limpeza dos fake timers.

**Problemas identificados:**
- **Sem teste de busca case-insensitive explícito**: O teste usa "OPÇÃO 1" mas não documenta que é case-insensitive.
- **Sem teste de `noOptionsMessage` customizável**: Mensagem fixa "Nenhuma opção encontrada" mas pode ser customizável.
- **Sem teste de `isLoading`**: Estado de carregamento não testado.
- **Sem teste de `isMulti`**: Select múltiplo não coberto.
- **Sem teste de `closeOnSelect=false`**: Manter dropdown aberto após selecionar.
- **Sem teste de teclas de navegação (ArrowDown/ArrowUp)**: Navegação por teclado no dropdown não testada.
- **Falta teste de `menuPlacement`**: Posição do dropdown (auto, top, bottom).
- **Sem teste de `blur` limpar valor de busca**: Comportamento comum.

**Duplicações:**
- `helperText` + `errorMessage` testado tanto no top-level quanto no `modo nativo` — poderia ser fatorado.
- Padrão de abrir dropdown repetido em múltiplos testes do `modo custom`.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
```js
// Navegação por teclado no dropdown
it('deve navegar opções com ArrowDown/ArrowUp', () => {
  render(<Select options={options} searchable />);
  const combobox = screen.getByRole('combobox');
  
  fireEvent.keyDown(combobox, { key: 'ArrowDown' });
  expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Opção 1');
  
  fireEvent.keyDown(combobox, { key: 'ArrowDown' });
  expect(screen.getByRole('option', { selected: true })).toHaveTextContent('Opção 2');
});

// Teste de multi-select
it('deve permitir seleção múltipla quando isMulti=true', () => {
  const onChange = jest.fn();
  render(<Select options={options} isMulti onChange={onChange} />);
  // ...selecionar múltiplas opções
});
```

---


**Caminho:** `tests/unit/components/UI/Spinner.test.js`
**Componente testado:** `Spinner` (Container, Overlay)
**Linhas:** 27 | **Testes:** 3

#### Propósito
Validar o indicador de carregamento com variantes e overlay.

#### Testes

| # | Nome | Valida |
|---|------|--------|
| 1 | Spinner base | `role="status"`, `aria-label`, `centered` |
| 2 | Variante dots | 3 spans para os pontos |
| 3 | Container + Overlay | Delegação de acessibilidade ao Spinner filho |

#### Análise Profunda

**Pontos positivos:**
- Validação de `role="status"` — padrão correto para loading.
- Teste de variante `dots` verifica estrutura exata (3 spans).
- Documentação clara sobre delegação de acessibilidade no Overlay.

**Problemas identificados:**
- **Cobertura mínima**: Apenas 3 testes para múltiplas variantes (presume-se que existam mais: `lines`, `circle`, etc.).
- **Sem teste de `size`**: Spinner provavelmente aceita `sm`, `md`, `lg`.
- **Sem teste de `color`**: Cor customizável não testada.
- **Sem teste de `delay`**: Muitos spinners têm delay antes de aparecer.
- **Sem teste de `label` vazio**: Comportamento sem label não documentado.
- **Sem teste de `Overlay` standalone**: Overlay sem Spinner filho não testado.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
```js
it('deve renderizar variante circle corretamente', () => {
  render(<Spinner variant="circle" />);
  expect(container.firstChild).toHaveClass('spinner-circle');
});

it('deve ter delay antes de aparecer quando delay > 0', () => {
  jest.useFakeTimers();
  render(<Spinner delay={300} label="Carregando" />);
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  act(() => jest.advanceTimersByTime(300));
  expect(screen.getByRole('status')).toBeInTheDocument();
  jest.useRealTimers();
});
```

---


**Caminho:** `tests/unit/components/UI/TextArea.test.js`
**Componente testado:** `TextArea`
**Linhas:** 172 | **Testes:** 11

#### Propósito
Validar o campo de texto multi-linha com auto-resize, contador e bloqueio de limite.

#### Testes

| # | Nome | Valida |
|---|------|--------|
| 1 | Renderização | `label`, `ref`, `required` |
| 2 | Contador + autoResize | `showCount`, `maxLength`, `autoResize` ajusta altura |
| 3 | Helper/Erro | Troca de helperText para errorMessage |
| 4 | DefaultValue + espaço | Contador usa defaultValue, espaço reservado quando sem texto |
| 5 | minRows | Respeita limite mínimo de linhas |
| 6 | maxRows | Respeita limite máximo + overflow |
| 7 | Desabilitar autoResize | Limpa estilo e overflow ao desabilitar |
| 8 | AutoResize na montagem | Aplica altura ao montar com valor longo |
| 9 | blockOnLimit | Bloqueia digitação no limite (maxLength) |
| 10 | Teclas de edição | Backspace/Arrow/Delete permitidos quando bloqueado |
| 11 | Sem blockOnLimit | Permite digitar além do limite por padrão |

#### Análise Profunda

**Pontos positivos:**
- **Teste de autoResize completo**: minRows, maxRows, scrollHeight mockado.
- **Teste de montagem**: Valida autoResize ao montar (lifecycle).
- **Bloqueio de limite**: Valida `preventDefault` + teclas de edição permitidas.
- **Mock de `getComputedStyle`**: Correto uso de `beforeEach`.
- **Delegação de ref**: Testa `createRef` com id correto.

**Problemas identificados:**
- **Sem teste de `disabled`**: TextArea desabilitado não testado.
- **Sem teste de `readOnly`**: Modo somente leitura não coberto.
- **Sem teste de `onChange` com debounce**: Muitos textareas têm debounce.
- **Sem teste de `autoResize` com `resize` CSS**: Interação com `resize: none`.
- **Falta validar `aria-describedby`**: Contador/helper provavelmente associa.
- **Sem teste de `showCount` sem `maxLength`**: Comportamento não documentado.
- **Mock de `scrollHeight` inconsistente**: Usa `Object.defineProperty` em alguns, mock global em outros — padrão inconsistente.

**Duplicações:**
- Padrão de mock de `scrollHeight` + `fireEvent.change` repetido nos testes de autoResize.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
```js
it('deve ter aria-invalid quando error=true', () => {
  render(<TextArea error errorMessage="Erro" />);
  expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
});

it('deve respeitar rows quando autoResize=false', () => {
  render(<TextArea rows={5} autoResize={false} />);
  expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
});
```

---


**Caminho:** `tests/unit/components/UI/Toast.test.js`
**Componente testado:** `Toast` + `useToast` hook
**Linhas:** 120 | **Testes:** 6

#### Propósito
Validar o sistema de notificações com fechamento automático, hook de gerenciamento e posições.

#### Testes

| # | Nome | Valoda |
|---|------|--------|
| 1 | Auto-close | Fecha após `duration` + animação |
| 2 | Botão fechar | `isClosable` + `onClose` |
| 3 | Persistente | `duration=0` não fecha automaticamente |
| 4 | Hook useToast | Adicionar/remover toasts |
| 5 | Status via hook | `toast.info`, `toast.warning`, `toast.error` |
| 6 | Container | Posições e className customizada |

#### Análise Profunda

**Pontos positivos:**
- **Teste de animação de saída**: Valida delay extra (300ms) após tempo visível.
- **Fake timers globais**: `beforeEach`/`afterEach` garantem limpeza.
- **Hook testado em isolamento**: Componente dedicado `HookTestComponent`.
- **`it.each` para status**: Padrão correto para testar variações.
- **Duração persistente**: Valida que `duration=0` mantém aberto.

**Problemas identificados:**
- **Sem teste de `toast.promise`**: Muitas APIs de toast têm suporte a Promise (loading → success).
- **Sem teste de `updateToast`**: Atualização de toast existente não coberta.
- **Sem teste de limite de toasts**: Máximo de toasts visíveis não testado.
- **Sem teste de `pauseOnHover`**: Pausar auto-close ao passar mouse.
- **Sem teste de `position` com classe CSS**: Posição é passada mas nunca validada visualmente.
- **Sem teste de `swipeToDismiss`**: Em mobile, dismiss por gesture.
- **Sem teste de `aria-live`**: Toasts devem ter `aria-live="polite"` ou `"assertive"`.
- **Componente `HookTestComponent` no escopo do arquivo**: Polui o módulo — deveria ser helper isolado.

**Duplicações:**
- Padrão de `HookTestComponent` repetido no teste `it.each` (linhas 76-89) com lógica similar ao componente principal.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
```js
it('deve ter aria-live="polite" para não assertive', () => {
  render(<Toast isOpen title="Info" />);
  expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
});

it('deve pausar auto-close quando pauseOnHover=true', () => {
  const onClose = jest.fn();
  render(<Toast isOpen title="Hover" duration={1000} pauseOnHover onClose={onClose} />);
  fireEvent.mouseEnter(screen.getByRole('status'));
  act(() => jest.advanceTimersByTime(2000));
  expect(onClose).not.toHaveBeenCalled();
});

it('toast.promise deve mostrar loading e depois success', async () => {
  const promise = Promise.resolve('ok');
  const TestPromise = () => {
    const { toast } = useToast();
    return <button onClick={() => toast.promise(promise, { loading: 'Carregando', success: 'Ok' })}>Go</button>;
  };
  render(<TestPromise />);
  // ...
});
```

---


**Caminho:** `tests/unit/components/UI/index.test.js`
**Componente testado:** Barrel export (`UI/index.js`)
**Linhas:** 14 | **Testes:** 2

#### Propósito
Validar que o barrel (arquivo de índice) exporta todos os componentes UI corretamente.

#### Testes

| # | Nome | Valida |
|---|------|--------|
|1 | Snapshot de exportações | `Object.keys` ordenados contra snapshot |
|2 | Referência crítica | `Button` está definido |

#### Análise Profunda

**Pontos positivos:**
- **Snapshot automático**: Detecta mudanças acidentais nas exportações.
- **Comando documentado**: Comentário no topo explica como atualizar o snapshot.
- **Referência crítica**: Validar `Button` especificamente é boa prática (componente mais usado).

**Problemas identificados:**
- **Snapshot frágil**: Qualquer adição/remoção de componente quebra o snapshot — pode gerar fadiga.
- **Sem validação de tipos**: Verifica existência mas não se é função/componente válido.
- **Apenas um componente explícito**: Apenas `Button` é validado individualmente.
- **Sem validação de subcomponentes**: `Card.Header`, `Badge.Counter` etc. não são verificados.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
```js
it('deve exportar todos os componentes como funções válidas', () => {
  Object.entries(UIComponents).forEach(([name, component]) => {
    expect(typeof component).toBe('function');
  });
});

it('deve incluir os subcomponentes esperados', () => {
  expect(UIComponents.Card).toHaveProperty('Header');
  expect(UIComponents.Card).toHaveProperty('Footer');
  expect(UIComponents.Badge).toHaveProperty('Counter');
});
```

---

## Síntese Transversal

#### Métricas Gerais

| Métrica | Valor |
|---------|-------|
| Total de arquivos | 11 |
| Total de linhas de teste | ~952 |
| Total de casos de teste | ~65 |
| Componentes cobertos | 10 |
| Arquivos com `describe` aninhado | 2 (Select, Badge parcial) |
| Arquivos com subcomponentes testados | 4 (Badge, Card, Modal, Spinner) |

#### Padrões Consistentes

1. **Fake timers**: Modal, Select, Toast usam corretamente `useFakeTimers`/`useRealTimers`.
2. **Rerender pattern**: Alert, Card, Input, Select, Toast usam `rerender` para testar mudanças de props.
3. **Acessibilidade**: Button, Card, Input, Select validam ARIA attributes.
4. **Ref pattern**: Input, Select, TextArea testam `createRef` com id.
5. **Comentários em português**: Todo o código é documentado em português.

#### Duplicações Identificadas

| Padrão duplicado | Ocorrências | Sugestão |
|------------------|-------------|----------|
| helperText ↔ errorMessage toggle | Input, TextArea, Select | Extrator helper `testErrorToggle(Component)` |
| Mock de scrollHeight + fireEvent.change | TextArea (5x) | Extrator helper `mockScrollHeight(el, px)` |
| beforeFocus/unmount + waitFor focus | Modal | Extrair `expectFocusRestored(trigger)` |

#### Código Morto

Nenhum código morto identificado. Todos os testes têm asserções válidas.

#### Cobertura de Testes por Componente

| Componente | Cobertura Estimada | Lacunas Principais |
|------------|-------------------|-------------------|
| Alert | ~60% | Sem variantes visuais, sem aria-live |
| Badge | ~70% | Sem validação de position/pulse |
| Button | ~55% | Sem variantes, sem type, sem aria-label |
| Card | ~75% | Sem validação de hoverable, fullWidth vazio |
| Input | ~65% | Sem type, disabled, readOnly, aria-describedby |
| Modal | ~85% | Sem initialFocus, closeOnOverlayClick=false |
| Select | ~80% | Sem multi, setas, isLoading |
| Spinner | ~50% | Sem size, color, delay, outras variantes |
| TextArea | ~85% | Sem disabled, readOnly, debounce |
| Toast | ~70% | Sem promise, pauseOnHover, aria-live |
| Barrel | ~90% | Snapshot frágil, sem validação de tipos |

---

## Recomendações Prioritárias

#### 1. Criar arquivo de shared helpers

`tests/unit/components/UI/__helpers__/common.js`:

```js
export const testErrorToggle = (Component) => {
  const { rerender } = render(<Component helperText="Ajuda" />);
  expect(screen.getByText('Ajuda')).toBeInTheDocument();
  rerender(<Component helperText="Ajuda" error errorMessage="Erro" />);
  expect(screen.queryByText('Ajuda')).not.toBeInTheDocument();
  expect(screen.getByText('Erro')).toBeInTheDocument();
};

export const mockScrollHeight = (element, px) => {
  Object.defineProperty(element, 'scrollHeight', { value: px, configurable: true });
};
```

#### 2. Adicionar testes de acessibilidade transversais

Todos os componentes interativos devem ter:
- `role` correto
- `aria-label`/`aria-labelledby` quando aplicável
- `aria-invalid` para erros
- `aria-describedby` para textos auxiliares

#### 3. Criar teste de contrato de API

Garantir que todos os componentes UI exportados:
- São funções/componentes válidos
- Aceitam `ref` quando aplicável
- Aceitam `className` customizado
- Aceitam `data-testid`

#### 4. Padronizar fake timers

Criar helper reutilizável:

```js
export const withFakeTimers = (fn) => () => {
  jest.useFakeTimers();
  try {
    fn();
  } finally {
    jest.useRealTimers();
  }
};
```

#### 5. Adicionar teste de regressão visual integrado

Considerar `@storybook/test-runner` ou `jest-image-snapshot` para componentes com CSS Modules.

---

## Conclusão

A suite de testes UI do Caminhar é **bem estruturada e consistente**, cobrindo os comportamentos principais de cada componente. Os pontos fortes são o uso correto de Testing Library, fake timers e validação de acessibilidade em alguns componentes.

As principais oportunidades são:
1. **Cobertura de edge cases** (disabled, readOnly, loading states)
2. **Testes de variantes visuais** (size, color, variant)
3. **DRY nos padrões de teste** repetidos
4. **Transversalidade de acessibilidade** (testar aria-* em todos)
5. **Cobertura de subcomponentes** no barrel test

A ausência de código morto e a clareza dos comentários são indicativos de manutenção ativa e boa intenção de documentação.


---


## 14. Testes Unitários — Lib

## Sumário

1. [Visão Geral do Conjunto](#1-visão-geral-do-conjunto)
2. [Análise Individual](#2-análise-individual)
   - [products.test.js](#21-productstestjs)
   - [seo/config.test.js](#22-seoconfigtestjs)
   - [api/errors.test.js](#23-apierrorstestjs)
   - [api/index.test.js](#24-apiindextestjs)
   - [api/middleware.test.js](#25-apimiddlewaretestjs)
   - [api/response.test.js](#26-apiresponsetestjs)
   - [api/validate.test.js](#27-apivalidatetestjs)
   - [auth.test.js](#28-authtestjs)
   - [cache.test.js](#29-cachetestjs)
   - [crud.test.js](#30-crudtestjs)
   - [db.test.js](#31-dbtestjs)
   - [middleware.test.js](#32-middlewaretestjs)
   - [redis.test.js](#33-redistestjs)
3. [Relações e Dependências Entre Módulos](#34-relações-e-dependências-entre-módulos)
4. [Problemas Identificados](#35-problemas-identificados)
5. [Código Morto e Duplicidades](#36-código-morto-e-duplicidades)
6. [Recomendações](#37-recomendações)

---


O conjunto de testes unitários de `tests/unit/lib/` cobre as camadas fundamentais da aplicação **Caminhar**: domínio, infraestrutura, API, cache, autenticação, CRUD, banco de dados e SEO. São 13 arquivos, todos escritos em **Jest** com **ES Modules** (via `@jest/globals`).

**Características comuns:**
- Convenção de nomeação: `describe` agrupa funcionalidades, `it`/`test` descreve cenários em português.
- Mocks em nível de módulo via `jest.mock()` e, quando necessário, `jest.requireMock()`.
- Uso de helpers de terceiros (`node-mocks-http`, `zod`).
- Mocks manuais de `req`/`res` em middleware.

**Estatísticas consolidadas:**

| Arquivo | Linhas | Funções testadas | Cenários (`it`/`test`) |
|---|---|---|---|
| `products.test.js` | 147 | 5 | 11 |
| `seo/config.test.js` | 110 | 7 | 12 |
| `api/errors.test.js` | 248 | 10 | 24 |
| `api/index.test.js` | 19 | 1 (index) | 1 |
| `api/middleware.test.js` | 319 | 13 | 22 |
| `api/response.test.js` | 342 | 17 | 32 |
| `api/validate.test.js` | 321 | 9 | 17 |
| `auth.test.js` | 111 | 8 | 10 |
| `cache.test.js` | 421 | 6 | 24 |
| `crud.test.js` | 103 | 5 | 8 |
| `db.test.js` | 108 | 6 | 10 |
| `middleware.test.js` | 176 | 6 | 11 |
| `redis.test.js` | 47 | 2 | 3 |
| **Total** | **~2.432** | — | **~185** |

---


---

#### 2.1 `products.test.js`

**Arquivo:** `tests/unit/lib/domain/products.test.js`  
**Alvo:** `lib/domain/products.js`

**Finalidade:** Testar o módulo de domínio de Produtos (CRUD + paginação).

**Funções testadas:**
| Função | O que faz |
|---|---|
| `getPaginatedProducts(page, limit, filters)` | Paginação com busca (`ILIKE`), preço mínimo/máximo, contagem total |
| `getAllProducts(page, limit)` | Listagem sem filtros |
| `createProduct(data)` | Insere produto com cálculo automático de `position` (MAX + 1) |
| `updateProduct(id, data)` | Atualização parcial com `updated_at = CURRENT_TIMESTAMP` |
| `deleteProduct(id)` | Remoção por ID |

**Pontos fortes:**
- Testa geração de SQL dinâmica com validação de snippets.
- Valida `formatted_price` em formato Real (`49,90`, `0,00` fallback).
- Cobre default values quando `max_pos` é `null`.

**Problemas:**
1. **Mock de `query` não é resetado entre cenários** — usa `mockResolvedValueOnce` em cadeia (`COUNT` depois `SELECT`), mas se uma query extra for adicionada no futuro, a ordem silenciosamente mudará.
2. **Sem teste de erro** — nenhum cenário testa falha no banco ou exceção propagada.
3. **Valores fracionários** — preço `49.90` como string é frágil; depende do driver/PostgreSQL converter para `numeric`. Risco de quebra se o schema mudar.
4. **Sem teste para `getAllProducts` com `page > 1`** — sempre testado com page=1.
5. **`formatted_price` não testa milhar** — valores como `1299.90` → `1.299,90` não são validados.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
- Adicionar cenário de erro propagado.
- Testar preço formatado com separador de milhar.
- Adicionar teste de `updateProduct` com `raw('CURRENT_TIMESTAMP')`.

---

#### 2.2 `seo/config.test.js`

**Arquivo:** `tests/unit/lib/seo/config.test.js`  
**Alvo:** `lib/seo/config.js`

**Finalidade:** Validar utilitários de SEO (canonical URLs, imagens, datas, breadcrumb, indexação).

**Funções testadas:**
| Função | Descrição |
|---|---|
| `siteConfig` | Objeto de configuração com `name`, `url`, `seo` |
| `getCanonicalUrl(path)` | Concatena base + caminho, normaliza `/` |
| `getImageUrl(path)` | Retorna default se null, preserva URLs absolutas |
| `formatSchemaDate(date)` | Converte para ISO 8601 ou `null` |
| `truncateDescription(text, max)` | Trunca com reticências |
| `extractKeywords(tags, limit)` | Formata tags (lowercase, trim) |
| `shouldIndex(path)` | Verifica `noindexPaths` |
| `generateBreadcrumb(items)` | Insere "Início" como primeiro item |

**Pontos fortes:**
- Testa edge cases (null, string vazia, URL absoluta).
- Valida case-insensitive para headers em `validateHeaders`.

**Problemas:**
1. **Base URL hardcoded** — testes assumem `http://localhost:3000`. Se `siteConfig.url` mudar, os testes quebram silenciosamente.
2. **Regex frágil** — `expect(url).toMatch(/http:\/\/localhost:3000\/blog\/post-1/)` não valida scheme HTTPS.
3. **Sem teste para `truncateDescription` com multi-byte** — reticências podem cortar UTF-8 no meio.
4. **`extractKeywords` sem teste de duplicatas** — se `tags` tiver duplicatas, comportamento é indefinido.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
- Usar `siteConfig.url` dinâmico em vez de `localhost:3000`.
- Adicionar teste de `shouldIndex` com subpaths (`/admin/users`).

---

#### 2.3 `api/errors.test.js`

**Arquivo:** `tests/unit/lib/api/errors.test.js`  
**Alvo:** `lib/api/errors.js`

**Finalidade:** Testar hierarquia de classes de erro customizadas da API.

**Classes testadas:**
| Classe | Status | Código | Extra |
|---|---|---|---|
| `ApiError` | 500 | `INTERNAL_ERROR` | Base, `toJSON()`, `details`, `meta` |
| `ValidationError` | 400 | `VALIDATION_ERROR` | `details[]` |
| `AuthenticationError` | 401 | `AUTHENTICATION_ERROR` | — |
| `ForbiddenError` | 403 | `FORBIDDEN_ERROR` | — |
| `NotFoundError` | 404 | `NOT_FOUND_ERROR` | `resource`, `identifier` |
| `ConflictError` | 409 | `CONFLICT_ERROR` | — |
| `RateLimitError` | 429 | `RATE_LIMIT_ERROR` | `retryAfter` |
| `ServerError` | 500 | `SERVER_ERROR` | `originalError` |
| `ServiceUnavailableError` | 503 | `SERVICE_UNAVAILABLE` | `retryAfter` |
| `MethodNotAllowedError` | 405 | `METHOD_NOT_ALLOWED` | `method`, `allowed` |

**Pontos fortes:**
- Testa mensagens padrão e customizadas.
- Valida serialização `toJSON()` com `timestamp` e `requestId`.
- Diferencia identificador numérico vs string em `NotFoundError`.

**Problemas:**
1. **Sem teste de herança** — não verifica `error instanceof Error` ou `instanceof ApiError`.
2. **Sem teste de serialização para `ServerError.toJSON()`** — `originalError` não é verificado no `toJSON()`.
3. **`requestId` gerado dinamicamente** — impossível testar valor exato, mas não valida formato (UUID?).
4. **`NotFoundError` assume gênero masculino** — teste usa `'Música não encontrado'` (gramaticalmente errado, deveria ser "não encontrada").

**Código morto:** Nenhuma classe parece morta; todas são referenciadas em `response.js`.

**Melhorias sugeridas:**
- Adicionar `expect(error instanceof ApiError).toBe(true)` e `expect(error instanceof Error).toBe(true)`.
- Corrigir gênero no teste de `NotFoundError` com recurso feminino.

---

#### 2.4 `api/index.test.js`

**Arquivo:** `tests/unit/lib/api/index.test.js`  
**Alvo:** `lib/api/index.js`

**Finalidade:** Verificar que o barril (`index.js`) exporta todos os submódulos.

**Estrutura:** Um único teste que verifica a presença de:
- `apiIndex.errors.ApiError`
- `apiIndex.response.success`
- `apiIndex.validate.validateBody`
- `apiIndex.middleware.composeMiddleware`

**Pontos fortes:**
- Protege contra remoção acidental de exportações.

**Problemas:**
1. **Cobertura mínima** — só verifica existência de 4 métodos. Se um novo submódulo for adicionado, o teste não avisa.
2. **Sem teste de tipos** — não valida que `ApiError` é uma classe (construtível).
3. **Sem teste de comportamento** — só checa `toBeDefined()`.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
- Usar `Object.keys()` para garantir que novas exportações são detectadas.
- Adicionar `typeof apiIndex.errors.ApiError === 'function'`.

---

#### 2.5 `api/middleware.test.js`

**Arquivo:** `tests/unit/lib/api/middleware.test.js`  
**Alvo:** `lib/api/middleware.js`

**Finalidade:** Testar middlewares individuais e compostos.

**Funções testadas:**
| Função | O que faz |
|---|---|
| `composeMiddleware(...mws)` | Encadeia middlewares (ordem de aplicação) |
| `withMethod(['GET', 'POST'])` | Bloqueia métodos não permitidos |
| `withAuth({ roles })` | Verifica token + role |
| `withOptionalAuth()` | Adiciona `req.user` se token existir |
| `withRateLimit({ maxRequests, windowMs })` | Usa `checkRateLimit` do cache |
| `withCors({ origins })` | Headers CORS + OPTIONS |
| `withErrorHandler({ includeStack })` | Captura exceções |
| `withLogger({ logger })` | Log de início/fim com duração |
| `withTimeout(ms)` | Timeout via `setTimeout` |
| `withBodyParser({ limit })` | Valida tamanho do body |
| `withCache(maxAge)` | `Cache-Control` header para GET |
| `publicApi(handler, opts)` | Builder pré-configurado |
| `protectedApi(handler, opts)` | Builder com auth |

**Pontos fortes:**
- Testa `fakeTimers` corretamente em timeout/rate-limit.
- Valida ordem de composição (`m1` antes de `m2`).
- Usa IP público (`203.0.113.x`) para evitar whitelist.

**Problemas:**
1. **Duplicação com `tests/unit/lib/middleware.test.js`** — o arquivo raiz também testa `withAuth`, `withCors`, `withErrorHandler`, `withRateLimit`, `withLogger`, `composeMiddleware`.
2. **Mock de `response.js` para `methodNotAllowed`** — no teste de `withMethod`, verifica `response.methodNotAllowed`, mas `response.js` também é mockado em `middleware.test.js` (raiz). Se ambos rodarem juntos, há duplicação de mock setup.
3. **Teste de `publicApi`/`protectedApi` apenas verifica tipo** — `expect(typeof composed).toBe(function)` não garante que os middlewares internos foram aplicados.
4. **Código comentado em português** — comentário inline inconsistente com o restante.
5. **IP `203.0.113.x` codificado** — requer comentário explicando RFC 5737.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
- Remover `middleware.test.js` da raiz ou consolidar.
- Adicionar teste de `Vary: Origin` no CORS.
- Testar `withTimeout` no boundary exato.

---

#### 2.6 `api/response.test.js`

**Arquivo:** `tests/unit/lib/api/response.test.js`  
**Alvo:** `lib/api/response.js`

**Finalidade:** Validar formatadores de resposta (sucesso, erro, handleError).

**Funções testadas:**
- **Sucesso:** `success`, `paginated`, `created`, `noContent`, `updated`, `deleted`
- **Erro:** `badRequest`, `validationError`, `unauthorized`, `forbidden`, `notFound`, `methodNotAllowed`, `conflict`, `tooManyRequests`, `serverError`, `serviceUnavailable`
- **Handler:** `handleError`

**Pontos fortes:**
- Cria helper `createMockResponse()` local (sem dependência externa).
- Valida headers (`Location`, `WWW-Authenticate`, `Allow`, `Retry-After`).
- Testa `paginated` com `totalPages`, `hasNext`, `hasPrev`.

**Problemas:**
1. **Helper local duplicável** — `createMockResponse()` é definido localmente; outros arquivos (middleware) criam mocks manuais semelhantes. Deveria ser centralizado.
2. **Sem teste de `meta.requestId` dinâmico** — `requestId` é gerado em runtime, impossível prever.
3. **`handleError` com `includeStack: true`** — stack real do Jest é poluída; teste seria mais robusto com mock de Error.
4. **`paginated` com `total: 0`** — não testa comportamento quando total é 0 (provavelmente `totalPages: 0`).

**Código morto:** Nenhuma função parece morta.

**Melhorias sugeridas:**
- Extrair `createMockResponse()` para `tests/unit/lib/__helpers__/mockResponse.js`.
- Adicionar teste de `paginated` com `total: 0`.

---

#### 2.7 `api/validate.test.js`

**Arquivo:** `tests/unit/lib/api/validate.test.js`  
**Alvo:** `lib/api/validate.js`

**Finalidade:** Testar middlewares de validação com Zod.

**Funções testadas:**
| Função | Fonte validada |
|---|---|
| `validateBody(schema)` | `req.body` |
| `validateQuery(schema)` | `req.query` |
| `validateParams(schema)` | `req.query` (Next.js Pages Router) |
| `validateHeaders(schema)` | `req.headers` (case-insensitive) |
| `validateRequest(schemas)` | Composto (body + query + params) |
| `createPaginationSchema(opts)` | Helper reutilizável |
| `createSearchSchema(opts)` | Helper reutilizável |
| `formatZodErrors(zodError)` | Formatador de erros |

**Pontos fortes:**
- Testa transformação (`page: string → number`).
- Valida erros inesperados (não-Zod) com `logger.error`.
- Testa acumulação de erros de múltiplas fontes.

**Problemas:**
1. **Inconsistência `describe`/`it`** — a maioria usa `describe`/`it`, mas `validateHeaders` usa `it` solto no final (linha 228-237), fora de `describe`.
2. **Mock de `logger.js` com `success: jest.fn()`** — nenhum teste usa `logger.success`.
3. **Padrão repetitivo** — quatro testes de "erro inesperado não-Zod" seguem a mesma estrutura (body, query, params, headers) e poderiam ser parametrizados.
4. **`createPaginationSchema` usa coerção implícita** — `z.string().transform(Number)` falha silenciosamente se não puder converter — sem teste para `limit: 'abc'`.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
- Mover o teste de "erro inesperado nos headers" para dentro do `describe('validateHeaders')`.
- Parametrizar testes de erro não-Zod.
- Adicionar teste para `validateRequest` com headers + body + query + params simultaneamente.

---

#### 2.8 `auth.test.js`

**Arquivo:** `tests/unit/lib/auth.test.js`  
**Alvo:** `lib/auth/auth.js`

**Finalidade:** Testar fluxo de autenticação (hash, JWT, cookies, middleware).

**Funções testadas:**
| Função | O que faz |
|---|---|
| `hashPassword`, `verifyPassword` | Bcrypt + validação de senha vazia |
| `generateToken`, `verifyToken` | JWT (jsonwebtoken) |
| `getAuthToken(req)` | Extrai de header Bearer ou cookie |
| `setAuthCookie(res, token)` | Set-Cookie header |
| `authenticate(user, pass)` | Busca no banco + verifica hash |
| `authenticateAndGenerateToken(...)` | Login completo + permissões + refresh token |
| `withAuth(handler)` | Middleware de proteção de rota |
| `initializeAuth()` | Cria tabelas + admin default |

**Pontos fortes:**
- Testa falha de armazenamento de refresh token (retorna `null` sem crash).
- Testa criação vs atualização de admin no `initializeAuth`.
- Testa variáveis de ambiente ausentes.

**Problemas:**
1. **Mock de `cache.js` incompleto** — mocka apenas `checkRateLimit`; se `auth.js` importar mais algo, o teste quebra silenciosamente.
2. **`checkRateLimit` mock sempre retorna `false`** — não testa cenário de rate-limit no login.
3. **JWT secret** — não testa expiração de token (depende de `jwt.verify` com tempo real).
4. **Sem teste de cookie malformado** — `getAuthToken` com cookie `token=` vazio ou sem `=` não é testado.
5. **`initializeAuth` modifica `process.env`** — altera variáveis de ambiente global sem cleanup adequado em todos os testes.
6. **Sem teste de `authenticate` com erro no banco** — nenhum cenário testa `query` lançando exceção.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
- Adicionar `afterEach` para limpar `process.env`.
- Testar `verifyToken` com token expirado.
- Testar `hashPassword` com string > 72 bytes (limite do bcrypt).

---

#### 2.9 `cache.test.js`

**Arquivo:** `tests/unit/lib/cache.test.js`  
**Alvo:** `lib/cache/cache.js`

**Finalidade:** Testar cache multi-layer (L1 memória, L2 Redis) + rate limiting.

**Funções testadas:**
| Função | Descrição |
|---|---|
| `getOrSetCache(key, fn, ttl)` | Cache com L1/L2/Single-Flight |
| `invalidateCache(pattern)` | Remove chave exata ou wildcard (SCAN) |
| `clearAllCache({ confirm })` | FLUSHDB com confirmação |
| `checkRateLimit(ip, endpoint, limit, window)` | Rate limit Redis + fallback memória |
| `getCacheMetrics()` | Métricas de hits/misses/errors |
| `cleanupRateLimitTimer()` | Limpa timer de manutenção (test-only) |

**Pontos fortes:**
- Testa Single-Flight com 3 chamadas concorrentes (apenas 1 fetch).
- Valida whitelist (local e privadas).
- Testa dynamic limit (função como limite).
- Testa DISABLE_RATE_LIMIT.

**Problemas:**
1. **Setup verboso de mocks** — usa `jest.requireMock()` com `_mockRedisGet` etc. Fragil se nomes mudarem.
2. **Sem teste de expiração de TTL no `appMemoryCache`** — o lazy eviction em `getAppMemoryCache` é testado indiretamente.
3. **`cleanupRateLimitTimer` não verifica estado do timer** — apenas chama sem asserção.
4. **Teste de `fallback` com limite 0** — `checkRateLimit('200.200.0.3', 'fallback', 0, 60000)` retorna `true` porque `count(1) > 0`. Correto, mas pouco legível sem comentário.
5. **Complexidade alta** — 421 linhas com mocks elaborados, difícil de manter.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
- Adicionar teste de `getOrSetCache` com TTL 0.
- Adicionar teste de `invalidateCache` com wildcard sem matches.
- Extrair mock do Redis para arquivo compartilhável.

---

#### 2.10 `crud.test.js`

**Arquivo:** `tests/unit/lib/crud/crud.test.js`  
**Alvo:** `lib/crud/crud.js`

**Finalidade:** Testar utilitários CRUD genéricos (INSERT, UPDATE, DELETE, UPSERT).

**Funções testadas:**
| Função | SQL gerado |
|---|---|
| `createRecord(table, data)` | `INSERT INTO ... VALUES ($1, $2) RETURNING *` |
| `updateRecords(table, data, where)` | `UPDATE ... SET ... WHERE ... RETURNING *` |
| `deleteRecords(table, where)` | `DELETE FROM ... WHERE ... RETURNING id` |
| `upsertRecord(table, data, conflictCol, updateData)` | `INSERT ... ON CONFLICT DO UPDATE SET ... RETURNING *` |
| `raw(value)` | Marca valor como SQL bruto (sem placeholder) |

**Pontos fortes:**
- Valida proteção contra SQL Injection (identificadores inválidos).
- Testa `raw('NOW()')` interpolado diretamente.

**Problemas:**
1. **`beforeEach` vazio** — linhas 10-11 têm `beforeEach(() => {})` sem conteúdo — código morto explícito.
2. **Sem teste de `updateRecords` com where vazio** — pode gerar SQL inválido (`WHERE `).
3. **Sem teste de `deleteRecords` sem where** — mesma vulnerabilidade.
4. **Sem teste de `tableSchemas` filtering** — o código menciona `_filterAllowedFields`, mas não há tabela com schema nos mocks.
5. **Sem teste de `upsertRecord` sem campos de update** — o terceiro argumento é opcional.

**Código morto:** `beforeEach(() => {})` (linhas 10-11).

**Melhorias sugeridas:**
- Remover `beforeEach` vazio.
- Adicionar teste de SQL injection no campo de constraint do `upsertRecord`.
- Adicionar teste de `upsertRecord` sem campos de update (ON CONFLICT DO NOTHING).

---

#### 2.11 `db.test.js`

**Arquivo:** `tests/unit/lib/db.test.js`  
**Alvo:** `lib/infra/db.js`

**Finalidade:** Testar camada de abstração do PostgreSQL (Pool, transações, health check).

**Funções testadas:**
| Função | O que faz |
|---|---|
| `query(sql, params, opts)` | Executa SQL com retry opcional |
| `closeDatabase()` | Encerra o pool |
| `transaction(callback)` | BEGIN/COMMIT/ROLLBACK |
| `healthCheck()` | SELECT 1 |
| `getDatabaseInfo()` | Métricas (version, connections, size) |
| `resetPool()` | Reseta singleton do pool (test-only) |
| `getPool()` | Retorna instancia do pool |

**Pontos fortes:**
- Testa retry com `mockImplementation` (rejeita sempre).
- Valida transação com COMMIT/ROLLBACK.
- Testa SSL em produção.

**Problemas:**
1. **`restorePoolImplementation()` importada mas subutilizada** — só usada em `beforeEach`. Não testa cenário onde o pool é recriado com config diferente.
2. **Sem teste de timeout de conexão** — o pool tem `connectionTimeoutMillis` configurado, mas não é testado.
3. **Teste de SSL muda `process.env.NODE_ENV`** — modifica globalmente e restaura, mas não usa `afterEach` — se o teste falhar no meio, o env permanece alterado.
4. **`transaction` com rollback** — não testa se `release()` é chamado em caso de sucesso.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
- Adicionar `afterEach` para restaurar `NODE_ENV`.
- Adicionar teste de `transaction` com sucesso, verificando `release()`.
- Adicionar teste de retry bem-sucedido (primeira chamada falha, segunda succeeds).

---

#### 2.12 `middleware.test.js`

**Arquivo:** `tests/unit/lib/middleware.test.js`  
**Alvo:** `lib/api/middleware.js` (mesmo que `api/middleware.test.js`)

**Finalidade:** Testar subset de middlewares (os mais críticos).

**Funções testadas:**
- `withLogger`
- `composeMiddleware`
- `withCors` (com OPTIONS)
- `withAuth` (401 sem token, inválido, sucesso)
- `withRateLimit` (via `checkRateLimit` mockado)
- `withErrorHandler`

**Problemas (além dos já citados em 2.5):**
1. **Sobreposição com `api/middleware.test.js`** — ~90% dos testes são duplicados. A diferença é que aqui `withRateLimit` é testado com `checkRateLimit` mockado (verdadeiro unitário), enquanto em `api/middleware.test.js` é testado com timers reais (mais integrado).
2. **Mock manual de `req`/`res`** — diferente do `api/middleware.test.js` que também cria manualmente. Deveriam compartilhar helper.
3. **Usa `require('../../../lib/api/response.js')` inline** — inconsistente com mock top-level via `jest.mock`.
4. **Cobertura menor** — não testa `withMethod`, `withOptionalAuth`, `withTimeout`, `withBodyParser`, `withCache`.

**Código morto:** Nenhum, mas funcionalidade testada é subconjunto de `api/middleware.test.js`.

**Melhorias sugeridas:**
- **Remover este arquivo** ou converter para teste de integração com escopo claramente distinto.
- Extrair helper `createMockResponse()` para compartilhar.

---

#### 2.13 `redis.test.js`

**Arquivo:** `tests/unit/lib/redis.test.js`  
**Alvo:** `lib/infra/redis.js`

**Finalidade:** Testar inicialização lazy do Upstash Redis.

**Funções testadas:**
- `redis` (getter)
- `getRedisInstance()`

**Cenários:**
1. Sem variáveis de ambiente → `null`
2. Com `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` → instância

**Pontos fortes:**
- Testa inicialização lazy (módulo só instancia Redis quando variáveis existem).
- Usa `jest.resetModules()` para testar imports condicionais.

**Problemas:**
1. **Cobertura mínima** — não testa `redisGet`, `redisSet`, etc. (estas são testadas indiretamente via `cache.test.js`).
2. **Sem teste de reconexão** — se o Redis desconecta, o comportamento não é validado.
3. **Sem teste de erro na criação** — se o construtor lança, não há fallback testado.
4. **Mock de `@upstash/redis` retorna `config`** — faz a "instância" ser o próprio objeto de configuração; teste verifica `instance.url`, mas não testa métodos reais.

**Código morto:** Nenhum.

**Melhorias sugeridas:**
- Adicionar teste de lazy initialization (chamar `getRedisInstance()` 2x, verificar que construtor é chamado 1x).
- Adicionar `afterEach` mais robusto para restaurar `process.env`.

---


```
┌─────────────────────────────────────────────────────────────────┐
│                        api/index.js (barril)                    │
├──────────┬──────────┬──────────┬──────────────────────────────────┤
│ errors   │ response │ validate │ middleware                       │
└────┬─────┴────┬─────┴────┬─────┴────┬─────────────┬─────────────┘
     │          │          │          │             │
     ▼          ▼          ▼          ▼             ▼
  Exceções  HTTP      Zod      composeMiddleware  withAuth/withRateLimit
  padron.  status     schemas  withCors           dependem de:
           bodies             withErrorHandler       ├── auth/auth.js (getAuthToken, verifyToken)
                                                └── cache/cache.js (checkRateLimit)
                                                       │
                                                       ▼
┌──────────────────────────────────────────────────────────────────────┐
│ cache/cache.js                                                       │
│  ├── L1: appMemoryCache (Map)                                        │
│  ├── L2: redisGet/Set (infra/redis.js → @upstash/redis)              │
│  └── Fallback: localRateLimitMap (Map)                               │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ auth/auth.js                                                         │
│  ├── hashPassword/verifyPassword (bcrypt)                            │
│  ├── generateToken/verifyToken (jsonwebtoken)                        │
│  ├── authenticate → db/query                                         │
│  └── authenticateAndGenerateToken → db/query + cache/checkRateLimit  │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ crud/crud.js  →  lib/infra/db.js (pg Pool)                           │
│ domain/products.js → crud/crud.js + lib/infra/db.js                  │
└──────────────────────────────────────────────────────────────────────┘
```

---


#### Alta prioridade

| # | Problema | Arquivos afetados |
|---|---|---|
| P1 | **Duplicação massiva de testes de middleware** entre `api/middleware.test.js` e `middleware.test.js` | `api/middleware.test.js`, `middleware.test.js` |
| P2 | **Sem testes de erro/exception** em `products.test.js`, `crud.test.js` | `products.test.js`, `crud.test.js` |
| P3 | **Mocks de `db` via `require('../../mocks/db-module')`** com caminho frágil e sem tipagem | `auth.test.js`, `crud.test.js` |

#### Média prioridade

| # | Problema | Arquivos afetados |
|---|---|---|
| P4 | **Sem teste de herança** em `errors.test.js` (`instanceof`) | `api/errors.test.js` |
| P5 | **Base URL hardcoded** `localhost:3000` em SEO tests | `seo/config.test.js` |
| P6 | **Inconsistência `describe`/`it`** em `validate.test.js` (linha 228) | `api/validate.test.js` |
| P7 | **Sem teste de cookies malformados** em auth | `auth.test.js` |

#### Baixa prioridade

| # | Problema | Arquivos afetados |
|---|---|---|
| P8 | **Regex frágil** em SEO tests (scheme HTTP apenas) | `seo/config.test.js` |
| P9 | **Mock de `logger.success` nunca usado** | `api/validate.test.js` |
| P10 | **Teste de `publicApi`/`protectedApi` verifica apenas tipo `function`** | `api/middleware.test.js` |

---


#### Código morto

| Arquivo | Local | Descrição |
|---|---|---|
| `crud.test.js` | Linhas 10-11 | `beforeEach(() => {})` vazio — código morto explícito |

Não foi identificado código morto significativo além do acima. Todas as funções testadas são referenciadas em produção.

#### Duplicações

| Funcionalidade | Arquivo 1 | Arquivo 2 | Grau |
|---|---|---|---|
| `withAuth` | `api/middleware.test.js` | `middleware.test.js` | **Alto** |
| `withCors` | `api/middleware.test.js` | `middleware.test.js` | **Alto** |
| `withErrorHandler` | `api/middleware.test.js` | `middleware.test.js` | **Alto** |
| `withLogger` | `api/middleware.test.js` | `middleware.test.js` | **Alto** |
| `withRateLimit` | `api/middleware.test.js` | `middleware.test.js` | **Médio** (abordagens diferentes) |
| `composeMiddleware` | `api/middleware.test.js` | `middleware.test.js` | **Médio** |
| Mock de `req`/`res` manual | `api/middleware.test.js` | `middleware.test.js` | **Alto** |
| `createMockResponse()` | `api/response.test.js` | — | **Potencial** — deveria ser helper compartilhado |

#### Sugestão de resolução
- **Manter `api/middleware.test.js`** como teste canônico (mais completo).
- **Remover `middleware.test.js`** ou converter para teste de integração (testar `publicApi`/`protectedApi` com middlewares reais).
- Extrair helper `createMockResponse()` para `tests/unit/lib/__helpers__/mockResponse.js`.

---


#### Curto prazo (limpeza)
1. **Remover `middleware.test.js`** ou renomear para `middleware.integration.test.js` com escopo claramente distinto.
2. **Adicionar testes de erro** em `products.test.js` e `crud.test.js`.
3. **Corrigir base URL** em `seo/config.test.js` para usar `siteConfig.url` dinamicamente.
4. **Remover `beforeEach` vazio** de `crud.test.js`.

#### Médio prazo (robustez)
5. **Adicionar testes de herança** em `errors.test.js`.
6. **Centralizar mocks de `req`/`res`** em helper compartilhado.
7. **Adicionar cenários de timeout/concorrência** em `auth.test.js`.
8. **Parametrizar testes de erro não-Zod** em `validate.test.js`.

#### Longo prazo (arquitetura)
9. **Migrar `require('../../mocks/db-module')`** para injeção de dependência ou factory explícita.
10. **Adicionar testes de integração** entre `cache.js` e `redis.js`.
11. **Cobertura de código** — rodar `jest --coverage` para identificar lacunas não óbvias.
12. **Adicionar `afterAfter` de cleanup consistente** para evitar flaky tests.

---

*Fim da documentação.*


---


## 15. Testes Unitários — Lib DB e Backup

## Índice

1. [Visão Geral](#visão-geral)
2. [Testes de Backup (scripts/backup.js)](#testes-de-backup)
   - [backup.available.test.js](#backupavailabletestjs)
   - [backup.cleanup.test.js](#backupcleanuptestjs)
   - [backup.logs.test.js](#backuplogstestjs)
   - [backup.operations.test.js](#backupoperationstestjs)
3. [Testes de Banco de Dados (lib/domain/)](#testes-de-banco-de-dados)
   - [createPost.test.js](#createposttestjs)
   - [deletePost.test.js](#deleteposttestjs)
   - [getAllPosts.test.js](#getallpoststestjs)
   - [getPaginatedPosts.test.js](#getpaginatedpoststestjs)
   - [musicas.test.js](#musicastestjs)
   - [query.test.js](#querytestjs)
   - [saveImage.test.js](#saveimagetestjs)
   - [settings.test.js](#settingstestjs)
   - [updatePost.test.js](#updateposttestjs)
4. [Testes de Infraestrutura (lib/infra/)](#testes-de-infraestrutura)
   - [logger.test.js](#loggertestjs)
   - [redis.test.js](#redistestjs)
5. [Resumo de Achados](#resumo-de-achados)
6. [Recomendações Consolidadas](#recomendações-consolidadas)

---


Os 15 arquivos testam três camadas do projeto Caminhar:

| Camada | Módulos-fonte | Arquivos de teste |
|--------|---------------|-------------------|
| **Backup** | `scripts/backup.js` | 4 |
| **DB/Domain** | `lib/domain/posts.js`, `lib/domain/musicas.js`, `lib/domain/images.js`, `lib/domain/settings.js`, `lib/crud/crud.js`, `lib/infra/db.js` | 9 |
| **Infra** | `lib/infra/logger.js`, `lib/infra/redis.js` | 2 |

#### Arquitetura testada

```
lib/infra/db.js ──► crud/crud.js ──► domain/posts.js, musicas.js, images.js, settings.js
        │
        └─ logger.js (logging transversal)
```

- **`db.js`**: Pool PostgreSQL lazy, query() com retry, health check, transaction()
- **`crud.js`**: CRUD genérico parametrizado com sanitização SQL (whitelist de campos, raw identifiers)
- **domain/*.js**: Funções específicas por entidade (posts, musicas, images, settings)
- **`scripts/backup.js`**: Operações standalone (pg_dump/psql spawn, compressão gzip, criptografia AES-256-GCM, rotação)

#### Padrões compartilhados

- Mock manual compartilhado do `pg` em `__mocks__/pg.js` com `mockQuery` singleton
- `jest.mock('pg')` em todos os testes de DB
- `clearMocks: true` no `jest.config.js` — apenas chamadas são limpas, implementações preservadas
- `restorePoolImplementation()` + `resetPool()` em `beforeEach` quando `jest.clearAllMocks()` é usado
- Helper `createAsyncDirIterator` duplicado em 3+ arquivos de backup

---

## Testes de Backup

Os 4 arquivos de backup testam o módulo `scripts/backup.js` (731 linhas), que usa:
- `fs` síncrono/assíncrono para arquivos e diretórios
- `child_process.spawn` para `pg_dump` e `psql`
- `zlib` para gzip
- `crypto` para hash SHA-256 e AES-256-GCM

---

#### backup.available.test.js

**Arquivo:** `tests/unit/lib/backup/backup.available.test.js`  
**Fonte:** `scripts/backup.js` — `getAvailableBackups()`

#### Finalidade

Testar a listagem e formatação de backups disponíveis no diretório. Verifica filtragem por prefixo (`caminhar-pg-backup`), ordenação decrescente por timestamp, formatação de metadados (filename, timestamp, size, compressed) e criação automática do diretório caso não exista.

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | deve listar, formatar e ordenar corretamente | Mock de 4 arquivos (3 válidos + 1 inválido), verifica filtragem, ordenação e formato de saída | `toHaveLength(3)`, ordenação data, formato do objeto |
| 2 | deve retornar array vazio sem arquivos de backup | Mock de 2 arquivos inválidos | `toEqual([])` |
| 3 | deve criar diretório se não existir | `existsSync` false → `mkdir` chamado | `toHaveBeenCalledWith` com recursive |

#### Relações

- Depende de `fs.promises.opendir()`, `fs.promises.stat()`, `fs.promises.mkdir()`
- Usa helper `createAsyncDirIterator()` local
- Compartilha padrão de `createAsyncDirIterator` com `backup.cleanup.test.js` e `backup.operations.test.js`

#### Problemas

1. **Teste 1 — data nos comentário vs. implementação inconsistente**: O comentário linha 67 menciona `2026-01-10T12-00-00Z` mas os arquivos mock usam `2026-01-12T12-00-00Z` etc. A função de formatação `getAvailableBackups` remove o `Z` final — o teste valida corretamente, mas a diferença entre comentário e código pode causar confusão.

2. **Duplicação do helper `createAsyncDirIterator`**: Definido em 4 arquivos de backup. Deveria ser extraído para um módulo compartilhado (ex: `tests/mocks/fs-helpers.js`).

3. **Mock de `fs.statSync` sem efeito**: Linha 77 — `fs.statSync` é configurado com `fakeSize` mas a função `getAvailableBackups` usa `fs.promises.stat()`. O mock de `statSync` é desnecessário neste teste.

4. **Mock de `fs.existsSync` em beforeEach mas linha 77 usa `fs.statSync`**: O teste 1 realmente usa `fs.promises.stat` (configurado no beforeEach com `size: 54321`). Porém o `mockReturnValue` para `statSync` é desnecessário.

#### Melhorias sugeridas

- Extrair `createAsyncDirIterator` para utilitário compartilhado
- Remover mock de `fs.statSync` (não usado pela função testada)
- Adicionar teste de erro em `opendir` (ex: permissão negada)
- Adicionar teste de `getAvailableBackups(1)` com parâmetro `maxFiles`

#### Código morto

- `fs.statSync` mock no beforeEach e linha 77

---

#### backup.cleanup.test.js

**Arquivo:** `tests/unit/lib/backup/backup.cleanup.test.js`  
**Fonte:** `scripts/backup.js` — `cleanupOldBackups()`

#### Finalidade

Testar a rotação de backups: remoção de arquivos que excedem o limite configurado (`maxBackups = 10`). Verifica que apenas arquivos com prefixo válido são considerados e que arquivos excedentes (e seus pares `.enc` e `.sha256`) são removidos.

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | deve remover backups antigos excedendo o limite de 10 | Gera 12 arquivos, espera remover dias 01 e 02 | `toHaveBeenCalledTimes(3)` (unlink assíncrono) |
| 2 | não deve remover nada com 10 ou menos | Gera exatamente 10 arquivos | `unlinkSync` não chamado |
| 3 | deve ignorar arquivos inválidos | 1 válido + 2 inválidos | nenhum unlink chamado |

#### Relações

- Chama internamente `getBackupFiles(maxBackups + 1)` = 11, deproslice(10)`
- Usa `fs.promises.unlink` (assíncrono)
- Helper `createAsyncDirIterator` local (duplicado)

#### Problemas

1. **Contagem de unlinks no teste 1**: O comentário explica que 12 arquivos geram 11 em `getBackupFiles(11)`, resultando em 1 arquivo excedente × 3 extensões (.sql.gz, .enc, .sha256) = 3 unlinks. Isso é correto mas frágil — se a lógica de `getBackupFiles` mudar o limite, o teste quebra sem mensagem clara.

2. **Não testa falha em unlink**: Se `unlink` lançar erro em um dos 3 arquivos, o comportamento é silencioso (catch interno). Não há teste para isso.

3. **Duplicação do helper `createAsyncDirIterator`**: Presente nos 4 arquivos de backup.

#### Melhorias sugeridas

- Adicionar teste de falha parcial em unlink (um dos 3 arquivos falha)
- Documentar por que 3 unlinks: adicionar assertion para verificar cada extensão individualmente
- Extrair helper compartilhado

#### Código morto

- Nenhum

---

#### backup.logs.test.js

**Arquivo:** `tests/unit/lib/backup/backup.logs.test.js`  
**Fonte:** `scripts/backup.js` — `getBackupLogs()`

#### Finalidade

Testar o parser e retorno de logs de backup. Verifica leitura do arquivo de log, parsing de linhas formatadas (`[timestamp] [STATUS] message`), retorno de logs vazios (arquivo inexistente ou vazio) e ignoramento de linhas mal formatadas.

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | array vazio se log não existir | `access` rejeita com ENOENT | `toEqual([])`, `readFile` não chamado |
| 2 | array vazio se log vazio | `readFile` retorna '' | `toEqual([])` |
| 3 | parsear linhas válidas | 3 linhas de log SUCCESS/RESTORE_SUCCESS/ERROR | `toHaveLength(3)`, formato do objeto, ordenação |
| 4 | ignorar linhas malformatadas | 1 válida + 1 vazia + 1 mal formatada + 1 válida | `toHaveLength(2)` |

#### Relações

- Usa `fs.promises.access` e `fs.promises.readFile`
- Formato do log: `[YYYY-MM-DD HH:MM:SS] [STATUS] message`

#### Problemas

1. **Teste 3 — ordenação não documentada**: Os logs são ordenados do mais recente para o mais antigo (`allLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp))`). O teste coloca SUCCESS primeiro no arquivo mas espera ERROR primeiro no resultado (linha 70). Isso é correto mas a inversão de ordem é sutil — o comentário poderia ser mais explícito.

2. **beforeEach vazio**: Linha 37-39 — `beforeEach(() => {})` sem conteúdo. Poderia ser removido ou documentado.

3. **Não testa `includeRotated: true`**: O parâmetro `options.includeRotated` lê logs rotacionados do diretório — não coberto por teste.

4. **Não testa erro em readFile após access bem-sucedido**: Se `access` resolve mas `readFile` falha, o catch retorna `[]` silenciosamente. Sem teste.

#### Melhorias sugeridas

- Adicionar teste para `getBackupLogs({ includeRotated: true })`
- Adicionar teste de falha em `readFile` após `access` ok
- Remover `beforeEach` vazio ou documentar intenção explícita

#### Código morto

- `beforeEach` vazio (linhas 37-39)

---

#### backup.operations.test.js

**Arquivo:** `tests/unit/lib/backup/backup.operations.test.js`  
**Fonte:** `scripts/backup.js` — `createBackup()`, `restoreBackup()`

#### Finalidade

Testar as operações de criação e restauração de backup. Verifica invocação de `pg_dump`/`psql` via `spawn`, criação de diretório, limpeza de backups antigos, log de sucesso, segurança pré-restore (backup de segurança), verificação de hash SHA-256, criptografia e descriptografia AES-256-GCM.

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | createBackup — deve executar pg_dump | Verifica spawn com pg_dump | `toHaveBeenCalledWith('pg_dump', ['-d', DATABASE_URL], ...)` |
| 2 | createBackup — criar diretório se não existir | `existsSync` retorna false uma vez | `mkdir` chamado |
| 3 | createBackup — limpar backups antigos | 12 arquivos mockados | `unlink` chamado |
| 4 | createBackup — logar sucesso | Verifica appendFile com SUCCESS | `toHaveBeenCalledWith(backup.log, '[SUCCESS]')` |
| 5 | restoreBackup — backup seguro e restaurar | Verifica 2 spawns (pg_dump + psql) | `toHaveBeenCalledTimes(2)`, warn com 'ATENÇÃO' |
| 6 | restoreBackup — falhar se backup não existir | `existsSync` false | `rejects.toThrow()` |

#### Relações

- Mocks complexos: `fs`, `child_process`, `zlib`, `crypto`, `scripts/utils/date-format.js`
- Helper `createAsyncDirIterator` local
- Usa `jest.spyOn(console, 'warn')` e `'error'` para capturar warnings

#### Problemas

1. **Mock de `createReadStream` frágil**: Linhas 37-55 — O mock do stream dispara `data`+`end` apenas uma vez quando ambos os listeners estão registrados. É um workaround para testar `calculateFileHash` sem arquivo real. Pode quebrar se a ordem dos listeners mudar.

2. **Teste 5 — hash mockado hard-coded**: O mock de `crypto.createHash` retorna `'abc123hash'` fixo (linha 14). O mock de `readFile` para `.sha256` retorna `'abc123hash\n'` (linha 152). Se qualquer um mudar, o teste quebra silenciosamente.

3. **Não testa criptografia/descriptografia**: `BACKUP_ENCRYPTION_KEY` não está definido no teste, então o caminho AES-256-GGM não é coberto. O `restoreBackup` testado não tem `.enc` para descriptografar.

4. **Teste 6 — `restoreBackup` usa `fs.existsSync` síncrono para verificação**: A função usa `fs.existsSync` para verificar se o arquivo existe (linha 492 do source), mas o mock de `existsSync` retorna `true` no beforeEach. Para o teste 6, é mockado `false` com `mockReturnValueOnce(false)` — correto.

5. **`child_process.spawn` mockado com `process.nextTick` para 'close'**: O mock do spawn dispara `close` com código 0 imediatamente. Não testa falha em pg_dump/psql.

#### Melhorias sugeridas

- Adicionar teste de criptografia (`BACKUP_ENCRYPTION_KEY` definido)
- Adicionar teste de falha em pg_dump (exit code != 0)
- Adicionar teste de hash inesperado (backup corrompido)
- Testar `restoreBackup` com arquivo `.enc`
- Extrair mock de `createReadStream` para helper

#### Código morto

- Nenhum, mas vários mocks não totalmente utilizados

---

## Testes de Banco de Dados

Os 9 arquivos de DB testam as funções de domínio que dependem de `lib/infra/db.js` e `lib/crud/crud.js`. Todos usam o mock compartilhado `__mocks__/pg.js`.

---

#### createPost.test.js

**Arquivo:** `tests/unit/lib/db/createPost.test.js`  
**Fonte:** `lib/domain/posts.js` — `createPost()`

#### Finalidade

Testar a criação de posts: query SQL correta, tratamento de valores nulos/ausentes, e propagação de erros do banco.

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | criar novo post com dados completos | Todos os campos preenchidos | SQL `INSERT INTO posts`, 7 valores, resultado |
| 2 | lidar com valores nulos/ausentes | Apenas title, slug, content | Valores ausentes → null/false/0 |
| 3 | propagar erros do banco | `mockQuery` rejeita | `rejects.toThrow`, console.error chamado |

#### Relações

- Chama `createRecord('posts', postData)` do `crud.js`
- `crud.js` constrói SQL parametrizado via `_buildInsertClauseParts`

#### Problemas

1. **Teste 2 — assertion de `position ?? 0`**: Linha 53 — `postData.position ?? 0` avalia `0` mas a assinatura do `createPost` no source (linha 69 de `posts.js`) faz `position: post.position ?? 0`. Correto, mas a assertion `values` na linha 53-54 mostra `postData.position ?? 0` em vez de `0` diretamente — funciona porque avalia em runtime, mas é menos claro.

2. **Não testa `options` (client de transação)**: `createPost` aceita `{ client }` mas nenhum teste passa client.

3. **Teste 3 — console.error verificado mas sem conteúdo**: `expect(consoleErrorSpy).toHaveBeenCalled()` não verifica a mensagem exata.

#### Melhorias sugeridas

- Testar com `{ client }` (transação)
- Verificar mensagem exata do console.error

#### Código morto

- Nenhum

---

#### deletePost.test.js

**Arquivo:** `tests/unit/lib/db/deletePost.test.js`  
**Fonte:** `lib/domain/posts.js` — `deletePost()`, `lib/crud/crud.js` — `deleteRecords()`

#### Finalidade

Testar exclusão de posts: query SQL correta, retorno do ID removido, retorno `undefined` se post não existe, e propagação de erros com log.

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | deletar pelo ID e retornar ID | Mock retorna `{ rows: [{ id: 123 }] }` | SQL DELETE, valores, resultado |
| 2 | retornar undefined se não existir | Mock retorna `{ rows: [] }` | `toBeUndefined()` |
| 3 | propagar erros ao deletar | `mockQuery` rejeita | `rejects.toThrow`, logger.error chamado |

#### Relações

- Usa `deleteRecords('posts', { id })` → `query()` → `logger.error` em caso de falha
- Mock do `logger.js` injetado via `jest.mock`

#### Problemas

1. **Teste 3 — logger.error verificado com payload específico**: A assertion verifica `expect.objectContaining({ code: undefined, duration, message, query })`. O `code: undefined` é estranho — sugere que o erro do banco não tem código PG (como `23503` para foreign key). Se um dia o erro tiver `code`, a assertion ainda passa (objectContaining), mas documenta que o código é perdido.

2. **Mock do logger repetido em vários arquivos**: `jest.mock('../../../../lib/infra/logger.js', ...)` está em `deletePost`, `getAllPosts`, `query`, e outros. Deveria ser um mock manual em `__mocks__/` ou `tests/mocks/`.

#### Melhorias sugeridas

- Mover mock do logger para `__mocks__/logger.js` (se aplicável globalmente)
- Adicionar teste de erro com `code` preenchido

#### Código morto

- Nenhum

---

#### getAllPosts.test.js

**Arquivo:** `tests/unit/lib/db/getAllPosts.test.js`  
**Fonte:** `lib/domain/posts.js` — `getAllPosts()`

#### Finalidade

Testar listagem de todos os posts (admin): query SQL correta, retorno de lista, lista vazia, e propagação de erros com log.

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | retornar lista de posts | Mock com 2 posts | SQL `SELECT * FROM posts ORDER BY created_at DESC`, resultado |
| 2 | array vazio se não houver posts | Mock retorna rows: [] | `toEqual([])`, length 0 |
| 3 | lançar erro se consulta falhar | `mockQuery` rejeita | `rejects.toThrow`, logger.error |

#### Relações

- Função simples que chama `query('SELECT * FROM posts ORDER BY created_at DESC')`
- Mock do logger

#### Problemas

1. **Duplicação com getPaginatedPosts**: `getAllPosts` é um subconjunto de `getPaginatedPosts` (sem paginação). Poderia ser testada indiretamente via `getPaginatedPosts(1, Infinity)`.

2. **Mock do logger duplicado**: Mesmo padrão de outros arquivos.

#### Melhorias sugeridas

- Consolidar mock do logger em `__mocks__/`

#### Código morto

- Nenhum

---

#### getPaginatedPosts.test.js

**Arquivo:** `tests/unit/lib/db/getPaginatedPosts.test.js`  
**Fonte:** `lib/domain/posts.js` — `getPaginatedPosts()`, `lib/domain/shared-pagination.js` (via `paginate()`)

#### Finalidade

Testar paginação de posts: query de contagem e dados em paralelo (`Promise.all`), cálculo de offset, filtro por busca (`ILIKE`), e formato de retorno `{ data, pagination }`.

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | retornar posts paginados sem busca | COUNT=50, 1 post | `mockQuery` 2 calls, params `[10, 0]`, formato `{ data, pagination }` |
| 2 | filtrar por busca e calcular offset | Page 3, search='Teste' | SQL `WHERE (title ILIKE $1)`, params `['%teste%', 10, 20]` |

#### Relações

- Delega para `paginate('posts', { page, limit, search, publishedOnly: false, searchOptions: { fields: ['title'] } })`
- `paginate` executa 2 queries paralelas (COUNT + SELECT)

#### Problemas

1. **Teste 1 — `mockImplementation` responde por conteúdo da query**: O mock verifica `text.includes('COUNT(*)')` para diferenciar as 2 chamadas. É robusto mas acopla o teste à implementação interna do `paginate`.

2. **Sem teste de totalPages=0**: Se COUNT retorna 0, `totalPages` deveria ser 0. Não coberto.

3. **Não testa publishedOnly=true**: A função `getPaginatedPosts` usa `publishedOnly: false`, mas existe `getRecentPosts` que usa `true`. Nenhuma das duas testa o filtro `published`.

#### Melhorias sugeridas

- Adicionar teste de página vazia (COUNT=0)
- Testar com `search` vazio vs. undefined

#### Código morto

- Nenhum

---

#### musicas.test.js

**Arquivo:** `tests/unit/lib/db/musicas.test.js`  
**Fonte:** `lib/domain/musicas.js` — `getPaginatedMusicas()`, `createMusica()`, `updateMusica()`, `deleteMusica()`, `getAllMusicas()`

#### Finalidade

Testar o CRUD completo de músicas, incluindo paginação com busca por título/artista, criação com transação (BEGIN/COMMIT), posição automática, atualização parcial, e deleção.

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | getPaginatedMusicas — parâmetros padrão | Sem busca, page 1, limit 10 | SQL `ORDER BY position ASC, created_at DESC`, params `[10, 0]` |
| 2 | getPaginatedMusicas — busca | search='Teste' | SQL `WHERE (titulo ILIKE $1 OR artista ILIKE $1)`, params `['%teste%', 10, 0]` |
| 3 | getPaginatedMusicas — offset page 2 | page=2, limit=5 | params `[5, 5]` |
| 4 | createMusica — todos os campos | 5 campos preenchidos | 4 queries (BEGIN, MAX, INSERT, COMMIT), position=6 |
| 5 | createMusica — campos opcionais nulos | Apenas titulo | position=1 (tabela vazia), nulls para opcionais |
| 6 | updateMusica — existente | titulo, artista, publicado | SQL UPDATE parcial, 1 query |
| 7 | deleteMusica — pelo ID | id=123 | SQL DELETE, retorna `{ id: 123 }` |
| 8 | getAllMusicas — sem busca | Sem filtro | SQL `ORDER BY position ASC, created_at DESC` |
| 9 | getAllMusicas — busca | search='Rock' | SQL `WHERE titulo ILIKE $1 OR artista ILIKE $1` |

#### Relações

- **`createMusica`**: Usa `transaction()` que chama `client.query('BEGIN')` / `COMMIT`
- **`getPaginatedMusicas`**: Usa `paginate()` do `shared-pagination.js`
- **`updateMusica`**: Usa `updateRecords` com campos parciais
- **`deleteMusica`**: Usa `deleteRecords`

#### Problemas

1. **Teste 4 — 4 queries sequenciais com `mockResolvedValueOnce`**: Se a ordem das queries mudar (ex: COMMIT antes de INSERT), o teste quebra. Acoplamento alto à ordem interna de `transaction()`.

2. **Teste 4 — SELECT MAX(position) retorna `{ max_pos: 5 }`**: A função `createMusica` usa `COALESCE(MAX(position), 0)` no source, mas o mock retorna `{ max_pos: 5 }`. Se não houver músicas, retornaria `{ max_pos: 0 }` ou `null`. O teste 5 cobre o caso vazio (`{ rows: [] }`).

3. **Teste 6 — updateMusica sem verificação de SQL exato**: O `toContain` para SQL é menos restritivo que o `toBe` usado em outros testes. A ausência de verificação dos valores exatos do SET permite que campos extras escapem.

4. **Não testa ROLLBACK em `createMusica`**: Se o INSERT falhar, o ROLLBACK deveria ocorrer. Não coberto.

#### Melhorias sugeridas

- Adicionar teste de ROLLBACK (INSERT falha dentro de transaction)
- Verificar SQL exato em updateMusica (toBe)
- Testar `createMusica` com posição explícita (`musica.position = 10`)

#### Código morto

- Nenhum

---

#### query.test.js

**Arquivo:** `tests/unit/lib/db/query.test.js`  
**Fonte:** `lib/infra/db.js` — `query()`

#### Finalidade

Testar o wrapper de query: execução simples com sucesso, e propagação de erro com log estruturado.

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | executar query com sucesso | mockQuery resolve | `mockQuery` chamado com argumentos corretos |
| 2 | logar erro e relançar exceção | mockQuery rejeita | `rejects.toThrow`, logger.error com payload |

#### Relações

- Função central de `lib/infra/db.js` — todas as operações de DB passam por ela
- Usa `getPool().query()` (que no mock é `mockQuery`)
- Em caso de erro, chama `logger.error('DB', 'Erro ao executar consulta SQL', errorDetails)`

#### Problemas

1. **Não testa retry**: A função `query()` tem lógica de retry (2 tentativas para timeout/rede). O mock sempre resolve/rejeite uma vez — não há teste para o cenário de retry bem-sucedido na 2ª tentativa.

2. **Não testa `log: true`**: A opção `log` habilita debug logging da query. Não coberto.

3. **Não testa `client` (transação)**: A opção `client` permite passar um client específico (para transações). Não testada.

4. **Não testa `throwOnError: false`**: Com `throwOnError: false`, a função retorna `null` em vez de lançar. Não coberto.

#### Melhorias sugeridas

- Testar retry (1ª tentativa timeout, 2ª sucesso)
- Testar com `client` (transação)
- Testar `throwOnError: false`
- Testar `log: true` com `LOG_LEVEL=debug`

#### Código morto

- Nenhum

---

#### saveImage.test.js

**Arquivo:** `tests/unit/lib/db/saveImage.test.js`  
**Fonte:** `lib/domain/images.js` — `saveImage()`

#### Finalidade

Testar salvamento de metadados de imagem: query SQL correta, parâmetros na ordem certa, e retorno do registro inserido.

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | salvar metadados corretamente | 5 parâmetros (filename, path, type, size, userId) | SQL INSERT, params `[filename, path, type, fileSize, userId]` |

#### Relações

- Usa `createRecord('images', validatedData)` após validação Zod
- `imageSchema` valida tipos e obrigatoriedade

#### Problemas

1. **Não testa validação Zod**: A função `saveImage` valida dados com `imageSchema.parse()`. Entradas inválidas (filename vazio, size negativo) deveriam lançar `ZodError`. Não coberto.

2. **Não testa `user_id: null`**: O schema permite `nullable` para `userId` mas o teste sempre passa `userId = 1`.

3. **Não testa `options` (client de transação)**: `saveImage` aceita `options` mas não é testado.

4. **Não testa erro do banco**: Falha no `createRecord` → `query` lança → teste deveria verificar propagação.

#### Melhorias sugeridas

- Testar validação Zod (filename vazio, size negativo)
- Testar `userId = null`
- Testar erro do banco
- Testar com `{ client }`

#### Código morto

- Nenhum

---

#### settings.test.js

**Arquivo:** `tests/unit/lib/db/settings.test.js`  
**Fonte:** `lib/domain/settings.js` — `updateSetting()`, `getSetting()`, `getSettings()`, `getAllSettingsRaw()`

#### Finalidade

Testar operações de configurações: upsert (INSERT ON CONFLICT), get por chave, get todas como objeto, e get bruto como array.

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | updateSetting — inserir/atualizar | key, value, type, description | SQL INSERT ON CONFLICT, 7 params |
| 2 | updateSetting — propagar erro | mockQuery rejeita | `rejects.toThrow` |
| 3 | getSetting — valor existente | Mock retorna valor | `toBe('my_value')` |
| 4 | getSetting — não existente | Mock retorna rows: [] | `toBeNull()` |
| 5 | getSetting — tratar erro | mockQuery rejeita | `rejects.toThrow` |
| 6 | getSettings — objeto chave-valor | json_object_agg | `toEqual({ site_title, admin_email })` |
| 7 | getAllSettingsRaw — array bruto | Mock retorna array | `toEqual(rows)` |
| 8 | getAllSettingsRaw — tratar erro | mockQuery rejeita | `rejects.toThrow()` |

#### Relações

- **`updateSetting`**: Usa `upsertRecord('settings', insertData, 'key', updateData)` com `raw('CURRENT_TIMESTAMP')`
- **`getSettings`**: Usa `json_object_agg` do PostgreSQL para agregar no banco
- **`getAllSettingsRaw`**: Query simples `SELECT * FROM settings ORDER BY key ASC`

#### Problemas

1. **Teste 1 — 7 params no upsert**: INSERT com 4 campos + UPDATE com 3 campos (value, type, description) = 7. Isso é correto mas frágil — se um campo for adicionado ao INSERT, o UPDATE pode não corresponder.

2. **Não testa `getSetting` com `defaultValue`**: A função `getSetting(key, defaultValue = null)` aceita valor padrão mas nenhum teste usa `defaultValue`.

3. **`getSettings` com tabela vazia**: Não testa o fallback `{}` do `COALESCE(json_object_agg, '{}'::json)`.

#### Melhorias sugeridas

- Testar `getSetting` com `defaultValue` customizado
- Testar `getSettings` com tabela vazia (retorna `{}`)

#### Código morto

- Nenhum

---

#### updatePost.test.js

**Arquivo:** `tests/unit/lib/db/updatePost.test.js`  
**Fonte:** `lib/domain/posts.js` — `updatePost()`

#### Finalidade

Testar atualização de posts: atualização completa, atualização parcial (apenas campos fornecidos), atualização apenas de `published`, e propagação de erros.

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | atualizar post existente completo | 6 campos | SQL UPDATE, 7 params (6 + id), `WHERE id = $7` |
| 2 | atualização parcial | Apenas title, slug, content | SQL UPDATE com 3 SET + id = 4 params |
| 3 | atualizar apenas published | Apenas `{ published: false }` | params `[false, id]` |
| 4 | propagar erros | mockQuery rejeita | `rejects.toThrow`, console.error |

#### Relações

- Usa `updateRecords('posts', postData, { id })` do `crud.js`
- `crud.js` constrói SET dinâmico apenas com campos fornecidos

#### Problemas

1. **Teste 3 — sem verificação de SQL**: Apenas verifica params, não verifica que o SQL contém `SET published = $1`. Campos ignorados (title, slug etc.) não aparecem no SQL.

2. **Não testa atualização vazia**: `updatePost(1, {})` — sem campos. A função `updatePost` faz `if (Object.keys(postData).length > 0)` antes de adicionar `updated_at`, mas se `postData` estiver vazio, `updateRecords` ainda é chamado com `data = {}`. O que acontece? `updateRecords` com `data = {}` gera `UPDATE posts SET WHERE id = $1` (SQL inválido). Não testado.

3. **Teste 4 — `updatePost(1, {})`**: Chama com objeto vazio — pode gerar SQL inválido. Deveria verificar se lança erro.

#### Melhorias sugeridas

- Adicionar teste de `updatePost` com objeto vazio → deveria lançar ou ser no-op
- Teste 3 — verificar SQL contém `SET published = $1`

#### Código morto

- Nenhum

---

## Testes de Infraestrutura

Os 2 arquivos de infraestrutura testam módulos base do sistema: logging e cache Redis.

---

#### logger.test.js

**Arquivo:** `tests/unit/lib/infra/logger.test.js`  
**Fonte:** `lib/infra/logger.js`

#### Finalidade

Testar o logger estruturado: filtro por nível (`LOG_LEVEL`), saída JSON em produção, requestId via `AsyncLocalStorage`, sanitização de erros e objetos circulares, file transport com rotação, e comportamento por ambiente (`NODE_ENV`).

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | LOG_LEVEL=error suprime warn/info/success/debug | Apenas error emitado | `toHaveBeenCalledTimes(1)` em error |
| 2 | LOG_LEVEL=warn suprime info/success/debug | error + warn emitados | `toHaveBeenCalledTimes(1)` em ambos |
| 3 | LOG_LEVEL=info suprime debug | info + success emitados | `toHaveBeenCalledTimes(2)` em log |
| 4 | LOG_LEVEL=debug emite todos | Todos os níveis | 1 error + 1 warn + 3 log |
| 5 | default em NODE_ENV=test é error | Sem LOG_LEVEL, NODE_ENV=test | log não chamado |
| 6 | NODE_ENV=production emite JSON parseável | error em produção | `JSON.parse(line)`, level/module/message/timestamp |
| 7 | success normalizado para info no JSON | success em produção | parsed.level === 'info' |
| 8 | setRequestId injeta ID no JSON | `setRequestId('req-123')` | parsed.requestId === 'req-123' |
| 9 | runWithRequestId propaga ID apenas no callback | ID dentro e fora do callback | Inside: req-abc, Outside: undefined |
| 10 | serializa Error para { name, message, stack } | Error como arg | parsed.args[0] tem name/message/stack |
| 11 | não quebra com objeto circular | Obj autoreferenciado | parsed.args[0].self === '[Circular]' |
| 12 | LOG_FILE_PATH escreve linha JSON no arquivo | File transport | existsSync, JSON.parse do arquivo |
| 13 | rotaciona arquivo quando excede MAX_FILE_SIZE | Arquivo > 10MB | `${filePath}.1` existe, size > 10MB |

#### Relações

- Usa `node:fs` real para file transport (com `mkdtempSync` e `rmSync` para limpeza)
- Usa `jest.resetModules()` para carregar módulo fresco em cada teste
- Usa `AsyncLocalStorage` para requestId

#### Problemas

1. **Teste 5 — `LOG_LEVEL=error` vs. `NODE_ENV=test`**: O teste configura `NODE_ENV=test` sem `LOG_LEVEL` e espera que `console.log` não seja chamado. A função `resolveLogLevel()` retorna `'error'` em `test`. Correto, mas o teste poderia documentar a lógica de fallback (LOG_LEVEL > NODE_ENV > 'debug').

2. **Teste 13 — 11MB de memória alocada**: `'x'.repeat(11 * 1024 * 1024)` aloca ~11MB em RAM. Funciona mas é pesado para teste unitário. Deveria usar tamanho menor com `MAX_FILE_SIZE` mockado.

3. **`jest.resetModules()` em beforeEach**: Isso recarrega o módulo logger em cada teste, isolando o estado singleton. Correto, mas lento. Alternativa: exportar função de reset do logger.

4. **Não testa `formatReadable` diretamente**: O formato legível com emojis não é testado individualmente (apenas indiretamente via console spies).

5. **Não testa nível `success` em `resolveLogLevel()`**: O `shouldLog` normaliza `success` para `info`, mas não há teste que verifique `LOG_LEVEL=info` permite `success`.

#### Melhorias sugeridas

- Mockar `MAX_FILE_SIZE` para 100 bytes em vez de alocar 11MB
- Testar `LOG_LEVEL=info` permite `success`
- Testar `formatReadable` diretamente (exportá-la ou testar output)

#### Código morto

- Nenhum

---

#### redis.test.js

**Arquivo:** `tests/unit/lib/infra/redis.test.js`  
**Fonte:** `lib/infra/redis.js`

#### Finalidade

Testar o módulo Redis com fallback em memória: inicialização com Upstash Redis REST, fallback quando não configurado, fallback com URL inválida, fallback com REDIS_URL (redis://), e delegação de operações.

#### Testes

| # | Nome | Descrição | Assertions-chave |
|---|------|-----------|------------------|
| 1 | fallback em memória sem Redis | Sem env vars | Todas operações funcionam em memória, `getRedisInstance()` null |
| 2 | inicializar Upstash e delegar operações | URL + token válidos | `Redis` construtor chamado, todas operações delegadas |
| 3 | URL inválida (não https://) | `http://invalido` | `getRedisInstance()` null |
| 4 | apenas REDIS_URL (redis://) | Protocolo redis:// | `getRedisInstance()` null |

#### Relações

- Mocks: `@upstash/redis` (construtor `Redis`), `lib/infra/logger.js`
- Usa `jest.resetModules()` e `loadFreshRedis()` helper para isolar estado singleton
- Testa `redisGet`, `redisSet`, `redisDel`, `redisScan`, `redisIncr`, `redisExpire`, `redisFlushdb`, `getRedisInstance`

#### Problemas

1. **Teste 1 — verificação de `redisScan('0', {})`**: `resolves.toEqual(['0', []])`. O fallback retorna `['0', []]` para scan. Correto, mas a assertion é frágil — se o fallback mudar para `['0', ['memkey']]`, o teste quebra.

2. **Teste 2 — mock de `Redis` completo**: O mock de `mockInstance` implementa todas as operações Redis (get, set, del, scan, incr, expire, flushdb). Não testa falha em operações Redis (ex: `redisInstance.get` lança).

3. **Não testa fallback em runtime**: Se `redisInstance.get` lança erro, a função `redisGet` faz fallback para memória. Não testado.

4. **`loadFreshRedis` helper**: Isola estado via `jest.resetModules()` + `import()` dinâmico. Correto, mas o nome da função poderia ser mais descritivo (ex: `loadIsolatedRedis`).

5. **Teste 4 — REDIS_URL com redis://**: Apenas verifica que `getRedisInstance()` é null. Não testa que `logger.info` foi chamado com mensagem sobre protocolo redis://.

#### Melhorias sugeridas

- Adicionar teste de fallback em runtime (Redis operação lança → memória)
- Testar `redisDel` com wildcard (`key.includes('*')`)
- Verificar logs de warning em cenários de fallback

#### Código morto

- Nenhum

---

## Resumo de Achados

#### Duplicação de Código

| Ocorrência | Arquivos afetados | Descrição |
|---|---|---|
| `createAsyncDirIterator` | 4 arquivos de backup | Helper idêntico definido localmente |
| `jest.mock(logger)` manual | 5 arquivos de DB | Mock idêntico repetido inline |
| `beforeEach` padrão | 6 arquivos de DB | `restorePoolImplementation()` + `resetPool()` + `mockQuery.mockResolvedValue` |
| `fs` mock completo | 3 arquivos de backup | Mock de fs com mesmas funções |

#### Código Morto / Mocks Desnecessários

| Arquivo | Linha(s) | Descrição |
|---|---|---|
| `backup.available.test.js` | 77 | `fs.statSync` mockado mas função usa `fs.promises.stat()` |
| `backup.logs.test.js` | 37-39 | `beforeEach` vazio |

#### Lacunas de Teste (Cobertura)

| Módulo | Funcionalidade não testada | Risco |
|---|---|---|
| `query()` | Retry em timeout | Alto — lógica crítica de resiliência |
| `query()` | `throwOnError: false` | Médio — contrato público |
| `query()` | `log: true` com LOG_LEVEL=debug | Baixo — apenas debug |
| `query()` | `client` (transação) | Alto — path de execução alternativo |
| `createMusica()` | ROLLBACK em falha | Alto — integridade transacional |
| `updatePost()` | Objeto vazio `{}` | Médio — gera SQL inválido |
| `saveImage()` | Validação Zod | Alto — entrada inválida não tratada |
| `saveImage()` | Erro do banco | Médio — propagação |
| `restoreBackup()` | Criptografia AES-256-GCM | Alto — segurança |
| `restoreBackup()` | Falha em pg_dump/psql | Médio — tratamento de erro |
| `restoreBackup()` | Hash inesperado (corrompido) | Alto — integridade |
| `getBackupLogs()` | `includeRotated: true` | Baixo — feature opcional |
| `logger.js` | `LOG_LEVEL=info` permite `success` | Baixo — edge case |
| `redis.js` | Fallback em runtime (erro Redis) | Alto — resiliência |
| `redis.js` | `redisDel` com wildcard | Médio — funcionalidade implementada |
| `db.js` | `transaction()`, `healthCheck()`, `getDatabaseInfo()` | Médio — funções não testadas diretamente |

#### Problemas de Manutenibilidade

1. **Mocks de fs gigantes nos backups**: 4 arquivos com ~25 linhas de mock fs idênticas. Se `backup.js` passar a usar `fs.promises.copyFile`, por exemplo, todos os 4 mocks quebram.

2. **Caminhos de importação longos**: `../../../../scripts/backup.js` (4 níveis). Poderia usar alias de path (ex: `@/`).

3. **Mocks de console não restaurados adequadamente**: Vários testes usam `jest.spyOn(console, 'error').mockImplementation()` mas não chamam `mockRestore()` em `afterEach` (ex: `createPost.test.js` linha 83-92 — OK, restaura, mas `deletePost.test.js` linha 83 também OK).

4. **Falta de teste de integração entre `crud.js` e `db.js`**: Os testes mockam `pg` mas nunca testam que `crud.js` realmente chama `db.query()` com parâmetros corretos. Os testes testam `db.query` separadamente e `domain/*.js` separadamente, mas a integração `crud → db` é assumida.

---

## Recomendações Consolidadas

#### Prioridade Alta

1. **Extrair `createAsyncDirIterator` para `tests/mocks/fs-helpers.js`**
   - Elimina duplicação nos 4 arquivos de backup
   - Facilita manutenção se `fs.promises.opendir` mudar

2. **Mover mock do logger para `__mocks__/lib/infra/logger.js`**
   - Elimina repetição em 5+ arquivos
   - Garante consistência
   - Aproveita resolução automática do Jest para `__mocks__/` adjacente ao módulo

3. **Adicionar testes de retry em `query()`**
   - Mock que rejeita 1ª vez com 'timeout' e resolve na 2ª
   - Verifica `logger.warn` chamado com 'tentativa'

4. **Adicionar teste de ROLLBACK em `createMusica()`**
   - Mock: BEGIN ok, SELECT MAX ok, INSERT rejeita
   - Verifica `mockQuery` chamado com 'ROLLBACK'

5. **Adicionar testes de criptografia em `restoreBackup()`**
   - Definir `process.env.BACKUP_ENCRYPTION_KEY` com 64 chars hex
   - Verificar descriptografia AES-256-GCM

6. **Adicionar testes de validação Zod em `saveImage()`**
   - `filename: ''` → lança ZodError
   - `size: -1` → lança ZodError
   - `size: 'abc'` → lança ZodError

#### Prioridade Média

7. **Extrair mock de fs para `tests/mocks/fs-backup.js`** (factory function)
   - Reduz 25 linhas duplicadas para 1 import
   - Permite customização por teste (ex: `createFsBackupMock({ opendir: ... })`)

8. **Adicionar teste de `updatePost()` com objeto vazio**
   - Verifica se lança erro ou é no-op
   - Previne SQL inválido `UPDATE posts SET WHERE id = $1`

9. **Adicionar teste de `redisDel` com wildcard**
   - `redisDel('prefix:*')` → limpa todas as chaves que começam com 'prefix:'

10. **Adicionar teste de fallback em runtime no redis.js**
    - `redisInstance.get` lança → `redisGet` retorna da memória

11. **Criar `tests/setup.js` compartilhado para testes de DB**
    - Define `restorePoolImplementation()` + `resetPool()` globalmente
    - Reduz boilerplate em 6 arquivos

#### Prioridade Baixa

12. **Remover `beforeEach` vazio em `backup.logs.test.js`**

13. **Remover `fs.statSync` mock desnecessário em `backup.available.test.js`**

14. **Reduzir alocação de memória em `logger.test.js` teste de rotação**
    - Mockar `MAX_FILE_SIZE` para 100 bytes em vez de 11MB

15. **Documentar ordenação em `backup.logs.test.js` teste 3**
    - Adicionar comentário explicando inversão de ordem (ERROR antes de SUCCESS)

---

## Cobertura por Arquivo (estimada)

| Arquivo | Testes | Cobertura subjetiva | Nota |
|---|---|---|---|
| `backup.available.test.js` | 3 | ★★★★☆ | Falta teste de race condition |
| `backup.cleanup.test.js` | 3 | ★★★☆☆ | Falha de unlink não testada |
| `backup.logs.test.js` | 4 | ★★★★☆ | Cobertura boa para parser |
| `backup.operations.test.js` | 6 | ★★★☆☆ | Falta falha de spawn/hash mismatch |
| `createPost.test.js` | 3 | ★★★☆☆ | Falta slug duplicado, HTML injection |
| `deletePost.test.js` | 3 | ★★★★☆ | Cobertura adequada |
| `getAllPosts.test.js` | 3 | ★★★★☆ | Simples, mas completo |
| `getPaginatedPosts.test.js` | 3 | ★★★☆☆ | Falta page=0, total não divisível |
| `musicas.test.js` | 8 | ★★★☆☆ | Falta ROLLBACK, concorrência |
| `query.test.js` | 2 | ★★★☆☆ | Mínimo; faltam params, timeout |
| `saveImage.test.js` | 1 | ★★☆☆☆ | Cobertura muito baixa |
| `settings.test.js` | 8 | ★★★★☆ | Cobertura ampla |
| `updatePost.test.js` | 4 | ★★★☆☆ | Falta update vazio |
| `logger.test.js` | 13 | ★★★★★ | Muito completo |
| `redis.test.js` | 4 | ★★★★☆ | Cobertura boa |

---

## Conclusão

A suíte de testes é **sólida e funcional**, cobrindo os caminhos felizes e a maioria dos erros esperados. Os maiores pontos de melhoria são:

1. **Eliminar duplicação** — o helper `createAsyncDirIterator` aparece 4x, e mocks de `fs` aparecem em 14 arquivos. Centralizar reduz acoplamento e facilita evolução.
2. **Padronização de asserts SQL** — misturar `toHaveBeenCalledWith(string)` (rígido) com `toContain` (flexível) dificulta refatoração do código de produção. Adotar um padrão único.
3. **Cobertura de arestas** — `saveImage` (1 teste), `updatePost` (sem teste de vazio), `musicas` (sem ROLLBACK) têm gaps claros.
4. **Isolamento de logger** — nenhum teste DB faz `logger.mockClear()` em `beforeEach`; se a ordem de execução mudar, asserts de `logger.error` podem falhar.
5. **Testes de resiliência** — `backup` (unlink falha), `redis` (timeout de rede), `pg_dump` (exit code ≠ 0) estão ausentes.

A arquitetura de mocks é consistente e bem-aproveitada (especialmente `__mocks__/pg.js` para todo o DB e `loadFreshRedis()` para isolamento de singleton). Com as refatorações sugeridas, a suíte atingiria nível excelente de manutenabilidade.

---

*Documentação gerada em 2026-09-23 por Hermes Agent (subagent).*


---


## 16. Testes Unitários — Pages API


Todos os arquivos compartilham padrões:
- Importam `describe, it, expect, jest, beforeEach` de `@jest/globals`
- Usam `createMocks` de `node-mocks-http` para simular `(req, res)`
- Mockam módulos de infraestrutura (`db.js`, `auth.js`, `logger.js`, `cache.js`)
- Testam handlers exportados como `default` das rotas de API

---


#### Finalidade
Testa o endpoint `/api/admin/dicas.js` (gerenciamento de dicas/tipos), focando em:
- Valor padrão de `published` (boolean) quando omitido no POST e PUT
- Fallback de IP quando `socket` está vazio

#### Relações com Código Fonte
| Teste | Handler Original | Linhas Cobertas |
|-------|------------------|-----------------|
| POST com `published` padrão | `handlePost` em `dicas.js:24-42` | Linha 36 (operador ternário do `published`) |
| PUT com `published` padrão | `handlePut` em `dicas.js:44-82` | Linha 62 (operador ternário do `published`) |

#### Mocks Utilizados
- `db.js` → `mockDb()` (resolver bem-sucedido com `rows: [{ id: 1 }]`)
- `auth.js` → `withAuth` bypassado (`jest.fn((h) => h)`)
- `audit.js` → `logActivity` mockado

#### Problemas Identificados

1. **Teste de IP inconsistente com mock**: O `beforeEach` define `socket: {}` e o comentário diz "Força o fallback de IP para 'unknown'", mas o teste espera `'127.0.0.1'`. Isso revela que o handler usa `req.socket?.remoteAddress || '127.0.0.1'` e não `'unknown'`. O comentário está **incorreto**.

2. **Não testa DELETE**: O handler possui `handleDelete` (linha 84-93) mas nenhum teste cobre esse método.

3. **Não testa validação Zod**: O `dicaSchema` e `dicaUpdateSchema` possuem regras (`.min(1)`) que nunca são acionadas nos testes de edge case.

4. **Dependência de mock global de `audit.js`**: O `logActivity` é chamado como `logActivity` diretamente (linha 41, 52), mas o handler usa `req.adminUtils.logActivity` — o teste assume que a função mockada é a mesma, o que pode mascarar bugs de integração.

#### Melhorias Sugeridas
- Adicionar teste para `DELETE` com ID válido e inexistente
- Adicionar teste de validação Zod (nome vazio, content ausente)
- Corrigir comentário sobre IP fallback
- Testar cenário onde `db.query` retorna erro no SELECT do PUT (merge com dados existentes)

---


#### Finalidade
Testa o endpoint `/api/admin/fetch-ml.js` (integração com Mercado Livre), cobrindo os múltiplos branches do fluxo de busca de produtos:
- Priorização de ID explícito (`item_id`) na ordenação
- Produtos de catálogo (`buy_box_winner`) com descrição falha
- Fallback de scraping HTML (meta tags OG)
- Preço inválido (`isNaN`)
- Item sem preço e fallback de imagem (`url` vs `secure_url`)
- Falha no scraping HTML (catch interno)

#### Relações com Código Fonte
| Teste | Handler Original | Linhas Cobertas |
|-------|------------------|-----------------|
| Ordenação com `b === explicitId` | `handlePost:50-54` | Linha 53 (sort) |
| `descRes.ok = false` | `handlePost:64-71` | Linha 70 (descRes.ok) |
| Fallback HTML com `content` antes | `handlePost:110-114` | Linhas 110-114 (getMeta) |
| `priceMatch` presente | `handlePost:119` | Linha 119 (product:price:amount) |
| `url` em vez de `secure_url` | `handlePost:69` | Linha 69 (fallback) |
| Catch do scraping | `handlePost:143-145` | Linha 144 (logger.error) |

#### Mocks Utilizados
- `auth.js` → `withAuth` com `req.user = { role: 'admin' }`
- `logger.js` → mock completo (error, warn, info, debug, success)
- `global.fetch` → `mockGlobalFetch()` helper com `mockRestore()`

#### Pontos Fortes
- Testes muito granulares com comentários referenciando linhas exatas do código fonte
- Cobertura completa dos branches de fallback (API → Products → Scraping HTML)
- Mock de fetch com `mockImplementation` para simular múltiplos endpoints sequenciais

#### Problemas Identificados

1. **Teste de catch do scraping não verifica log corretamente**: O teste "deve estourar catch" (linha 177) espera `logger.error` mas a expectativa está no final (linha 195), após o `await handler`. Como o catch interno no handler não re-lança, o handler retorna 500 com a mensagem de erro, mas o `logger.error` pode não ser chamado se o `htmlRes.text()` não lançar — o mock `{ ok: true, text: async () => { throw } }` está correto, mas frágil.

2. **Teste de preço inválido assume `0`**: O título contém `'R$ TextoInvalido'` e o teste espera `price: 0`. Isso testa o `isNaN` (linha 132), mas o parse de `TextoInvalido` com `replace('.', '').replace(',', '.')` ainda assim resulta em `NaN`, coberto corretamente.

3. **Não testa múltiplos IDs na URL**: O handler suporta múltiplos `MLB-` na URL (linha 41), mas apenas um teste cobre explicitamente a ordenação com `item_id`.

#### Melhorias Sugeridas
- Adicionar teste com URL contendo 3+ IDs para verificar ordenação estável
- Testar cenário onde `fetchWithTimeout` lança `AbortError` (timeout)
- Verificar se `idsToTry.sort()` é estável para o caso sem `item_id`

---


#### Finalidade
Testa o endpoint `/api/admin/fetch-spotify.js` (integração com Spotify), com foco no cenário onde **todas as 3 estratégias de busca falham**:
1. API oEmbed
2. Iframe de embed
3. Scraping HTML com Googlebot

#### Relações com Código Fonte
| Teste | Handler Original | Linhas Cobertas |
|-------|------------------|-----------------|
| Todas as estratégias falham | `handlePost:36-118` | Linhas 47-49, 74-76, 103-105, 108-110, 115-116 |

#### Mocks Utilizados
- `auth.js` → `withAuth` bypassado
- `logger.js` → mock completo
- `global.fetch` → `mockRejectedValue` para simular erro de rede

#### Problemas Identificados

1. **Apenas 1 caso de teste**: O arquivo tem um único teste, que embora complexo, não cobre cenários de sucesso parcial (ex: oEmbed falha mas iframe funciona).

2. **Mock de fetch rejeita mas não distingue URLs**: O `mockRejectedValue` faz **todas** as chamadas fetch falharem, incluindo as de validação de URL. Se o handler mudasse a ordem das chamadas, o teste ainda passaria, mascarando regressões.

3. **Não testa regex de track/episode**: O handler tem `url.match(/(?:track|episode)\/([a-zA-Z0-9]+)/)` (linha 52) mas não há teste com URL de episode ou URL inválida sem track ID.

4. **Duplicação de mock do logger**: O mesmo padrão de mock do `logger` (com 5 métodos) é replicado em `fetch-ml.edge.test.js` e `fetch-spotify.edge.test.js` — candidato a helper compartilhado.

#### Melhorias Sugeridas
- Adicionar teste de sucesso parcial (oEmbed OK, iframe falha)
- Adicionar teste com URL de episode
- Adicionar teste com URL inválida (sem track/episode)
- Extrair mock de `logger` para helper compartilhado

---


#### Finalidade
Testa o endpoint `/api/admin/posts.js` (CRUD de posts/artigos), cobrindo:
- Autenticação (401 sem user, 403 sem permissão, fallback de permissões vazias)
- Validação Zod (image_url inválida, ID inválido/negativo, dados vazios no PUT)
- Erros internos (500 em DELETE e PUT)
- Método não permitido (405 para PATCH)
- Ação customizada de reordenação (reorder)

#### Relações com Código Fonte
| Teste | Handler Original | Linhas Cobertas |
|-------|------------------|-----------------|
| 401 sem user | `withAuth` bypass → handler | Validação de `req.user` |
| 403 sem permissão | `handlePost` via `withAuth` | Validação de permissões |
| Permissões vazias | `handlePost` | Fallback `permissions: []` |
| Zod image_url inválida | `handlePost:56-61` | Linha 56 (safeParse) |
| ID inválido no PUT | `handlePut:89-96` | Linha 93 (parsedId) |
| Dados vazios no PUT | `handlePut:105-107` | Linha 106 |
| image_url inválida no PUT | `handlePut:99-101` | Linha 100 |
| 500 no DELETE | `handleDelete:118-134` | Linha 127 (deletePost) |
| 500 no PUT | `handlePut:109-115` | Linha 109 (updatePost) |
| 405 PATCH | `createAdminHandler` | Linha 146-153 |
| Reordenação | `handlePut:73-86` | Linhas 73-85 |

#### Mocks Utilizados
- `auth.js` → `withAuth` bypassado
- `db.js` → `mockDb()`
- `cache.js` → `checkRateLimit: mockResolvedValue(false)`, `invalidateCache`
- `posts.js` → `getPaginatedPosts, createPost, updatePost, deletePost`
- `crud.js` → `updateRecords`
- `audit.js` → `logActivity`
- `console.error` → spy com `mockImplementation(() => {})`

#### Problemas Identificados

1. **Mock de `db.query` com `mockImplementation` repetitivo**: Muitos testes usam `db.query.mockResolvedValueOnce({ rows: [{ permissions: [] }] })` para simular a consulta de permissões, mas isso é frágil — se o handler mudar a ordem das queries, os testes quebram silenciosamente.

2. **Teste de 403 com role 'unknown'**: O teste "deve assumir array vazio" (linha 73) espera 403 quando `db.query` retorna `rows: []`, mas isso assume que roles desconhecidos não têm permissão — o handler real pode ter lógica diferente para `role === 'admin'` vs outros.

3. **Não testa GET**: O `handleGet` (linha 42-53) nunca é testado, incluindo paginação e busca.

4. **Spy de console.error global**: O `consoleErrorSpy` é criado no `beforeEach` e restaurado no `afterEach`, mas se um teste lançar erro antes de `await handler`, o spy pode não ser restaurado.

5. **Teste de reorder não verifica `updateRecords`**: Apenas verifica status 200 e mensagem, mas não verifica se `updateRecords` foi chamado com os parâmetros corretos.

#### Melhorias Sugeridas
- Adicionar testes para `handleGet` com paginação e busca
- Verificar chamadas específicas de `updateRecords` no reorder
- Adicionar teste de permissão customizada (não vazia, não admin)
- Testar cenário onde `checkRateLimit` retorna true (bloqueado)

---


#### Finalidade
Testa o endpoint `/api/admin/rate-limit.js` (gerenciamento de rate limit via Redis), cobrando:
- Retorno 501 sem Redis configurado
- Exportação CSV com filtros (data, busca)
- Retorno de IP atual (`type=current_ip`)
- Listagem de whitelist (`type=whitelist`)
- Logs de auditoria com paginação e busca (`type=audit`)
- IPs bloqueados (com cache e sem cache)
- Whitelist POST/DELETE
- Desbloqueio manual (DELETE)
- Validações de IP obrigatório (400)
- Método não permitido (405)
- Erro interno (500)

#### Relações com Código Fonte
| Teste | Handler Original | Linhas Cobertas |
|-------|------------------|-----------------|
| 501 sem Redis | `handleGet:114-118` | Linha 115 |
| CSV com filtros | `handleGet:156-169` | Linhas 156-168 |
| current_ip | `handleGet:123-126` | Linhas 123-125 |
| whitelist | `handleGet:129-132` | Linhas 129-131 |
| audit com paginação | `handleGet:135-153` | Linhas 135-152 |
| IPs bloqueados | `handleGet:171-238` | Linhas 186-237 |
| Adicionar whitelist | `handlePost:241-271` | Linhas 258-266 |
| 400 sem IP no POST | `handlePost:248-254` | Linha 250 |
| Remover whitelist | `handleDelete:284-291` | Linhas 285-290 |
| Desbloqueio manual | `handleDelete:294-300` | Linhas 294-299 |
| 400 sem IP no DELETE | `handleDelete:281` | Linha 281 |
| 405 PUT | `createAdminHandler` | Linha 309 |
| 500 erro interno | `handleGet` catch | Linha 500 |

#### Mocks Utilizados
- `@upstash/redis` → `Redis` function com instância mockada (`lpush`, `ltrim`, `smembers`, `lrange`, `pipeline`, `sadd`, `del`, `srem`)
- `lib/infra/redis.js` → `redisScan`, `redisGet`, `redisSet`, etc.
- `auth.js` → `withAuth` que injeta `req.user = { role: 'admin' }`
- `process.env` → manipulado para testar presença/ausência de `UPSTASH_REDIS_REST_URL`

#### Pontos Fortes
- **Mais completo do conjunto**: 13 testes cobrindo todos os métodos HTTP e branches
- Teste de cache de IPs bloqueados (`mockRedisScan` + `pipeline`)
- Teste de `process.env` manipulação com `jest.resetModules()` + `require()` dinâmico
- Verificação de chamadas Redis específicas (`sadd`, `del`, `lpush`)

#### Problemas Identificados

1. **`jest.resetModules()` pode causar side effects**: O `beforeEach` chama `jest.resetModules()` e o handler é obtido via `require()` dinâmico. Isso é necessário para re-executar o módulo com novos `process.env`, mas pode interferir com outros testes se executados em paralelo.

2. **Mock de `pipeline.exec()` retorna array flat**: O mock retorna `[10, 60, 2, 60]` mas o handler espera `results[i * 2]` e `results[(i * 2) + 1]`. Isso assume que o pipeline retorna resultados sequenciais, o que é correto para Upstash, mas o mock não simula a estrutura real `{ ok, value }`.

3. **Teste de `current_ip` modifica `req.socket` após createMocks**: A linha 94 faz `req.socket = { remoteAddress: '::1' }` após criar os mocks. Funciona mas é frágil — depende da mutabilidade do objeto `req`.

4. **Não testa `redisSafe` com rate limit do Upstash**: O handler tem tratamento específico para `message.includes('max requests limit exceeded')` (linha 56-62), mas nenhum teste cobre esse cenário.

5. **Teste de 500 não verifica `logger.error`**: O último teste (linha 196) verifica status 500 mas não verifica se `logger.error` foi chamado — o handler usa `logger.error` no catch, mas o teste suprime com `consoleSpy`.

#### Melhorias Sugeridas
- Adicionar teste para `redisSafe` com erro de rate limit Upstash
- Testar cenário onde `parseAndFilterLogs` recebe JSON inválido
- Verificar chamadas específicas de `logger.error` no catch
- Testar invalidação de cache (`invalidateBlockedIpsCache`) em POST/DELETE

---


#### Finalidade
Testa o endpoint `/api/admin/roles.js` (gerenciamento de cargos/roles), cobrindo:
- Fallback de IP (`socket: {}`) e permissões vazias para cargo inexistente
- POST com permissões como string (JSON.stringify)
- PUT com ID na query e fallback no retorno (`|| {}`)
- DELETE com ID na query e fallback no nome para log

#### Relações com Código Fonte
| Teste | Handler Original | Linhas Cobertas |
|-------|------------------|-----------------|
| IP unknown + permissões vazias | `handleGet` + `withAuth` | Linhas 6 (IP), 21 (fallback) |
| POST com permissions string | `handlePost:42-55` | Linha 52 (JSON.stringify) |
| PUT com ID na query | `handlePut:57-73` | Linhas 61-66 |
| DELETE com fallback no nome | `handleDelete:75-82` | Linhas 68-72 |

#### Mocks Utilizados
- `auth.js` → mock completo com `getAuthToken`, `verifyToken`, `withAuth` (realmente verifica token)
- `db.js` → `mockDb()` com `mockImplementation` para queries dinâmicas
- `crud.js` → `createRecord`, `updateRecords`, `deleteRecords`
- `audit.js` → `logActivity`

#### Problemas Identificados

1. **Mock de `withAuth` é mais realista que outros**: Diferente de outros testes que usam `withAuth: (h) => h`, este teste mocka o `withAuth` para realmente chamar `getAuthToken()` e `verifyToken()`. Isso é bom, mas cria **duplicação** desse mock complexo (repetido em `stats.edge.test.js`).

2. **Teste de POST assume `permissions` como array**: O `req.body` envia `permissions: ['Leitura']` (array), mas o handler faz `JSON.stringify(permissions)` (linha 52). O teste verifica se `createRecord` foi chamado com `'["Leitura"]'`. Correto, mas o teste não cobre o caso onde `permissions` já é string.

3. **Teste de PUT com `updateRecords.mockResolvedValueOnce([])`**: O handler faz `updatedRoles[0] || {}` (linha 72). O mock retorna `[]`, forçando o fallback para `{}`. Correto, mas o teste não verifica `logActivity` no PUT.

4. **Não testa criação automática de tabela**: O `handleGet` tem lógica para criar tabela `roles` se não existir (linha 23-37, código `42P01`), mas nenhum teste cobre esse cenário.

5. **Teste de DELETE não verifica `deleteRecords`**: Apenas verifica `logActivity`, mas não verifica se `deleteRecords('roles', { id: 55 })` foi chamado.

#### Melhorias Sugeridas
- Adicionar teste para criação automática de tabela (código `42P01`)
- Adicionar teste para PUT com `permissions` já como string
- Verificar chamadas de `deleteRecords` no DELETE
- Extrair mock de `auth.js` com `withAuth` realista para helper compartilhado

---


#### Finalidade
Testa o endpoint `/api/admin/stats.js` (estatísticas do dashboard), cobrindo:
- Bloqueio de métodos diferentes de GET (405)
- Erro 500 quando `db.query` falha

#### Relações com Código Fonte
| Teste | Handler Original | Linhas Cobertas |
|-------|------------------|-----------------|
| 405 para POST | `createAdminHandler` | Linha 59-63 |
| 500 no DB | `handleGet:4-57` | Linha 4 (Promise.all) |

#### Mocks Utilizados
- `auth.js` → mock com `withAuth` realista (token verification)
- `db.js` → `mockDb()` com `mockReset()` e `mockRejectedValue`

#### Problemas Identificados

1. **Teste de 500 usa `db.query.mockReset()`**: A linha 53 faz `db.query.mockReset()` antes de `mockRejectedValue`. Isso é necessário porque o `mockDb()` define um comportamento padrão (`mockResolvedValue`), mas `mockReset` também limpa histórico de chamadas. O teste verifica `consoleSpy` mas não verifica `logger.error` — o handler original **não usa logger** no catch, apenas `console.error`, o que é inconsistente com outros endpoints.

2. **Não testa retorno bem-sucedido**: O `handleGet` faz 19 queries em `Promise.all`, mas nenhum teste verifica o retorno 200 com dados. O teste de 500 falha porque `Promise.all` rejeita na primeira query, mas o caminho feliz nunca é testado.

3. **Mock de `auth.js` duplicado**: O mesmo mock complexo de `withAuth` é replicado de `roles.edge.test.js`.

4. **Verificação de `consoleSpy` sem expectativa de conteúdo**: O teste verifica `expect(consoleSpy).toHaveBeenCalled()` mas não verifica se a mensagem de erro é a esperada.

#### Melhorias Sugeridas
- Adicionar teste de sucesso com mock de `db.query` retornando contagens
- Verificar conteúdo da resposta (posts, musicas, users, etc.)
- Substituir `console.error` por `logger.error` no handler para consistência
- Extrair mock de `auth.js` para helper compartilhado

---


#### Finalidade
Testa o endpoint `/api/auth/login.js` (autenticação de usuários), cobrindo:
- Erro 500 quando `authenticateAndGenerateToken` lança exceção

#### Relações com Código Fonte
| Teste | Handler Original | Linhas Cobertas |
|-------|------------------|-----------------|
| 500 erro interno | `handler:13-53` | Linhas 50-53 |

#### Mocks Utilizados
- `auth.js` → `authenticateAndGenerateToken`, `generateToken`, `setAuthCookie`
- `cache.js` → `checkRateLimit`
- `logger.js` → mock completo

#### Problemas Identificados

1. **Apenas 1 caso de teste**: O handler possui múltiplos branches (RATE_LIMITED, INVALID_CREDENTIALS, MISSING_FIELDS, responseMode body vs cookie, IP spoofing), mas apenas o erro 500 é testado.

2. **Mock de `logger` inconsistente**: O mock retorna `{ ...mockMethods, logger: { ...mockMethods } }` (linhas 27-30), exportando tanto métodos diretos quanto objeto `logger`. O teste usa `loggerModule.logger.error`, mas o handler pode usar `logger.error` diretamente — inconsistência.

3. **Não testa IP spoofing**: O handler tem `detectSpoofedIP` (linha 25) que retorna 403 se spoofing detectado, mas nenhum teste cobre esse cenário.

4. **Não testa rate limiting**: O `checkRateLimit` é mockado para retornar `false` (não bloqueado), mas não há teste para quando retorna `true`.

5. **Não testa `response=body`**: O handler suporta `?response=body` para retornar token no body (linhas 77-98), mas nenhum teste cobre esse modo.

#### Melhorias Sugeridas
- Adicionar teste para IP spoofing (403)
- Adicionar teste para rate limited (429)
- Adicionar teste para credenciais inválidas (401)
- Adicionar teste para `response=body` (token no body)
- Adicionar teste para `MISSING_FIELDS` (400)

---


#### Finalidade
Testa o endpoint `/api/upload-image.js` (upload de imagens), cobrindo:
- Criação do diretório de upload quando não existe

#### Relações com Código Fonte
| Teste | Handler Original | Linhas Cobertas |
|-------|------------------|-----------------|
| Criação do diretório | `handler:34-44` | Linhas 41-44 |

#### Mocks Utilizados
- `fs` → `existsSync` retorna `false` para paths contendo `'uploads'`, `mkdirSync` mockado, `promises.rename/unlink` mockados
- `sharp` → mock retorna `{ width: 800, height: 600, format: 'jpeg' }`
- `formidable` → mock simula parse com `uploadType: 'post_image'`, `mimetype: 'image/jpeg'`, `size: 1000`
- `settings.js` → `updateSetting` mockado
- `auth.js` → `withAuth` bypassado

#### Problemas Identificados

1. **Apenas 1 caso de teste**: O handler possui múltiplos branches (405, 400 sem imagem, mimetype inválido, tamanho excedido, dimensões exatas, arquivo corrompido, `setting_home_image` vs `post_image`), mas apenas a criação do diretório é testada.

2. **Mock de `fs` complexo e frágil**: O `existsSync` mockado usa `String(p).includes('uploads')` para retornar `false`, mas isso pode causar falsos positivos se outros paths contiverem 'uploads'.

3. **Spy de `console.error` com comportamento inesperado**: O `consoleSpy` (linha 54-57) lança erro se `err` for truthy, ou lança `new Error(msg)` se não for. Isso é incomum e pode mascarar erros reais do handler.

4. **Não testa validações de segurança**: O handler valida mimetype, tamanho, dimensões e magic bytes (sharp), mas nenhum teste cobre esses cenários.

5. **Mock de `formidable` não simula erro**: O `formidable.parse` sempre chama `cb(null, ...)` — não há teste para quando `err` é truthy.

#### Melhorias Sugeridas
- Adicionar teste para 405 (método não POST)
- Adicionar teste para 400 sem imagem
- Adicionar teste para mimetype inválido
- Adicionar teste para tamanho excedido (>5MB)
- Adicionar teste para dimensões exatas (>1920px)
- Adicionar teste para `setting_home_image` (prefixo `hero-image-`)
- Adicionar teste para `formidable.parse` com erro

---


#### 1. Duplicação de Mocks

Os seguintes mocks são duplicados em múltiplos arquivos e candidatos a extração para `tests/helpers/`:

| Mock | Arquivos |
|------|----------|
| `auth.js` com `withAuth: (h) => h` | dicas, posts, upload-image |
| `auth.js` com `withAuth` realista (token verification) | roles, stats |
| `logger.js` completo (5 métodos) | fetch-ml, fetch-spotify, login |
| `db.js` via `mockDb()` | dicas, posts, roles, stats |

#### 2. Cobertura Insuficiente de Casos de Sucesso

A maioria dos testes foca em erros e edge cases, mas **não testa o caminho feliz** (happy path):
- `posts.js`: `handleGet` nunca testado
- `stats.js`: retorno 200 nunca testado
- `upload-image.js`: upload bem-sucedido completo nunca testado
- `login.js`: autenticação bem-sucedida nunca testada

#### 3. Referências a Linhas Específicas

Os comentários referenciando linhas (e.g., "linha 35", "linhas 50-52") são úteis para rastreamento, mas **frágeis** — qualquer mudança no código fonte quebra os comentários sem aviso.

#### 4. Uso de `mockResolvedValueOnce` vs `mockImplementation`

Alguns testes usam `mockResolvedValueOnce` para múltiplas chamadas (e.g., `db.query` no posts.test.js), o que é frágil se a ordem das queries mudar. Outros usam `mockImplementation` com verificação de SQL, que é mais robusto.

#### 5. Testes de Integração vs Unitários

Os testes de `fetch-ml` e `fetch-spotify` mockam `global.fetch` para simular integrações externas. Isso é adequado para unitários, mas a ausência de testes de integração (com fetch real) pode mascarar problemas de timeout, parsing de HTML real, etc.

#### 6. Código Morto

Não foi identificado código morto nos arquivos de teste — todos os `it()` possuem expectativas ativas.

---

## Resumo por Arquivo

| Arquivo | Testes | Cobertura | Qualidade | Problemas |
|---------|--------|-----------|-----------|-----------|
| `dicas.edge.test.js` | 2 | Baixa | Média | Comentário errado, sem DELETE |
| `fetch-ml.edge.test.js` | 6 | Alta | Alta | Frágil no catch do scraping |
| `fetch-spotify.edge.test.js` | 1 | Baixa | Baixa | Apenas 1 teste, sem cenários parciais |
| `posts.edge.test.js` | 11 | Média | Média | Sem GET, mocks frágeis |
| `rate-limit.test.js` | 13 | Alta | Alta | `resetModules` frágil |
| `roles.edge.test.js` | 4 | Média | Média | Mock duplicado, sem tabela auto-criação |
| `stats.edge.test.js` | 2 | Baixa | Baixa | Sem sucesso, handler usa console |
| `login.edge.test.js` | 1 | Baixa | Baixa | Apenas 1 teste, sem cenários |
| `upload-image.edge.test.js` | 1 | Baixa | Baixa | Apenas 1 teste, sem validações |

---

## Recomendações Prioritárias

1. **Extrair mocks compartilhados** para `tests/helpers/mocks.js` (auth, logger, db, redis)
2. **Adicionar testes de caminho feliz** para endpoints com apenas testes de erro
3. **Aumentar cobertura** de `fetch-spotify`, `login` e `upload-image`
4. **Substituir referências a linhas** por descrições comportamentais
5. **Padronizar mocks de `db.query`** usando `mockImplementation` com verificação de SQL
6. **Testar validações Zod** em todos os endpoints que usam schemas


---


## 17. Testes Unitários — Scripts

## Sumário

1. [Visão Geral da Suíte](#1-visão-geral-da-suíte)
2. [Infraestrutura Compartilhada](#2-infraestrutura-compartilhada)
3. [Arquivos de Teste — Análise Individual](#3-arquivos-de-teste--análise-individual)
   - [3.1 `scripts/db/connection.test.js`](#31-scriptsdbconnectiontestjs)
   - [3.2 `scripts/backup.test.js`](#32-scriptsbackuptestjs)
   - [3.3 `scripts/clean-orphaned-images.test.js`](#33-scriptsclean-orphaned-imagestestjs)
   - [3.4 `scripts/clear-db.test.js`](#34-scriptsclear-dbtestjs)
   - [3.5 `scripts/clear-musicas.test.js`](#35-scriptsclear-musicastestjs)
   - [3.6 `scripts/init-table.test.js`](#36-scriptsinit-tabletestjs)
   - [3.7 `scripts/migrate.test.js`](#37-scriptsmigratetestjs)
   - [3.8 `scripts/reset-password.test.js`](#38-scriptsreset-passwordtestjs)
   - [3.9 `scripts/seed-all.test.js`](#39-scriptsseed-alltestjs)
   - [3.10 `scripts/validate-schema.test.js`](#310-scriptsvalidate-schematestjs)
   - [3.11 `scripts/utils/cleanup.test.js`](#311-scriptsutilscleanuptestjs)
   - [3.12 `scripts/utils/constants.test.js`](#312-scriptsutilsconstantstestjs)
   - [3.13 `scripts/utils/date-format.test.js`](#313-scriptsutilsdate-formattestjs)
   - [3.14 `scripts/utils/load-env.test.js`](#314-scriptsutilsload-envtestjs)
4. [Problemas Identificados](#4-problemas-identificados)
5. [Melhorias e Recomendações](#5-melhorias-e-recomendações)
6. [Duplicidades e Código Morto](#6-duplicidades-e-código-morto)
7. [Matriz de Cobertura](#7-matriz-de-cobertura)

---


A suíte `tests/unit/scripts/` contém **14 arquivos** de teste que validam scripts operacionais responsáveis por:

| Domínio | Scripts | Arquivos de Teste |
|---|---|---|
| Conexão/Infraestrutura | `scripts/db/connection.js` | `db/connection.test.js` |
| Backup e Restauração | `scripts/backup.js` | `backup.test.js` |
| Limpeza de Dados | `clear-db.js`, `clear-musicas.js`, `clean-orphaned-images.js`, `utils/cleanup.js` | `clear-db.test.js`, `clear-musicas.test.js`, `clean-orphaned-images.test.js`, `utils/cleanup.test.js` |
| Inicialização de Tabelas | `init-table.js` + `utils/init-table-utils.js` | `init-table.test.js` |
| Migrações | `scripts/migrate.js` | `migrate.test.js` |
| Autenticação | `scripts/reset-password.js` | `reset-password.test.js` |
| Seed/Orquestração | `scripts/seed-all.js` | `seed-all.test.js` |
| Validação de Schema | `scripts/validate-schema.js` | `validate-schema.test.js` |
| Utilitários | `utils/constants.js`, `utils/date-format.js`, `utils/load-env.js` | `utils/constants.test.js`, `utils/date-format.test.js`, `utils/load-env.test.js` |

**Padrões observados:**
- Usa-se `@jest/globals` com ESM (`import { jest } from '@jest/globals'`).
- Módulos com CLI guard (side-effects no top-level) são importados com `jest.isolateModulesAsync` para evitar execução automática.
- Mock centralizado do banco em `tests/mocks/db-module.js` (padrão `mockDb()`).

---


#### `tests/mocks/db-module.js`
Mock centralizado que exporta `mockDb(overrides)`, `mockDbError(error)` e `resetDbMocks(dbMock)`. Retorna objetos com: `query`, `resetPool`, `closeDatabase`, `transaction`, `healthCheck`, `getDatabaseInfo`. Usado via:

```js
jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb());
```

**Problema:** A maioria dos scripts importa `db/connection.js`, não `lib/infra/db.js`. Esse mock é relevante apenas quando o script testado usa `lib/infra/db.js` indiretamente, ou quando a camada de testes aponta para esse módulo de forma desalinhada.

#### Jest Config

| Arquivo | Propósito |
|---|---|
| `jest.config.base.js` | Base compartilhada: transform (Babel), moduleNameMapper, clearMocks/restoreMocks, maxWorkers 50% |
| `jest.config.js` | Estende base com jsdom, coverage (V8), thresholds (80% branches, 85% functions, 90% lines global), testMatch `**/*.test.js` |
| `jest.config.db.js` | Config separada para testes com banco (PostgreSQL real) |

---


#### 3.1 `scripts/db/connection.test.js`

**Arquivo sob teste:** `scripts/db/connection.js`  
**Escopo:** Singleton de Pool PostgreSQL, wrapper de query, ciclo de vida (create → close → reset).

**Testes (6 casos):**

| Teste | O que valida |
|---|---|
| Cria Pool se não existe | Verifica `Pool` é instanciado com `connectionString` correto |
| Erro se DATABASE_URL ausente | Espera throw quando env var não definida |
| Singleton | Múltiplas chamadas retornam mesma instância, `Pool` chamado 1x |
| `closePool()` fecha pool | Verifica `pool.end()` chamado |
| `closePool()` com pool null | Não lança erro (idempotência) |
| `query()` executa e propaga erros | Testa com e sem parâmetros, e rejeição |

**Problemas:**
- ✅ **Positivo:** Mock limpo via `jest.unstable_mockModule` com referência compartilhada (`mockQuery`, `mockConnect`, `mockPool`).
- ✅ **Positivo:** `resetPool()` em `beforeEach` garante isolamento.
- ⚠️ `resetPool()` é chamado no `beforeAll`, mas o mock do `pg` é reutilizado entre testes — `resetPool` reseta a variável interna `pool` do módulo, mas o mock `Pool` do `pg` acumula chamadas. O teste de singleton (`toHaveBeenCalledTimes(1)`) depende da ordem de execução (não determinística sem `resetPool` prévio).

**Melhoria recomendada:**
- Adicionar teste de `resetPool()` explicitamente (verificar que após reset, nova chamada a `getPool()` cria pool diferente).
- Testar comportamento quando `DATABASE_URL` é definida *após* criação de pool — o pool já criado é reutilizado com a URL antiga.

---

#### 3.2 `scripts/backup.test.js`

**Arquivo sob teste:** `scripts/backup.js`  
**Escopo:** Sistema completo de backup (pg_dump → gzip → sha256 → AES-256-GCM → log → rotação → restore).

**Testes (6 casos):**

| Teste | O que valida |
|---|---|
| Exporta `createBackup` | `typeof === 'function'` |
| Exporta `restoreBackup` | `typeof === 'function'` |
| Exporta `cleanupOldBackups` | `typeof === 'function'` |
| Exporta `getAvailableBackups` | `typeof === 'function'` |
| Exporta `getBackupLogs` | `typeof === 'function'` |
| Exporta `initializeBackupSystem` | `typeof === 'function'` |

**Problemas:**
- 🔴 **Teste fraco:** Apenas verifica exports (`typeof === 'function'`). Não testa **nenhuma lógica** do `createBackup`, `restoreBackup`, `cleanupOldBackups`, `getBackupFiles`, criptografia, hash, rotação de log, verificação de disco, etc.
- 🔴 **Constantes mockadas desalinhadas:** O mock de `constants.js` omite `BACKUP_INTERVAL_MS`, `PRE_RESTORE_PREFIX`, `LOG_RETENTION_DAYS`, `LOG_MAX_SIZE_BYTES`, `DISK_THRESHOLD_PERCENT`, `DISK_PATH_DEFAULT`, `REPORTS_DIR`, `K6_SUMMARY_DIR`, `LOAD_TESTS_DIR` — logo o teste **passa** mas esses valores estão `undefined` para o módulo real.
- 🔴 **`jest.isolateModules` assíncrono:** O `beforeEach` usa `jest.isolateModules(async () => {...})` — isso força reload do módulo a cada teste. Como `backup.js` tem exports puros (sem side-effect no top-level devido ao CLI guard), o `isolateModules` é desnecessário aqui.
- ⚠️ O mock de `date-fns` é desnecessário — `backup.js` importa `formatISODate` de `date-format.js`, não `date-fns`. Resquício de refatoração.

**Melhoria recomendada:**
- Testar `generateBackupFilename` (se exportada).
- Testar `getBackupFiles` com mock de `fs.promises.opendir`.
- Testar `logBackupOperation` com sanitização de secrets.
- Testar `cleanupOldBackups` removendo arquivos além de `MAX_BACKUPS`.
- Testar criptografia AES-256-GCM (com `BACKUP_ENCRYPTION_KEY` definido).

---

#### 3.3 `scripts/clean-orphaned-images.test.js`

**Arquivo sob teste:** `scripts/clean-orphaned-images.js`  
**Escopo:** Remove arquivos de imagem do `public/uploads` que não são referenciados no banco (órfãos).

**Testes (5 casos):**

| Teste | O que valida |
|---|---|
| Remove órfãos | Deleta arquivos não referenciados, preserva usados |
| Diretório inexistente | Não chama `readdirSync`, não deleta nada |
| Erro de banco | Captura exceção, loga `console.error`, não lança |
| Coluna inexistente | Trata erro `42703`, loga `console.warn` com mensagem específica |
| Arquivos irrelevantes | Ignora arquivos sem prefixos `post-image-`/`hero-image-` |

**Problemas:**
- ✅ **Positivo:** Usa `mockQuery.mockReset()` + `clearAllMocks` para isolar.
- ✅ **Positivo:** Valida mensagem de warn específica ("Aviso: Coluna 'image_url' não encontrada na tabela 'posts'").
- ⚠️ O script usa `pg` diretamente (cria `new Pool`), mas o mock é feito via `jest.mock('pg')` automático + `import { mockQuery } from 'pg'` — depende de `__mocks__/pg.js` global. Se esse arquivo não existe, o mock falha silenciosamente.
- ⚠️ Não testa cenário onde `fs.unlinkSync` lança erro (ex: permissão).
- ⚠️ O teste de "erro de banco" espera `console.error` chamado, mas não valida a mensagem.

**Melhoria recomendada:**
- Testar cenário de `fs.promises.access` falhando no `uploadsDir`.
- Testar quando todos os arquivos são usados (nada deletado).
- Testar múltiplas tabelas com colunas diferentes em sequência.

---

#### 3.4 `scripts/clear-db.test.js`

**Arquivo sob teste:** `scripts/clear-db.js` (e `lib/infra/db.js` via mock)  
**Escopo:** Limpeza completa do banco (TRUNCATE em cascata + limpeza de uploads).

**Testes (4 casos):**

| Teste | O que valida |
|---|---|
| Importa dependências | `query` e `closeDatabase` são funções |
| Executa TRUNCATE | SQL contém `TRUNCATE TABLE` + tabelas corretas + `RESTART IDENTITY CASCADE` |
| Fecha conexão | `closeDatabase` é chamado |
| Cancelamento | Se usuário não confirma, query não executa |

**Problemas:**
- 🔴 **Teste testa o mock, não o script:** O teste chama `libDb.query(TRUNCATE...)` diretamente, não invoca `clearDatabase()` do `clear-db.js`. O script real usa `query()` de `scripts/db/connection.js`, não `lib/infra/db.js`.
- 🔴 **Teste do cancelamento é falso-positivo:** A validação é `if (!answer) { expect(query).not.toHaveBeenCalled() }` — é uma condicional JavaScript, não uma execução real do script. O script nunca é importado/testado.
- ⚠️ `clear-db.js` não é importado — o `require('../../mocks/db-module')` aponta para `lib/infra/db.js`, que é um módulo diferente de `scripts/db/connection.js`.
- ⚠️ Não testa `clearUploadsDir`.

**Melhoria recomendada:**
- Importar `clear-db.js` e testar `clearDatabase()` isolando o `readline` (mock de `readline.question`).
- Testar `clearUploadsDir` removendo arquivos de `public/uploads`.
- Remover teste de cancelação falso (reescrever com mock de `readline`).

---

#### 3.5 `scripts/clear-musicas.test.js`

**Arquivo sob teste:** `scripts/clear-musicas.js`  
**Escopo:** Remove todos os registros da tabela `musicas`.

**Testes (2 casos):**

| Teste | O que valida |
|---|---|
| Executa DELETE | Query contém `DELETE` |
| Fecha conexão | `closeDatabase` é chamado |

**Problemas:**
- 🔴 **Mesmo problema que `clear-db.test.js`:** Testa o mock `lib/infra/db.js`, não o script real.
- 🔴 **`clear-musicas.js` não é importado** — o teste nem importa o arquivo sob teste.
- ⚠️ O teste de "DELETE" é trivial: monta string `'DELETE FROM musicas'` e chama `libDb.query(sql)` — não valida comportamento do script.

**Melhoria recomendada:**
- Importar `clear-musicas.js` e testar `clearMusicRecords()` com mock de `readline`.
- Testar comportamento quando tabela está vazia (rowCount = 0).

---

#### 3.6 `scripts/init-table.test.js`

**Arquivo sob teste:** `scripts/utils/init-table-utils.js`  
**Escopo:** Utilitários de inicialização de tabelas (buildCreateTableSQL, getSeedValues, buildSeedSQL, getTableName, validateIdentifier).

**Testes (9 casos):**

| Teste | O que valida |
|---|---|
| `buildCreateTableSQL` | Gera SQL com `CREATE TABLE IF NOT EXISTS` + colunas + constraints |
| `getSeedValues` | Converte seedData para array de arrays de valores SQL |
| `getSeedValues` vazio | Retorna `[]` sem seedData |
| `buildSeedSQL` | Gera INSERT INTO com valores |
| `buildSeedSQL` null | Retorna `null` sem seedData |
| `getTableName` posicional | Extrai de `process.argv[2]` |
| `getTableName` `--table=valor` | Extrai de flag com `=` |
| `getTableName` `--table valor` | Extrai de flag + próximo arg |
| `getTableName` sem args | Lança erro com `/Uso:/` |

**Problemas:**
- ✅ **Positivo:** Bem estruturado com schemas reutilizáveis (`musicasSchema`, `dicasSchema`).
- ✅ **Positivo:** Testa validação de identificadores e parsing de argv.
- ⚠️ `validateIdentifier` não é testado diretamente (injeção SQL, nomes vazios, caracteres especiais) — testado apenas indiretamente via `buildCreateTableSQL`.
- ⚠️ Não testa `loadSchemaFromDir` (leitura de arquivo JSON).
- ⚠️ Os schemas `musicasSchema` e `dicasSchema` são declarados múltiplas vezes (repetidos em cada describe).

**Melhoria recomendada:**
- Adicionar teste de `validateIdentifier` com nomes inválidos (`'; DROP TABLE--`, `''`, `null`).
- Testar `loadSchemaFromDir` com arquivo inexistente.
- Extrair schemas para `beforeAll` compartilhado para evitar duplicação.

---

#### 3.7 `scripts/migrate.test.js`

**Arquivo sob teste:** `scripts/migrate.js`  
**Escopo:** Gerenciador de migrações (listar, aplicar, reverter, status).

**Testes (4 casos):**

| Teste | O que valida |
|---|---|
| `listMigrationFiles` ordenado | Ordena por prefixo numérico |
| `listMigrationFiles` filtro | Rejeita arquivos fora do padrão `NNN-*.js` |
| `migrationNameFromFile` | Remove `.js` do nome |
| `ensureMigrationTable` | Cria tabela `_migrations` se não existir |
| `getAppliedMigrations` | Retorna `Set` com nomes |

**Problemas:**
- ✅ **Positivo:** Mocks de `fs.promises.readdir` e `pool.query` bem isolados.
- ✅ **Positivo:** Testa ordenação e filtro de arquivos.
- ✅ **Positivo:** Comentário explicativo sobre por que não usar `isolateModules` (CLI guard).
- 🔴 Não testa `applyMigration` (transação + INSERT na tabela de controle).
- 🔴 Não testa `revertLastMigration`.
- 🔴 Não testa `listStatus`.
- 🔴 Não testa `showHelp`.
- ⚠️ Não testa cenário de migração com função `up` ausente.

**Melhoria recomendada:**
- Adicionar testes de `applyMigration` com mock de arquivo de migração.
- Testar `revertLastMigration` com migração aplicada.
- Testar `listStatus` com mix de aplicadas/pendentes.

---

#### 3.8 `scripts/reset-password.test.js`

**Arquivo sob teste:** `scripts/reset-password.js`  
**Escopo:** Redefinição de senha de usuário admin (hash + UPDATE/INSERT).

**Testes (4 casos):**

| Teste | O que valida |
|---|---|
| `hashPassword` chamado | Verifica chamada com senha |
| UPDATE com parâmetros | Query contém `UPDATE users` + array com hash + username |
| INSERT se não existir | Quando UPDATE retorna 0 linhas, faz INSERT |
| Fecha conexão | `closeDatabase` chamado |

**Problemas:**
- 🔴 **Teste testa mock, não script:** Chama `libDb.query(UPDATE...)` diretamente. O script real (`reset-password.js`) não é importado.
- 🔴 **Ordem confusa de mocks:** No teste de INSERT, `mockResolvedValue` é chamado **depois** do `mockResolvedValueOnce` — o que significa que o primeiro `await libDb.query('UPDATE...')` usa `{rows: [{id:1}], rowCount:1}` (não simulando "usuário não encontrado"). O cenário real nunca é exercitado.
- ⚠️ Não testa validação de argumento ausente (sem `process.argv[3]` → `process.exit(1)`).
- ⚠️ Não testa erro de banco durante UPDATE ou INSERT.
- ⚠️ Não testa chamada a `hashPassword` quando `libAuth.hashPassword` lança erro.

**Melhoria recomendada:**
- Importar `reset-password.js` e mockar `readline`/`process.argv`.
- Corrigir lógica do teste de INSERT: primeiro mock deve ser `rowCount: 0` para UPDATE.
- Testar path de erro de banco.

---

#### 3.9 `scripts/seed-all.test.js`

**Arquivo sob teste:** `scripts/seed-all.js`  
**Escopo:** Orquestrador de seeds (verifica conexão, executa seeds em ordem).

**Testes (2 casos):**

| Teste | O que valida |
|---|---|
| Verifica conexão | Query `SELECT 1` retorna `{ '?column?': 1 }` |
| Ordem de seeds | Array `['seed-posts.js', 'seed-musicas.js', 'seed-videos.js']` |

**Problemas:**
- 🔴 **Extremamente fraco:** O teste de "ordem de seeds" é um teste de array hardcoded — nem sequer importa o script. `seed-all.js` executa `seed-posts.js`, `seed-musicas.js`, `seed-videos.js`, `seed-settings.js` (4 itens), o teste verifica apenas 3.
- 🔴 Não testa `runSeed` (import dinâmico).
- 🔴 Não testa `--clean` flag.
- 🔴 Não testa falha de conexão (retorno de `checkDatabaseReady()` → `false`).
- 🔴 Não testa falha de seed individual.

**Melhoria recomendada:**
- Importar `seed-all.js` e mockar `child_process.execSync`, `fs.promises`, `path`.
- Testar path de erro de conexão.
- Testar que seeds são chamados em ordem correta.
- Testar que `--clean` invoca `npm run db:reset`.

---

#### 3.10 `scripts/validate-schema.test.js`

**Arquivo sob teste:** `scripts/validate-schema.js`  
**Escopo:** Valida se tabelas e colunas existem no banco conforme `EXPECTED_SCHEMA`.

**Testes (3 casos):**

| Teste | O que valida |
|---|---|
| Exporta `validateSchema` | `typeof === 'function'` + `loadEnv` chamado |
| Schema correto | Retorna `true` quando tabelas/colunas correspondem |
| Erro de conexão | Retorna `false` + loga `console.error` com "Erro fatal ao validar schema" |

**Problemas:**
- ✅ **Positivo:** Comentário excelente explicando por que `jest.mock` (não `unstable_mockModule`) para interceptar require CJS do Babel.
- ✅ **Positivo:** Testa comportamento real do módulo, não apenas o mock.
- ✅ **Positivo:** Mock condicional de query (`SELECT EXISTS`, `information_schema.columns`, fallback).
- ⚠️ Não testa cenário de tabela faltando (retorna `false` + log "Tabela faltando").
- ⚠️ Não testa cenário de colunas faltando (retorna `false` + log "Colunas faltando").
- ⚠️ Não testa `finally { await closePool() }`.

**Melhoria recomendada:**
- Adicionar teste de tabela ausente no schema.
- Adicionar teste de colunas ausentes em tabela existente.
- Verificar que `closePool` é chamado mesmo em erro.

---

#### 3.11 `scripts/utils/cleanup.test.js`

**Arquivo sob teste:** `scripts/utils/cleanup.js`  
**Escopo:** Módulo compartilhado de limpeza — reexporta `loadEnv`, fornece `cleanTableByPattern`.

**Testes (2 casos):**

| Teste | O que valida |
|---|---|
| `loadEnv` com `.env.local` | `fs.existsSync('.env.local')` chamado |
| `loadEnv` sem `.env.local` | Pula `.env.local`, apenas `.env` |

**Problemas:**
- 🔴 **Não testa `cleanTableByPattern`** — a função principal do módulo.
- ⚠️ O teste importa `fs` como `fsMock` do mock, mas `jest.mock('fs')` sem factory — depende de `__mocks__/fs.js` automático.
- ⚠️ Testa apenas que `existsSync` é chamado, não o comportamento completo do `loadEnv`.

**Melhoria recomendada:**
- Testar `cleanTableByPattern` com mock de `pool.query`.
- Testar construção de query LIKE com múltiplos patterns.
- Testar `showDeleted: true` com RETURNING.
- Testar path de erro (lança `process.exit(1)`).

---

#### 3.12 `scripts/utils/constants.test.js`

**Arquivo sob teste:** `scripts/utils/constants.js`  
**Escopo:** Constantes compartilhadas do projeto.

**Testes (12 casos):**

| Teste | O que valida |
|---|---|
| `MAX_BACKUPS` | `=== 10` |
| `DEFAULT_LIST_LIMIT` | `=== 50` |
| `BACKUP_INTERVAL_MS` | `=== 86400000` |
| `ENCRYPTION_KEY_LENGTH` | `=== 32` |
| `MAX_LOG_LINES` | `=== 100` |
| `DEFAULT_PORT` | `=== 3000` |
| `SERVER_CHECK_TIMEOUT` | `=== 2000` |
| `POST_ALERT_THRESHOLD` | `=== 10` |
| `DEFAULT_BATCH_SIZE` | `=== 50` |
| `MIGRATIONS_TABLE` | `=== '_migrations'` |
| `K6_RETENTION_DAYS` | `=== 7` |
| Sem `undefined` | Todos os exports definidos |

**Problemas:**
- ⚠️ **Snapshot implícito:** Testar valores hardcoded é frágil — qualquer mudança na constante quebra o teste. Melhor testar **invariantes** (ex: `MAX_BACKUPS > 0`, `BACKUP_INTERVAL_MS >= 86400000`).
- ⚠� Faltam testes para constantes adicionais: `LOG_RETENTION_DAYS`, `LOG_MAX_SIZE_BYTES`, `DISK_THRESHOLD_PERCENT`, `DISK_PATH_DEFAULT`, `PRE_RESTORE_PREFIX`, `REPORTS_DIR`, `K6_SUMMARY_DIR`, `LOAD_TESTS_DIR`.

**Melhoria recomendada:**
- Testar invariantes em vez de valores exatos.
- Adicionar todas as constantes faltantes.
- Considerar usar `Object.freeze()` no módulo para prevenir mutação.

---

#### 3.13 `scripts/utils/date-format.test.js`

**Arquivo sob teste:** `scripts/utils/date-format.js`  
**Escopo:** Funções `formatISODate` e `formatLogDate`.

**Testes (10 casos):**

| Teste | O que valida |
|---|---|
| `formatISODate` exportada | `typeof === 'function'` |
| `formatISODate` formato | `YYYY-MM-DDTHH-mm-ssZ` (dois-pontos → hífen) |
| `formatISODate` retorna string | Sem args, retorna string |
| `formatISODate` regex | Valida padrão com `/^\d{4}-...-Z$/` |
| `formatISODate` default agora | Usa `Date.now()` se sem arg |
| `formatLogDate` exportada | `typeof === 'function'` |
| `formatLogDate` formato | `YYYY-MM-DD HH:mm:ss` (com espaço) |
| `formatLogDate` retorna string | Sem args |
| `formatLogDate` regex | Valida padrão |
| `formatLogDate` default agora | Usa `Date.now()` |

**Problemas:**
- ✅ **Positivo:** Cobertura completa das duas funções.
- ✅ **Positivo:** Testa formato, tipo, regex e default.
- ⚠️ O teste de "default agora" é frágil — compara timestamps com margem de ±1s, mas a conversão pode falhar se o teste rodar próximo a meia-noite UTC.
- ⚠️ Não testa com `null` ou `undefined` explícito (embora `date = new Date()` cubra o default).

**Melhoria recomendada:**
- Testar com datas de borda (23:59:59, 00:00:00, ano bissexto).
- Testar que `formatLogDate` retorna string UTC (não local).

---

#### 3.14 `scripts/utils/load-env.test.js`

**Arquivo sob teste:** `scripts/utils/load-env.js`  
**Escopo:** Carregamento de `.env`/`.env.local` e validação de `DATABASE_URL`.

**Testes (5 casos):**

| Teste | O que valida |
|---|---|
| `loadEnv` com `.env.local` | Chama `dotenv.config({ path: '.env.local' })` + `.env` (2x) |
| `loadEnv` sem `.env.local` | Chama `dotenv.config` 1x |
| `requireDatabaseUrl` com URL | Não lança |
| `requireDatabaseUrl` sem URL | Lança erro "DATABASE_URL não definida" |
| `requireDatabaseUrl` string vazia | Lança erro |

**Problemas:**
- ✅ **Positivo:** Testa todos os branches de `requireDatabaseUrl`.
- ✅ **Positivo:** Valida número de chamadas `toHaveBeenCalledTimes`.
- ⚠️ Depende de `__mocks__/fs.js` e `__mocks__/dotenv.js` automáticos — não usa factory.
- ⚠️ Não testa ordem das chamadas (`.env.local` antes de `.env`).

**Melhoria recomendada:**
- Testar ordem estrita: `dotenv.config({ path: '.env.local' })` chamado **antes** de `dotenv.config()`.
- Mockar `fs` e `dotenv` explicitamente para evitar dependência de mocks automáticos.

---


#### Críticos (🔴)

| # | Descrição | Arquivos afetados |
|---|---|---|
| 1 | **Testes testam o mock, não o script real** | `clear-db.test.js`, `clear-musicas.test.js`, `reset-password.test.js`, `seed-all.test.js` |
| 2 | **Testes de cancelamento/falso-positivo** | `clear-db.test.js` (teste "não deve executar TRUNCATE se usuário cancelar") |
| 3 | **`backup.test.js` apenas verifica exports** | Nenhuma lógica de `createBackup`, `restoreBackup`, criptografia, hash, rotação |
| 4 | **`cleanup.test.js` não testa `cleanTableByPattern`** | Função principal do módulo não coberta |
| 5 | **`seed-all.test.js` testa array hardcoded** | Nem importa o script |

#### Moderados (⚠️)

| # | Descrição | Arquivos afetados |
|---|---|---|
| 6 | Mocks automáticos (`jest.mock('pg')` sem factory) dependem de `__mocks__/pg.js` global | `clean-orphaned-images.test.js` |
| 7 | Schemas duplicados em múltiplos describe | `init-table.test.js` |
| 8 | Constantes faltando em `constants.test.js` | `LOG_RETENTION_DAYS`, `LOG_MAX_SIZE_BYTES`, `DISK_THRESHOLD_PERCENT`, etc. |
| 9 | `migrate.test.js` sem testar `applyMigration`/`revertLastMigration` | Cobertura parcial |
| 10 | `connection.test.js` — `resetPool()` no beforeEach acumula estado de mock | Singleton test pode falhar se ordem mudar |

#### Menores

| # | Descrição |
|---|---|
| 11 | Comentários explicativos sobre mocks inconsistentes entre arquivos |
| 12 | `date-format.test.js` — teste de timestamp próximo a meia-noite UTC é frágil |
| 13 | `load-env.test.js` — não testa ordem estrita de carregamento |

---


#### 5.1 Testar o Script Real (não o mock)

Para `clear-db`, `clear-musicas`, `reset-password`, `seed-all`:

```js
// Padrão correto:
jest.mock('./db/connection.js', () => ({
  query: jest.fn(),
  closePool: jest.fn(),
}));
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn((_, cb) => cb('s')),
    close: jest.fn(),
  })),
}));
const { clearDatabase } = await import('../../../scripts/clear-db.js');
await clearDatabase();
expect(query).toHaveBeenCalledWith(expect.stringContaining('TRUNCATE'));
```

#### 5.2 Expandir `backup.test.js`

- Testar `getBackupFiles` com mock de `fs.promises.opendir`.
- Testar `cleanupOldBackups` removendo arquivos além do limite.
- Testar `logBackupOperation` com sanitização de secrets (verificar que `password=***` aparece no log).
- Testar criptografia: definir `BACKUP_ENCRYPTION_KEY` com 64 chars hex, verificar escrita de `.enc` e remoção de `.sql.gz`.

#### 5.3 Expandir `cleanup.test.js`

- Testar `cleanTableByPattern` com `pool.query` mockado.
- Testar construção de `WHERE column LIKE $1 OR column LIKE $2`.
- Testar `showDeleted: true` com `RETURNING`.
- Testar path de erro (`process.exit(1)`).

#### 5.4 Invariants vs Valores Hardcoded (constants.test.js)

```js
// Em vez de:
expect(constants.MAX_BACKUPS).toBe(10);

// Preferir:
expect(constants.MAX_BACKUPS).toBeGreaterThan(0);
expect(constants.MAX_BACKUPS).toBeLessThanOrEqual(100);
```

#### 5.5 Extrair Schemas Compartilhados (`init-table.test.js`)

```js
// Em cada describe, os schemas são redeclarados.
// Melhor: declarar em beforeAll ou em helper compartilhado.
let musicasSchema;
beforeAll(() => {
  musicasSchema = { table: 'musicas', ... };
});
```

#### 5.6 Isolamento de Mocks

- Usar `jest.mock('fs', () => ({ ... }))` com factory explícita em vez de depender de `__mocks__/fs.js` automático.
- Usar `jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }))` explicitamente.

---


#### Duplicações

| Padrão | Ocorrências |
|---|---|
| `jest.mock('pg'); jest.mock('fs'); jest.mock('dotenv');` | Repetido em `clear-db.test.js`, `clear-musicas.test.js`, `reset-password.test.js`, `clean-orphaned-images.test.js` |
| `jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb());` | `clear-db.test.js`, `clear-musicas.test.js`, `reset-password.test.js`, `seed-all.test.js` |
| `process.env.DATABASE_URL = 'postgres://user:***@localhost:5432/testdb'` + `delete process.env.DATABASE_URL` | Praticamente todos os arquivos |
| `musicasSchema` e `dicasSchema` | Duplicados em cada `describe` de `init-table.test.js` |
| Mock de `loadEnv` | Repetido em `clear-db.test.js`, `migrate.test.js` |

**Recomendação:** Criar `tests/unit/scripts/helpers/common-mocks.js` com:
- `mockPostgres()`
- `mockFs()`
- `mockDbModule()`
- `setupDatabaseEnv()` / `teardownDatabaseEnv()`

#### Código Morto / Resíduos

| Resíduo | Local | Observação |
|---|---|---|
| `jest.unstable_mockModule('date-fns', ...)` | `backup.test.js` | `backup.js` não usa `date-fns` desde refatoração para `date-format.js` |
| Import `{ mockQuery } from 'pg'` | `clean-orphaned-images.test.js` | Depende de `__mocks__/pg.js` que pode não existir; o mock real é feito por `jest.mock('pg')` automático |
| `afterEach` sem body | `reset-password.test.js` | Não há cleanup entre testes |
| Mock de `dotenv/config` em `reset-password.test.js` vs `dotenv` em outros | Inconsistência | `reset-password.js` importa `dotenv` (não `dotenv/config`), mas o mock usa `dotenv/config` |

---


| Arquivo de Teste | Funções Testadas | Funções Não Testadas | Cobertura Estimada |
|---|---|---|---|
| `connection.test.js` | getPool, closePool, query | resetPool (indireto) | 85% |
| `backup.test.js` | (só exports) | createBackup, restoreBackup, cleanupOldBackups, getBackupFiles, logBackupOperation, getBackupLogs, ensureBackupDirectory, generateBackupFilename, runPgDumpToFile, runPsqlFromFile, calculateFileHash, checkDiskBeforeBackup, rotateLogIfNeeded, cleanupOldLogs | 10% |
| `clean-orphaned-images.test.js` | cleanOrphanedImages | (parcial — múltiplos branches) | 60% |
| `clear-db.test.js` | (só imports) | clearDatabase, clearUploadsDir, askConfirmation | 15% |
| `clear-musicas.test.js` | (só imports) | clearMusicRecords, askConfirmation | 10% |
| `init-table.test.js` | buildCreateTableSQL, getSeedValues, buildSeedSQL, getTableName | loadSchemaFromDir | 75% |
| `migrate.test.js` | listMigrationFiles, migrationNameFromFile, ensureMigrationTable, getAppliedMigrations | applyMigration, revertLastMigration, listStatus, showHelp | 45% |
| `reset-password.test.js` | (chamadas diretas) | resetPassword, path de erro | 25% |
| `seed-all.test.js` | (array hardcoded) | seedAll, runSeed, checkDatabaseReady | 10% |
| `validate-schema.test.js` | validateSchema (caminho feliz + erro) | tabela faltando, coluna faltando | 55% |
| `utils/cleanup.test.js` | loadEnv (parcial) | cleanTableByPattern | 25% |
| `utils/constants.test.js` | 11 constantes | 8 constantes faltando | 60% |
| `utils/date-format.test.js` | formatISODate, formatLogDate | (cobertura completa) | 95% |
| `utils/load-env.test.js` | loadEnv, requireDatabaseUrl | (cobertura completa) | 90% |

**Média estimada de cobertura da suíte:** ~45–50%

---

## Apêndice: Relação Script ↔ Teste ↔ Mock

| Script | Arquivo de Teste | Mock Principal | Status |
|---|---|---|---|
| `scripts/db/connection.js` | `connection.test.js` | `jest.unstable_mockModule('pg')` | ✅ Adequado |
| `scripts/backup.js` | `backup.test.js` | `child_process`, `fs`, `date-fns` | 🔴 Inadequado (só exports) |
| `scripts/clean-orphaned-images.js` | `clean-orphaned-images.test.js` | `pg`, `fs`, `dotenv` | ⚠️ Parcial |
| `scripts/clear-db.js` | `clear-db.test.js` | `lib/infra/db.js` | 🔴 Testa mock, não script |
| `scripts/clear-musicas.js` | `clear-musicas.test.js` | `lib/infra/db.js` | 🔴 Testa mock, não script |
| `scripts/init-table.js` + `utils/init-table-utils.js` | `init-table.test.js` | (nenhum — funções puras) | ✅ Adequado |
| `scripts/migrate.js` | `migrate.test.js` | `pg`, `fs`, `load-env`, `db/connection` | ⚠️ Parcial |
| `scripts/reset-password.js` | `reset-password.test.js` | `pg`, `fs`, `dotenv/config`, `lib/auth`, `lib/infra/db` | 🔴 Testa mock, não script |
| `scripts/seed-all.js` | `seed-all.test.js` | `pg`, `fs`, `dotenv`, `lib/infra/db` | 🔴 Inadequado |
| `scripts/validate-schema.js` | `validate-schema.test.js` | `pg`, `load-env` | ✅ Adequado |
| `scripts/utils/cleanup.js` | `cleanup.test.js` | `fs`, `dotenv` | 🔴 Falta testar `cleanTableByPattern` |
| `scripts/utils/constants.js` | `constants.test.js` | (nenhum) | ⚠️ Parcial (faltam constantes) |
| `scripts/utils/date-format.js` | `date-format.test.js` | (nenhum) | ✅ Adequado |
| `scripts/utils/load-env.js` | `load-env.test.js` | `fs`, `dotenv` | ✅ Adequado |

---

*Documentação gerada por análise estática e dinâmica dos 14 arquivos de teste. Projeto Caminhar — 2026.*


---


## 18. Testes Unitários — GitHub Workflows e Snapshots


| # | Arquivo | Tipo | Linhas | Finalidade |
|---|---------|------|--------|------------|
| 1 | `tests/unit/github-workflows/pr-coverage-comment.test.js` | Teste lógico | 252 | Valida o script embutido no workflow `pr-coverage.yml` |
| 2 | `tests/unit/components/Admin/__snapshots__/index.test.js.snap` | Snapshot | 16 | Lista exports do barrel Admin |
| 3 | `tests/unit/components/Features/ContentTabs/__snapshots__/index.test.js.snap` | Snapshot | 7 | Lista exports do barrel ContentTabs |
| 4 | `tests/unit/components/Layout/__snapshots__/index.test.js.snap` | Snapshot | 14 | Lista exports do barrel Layout |
| 5 | `tests/unit/components/Performance/__snapshots__/index.test.js.snap` | Snapshot | 13 | Lista exports do barrel Performance |
| 6 | `tests/unit/components/SEO/__snapshots__/index.test.js.snap` | Snapshot | 17 | Lista exports do barrel SEO |
| 7 | `tests/unit/components/UI/__snapshots__/index.test.js.snap` | Snapshot | 30 | Lista exports do barrel UI |

**Total de arquivos de teste relacionados:** 127 arquivos `.test.js` no projeto, 7 arquivos `.snap`.

---


#### 1.1 Finalidade

Testa a lógica do step **"Post PR Comment on Failure"** do workflow `.github/workflows/pr-coverage.yml`. O step é escrito em JavaScript inline dentro do YAML e é executado pelo `actions/github-script`. Este teste replica o comportamento desse script sem depender de:

- Disco (usa `require('fs')` shimado com amostra em memória)
- GitHub API real (mock de `github.rest.issues.createContext`)
- Contexto de CI real (mock de `context`)

#### 1.2 Arquitetura do Teste

O teste implementa **três cenários** principais:

```
┌──────────────────────────────────────────────────────────────────┐
│ pr-coverage-comment.test.js                                     │
│                                                                  │
│  Cenário A — cobertura abaixo do mínimo                         │
│  ├── amostraComTabela(): gera 170 KB+ de saída                  │
│  │   ├── ruidoInicial(): 900 linhas console.error               │
│  │   ├── LINHAS_SENSIVEIS: crases, ${} e \\                    │
│  │   ├── TABELA_COBERTURA: saída do --coverage                  │
│  │   └── MOTIVO_THRESHOLD + RESUMO_JEST                        │
│  └── Validações:                                                │
│      ├── body.length ≤ 65536 (limite API)                      │
│      ├── marcador '### ❌ Cobertura...' presente               │
│      ├── tabela e thresholds preservados                       │
│      ├── ruído ('not wrapped in act') descartado               │
│      └── alvo do comentário correto (owner/repo/issue)         │
│                                                                  │
│  Cenário B — suíte quebrada antes da cobertura                  │
│  ├── amostraSemTabela(): FAIL sem tabela de cobertura           │
│  └── Validações:                                                │
│      ├── body.length ≤ 65536                                    │
│      ├── marcador '(início da saída truncado)'                 │
│      └── fim da saída preservado (FAIL line, Ran all suites)   │
│                                                                  │
│  Cenário C — caracteres sensíveis                                │
│  ├── LINHAS_SENSIVEIS no corpo                                  │
│  └── Validações:                                                │
│      ├── 'suite-${nome}' preservado sem escape                 │
│      ├── '${post.id}' preservado                               │
│      ├── 'C:\\jest\\output\\dump.txt' preservado               │
│      └── sem artefatos de escape ('\\`', '\\${')               │
│                                                                  │
│  Cenário D — controle negativo do preparo legado                │
│  ├── preparoLegado(): lógica ANTIGA (corte pelo começo)        │
│  └── Validações:                                                │
│      ├── corte pelo começo perde o fim                         │
│      └── escape corrompe crases e ${}                           │
└──────────────────────────────────────────────────────────────────┘
```

#### 1.3 Componentes-Chave do Script Testado

#### 1.3.1 `scriptDoStep()` — Fonte única de verdade

```javascript
const workflow = YAML.parse(fs.readFileSync(CAMINHO_WORKFLOW, 'utf8'));
const step = workflow.jobs[JOB].steps.find(candidato => candidato.name === NOME_STEP);
return step.with.script;
```

**Crítica:** O teste lê diretamente do arquivo YAML e executa o script inline usando `new Function()`. Isso é uma prática de teste excelente — **não duplica o script**, garantindo que o teste sempre reflete a versão real implantada.

#### 1.3.2 `publicarComentario(amostra)` — Executor isolado

Usa `new Function()` para criar uma IIFE com os parâmetros injetados:
- `github` (mock com `createComment` que grava chamadas)
- `context` (mock com owner/repo/issue_number)
- `require` (shim que intercepta `'fs'` e devolve a amostra)

#### 1.3.3 `ruidoInicial()` — Gerador de carga

Gera 900 iterações de `console.error` + `act(...)` para simular ~60 KB de ruído inicial, forçando o corte de `MAX_CHARS` na lógica do workflow.

#### 1.4 Análise de Problemas e Melhorias

| # | Categoria | Achado | Severidade | Recomendação |
|---|-----------|--------|------------|--------------|
| 1 | **Acoplamento** | `scriptDoStep()` depende de leitura síncrona do disco via `fs.readFileSync` | Baixo | Aceitável — é teste unitário, não operação de produção. Pode falhar se o workflow for renomeado/removido. |
| 2 | **Duplicação lógica** | A lógica de truncamento (`MAX_CHARS = 60000`) está espelhada entre o teste e o workflow. Se alterarem o workflow e esquecerem o teste, o teste pode passar mas o workflow falhar. | Médio | Usar um arquivo compartilhado com a constante `MAX_CHARS` exportada, ou testar via regex o script no YAML para verificar se contém o valor esperado. |
| 3 | **Cobertura do teste** | Não testa o cenário onde `fs.existsSync('coverage-output.txt')` retorna `false` (job de testes falhou antes de gerar o arquivo). O cenário B (`amostraSemTabela`) simula o conteúdo, mas o script do workflow usa `fs.existsSync` para decidir a mensagem. | Médio | Adicionar um teste onde `fs.existsSync('coverage-output.txt')` retorna `false` e verificar se a mensagem '(saída de cobertura indisponível...)' é publicada. |
| 4 | **Manutenibilidade** | A função `preparoLegado()` replica lógica antiga APENAS para provar que era ruim. É código morto disfarçado de teste. | Baixo | Aceitável como documentação histórica, mas comentar explicitamente que é "legado" ajuda. |
| 5 | **Precisão do mock de fs** | `fsSimulado.existsSync` retorna `true` para `ARQUIVO_AMOSTRA` **ou** delega para `fs.existsSync` real. Isso pode causar falsos positivos se o arquivo existir no disco durante o teste. | Baixo | Usar caminho absoluto único para a amostra simulada, ex: `/tmp/fake-coverage.txt`, evitando colisão com arquivos reais. |
| 6 | **Jest config** | `testEnvironment: 'jsdom'` no jest.config.js, mas este teste não precisa de DOM (testa lógica de string/IO). | Baixo | Mover para um contexto `node` ou aceitar o custo jsdom (pequeno em teste puro). |

#### 1.5 Relações com Outros Arquivos

```
pr-coverage-comment.test.js
  ├── LÊ: .github/workflows/pr-coverage.yml (script do step)
  ├── USA: yaml (parser), fs (readFileSync), @jest/globals
  └── VERIFICA:
      ├── Comentário cabe em 65536 chars
      ├── Marcador '### ❌ Cobertura...' presente
      ├── Tabela de cobertura no fim sobrevive ao truncamento
      └── Ruído do começo é descartado

Workflow pr-coverage.yml
  ├── Job "coverage" → gera coverage-output.txt
  └── Job "coverage-report"
      ├── Step "Remove Old Coverage Comments" → busca pelo mesmo marcador
      └── Step "Post PR Comment on Failure" → executado por este teste
```

#### 1.6 Código Morto / Duplicidades

- **Código morto:** Nenhum no arquivo de teste. Toda função é usada.
- **Duplicação potencial:** `preparoLegado()` replica lógica antiga para comparação. Poderia ser extraída para um módulo `legacy-helpers.test.js` se houvesse múltiplos testes comparando abordagens.

---


#### 2.1 Padrão Arquitetural

Todos os snapshots de barrel seguem o **mesmo padrão estrutural**:

```
┌─────────────────────────────────────────────────┐
│ index.test.js (fonte)                           │
│   ├── describe('[Barrel] X Components')        │
│   │   ├── it('deve exportar estrutura')        │
│   │   │   └── expect(Object.keys().sort())     │
│   │   │       .toMatchSnapshot()               │
│   │   └── it('deve exportar Y como referência') │
│   │       └── expect(Y).toBeDefined()          │
│   └── Comentário: comando --updateSnapshot      │
└─────────────────────────────────────────────────┘
```

**Padrão consistente em todos os 6 barrels:**
1. Snapshot de `Object.keys(barrel).sort()` — lista ordenada alfabeticamente
2. Asserção de existência de um componente "referência crítica" (nome varia)
3. Comentário com comando de atualização do snapshot

#### 2.2 Comparação de Padrões entre Barrels

| Barrel | Exports | Default | Padrão de Nomeação | Snapshot? | Teste de Referência? |
|--------|---------|---------|-------------------|-----------|---------------------|
| **Admin** | 10 | Não | `AdminXxxNew`, `XxxField` | ✅ | `AdminCrudBase` (defined) |
| **ContentTabs** | 1 | Sim | `default` (função) | ✅ | `default` (defined) |
| **Layout** | 8 | Não (2 por componente: nomeado + `*Default`) | `Xxx`, `XxxDefault` | ✅ | `Container` (defined) |
| **Performance** | 7 | Misto | `Xxx` + funções auxiliares | ✅ | `ImageOptimized` (defined) |
| **SEO** | 11 | Sim (`SEOHead`) | `XxxSchema` + utilitários | ✅ | `default === SEOHead` (toBe) |
| **UI** | 27 | Muito misto | `Xxx`, `XxxDefault`, hooks | ✅ | `Button` (defined) |

#### 2.3 Padrões de Exportação Identificados

#### Padrão 1: **Alias Duplo** (Layout)
```javascript
export { Container } from './Container';
export { default as ContainerDefault } from './Container';
```
O barrel exporta o mesmo componente como nome nome E como `XxxDefault`. Isso existe para compatibilidade com imports que usam `import { Container }` vs `import Container from '.../Layout/Container'`.

**Problema:** Isso dobra o número de exports sem adicionar valor semântico. O snapshot contém duplicatas virtuais (`Container` + `ContainerDefault`).

#### Padrão 2: **Default Explícito** (ContentTabs, SEO)
```javascript
// ContentTabs
export default function ContentTabs() { ... }

// SEO
export { default } from './Head';
```
O snapshot de ContentTabs contém apenas `["default"]` — o componente inteiro é default, não há nomeados.

O snapshot de SEO tem `["ArticleSchema", ..., "default", "getCanonicalUrl", ...]` — mistura estruturada com default explícito.

#### Padrão 3: **Componentes + Utilitários** (Performance, UI)
```javascript
export { default as PreloadResources, getCriticalResources } from './PreloadResources';
export { default as CriticalCSS, extractCriticalCSS, removeCriticalCSS } from './CriticalCSS';
```
O barrel agrupa componentes React e funções utilitárias. O snapshot confirma que funções não-React (`extractCriticalCSS`, `removeCriticalCSS`) aparecem ao lado de componentes.

#### 2.4 Análise Individual de Cada Snapshot

---

#### 2.4.1 `Admin/__snapshots__/index.test.js.snap`

**Conteúdo:**
```json
[
  "AdminCrudBase",     // Componente CRUD reutilizável
  "AdminMusicasNew",   // Admin de músicas
  "AdminPostsNew",     // Admin de posts
  "AdminVideosNew",    // Admin de vídeos
  "ExternalDataButton",// Campo de dados externos
  "ImageUploadField",  // Campo de upload de imagem
  "TextAreaField",     // Campo de texto longo
  "TextField",         // Campo de texto simples
  "ToggleField",      // Campo toggle/switch
  "UrlField",         // Campo de URL
]
```

**Finalidade:** Garantir que o barrel Admin exporte exatamente os 10 componentes do sistema administrativo, mantendo a estrutura CRUD e campos de formulário.

**Problemas identificados:**
1. **Nomenclatura inconsistente:** `AdminMusicasNew`, `AdminVideosNew`, `AdminPostsNew` usam sufixo `New`, mas `AdminCrudBase` não. Isso sugere refactor incompleto — os `New` provavelmente vieram de uma migração de componentes antigos.
2. **Campos sem prefixo:** `TextField`, `TextAreaField`, `ToggleField` não têm prefixo `Admin`, podendo gerar colisão com campos de UI genéricos. Porém, o barrel isola o namespace.

**Código morto no barrel real:** Nenhum — todos os exports são importados de arquivos `*.js` dedicados.

---

#### 2.4.2 `Features/ContentTabs/__snapshots__/index.test.js.snap`

**Conteúdo:**
```json
["default"]
```

**Finalidade:** Garantir que o barrel ContentTabs exporte **apenas** o componente default (sem named exports).

**Observação arquitetural:** Diferente de todos os outros barrels, este é um barrel "trivial" — re-exporta uma única função default. O snapshot tem apenas 1 entrada.

**Problema potencial:**
- O barrel `ContentTabs/index.js` exporta `ContentTabs` como **default** diretamente (não via `export { default as ... }`), mas o barrel **não é um módulo de índice** — é o próprio componente. O arquivo `index.js` aqui é o componente, não um barrel de múltiplos arquivos.
- Isso viola o padrão dos outros barrels (que são índices que agregam múltiplos módulos).

**Recomendação:** Renomear `components/Features/ContentTabs/index.js` para `ContentTabs.js` e eliminar a camada `index.js` desnecessária, ou explicitamente aceitar que este é um "barrel degenerado".

---

#### 2.4.3 `Layout/__snapshots__/index.test.js.snap`

**Conteúdo:**
```json
[
  "Container",
  "ContainerDefault",
  "Grid",
  "GridDefault",
  "Sidebar",
  "SidebarDefault",
  "Stack",
  "StackDefault",
]
```

**Finalidade:** Garantir que cada componente de layout seja exportado de duas formas: nome direto e alias `Default`.

**Padrão único:** É o **único barrel** que duplica exports dessa forma. A razão (lida do código-fonte) é compatibilidade com dois estilos de import:
```javascript
import { Container } from './components/Layout';
// vs
import ContainerDefault from './components/Layout/Container';
```

**Problemas:**
1. **Duplicação semântica:** `Container` e `ContainerDefault` referenciam o mesmo componente. Se alguém refatorar `Container` para ter exports diferentes do default, o barrel silenciosamente quebra.
2. **Snapshot inflado:** 4 componentes geram 8 entries no snapshot — 50% é duplicação.
3. **Inconsistência:** Os outros barrels (UI, Performance, SEO) NÃO seguem esse padrão de alias `Default` (exceto UI, que tem `ButtonDefault`, `InputDefault`, etc. — mas o motivo é diferente: UI re-exporta defaults de arquivos que têm BOTH named e default exports).

**Análise do barrel real:**
```javascript
export { Container } from './Container';           // named export
export { default as ContainerDefault } from './Container'; // default as named
```
Se `Container.js` exporta `export function Container()` e também `export default Container`, então o barrel expõe ambos. Se `Container.js` só tem `export default`, o primeiro export falha silenciosamente em runtime.

---

#### 2.4.4 `Performance/__snapshots__/index.test.js.snap`

**Conteúdo:**
```json
[
  "CriticalCSS",
  "ImageOptimized",
  "LazyIframe",
  "PreloadResources",
  "extractCriticalCSS",
  "getCriticalResources",
  "removeCriticalCSS",
]
```

**Finalidade:** Garantir que o barrel Performance exporte 4 componentes React + 3 funções utilitárias.

**Padrão:** Componentes e utilitários coexistem no mesmo barrel. Funções auxiliares (`extractCriticalCSS`, `removeCriticalCSS`) são exportadas junto com os componentes que as usam (`CriticalCSS`).

**Observação:** Diferente de Admin/Layout/UI, Performance não tem prefixo `Default` nos exports. O barrel usa diretamente:
```javascript
export { default as ImageOptimized } from './ImageOptimized';
export { default as CriticalCSS, extractCriticalCSS, removeCriticalCSS } from './CriticalCSS';
```

Isso é mais limpo que o padrão Layout.

---

#### 2.4.5 `SEO/__snapshots__/index.test.js.snap`

**Conteúdo:**
```json
[
  "ArticleSchema",
  "BreadcrumbSchema",
  "MusicSchema",
  "OrganizationSchema",
  "SEOHead",
  "VideoSchema",
  "WebsiteSchema",
  "default",
  "getCanonicalUrl",
  "getImageUrl",
  "siteConfig",
]
```

**Finalidade:** Garantir que o barrel SEO exporte:
- 1 default (`SEOHead`)
- 6 componentes de Schema.org (`ArticleSchema`, `BreadcrumbSchema`, etc.)
- 3 utilitários (`getCanonicalUrl`, `getImageUrl`, `siteConfig`)

**Teste mais rico:** O teste do SEO faz algo único entre todos os barrels — verifica **identidade de referência**:
```javascript
expect(DefaultExport).toBe(SEOComponents.SEOHead);
```
Isso garante que o `default` do barrel é exatamente o mesmo objeto que a exportação nomeada `SEOHead`, não uma cópia.

**Problema potencial:** O snapshot contém `default` como string no array, mas o teste usa `Object.keys()` que retorna `"default"`. Isso é consistente.

---

#### 2.4.6 `UI/__snapshots__/index.test.js.snap`

**Conteúdo:**
```json
[
  "Alert",
  "AlertDefault",
  "Badge",
  "BadgeDefault",
  "BaseCard",
  "Button",
  "ButtonDefault",
  "Card",
  "CardDefault",
  "Icons",
  "Input",
  "InputDefault",
  "Modal",
  "ModalDefault",
  "Select",
  "SelectDefault",
  "Spinner",
  "SpinnerDefault",
  "TextArea",
  "TextAreaDefault",
  "Toast",
  "ToastDefault",
  "defaultIcons",
  "useToast",
]
```

**Finalidade:** Garantir que o barrel UI exporte 27 itens — o maior barrel do projeto.

**Padrão complexo:**
1. **Componentes nomeados:** `Alert`, `Badge`, `BaseCard`, `Button`, etc.
2. **Aliases `Default`:** `AlertDefault`, `BadgeDefault`, `ButtonDefault`, etc.
3. **Componentes sem alias:** `BaseCard`, `Card` (Card é alias para BaseCard)
4. **Utilitários não-componente:** `defaultIcons`, `useToast`, `Icons`
5. **Hooks:** `useToast`

**Problemas identificados:**
1. **Colisão de nomes:** `Icons` é `export { defaultIcons as Icons }` — renomeação que pode confundir.
2. **Card vs BaseCard:** `Card` é mantido para compatibilidade (comentário no barrel), mas o snapshot contém ambos. Se alguém remover `Card`, o snapshot quebra — teste de compatibilidade implícito.
3. **Coexistência de padrões:** `BaseCard` e `Card` NÃO têm alias `Default`, mas `Badge`, `Button` têm. Isso é inconsistente.
4. **Snapshot grande:** 27 entries — qualquer refactor no UI quebra este snapshot. Risco de "snapshot fatigue" (desenvolvedores atualizam sem ler).

---


#### 3.1 Duplicações Entre os Testes de Barrel

| Padrão | Arquivos Afetados | Duplicação |
|--------|-------------------|------------|
| Estrutura do describe/it | Todos os 6 testes | 100% idêntica — `describe('[Barrel] X')` + `it('deve exportar...')` + `it('deve exportar Y')` |
| Comentário de atualização | Todos os 6 testes | `// npx jest tests/unit/components/X/index.test.js --updateSnapshot` |
| `import { describe, it, expect } from '@jest/globals'` | Todos os 6 | Idêntico |
| `import * as XComponents from '...'` | Todos os 6 | Mesmo padrão, paths diferentes |
| `Object.keys(XComponents).sort()` | Todos os 6 | Lógica idêntica |

**Avaliação:** Esta duplicação é **intencional e aceitável** — testes de barrel são simplesmente boilerplate de verificação de snapshot. Extrair para helper traria complexidade desnecessária.

#### 3.2 Código Morto nos Snapshots

| Snapshot | Possível Código Morto | Evidência |
|----------|----------------------|-----------|
| `Admin` | Nenhum | Todos os 10 exports são usados em rotas/admin |
| `ContentTabs` | Nenhum | `default` é usado em pages |
| `Layout` | Nenhum | Todos os componentes são usados em layouts |
| `Performance` | Nenhum | Componentes usados em _app.js e pages |
| `SEO` | Nenhum | Componentes usados em páginas e API |
| `UI` | **Potencialmente `BaseCard`** | `BaseCard` é exportado, mas `Card` é o alias usado. Se `Card` for usado e `BaseCard` não for importado em nenhum lugar, `BaseCard` é código morto no barrel. |

#### 3.3 Análise de Consistência dos Testes vs Snapshots

**Verificação:** Os snapshots estão sincronizados com os barrels?

| Barrel | Snapshot | Barrel Real | Sincronizado? |
|--------|----------|-------------|---------------|
| Admin | 10 entries | 10 exports | ✅ Sim |
| ContentTabs | 1 entry (`default`) | 1 default export | ✅ Sim |
| Layout | 8 entries | 8 exports (4×2) | ✅ Sim |
| Performance | 7 entries | 7 exports | ✅ Sim |
| SEO | 11 entries | 11 exports | ✅ Sim |
| UI | 27 entries | 27 exports | ✅ Sim |

**Conclusão:** Todos os snapshots estão sincronizados com seus barrels correspondentes.

---


#### 4.1 Grafo de Dependência dos Testes de Barrel

```
components/Admin/index.js ────────► tests/unit/components/Admin/index.test.js
                                         └─► __snapshots__/index.test.js.snap

components/Features/ContentTabs/index.js ──► tests/unit/components/Features/ContentTabs/index.test.js
                                                └─► __snapshots__/index.test.js.snap

components/Layout/index.js ─────────► tests/unit/components/Layout/index.test.js
                                         └─► __snapshots__/index.test.js.snap

components/Performance/index.js ────► tests/unit/components/Performance/index.test.js
                                         └─► __snapshots__/index.test.js.snap

components/SEO/index.js ────────────► tests/unit/components/SEO/index.test.js
                                         └─► __snapshots__/index.test.js.snap

components/UI/index.js ─────────────► tests/unit/components/UI/index.test.js
                                         └─► __snapshots__/index.test.js.snap
```

#### 4.2 Dependências do Teste pr-coverage-comment

```
pr-coverage-comment.test.js
  ├── Depende DE:
  │   ├── .github/workflows/pr-coverage.yml (lê o YAML)
  │   ├── yaml package (parser)
  │   └── @jest/globals (describe/it/expect/beforeEach)
  │
  ├── NÃO depende de:
  │   ├── nenhum componente React
  │   ├── nenhum barrel
  │   └── nenhuma API real (GitHub, filesystem)
  │
  └── É testado POR:
      └── Jest runner com --coverage (este teste é coberto pelo próprio workflow que ele testa)
```

---


#### 5.1 Snapshot Fatigue

**Problema:** 7 snapshots de barrel no projeto. Qualquer mudança em um barrel (adicionar/remover componente) quebra o snapshot e requer `--updateSnapshot`. Desenvolvedores podem atualizar sem revisar.

**Recomendação:** Considerar um teste de "invariante" em vez de snapshot exato:
```javascript
// Em vez de toMatchSnapshot()
expect(Object.keys(AdminComponents)).toContain('AdminCrudBase');
expect(Object.keys(AdminComponents)).not.toContain('DeprecatedComponent');
expect(Object.keys(AdminComponents).length).toBeGreaterThan(5);
```
Isso é menos frágil e mais expressivo.

#### 5.2 Inconsistência de Padrões de Barrel

| Aspecto | Admin | ContentTabs | Layout | Performance | SEO | UI |
|---------|-------|-------------|--------|-------------|-----|-----|
| Default export | ❌ | ✅ (único) | ❌ | ❌ | ✅ | ❌ |
| Alias `Default` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Funções utilitárias | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Hooks | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Recomendação:** Documentar a decisão arquitetural de quando usar cada padrão. Atualmente, cada barrel foi escrito de forma independente, resultando em 6 convenções diferentes.

#### 5.3 Falta de Testes nos Barrels

Os testes atuais só verificam **existência** (shape). NÃO verificam:
1. **Tipo:** Se `Button` é função/classe/objeto
2. **Imutabilidade:** Se o barrel é re-exportado corretamente (não quebrado por refactors)
3. **Tree-shaking:** Se imports específicos do barrel não puxam todo o barrel
4. **Compatibilidade de API:** Se os componentes exportados têm as props esperadas

**Recomendação:** Adicionar pelo menos um teste de tipo por barrel:
```javascript
expect(typeof UIComponents.Button).toBe('function');
```

#### 5.4 `pr-coverage-comment.test.js` — Dependência Implícita de Disco

O teste lê `.github/workflows/pr-coverage.yml` do disco. Se o workflow for movido/renomeado, o teste quebra sem aviso claro (apenas `throw new Error`).

**Recomendação:** Adicionar um comentário no workflow YAML informando que ele é testado por este arquivo, e vice-versa.

---


#### O que funciona bem ✅

1. **Teste do workflow PR Coverage** é exemplar — lê o YAML real, executa o script inline, usa mocks isolados. Testa truncamento, escape, marcação e cenários de falha.
2. **Snapshots de barrel** garantem que exports não quebrem silenciosamente.
3. **Cenário negativo** no teste de cobertura (controle do preparo legado) documenta por que a abordagem atual é melhor.
4. **Teste de identidade** no barrel SEO (`toBe`) é mais rigoroso que os outros (`toBeDefined`).

#### O que precisa de atenção ⚠️

1. **Snapshot fatigue** — 27 entries no UI, 8 no Layout (50% duplicação de aliases).
2. **Inconsistência de padrões** — 6 barrels, 6 convenções diferentes.
3. **Barrel ContentTabs** é um barrel degenerado (só tem default).
4. **Teste de cobertura não testa** o branch `fs.existsSync === false`.
5. **UI barrel** contém re-exports renomeados (`Icons`, `Card`, `defaultIcons`) sem documentação clara.

#### Código Morto / Duplicações 🔍

- **Código morto direto:** Nenhum encontrado.
- **Código morto potencial:** `BaseCard` no barrel UI (se não for importado em nenhum lugar externo).
- **Duplicação lógica:** `preparoLegado()` no teste de cobertura replica lógica antiga para comparação — aceitável, mas documentar melhor.
- **Duplicação de alias `Default`:** Presente em Layout e UI — questionar se é necessário ou se `import X from './X'` direto resolveria.

---

*Documentação gerada a partir da análise dos arquivos listado no escopo.*
*Última atualização da análise: 2026-09-23*


---


## 18.1. Testes Unitários — Pages API, Scripts e Snapshots (Complementar)


#### 1.1 `tests/unit/pages/api/admin/dicas.edge.test.js`

**Finalidade**: Testa os defaults de `published` (true) e fallback de IP nas rotas POST e PUT do handler de dicas.

**Relações**: Importa `db`, `audit.logActivity`, `auth.withAuth` (mockado como pass-through). Mock do `db-module` compartilhado.

**Análise**:
- **Forte**: 2 testes cobrem explicitamente os defaults e o audit log com IP `127.0.0.1`.
- **Problema**: O mock do `withAuth` ignora completamente a auth (`jest.fn((h) => h)`), o que mascara falhas de autenticação — o `req.user` é injetado diretamente no `beforeEach`, mas nunca é verificado se o handler rejeita requisição sem auth real.
- **Melhoria**: Testar cenário onde `req.user` é `null` e verificar 401 (similar ao que `posts.edge.test.js` faz).
- **Duplicidade**: O padrão `jest.mock('../../../../../lib/infra/db.js', () => require('../../../../mocks/db-module').mockDb())` é repetido em quase todos os arquivos de API admin — poderia ser helper global do Jest setup.
- **Código morto**: Nenhum.

---

#### 1.2 `tests/unit/pages/api/admin/fetch-ml.edge.test.js`

**Finalidade**: Cobre caminhos específicos do scraping de Mercado Livre — ordenação por ID explícito, fallback HTML, isNaN no price, imagens com `url` vs `secure_url`, e erro no catch do fallback.

**Relações**: Depende de `mockGlobalFetch` helper, `auth.getAuthToken`, `auth.verifyToken`, `logger`.

**Análise**:
- **Forte**: 6 testes muito granulares com comentários indicando linhas exatas do código coberto (`// linha 35`, `// linhas 50-52`). Estratégia sólida de cobertura de branches.
- **Problema**: Mockar `global.fetch` diretamente pode conflitar com `node-mocks-http` em versões diferentes do Node; o `mockGlobalFetch` helper encapsula isso, mas há chamadas a `global.fetch.mockImplementation` que podem não resetar entre testes.
- **Melhoria**: Adicionar `afterEach(() => global.fetch.mockRestore())` explicitamente ou usar `jest.restoreAllMocks()`.
- **Duplicidade**: `mockGlobalFetch` é importado de helper compartilhado — bom.

---

#### 1.3 `tests/unit/pages/api/admin/fetch-spotify.edge.test.js`

**Finalidade**: Garante que quando todas as 3 estratégias de fetch Spotify falham, os 3 `logger.error` são chamados e retorna 500.

**Relações**: Mesmos mocks de `fetch-ml` (auth, logger, fetch).

**Análise**:
- **Forte**: Teste único mas bem focado no cenário de falha total.
- **Problema**: Só 1 teste — não cobre casos de sucesso parcial (ex: oEmbed funciona mas iframe falha).
- **Duplicidade**: Idêntica estrutura de `fetch-ml` (mockGlobalFetch, auth, logger) — poderia reutilizar setup.

---

#### 1.4 `tests/unit/pages/api/admin/posts.edge.test.js`

**Finalidade**: Cobertura abrangente de validação, permissão e erro no CRUD de posts — 401, 403, 400 (Zod), 405, 500 (catch), e reorder.

**Relações**: Mocks de `db`, `cache.checkRateLimit`, `domain/posts`, `crud/updateRecords`, `audit.logActivity`.

**Análise**:
- **Forte**: 11 testes cobrem cenários de autorização, validação (Zod image_url), method not allowed, falha de banco no DELETE/PUT, e reorder. É o mais completo do grupo.
- **Problema**: `db.query.mockResolvedValueOnce` para permissions é usado em cadeia sem `mockReset` entre testes — pode haver poluição de mock entre testes.
- **Melhoria**: Adicionar `jest.clearAllMocks()` no `beforeEach`.

---

#### 1.5 `tests/unit/pages/api/admin/rate-limit.test.js`

**Finalidade**: Testa gerenciamento de rate limit via Redis — bloqueio, whitelist, auditoria, CSV export, current_ip, error handling.

**Relações**: Mocks manuais de `@upstash/redis`, `lib/infra/redis.js`, `auth.withAuth`.

**Análise**:
- **Forte**: 14 testes. Cobertura rica de cenários de whitelist, auditoria com paginação, fallback de IP `::1` → `127.0.0.1`, e `mockRedisScan`. O uso de `require()` dinâmico dentro do teste (`getHandler()`) permite testar recarga de módulo com `jest.resetModules()`.
- **Problema**: 
  - O `mockRedisScan` é declarado fora dos testes mas nunca limpo explicitamente entre testes.
  - O `mockRedisInstance.pipeline` é redefinido com `mockImplementationOnce` em alguns testes mas não restaurado — testes subsequentes podem herdar mocks residuais.
  - `consoleSpy` criado dentro do último teste sem `try/finally` — se o teste falhar, o spy não é restaurado.
- **Melhoria**: Adicionar `afterEach(() => jest.restoreAllMocks())` e resetar `mockRedisInstance` completamente.

---

#### 1.6 `tests/unit/pages/api/admin/roles.edge.test.js`

**Finalidade**: Testa fallback de IP 'unknown', stringificação de permissões no POST, extração de ID da query no PUT/DELETE, e fallback de nome no log de auditoria.

**Relações**: Mock complexo de `auth` com `getAuthToken`/`verifyToken` stateful (referenciam `mockModule` internamente). Mock de `db`, `crud`, `audit`.

**Análise**:
- **Forte**: O mock stateful do `auth` é bem construído — testa o middleware real simulado. 4 testes cobrem branches específicos comentados com números de linha.
- **Problema**: O `auth.withAuth` mockado faz `res.status(401).json(...)` mas não chama `res.end()` — isso pode causar problemas em ambiente real, mas nos testes funciona porque o handler para de qualquer forma.
- **Melhoria**: Testar cenário de token inválido explicitamente (atualmente `verifyToken` sempre retorna truthy no mock).

---

#### 1.7 `tests/unit/pages/api/admin/stats.edge.test.js`

**Finalidade**: Garante que só aceita GET (405) e retorna 500 em erro de banco.

**Relações**: Mock stateful de `auth` (padrão de roles), mock de `db-module`.

**Análise**:
- **Forte**: Simples e direto — 2 testes.
- **Problema**: Usa `db.query.mockReset()` antes de mockar rejeição — isso é um sinal de que mocks residuais de testes anteriores estão interferindo.
- **Melhoria**: Por que o `mockReset` é necessário aqui e não em outros? Investigar setup global.

---

#### 1.8 `tests/unit/pages/api/auth/login.edge.test.js`

**Finalidade**: Testa erro interno na autenticação (500).

**Relações**: Mocks de `auth` (authenticate, generateToken, setAuthCookie, authenticateAndGenerateToken), `cache.checkRateLimit`, `logger`.

**Análise**:
- **Forte**: Mock de logger bem estruturado — exporta tanto métodos individuais quanto objeto `logger`.
- **Problema**: Apenas 1 teste. Não cobre: rate limit ativo, credenciais inválidas, sucesso.
- **Melhoria**: Expandir cobertura de login — o nome "edge.test.js" sugere que é complementar, mas mesmo assim faltam casos.

---

#### 1.9 `tests/unit/pages/api/upload-image.edge.test.js`

**Finalidade**: Testa criação do diretório de upload quando não existe.

**Relações**: Mocks de `fs` (parcial — preserva `requireActual` para outros métodos), `sharp`, `formidable`, `domain/settings`, `auth.withAuth`.

**Análise**:
- **Forte**: Mock de `fs` inteligente — preserva métodos reais e sobresve apenas `existsSync`, `mkdirSync`, `rename`, `unlink`. Mock de `sharp` e `formidable` bem simplificado.
- **Problema**: 
  - `jest.restoreAllMocks()` no `afterEach` pode quebrar o mock do `fs` parcial se restaurar algo que não deveria.
  - O teste verifica `mkdirSync` mas não verifica se o diretório correto foi criado — só verifica que foi chamado.
  - `consoleSpy` mockado lança erros se `err` for truthy — isso é frágil.
- **Melhoria**: Verificar o path completo do mkdir, não apenas `stringContaining('uploads')`.

---


#### 2.1 `tests/unit/scripts/backup.test.js`

**Finalidade**: Verifica que `backup.js` exporta as funções esperadas.

**Relações**: Usa `jest.unstable_mockModule` para `child_process`, `fs`, `date-fns`. Mock de `constants.js`.

**Análise**:
- **Forte**: Usa `jest.isolateModules` no `beforeEach` para recarregar o módulo limpo — importante para módulos com estado interno.
- **Problema**: 
  - Só testa que as funções **existem** — nunca testa o comportamento real (criar backup, restaurar, cleanup).
  - `jest.unstable_mockModule` é experimental e pode quebrar em versões futuras do Jest.
- **Melhoria**: Adicionar testes de comportamento — chamar `createBackup()` e verificar que `spawn` foi chamado com `pg_dump`.

---

#### 2.2 `tests/unit/scripts/clean-orphaned-images.test.js`

**Finalidade**: Testa remoção de imagens órfãs não referenciadas no banco.

**Relações**: Mocks de `fs`, `dotenv`, `pg` (via `__mocks__/pg.js`).

**Análise**:
- **Forte**: 5 testes cobrem: remoção de órfão, diretório inexistente, erro de banco, coluna inexistente, e arquivos com prefixo desconhecido. Bom tratamento de erro (`code: '42703'`).
- **Problema**: O mock do `pg` depende de `__mocks__/pg.js` global — pode interferir com outros testes.
- **Duplicação**: `fs.existsSync`/`readdirSync`/`unlinkSync` mockado em múltiplos testes.

---

#### 2.3 `tests/unit/scripts/clear-db.test.js`

**Finalidade**: Verifica que `clearDatabase()` executa TRUNCATE nas tabelas corretas.

**Relações**: Mocks de `pg`, `fs`, `dotenv`, `lib/infra/db.js`, `scripts/utils/load-env.js`.

**Análise**:
- **Problema grave**: Este teste **não testa o script real** — testa o mock do `lib/infra/db.js`. O SQL é construído inline no teste, não no script. Não há garantia de que `clear-db.js` realmente executa esse TRUNCATE.
- **Problema**: O teste "não deve executar TRUNCATE se usuário cancelar" é um teste falso — testa `if (!answer)` no próprio teste, não no script.
- **Melhoria**: Importar e chamar a função real do script, ou pelo menos verificar que o script contém a string `TRUNCATE TABLE`.

---

#### 2.4 `tests/unit/scripts/clear-musicas.test.js`

**Finalidade**: Verifica DELETE FROM musicas.

**Análise**:
- **Problema**: Mesmo problema que `clear-db.test.js` — testa o mock, não o script. Só 2 testes, ambos verificando que `libDb.query` foi chamado com SQL específico.
- **Código morto**: Nenhum teste verifica o comportamento real do script.
- **Melhada**: Chamar `clearMusicas()` do script.

---

#### 2.5 `tests/unit/scripts/init-table.test.js`

**Finalidade**: Testa funções utilitárias de `init-table-utils.js` — buildCreateTableSQL, getSeedValues, buildSeedSQL, getTableName, validateIdentifier.

**Análise**:
- **Forte**: 8 testes bem estruturados em sub-describes. Cobre geração SQL, seed data, extração de argumentos CLI.
- **Problema**: `process.argv` é restaurado no `afterAll` mas `validateIdentifier` não é testada com entradas maliciosas (SQL injection?).
- **Melhoria**: Testar `validateIdentifier` com nomes inválidos (ex: `"; DROP TABLE`).

---

#### 2.6 `tests/unit/scripts/migrate.test.js`

**Finalidade**: Testa funções do `migrate.js` — listMigrationFiles, migrationNameFromFile, ensureMigrationTable, getAppliedMigrations.

**Relações**: `jest.unstable_mockModule` para `pg`, mock de `fs` e `scripts/db/connection.js`.

**Análise**:
- **Forte**: 5 testes cobrem listagem ordenada, filtro de padrão NNN-*.js, extração de nome, criação de tabela, e Set de migrações aplicadas.
- **Problema**: Não testa o fluxo completo de migração (up/down). `jest.unstable_mockModule` experimental.
- **Melhoria**: Testar `runMigrations()` com migrações pendentes.

---

#### 2.7 `tests/unit/scripts/reset-password.test.js`

**Finalidade**: Testa hashing de senha e UPDATE/INSERT na tabela users.

**Análise**:
- **Problema**: Novamente, testa o mock de `db` e `auth`, não o script real. O script `reset-password.js` provavelmente pede input do usuário (username, senha) — isso não é testado.
- **Melhida**: Mockar `readline` ou input e testar o fluxo completo.

---

#### 2.8 `tests/unit/scripts/seed-all.test.js`

**Finalidade**: Verifica conexão e ordem de seeds.

**Análise**:
- **Problema**: Teste "deve executar seeds em ordem" é um teste falso — só verifica um array hardcoded no teste, não o seed-all.js real.
- **Melhoria**: Importar `seedAll()` e verificar que chama cada seed na ordem.

---

#### 2.9 `tests/unit/scripts/utils/cleanup.test.js`

**Finalidade**: Testa `loadEnv` do módulo `cleanup.js`.

**Análise**:
- **Problema**: Mocka `pg`, `fs`, `dotenv` mas não usa `pg` no teste (importado desnecessariamente). `beforeAll` importa o módulo mas `fsMock` é obtido no `beforeEach` — assimetria confusa.
- **Melhoria**: Remover mock não utilizado de `pg`.

---

#### 2.10 `tests/unit/scripts/utils/constants.test.js`

**Finalidade**: Verifica que cada constante exportada tem o valor esperado.

**Análise**:
- **Forte**: 11 testes simples e diretos. Útil para prevenir regressão acidental em constantes.
- **Problema**: Valores estão hardcoded no teste — se alguém muda a constante mas esquece de atualizar o teste, o teste falha (desejável), mas pode gerar falsos positivos se a mudança for intencional.
- **Melhoria**: Documentar por que cada constante tem aquele valor específico.

---

#### 2.11 `tests/unit/scripts/utils/date-format.test.js`

**Finalidade**: Testa formatação de datas ISO e log.

**Análise**:
- **Forte**: 9 testes. Bom uso de regex e verificações de timestamp com tolerância (`before - 1000` / `after + 1000`). Testa default (data atual).
- **Problema**: `formatLogDate` usa espaço entre data e hora — `new Date(result.replace(' ', 'T') + 'Z')` assume UTC, mas `formatLogDate` pode estar usando timezone local. Teste pode falhar em ambientes com TZ diferente de UTC.
- **Melhoria**: Fixar `TZ=UTC` no setup do Jest.

---

#### 2.12 `tests/unit/scripts/utils/load-env.test.js`

**Finalidade**: Testa carregamento condicional de `.env.local` vs `.env` e validação de `DATABASE_URL`.

**Análise**:
- **Forte**: 5 testes. `requireDatabaseUrl()` cobre casos de undefined, empty e defined.
- **Problema**: `fs` e `dotenv` são importados via `await import()` (ESM dinâmico) mas mockados com `jest.mock` (CJS) — funciona por sorte do Jest, mas é inconsistente.
- **Melhoria**: Usar `jest.unstable_mockModule` para consistência com outros testes ESM.

---

#### 2.13 `tests/unit/scripts/validate-schema.test.js`

**Finalidade**: Testa validação de schema do banco (tabelas e colunas).

**Análise**:
- **Forte**: 3 testes. Bom uso de `mockImplementation` para simular respostas condicionais ao SQL. Comentários explicam a estratégia de mock.
- **Problema**: 
  - `EXPECTED_SCHEMA` está hardcoded no teste — se o schema real mudar, o teste falha silenciosamente (ou quebra).
  - `jest.isolateModulesAsync` é usado apenas em alguns testes — inconsistência.
- **Melhoria**: Extrair `EXPECTED_SCHEMA` do módulo real e importar no teste.

---

#### 2.14 `tests/unit/scripts/db/connection.test.js`

**Finalidade**: Testa pool singleton, closePool, e query propagation.

**Análise**:
- **Forte**: 6 testes. Bom teste de singleton (`pool1 === pool2`). Testa erro propagation.
- **Problema**: `mockQuery` é compartilhado entre `query()` e `connect()` — pode mascarar bugs onde um usa mock e outro não.
- **Duplicação**: Mock de `poolImplementation` é similar ao de `migrate.test.js`.

---


#### 3.1 `tests/unit/github-workflows/pr-coverage-comment.test.js`

**Finalidade**: Testa o script inline do step "Post PR Comment on Failure" do workflow `pr-coverage.yml`.

**Análise**:
- **Forte**: 
  - Extrai o script do YAML real (fonte única de verdade).
  - Executa com `new Function()` simulando `github`, `context`, `require`.
  - 12 testes em 4 describes cobrindo: cenário de cobertura abaixo do mínimo, suíte quebrada antes da cobertura, caracteres sensíveis (crases, `${`, backslashes), e controle negativo (prova que o preparo antigo era falho).
  - Limite de 65536 caracteres respeitado.
- **Problema**: 
  - Depende do arquivo `.github/workflows/pr-coverage.yml` existir e ter a estrutura exata.
  - Se o workflow mudar, o teste quebra — isso é desejável mas pode ser frágil.
- **Melhoria**: Snapshot do script para detectar mudanças inesperadas no workflow.

---


#### 4.1 `tests/unit/components/Admin/__snapshots__/index.test.js.snap`

**Finalidade**: Snapshot dos exports do barrel `components/Admin/index.js`.

**Conteúdo**: 10 exports — `AdminCrudBase`, `AdminMusicasNew`, `AdminPostsNew`, `AdminVideosNew`, `ExternalDataButton`, `ImageUploadField`, `TextAreaField`, `TextField`, `ToggleField`, `UrlField`.

**Análise**: 
- **Problema**: O snapshot teste (`.snap`) existe mas o teste que o gerou não está na lista — presume-se que exista em `tests/unit/components/Admin/index.test.js`.
- **Melhoria**: Verificar se o teste correspondente está na pasta correta.

---

#### 4.2 `tests/unit/components/Features/ContentTabs/__snapshots__/index.test.js.snap`

**Conteúdo**: Apenas `["default"]`.

**Análise**: Barrel muito simples — só re-exporta `default`. Útil para detectar exports não intencionais.

---

#### 4.3 `tests/unit/components/Layout/__snapshots__/index.test.js.snap`

**Conteúdo**: 8 exports — `Container`, `ContainerDefault`, `Grid`, `GridDefault`, `Sidebar`, `SidebarDefault`, `Stack`, `StackDefault`.

**Análise**: Padrão consistente de pares `Nome` + `NomeDefault` — bom para detectar esquecimento de `Default` suffix.

---

#### 4.4 `tests/unit/components/Performance/__snapshots__/index.test.js.snap`

**Conteúdo**: 8 exports — `CriticalCSS`, `ImageOptimized`, `LazyIframe`, `PreloadResources`, `extractCriticalCSS`, `getCriticalResources`, `removeCriticalCSS`.

**Análise**: Sem padrão `Default` — mistura componentes e funções utilitárias.

---

#### 4.5 `tests/unit/components/SEO/__snapshots__/index.test.js.snap`

**Conteúdo**: 12 exports — schemas (Article, Breadcrumb, Music, Organization, Video, Website), `SEOHead`, `default`, utils (`getCanonicalUrl`, `getImageUrl`), `siteConfig`.

**Análise**: Barrel mais rico — cobre structured data e configuração.

---

#### 4.6 `tests/unit/components/UI/__snapshots__/index.test.js.snap`

**Conteúdo**: 26 exports — Alert, Badge, BaseCard, Button, Card, Icons, Input, Modal, Select, Spinner, TextArea, Toast (cada um com variante `Default`), `defaultIcons`, `useToast`.

**Análise**: Barrel mais pesado. Padrão `Nome` + `NomeDefault` consistente (exceto `BaseCard` que não tem `Default` — possível inconsistência).

---


#### 5.1 Mock do `db-module` compartilhado

O padrão `jest.mock('../../../../../lib/infra/db.js', () => require('../../../../mocks/db-module').mockDb())` aparece em ~8 arquivos. Se o mock compartilhado muda, todos os testes podem quebrar silenciosamente. **Recomendação**: Usar `jest.setup.js` para configurar mocks globais.

#### 5.2 Inconsistência ESM vs CJS

Alguns testes usam `jest.unstable_mockModule` (ESM), outros usem `jest.mock` (CJS). Isso funciona porque o Jest compila, mas gera confusão. **Recomendação**: Padronizar em `jest.unstable_mockModule` para todo código ESM.

#### 5.3 Testes que testam o mock, não o script

`clear-db.test.js`, `clear-musicas.test.js`, `reset-password.test.js`, `seed-all.test.js` testam o mock de `db` em vez do comportamento real do script. **Recomendação**: Refatorar para importar e testar as funções dos scripts.

#### 5.4 Falta de `afterAll`/`afterEach` em alguns testes

Vários testes criam spies (`jest.spyOn(console, ...)`) sem restaurar em `afterEach` ou `try/finally`. Isso causa poluição entre testes.

#### 5.5 Hardcoded paths vs `process.cwd()`

Os paths relativos (`../../../../../pages/...`) são frágeis — se o arquivo se move, quebra. `pr-coverage-comment.test.js` usa `path.resolve(process.cwd(), ...)` — abordagem mais robusta.

---


| Arquivo | Testes | Qualidade | Cobertura | Problemas |
|---------|--------|-----------|-----------|-----------|
| `dicas.edge.test.js` | 2 | ★★★☆☆ | Baixo | Sem teste de auth |
| `fetch-ml.edge.test.js` | 6 | ★★★★★ | Alto | Mock fetch pode vazar |
| `fetch-spotify.edge.test.js` | 1 | ★★☆☆☆ | Baixo | Só falha total |
| `posts.edge.test.js` | 11 | ★★★★☆ | Alto | Mock pode poluir |
| `rate-limit.test.js` | 14 | ★★★★☆ | Alto | Spy não restaurado |
| `roles.edge.test.js` | 4 | ★★★★☆ | Médio | Sem teste token inválido |
| `stats.edge.test.js` | 2 | ★★★☆☆ | Baixo | mockReset necessário |
| `login.edge.test.js` | 1 | ★★☆☆☆ | Baixo | Só erro 500 |
| `upload-image.edge.test.js` | 1 | ★★★☆☆ | Baixo | Verifica só chamada |
| `backup.test.js` | 6 | ★★☆☆☆ | Baixo | Só verifica exports |
| `clean-orphaned-images.test.js` | 5 | ★★★★☆ | Alto | Depende __mocks__/pg |
| `clear-db.test.js` | 4 | ★☆☆☆☆ | Muito Baixo | Testa mock, não script |
| `clear-musicas.test.js` | 2 | ★☆☆☆☆ | Muito Baixo | Testa mock, não script |
| `init-table.test.js` | 8 | ★★★★☆ | Alto | Faltam edge cases |
| `migrate.test.js` | 5 | ★★★★☆ | Médio | Sem teste de run |
| `reset-password.test.js` | 4 | ★★☆☆☆ | Baixo | Testa mock, não script |
| `seed-all.test.js` | 2 | ★☆☆☆☆ | Muito Baixo | Teste falso |
| `cleanup.test.js` | 2 | ★★☆☆☆ | Baixo | Mock não utilizado |
| `constants.test.js` | 11 | ★★★★☆ | Alto | Hardcoded values |
| `date-format.test.js` | 9 | ★★★★☆ | Alto | TZ-dependent |
| `load-env.test.js` | 5 | ★★★☆☆ | Médio | ESM/CJS misturados |
| `validate-schema.test.js` | 3 | ★★★★☆ | Médio | Schema hardcoded |
| `connection.test.js` | 6 | ★★★★☆ | Alto | Mock compartilhado |
| `pr-coverage-comment.test.js` | 12 | ★★★★★ | Alto | Depende YAML real |
| Snapshots (6) | 6 | ★★★★☆ | Alto | Falta teste fonte |

---


1. **Crítico**: Refatorar `clear-db.test.js`, `clear-musicas.test.js`, `reset-password.test.js`, `seed-all.test.js` para testar scripts reais, não mocks.
2. **Alto**: Adicionar `afterEach`/`afterAll` com `jest.restoreAllMocks()` em todos os testes que criam spies.
3. **Alto**: Padronizar estratégia de mock ESM vs CJS.
4. **Médio**: Expandir cobertura de `login.edge.test.js` e `fetch-spotify.edge.test.js`.
5. **Médio**: Fixar `TZ=UTC` globalmente para `date-format.test.js`.
6. **Baixo**: Extrair mock do `db-module` para `jest.setup.js`.


---


## 11.1. Testes Unitários — Admin Fields, Features e Snapshots Restantes


Os testes cobrem quatro domínios:

| Domínio | Arquivos | Componentes testados |
|---------|----------|---------------------|
| **Admin/Fields** | 4 | TextAreaField, TextField, ToggleField, UrlField |
| **Features** | 13 | BlogSection, PostCard, ContentTabs, MusicCard, MusicGallery, ProductCard, ProductList, styles, Testimonials, VideoCard, VideoGallery |
| **Barrel snapshots** | 6 | Admin, ContentTabs, Layout, Performance, SEO, UI |
| **Component snapshots** | 1 | Header |

---


#### 1.1 TextAreaField.test.js

**Finalidade:** Testar o componente `TextAreaField`, campo de texto multiline do painel administrativo.

**Relações com o componente real:**
- Componente: `components/Admin/fields/TextAreaField.js`
- Re-exporta/adapta o componente `TextArea` da UI
- Suporta: `label`, `required`, `maxLength`, `hint`, `error`, `rows`, `value` (normaliza null)

**Casos de teste (4):**
1. Renderização com label, asterisco de required e contador de caracteres (`5 / 100 caracteres`)
2. Alternância hint/erro — quando `error` está presente, hint some e erro aparece
3. Fallback de `rows` padrão (3)
4. Normalização de `value=null` para string vazia, mantendo input controlado

**Problemas identificados:**
- O teste de normalização (caso 4) é parcialmente ilusório: após `fireEvent.change`, o valor do textarea continua `''` porque é um componente controlado sem `useState` interno — isso **não** verifica que `onChange` alteraria o valor, apenas que o DOM mantém o estado inerte. O comentário no código já reconhece isso, mas o nome do teste ("deve normalizar value null para string vazia") é ambíguo — parece testar o `value` inicial, não o "mantendo o textarea controlado".

**Melhorias sugeridas:**
- Testar a propriedade `maxLength` real aplicada ao DOM (se existir)
- Testar se a mensagem de contador atualiza dinamicamente (se aplicável)
- Adicionar teste de `disabled` (não coberto)

**Duplicações/Código morto:**
- Padrão de `jest.fn()` para `onChange` em todos os casos — seria limpo com um helper local
- Nenhum código morto detectado

---

#### 1.2 TextField.test.js

**Finalidade:** Testar o componente `TextField`, adaptador do `Input` da UI para o admin.

**Relações:**
- Componente real: `components/Admin/fields/TextField.js`
- Delega inteiramente para `Input` da UI (`../../UI`)
- Suporta: `label`, `required`, `error`, `hint`, `type`, `placeholder`, `value` (normaliza null)

**Casos de teste (4):**
1. Renderização com label e asterisco de required
2. Alternância hint/erro (mesmo padrão que TextAreaField)
3. Repasse de eventos nativos (`fireEvent.change` → `onChange` chamado)
4. Normalização de `value=null` para string vazia

**Problemas:**
- O teste 3 apenas verifica `toHaveBeenCalled()` sem verificar o payload (value passado). Perde detalhes de integração.
- Mesma ilusão do teste 4: confirmação é sobre DOM controlado sem estado, não sobre atualização.

**Melhorias:**
- Verificar `expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 'novo valor' } }))`
- Testar prop `type="email"` ou `type="url"` se relevante

---

#### 1.3 ToggleField.test.js

**Finalidade:** Testar o `ToggleField`, campo booleano do admin.

**Relações:**
- Componente real: `components/Admin/fields/ToggleField.js`
- Representa estados visualmente distintos (ativo/inativo) com labels customizáveis

**Casos de teste (2):**
1. Renderização com labels de estado (default "Rascunho" vs custom "Sim")
2. Suporte a `disabled` e repasse de click via checkbox

**Problemas:**
- Apenas 2 testes — cobertura magra
- Não testa a alternância dinâmica de label em rerender (o label "Sim" é testado em rerender separado, mas a remoção do label anterior "Rascunho" não é verificada)
- Não testa `description` em combinação com `disabled`
- Não testa comportamento quando `checked=true` inicialmente e depois muda para `false` (rerender inverso)

**Melhorias:**
- Adicionar teste de keydown no checkbox (Enter/Space) se suportado
- Testar acessibilidade: `aria-checked`, role="switch" se aplicável

---

#### 1.4 UrlField.test.js

**Finalidade:** Testar o `UrlField`, campo com validação específica de URL e preview de embed (YouTube, Spotify).

**Relações:**
- Componente real: `components/Admin/fields/UrlField.js`
- Funcionalidade complexa: validação de URL, extração de ID, preview por plataforma

**Casos de teste (9):**
1. Renderização genérica com required
2. Validação de URL obrigatória (required)
3. Validação de formato URL genérica
4. Validação + extração de ID do YouTube + preview
5. Validação + extração de ID do Spotify + preview
6. Validação customizada via `validate` prop
7. Exibição de hint sem erro
8. `platform="generic"` não renderiza iframe de preview
9. Exceção no construtor de URL (`http://` → fallback de erro)

**Problemas:**
- Teste 2 usa um truque: inicia com valor válido (`https://exemplo.com`) para que o `fireEvent.change` dispare. Isso é frágil — se o componente mudar a lógica de validação inicial, o teste quebra silenciosamente.
- Teste 4 usa `rerender` dentro do mesmo `it` — isso é aceitável, mas combina dois cenários (erro e sucesso). Podem ser separados.
- Os testes mencionam linhas específicas do componente real no nome ("Lines 70-71", "Lines 126-127"). Isso cria **acoplamento estrutural**: refatorar o componente quebra os nomes dos testes.

**Melhorias:**
- Substituir referências a "Lines X" por descrições semânticas
- Testar `platform="youtube"` com URL válida que falha na extração (ex: `youtube.com/user/xxx`)
- Adicionar teste de limpeza do erro quando usuário corrige a URL

**Duplicações:**
- O padrão `screen.getByRole('textbox')` se repete em quase todos os testes — poderia ser abstraído em `const getInput = () => screen.getByRole('textbox')`

---

#### 1.5 Admin `__snapshots__/index.test.js.snap`

**Finalidade:** Snapshot do barrel `components/Admin/index.js` — verifica que todos os exports estão presentes.

**Conteúdo:**
```
["AdminCrudBase", "AdminMusicasNew", "AdminPostsNew", "AdminVideosNew",
 "ExternalDataButton", "ImageUploadField", "TextAreaField", "TextField",
 "ToggleField", "UrlField"]
```

**Problemas:**
- **Código morto potencial:** Se um destes componentes for removido, o snapshot falha, forçando atualização. Isso é o comportamento esperado, mas snapshot de barrel é frágil — qualquer adição/remoção exige `--updateSnapshot`.
- Não verifica a **tipo** do export (é classe? função? constante?) — apenas a string do nome.

**Melhorias:**
- Considerar substituir snapshot por teste de `expect(typeof Admin.BarrelComponent).toBe('function')` para cada export — mais semântico e menos propenso a quebras triviais.

---


#### 2.1 Blog/BlogSection.test.js

**Finalidade:** Testar `BlogSection`, seção de listagem de posts do blog.

**Relações:**
- Componente real: `components/Features/Blog/BlogSection.js`
- Faz fetch de dados via `global.fetch`
- Usa `PostCard` como componente filho (mockado)

**Casos de teste (8):**
1. Estado de loading inicial
2. Retorno `null` quando não há posts
3. Renderização de posts carregados
4. Limite de posts + botão "Ver todos"
5. Botão oculto quando limit > total
6. Tratamento silencioso de `success: false`
7. Erro HTTP 500 com JSON
8. Fallback "Unknown error" e falha de rede/JSON inválido

**Problemas:**
- Os testes de erro (6-8) dependem fortemente do `consoleErrorSpy` — não verificam o **estado visual** do componente após erro. O componente provavelmente retorna `null` em erro, mas isso não é testado.
- `mockGlobalFetch` do helper cria mock mas `global.fetch.mockResolvedValueOnce` é usado diretamente — inconsistência entre `fetchMock` (helper) e `global.fetch` (diretamente). O `fetchMock` é declarado mas nunca usado diretamente nos testes.

**Melhorias:**
- Verificar que o componente retorna `container.toBeEmptyDOMElement()` em caso de erro (silêncio visual)
- Testar interação com o botão "Ver todos" (navegação)
- Unificar uso de `fetchMock` vs `global.fetch`

---

#### 2.2 Blog/PostCard.test.js

**Finalidade:** Testar `PostCard`, card individual de post.

**Relações:**
- Componente real: `components/Features/Blog/PostCard.js`
- Usado dentro de `BlogSection` (mockado lá)

**Casos de teste (4):**
1. Renderização completa (title, excerpt, category, image, link)
2. Placeholder quando `image_url=null`
3. Texto customizado de "Ler mais"
4. Resiliência sem categorias (`null`)

**Problemas:**
- Teste 4 não verifica outros elementos quando categorias são `null` — apenas verifica ausência do nome. Não confirma que o card continua renderizado.
- Não testa formatação de data (`created_at`) — o mock tem `created_at` mas nada verifica exibição.

**Melhorias:**
- Testar formatação de data (ex: "10 de outubro de 2023")
- Testar escape/normalização de slug no href
- Testar múltiplas categorias (renderiza todas? apenas primeira?)

---

#### 2.3 ContentTabs/ContentTabs.test.js

**Finalidade:** Testar `ContentTabs`, container de abas que alterna entre Blog, Músicas, Vídeos, Produtos.

**Relações:**
- Componente real: `components/Features/ContentTabs/index.js`
- Importa: BlogSection, MusicGallery, VideoGallery, ProductList (todos mockados)
- Default tab: "Reflexões"

**Casos de teste (4):**
1. Aba padrão "Reflexões" renderiza Blog
2. Alternância entre Músicas, Vídeos, Produtos
3. Aba bloqueada ("Em Desenvolvimento") não troca conteúdo
4. Fallback via `useState` spy para abas desconhecidas

**Problemas:**
- O teste 4 usa `jest.spyOn(React, 'useState').mockReturnValueOnce(...)` — isso **mocha a implementação interna do React**, é um antipadrão sério. Quebra se o componente for reestruturado. Além disso, mockar `useState` diretamente é frágil (pode interferir em outros estados do componente).
- O texto "Em Desenvolvimento" é buscado com `.closest('button')` — se a estrutura DOM mudar (ex: span dentro de button), o teste quebra.

**Melhorias:**
- **Remover teste 4** ou substituir por teste de prop/estado que injeta aba desconhecida de forma controlada
- Verificar que apenas uma aba está visível por vez (as outras têm `display: none` ou são desmontadas)
- Testar ícones das abas se relevante

**Código morto:**
- `afterEach(() => { jest.restoreAllMocks(); })` é desnecessário se o teste 4 fosse removido (nenhum outro `jest.spyOn`/`jest.mock` é usado neste arquivo além dos globais)

---

#### 2.4 ContentTabs `__snapshots__/index.test.js.snap`

**Finalidade:** Snapshot do barrel ContentTabs.

**Conteúdo:** `["default"]`

**Problemas:**
- Snapshot minimalista — verifica apenas export default. Baixo valor como teste.
- Se o barrel passar a exportar named exports, o snapshot não detecta falta — apenas precisa de atualização.

---

#### 2.5 Music/MusicCard.test.js

**Finalidade:** Testar `MusicCard`, card de música individual com embed Spotify.

**Relações:**
- Componente real: `components/Features/Music/MusicCard.js`
- Usa `suppressConsoleError` e mock de `window.open`
- Formata URL Spotify para embed (normal, intl, URI)

**Casos de teste (7):**
1. Título, artista e formatação de URL normal → embed
2. URL internacional (intl-pt) → embed correto
3. URI spotify:track: → embed correto
4. Fallback para URL desconhecida (soundcloud)
5. URL nula → "Prévia indisponível", sem iframe
6. URL nula → sem botão "Ouvir"
7. Botão "Ouvir" → `window.open` com URL

**Problemas:**
- Teste 7 usa `screen.findByRole('button', { name: /Ouvir Som no Spotify/i })` — assume que o nome acessível do botão é exato. Se o componente usar `aria-label` diferente, o teste falha silenciosamente.
- O helper `suppressConsoleError` é usado, mas não há erros esperados nos casos 1-6 — pode mascarar problemas reais.

**Melhorias:**
- Testar que `window.open` é chamado exatamente uma vez (verificação de `toHaveBeenCalledTimes(1)`)
- Testar formatação de URL com query params (ex: `?si=xxx`)
- Verificar `rel="noopener"` ou atributos de segurança do link se `<a>` em vez de `window.open`

---

#### 2.6 Music/MusicGallery.edge.test.js

**Finalidade:** Testar edge cases do `MusicGallery` (galeria paginada de músicas).

**Relações:**
- Componente real: `components/Features/Music/MusicGallery.js`
- `MusicCard` mockado

**Casos de teste (5):**
1. Fallback vazio quando API retorna objeto sem `data`
2. Mensagem de erro quando `fetch` rejeita
3. Array plano como resposta (paginação calculada)
4. Resposta com paginação anidada (`data` + `pagination.totalPages`)
5. Resposta nula (`null`)

**Problemas:**
- O nome "edge.test.js" sugere arquivo específico para edge cases, mas `MusicGallery.test.js` também testa cenários de erro — **duplicidade parcial**.
- Teste 3 usa 7 itens com 6 por página → espera "Página 1 de 2". Assume `itensPorPagina=6` hardcoded. Se o componente mudar para 8 ou 12, o teste quebra sem mensagem clara.

**Melhorias:**
- Combinar com `MusicGallery.test.js` ou documentar claramente a separação (edge vs happy path)
- Extrair `itensPorPagina` para constante comparada com mock

**Duplicações:**
- Mock do `MusicCard` é idêntico em `MusicGallery.test.js` e `MusicGallery.edge.test.js` — poderia ser compartilhado via `__mocks__` ou helper

---

#### 2.7 Music/MusicGallery.test.js

**Finalidade:** Testar `MusicGallery` — happy path e funcionalidades principais.

**Casos de teste (9):**
1. Loading → carrega músicas
2. Erro de API → mensagem + retry
3. Nenhum resultado
4. Navegação entre páginas
5. Busca com termo e contador de resultados
6. Limpar busca (botão ✕)
7. Mudança de ordenação (`sort=recent`)
8. Voltar à página anterior (botão Anterior)
9. Sem resultados na busca + limpar

**Problemas:**
- Teste 4: `mockResolvedValueOnce` é chamado ANTES do clique, mas a sequência depende de que o primeiro `mockResolvedValueOnce` já foi consumido. Se a ordem de execução mudar, o teste quebra.
- Teste 7 (sort): usa `global.fetch.mock.calls.map(call => call[0])` para inspecionar URLs — funciona, mas é frágil à ordem de chamadas.
- Os testes 4, 6, 8, 9 usam múltiplos `mockResolvedValueOnce` em sequência — o padrão é repetitivo e propenso a erros de contagem.

**Melhorias:**
- Usar `mockImplementation` com switch de URL para tornar a ordem explícita
- Testar scroll infinito ou lazy loading se aplicável

---

#### 2.8 Products/ProductCard.test.js

**Finalidade:** Testar `ProductCard`, card de produto com galeria de imagens e lightbox.

**Relações:**
- Componente real: `components/Features/Products/ProductCard.js`
- Usa `parseImages` de `lib/api/utils` (mockado)
- Usa `suppressConsoleError`

**Casos de teste (12):**
1. Renderização (nome, descrição, preço)
2. "Sem imagem" quando `image_url=null`
3. "Sem imagem" quando `image_url=''`
4. Botões de navegação com múltiplas imagens
5. Navegação entre imagens (anterior/próxima)
6. Link do produto quando fornecido
7. Ausência de link quando não fornecido
8. Abertura do lightbox ao clicar na imagem
9. Fechar lightbox com Escape
10. Fechar lightbox clicando no overlay
11. Botões de navegação no lightbox (2 instâncias)
12. Transição de opacidade da imagem (loading → loaded)

**Problemas:**
- Mock de `parseImages` é simples e não exercita a lógica real de parse — se o mock divergir do real, testes passam mas o app quebra.
- Teste 11 conta `getAllByLabelText('Imagem anterior')` = 2 — assume que card + lightbox existem simultaneamente. Se o card esconde navegação quando lightbox abre, o teste falha.
- `suppressConsoleError` mascara erros — não há verificação se erro é esperado.

**Melhorias:**
- Testar navegação circular (última imagem + próxima = primeira?)
- Testar thumbnail/preview no lightbox (imagem ampliada)
- Verificar `loading="lazy"` no `<img>` se aplicável

---

#### 2.9 Products/ProductList.test.js

**Finalidade:** Testar `ProductList`, lista paginada com filtros e ordenação.

**Casos de teste (15):**
1. Renderização com dados da API
2. Loading state
3. Estado de erro
4. Lista vazia
5. Filtro sem resultados
6. Controles de paginação
7. "Anterior" desabilitado na primeira página
8. "Próxima" desabilitado na última página
9. Paginação oculta visualmente (1 página)
10. Campos de busca e filtro de preço
11. Limpar filtros
12. Incluir minPrice/maxPrice na URL
13. Navegar para próxima página
14. Navegar para página anterior
15. Loading overlay durante troca de página
16. Faixa de páginas visíveis (>5 páginas)
17. Ordenação por position e ID decrescente

**Problemas:**
- **Complexidade alta**: 17 testes com mocks encadeados (`mockReturnValue`, `mockImplementation`, `mockResolvedValue`) — difícil de manter.
- Teste 17: mock de `mockUseApiFetch` retorna `{ data: { data: [...], pagination: {} } }` — assume que a `transform` do componente ordena. Mas a **transform não é testada diretamente** — é o mock que emula o comportamento. Se a `transform` real divergir do mock, o teste engana.
- `beforeAll` faz polyfill de `scrollIntoView` — se jsdom implementar isso no futuro, o polyfill silenciosamente sobrescreve.
- `jest.useFakeTimers()` é chamado dentro de `it` (testes 13, 14, 15, 16), mas `useRealTimers` está apenas no `afterAll` — se um teste falhar antes de `advanceTimersByTime`, o estado dos timers vaza.

**Melhorias:**
- Extrair mocks complexos para factory functions reutilizáveis
- Testar `transform` do hook em isolado
- Mover `jest.useFakeTimers()` para `beforeEach` quando relevante
- Verificar `aria-current` na página ativa para acessibilidade

**Duplicações:**
- Mock do `useApiFetch` é idêntico ao padrão usado em outros arquivos — poderia ser helper

---

#### 2.10 Products/styles.test.js

**Finalidade:** Testar funções utilitárias de estilo (`inputStyle`, `buttonBaseStyle`).

**Casos de teste (5):**
1. `inputStyle()` retorna objeto completo com tokens CSS
2. `inputStyle('46px')` aplica paddingLeft whitelist
3. `inputStyle('50px; color: red')` rejeita injeção e usa fallback
4. `buttonBaseStyle()` retorna objeto base
5. `buttonBaseStyle(custom)` mescla overrides

**Problemas:**
- O teste de injeção CSS (caso 3) é excelente — whitelist previne XSS via estilo.
- Não testa **todos** os valores da whitelist (`VALID_PADDING_LEFT` tem 5 valores, apenas 2 testados).

**Melhorias:**
- Parametrizar teste com `it.each` para cobrir todos os valores da whitelist
- Testar que `buttonBaseStyle` não muta o objeto custom passado (imutabilidade)

---

#### 2.11 Testimonials/index.test.js

**Finalidade:** Testar `Testimonials`, seção de dicas/testemunhos com carrossel horizontal.

**Casos de teste (4):**
1. Renderização de dicas da API
2. Ocultar seção em erro/exceção
3. Ocultar seção em HTTP erro ou array vazio
4. Carrossel com >3 itens (scroll, resize, unmount cleanup)

**Problemas:**
- **Forte acoplamento com DOM**: mocka `clientWidth`, `scrollWidth`, `scrollLeft` via `Object.defineProperty` — frágil.
- Teste 4 é o mais complexo: verifica `scrollBy`, `scrollLeft` customizado, `removeEventListener` no unmount. Combina múltiplos cenários em um único teste.
- `beforeAll` modifica `HTMLElement.prototype.scrollBy` globalmente — vaza para outros testes se `afterAll` falhar.
- Usa `fetchMock.mockClear()` em `beforeEach` mas `global.fetch.mockResolvedValueOnce` diretamente — **inconsistência**: `fetchMock` é usado como alvo indireto, mas `global.fetch` é o alvo real. Isso funciona porque `mockGlobalFetch()` atribui `global.fetch = mock`, mas é confuso.

**Melhorias:**
- Dividir teste 4 em: teste de scroll direita, teste de scroll esquerda, teste de resize, teste de cleanup
- Usar `jest.spyOn(window, 'removeEventListener')` com verificação mais precisa
- Substituir `Object.defineProperty` por biblioteca de mock de scroll (se disponível)

---

#### 2.12 Video/VideoCard.test.js

**Finalidade:** Testar `VideoCard`, card de vídeo com iframe lazy.

**Casos de teste (2):**
1. Renderização com LazyIframe (props src, title, thumbnail)
2. Renderização com descrição

**Problemas:**
- **Cobertura muito baixa** (2 testes).
- Mock de `LazyIframe` é muito simples — não testa se o componente lida com thumbnail ausente no mock.
- Não testa `video.titulo` vs `video.title` — o componente pode esperar `title` (inglês) mas o mock usa `titulo` (português). O teste não verifica a chave correta.

**Melhorias:**
- Testar `video.thumbnail = null`
- Testar ausência de `descricao`
- Testar `video.url_youtube` vazio ou inválido

---

#### 2.13 Video/VideoGallery.test.js

**Finalidade:** Testar `VideoGallery`, galeria paginada de vídeos com busca.

**Casos de teste (8):**
1. Loading → exibe vídeos
2. Singular na contagem ("1 vídeo disponível")
3. Busca com debounce e limpar
4. Lista vazia + limpar busca
5. Resposta sem data/pagination (fallbacks)
6. Erro de fetch + retry
7. Erro HTTP (separado do 6 — **duplicidade**)
8. Navegação entre páginas

**Problemas:**
- Testes 6 e 7 são quase idênticos (ambos testam erro 500 com retry). O 7 não testa retry — é subconjunto do 6. **Duplicidade clara**.
- `jest.useFakeTimers()` é chamado no `beforeEach` global — afeta testes que não precisam de timers (1, 2, 5, 8), potencialmente causando timeouts se `waitFor` interagir com timers.
- Timeout explícito de 15000ms nos testes 6, 7 — indica lentidão ou problema de setup.

**Melhorias:**
- Remover teste 7 (coberto pelo 6)
- Mover `jest.useFakeTimers()` para dentro dos testes que precisam
- Testar URL de busca com encoding especial (`search=Teste%20Especial`)

---


#### 3.1 Layout `__snapshots__/index.test.js.snap`
**Conteúdo:** `["Container", "ContainerDefault", "Grid", "GridDefault", "Sidebar", "SidebarDefault", "Stack", "StackDefault"]`

**Problemas:**
- Apenas verifica existência dos exports, não tipos ou estrutura
- Padrão "Component" + "ComponentDefault" sugere barrel com default exports — não validado

#### 3.2 Performance `__snapshots__/index.test.js.snap`
**Conteúdo:** `["CriticalCSS", "ImageOptimized", "LazyIframe", "PreloadResources", "extractCriticalCSS", "getCriticalResources", "removeCriticalCSS"]`

**Probletes:**
- Mesmo problema de snapshot frágil
- Não detecta se `LazyIframe` deixou de exportar

#### 3.3 SEO `__snapshots__/index.test.js.snap`
**Conteúdo:** `["ArticleSchema", "BreadcrumbSchema", "MusicSchema", "OrganizationSchema", "SEOHead", "VideoSchema", "WebsiteSchema", "default", "getCanonicalUrl", "getImageUrl", "siteConfig"]`

**Problemas:**
- Snapshot de 11 itens — maior risco de quebra por refactor

#### 3.4 UI `__snapshots__/index.test.js.snap`
**Conteúdo:** 27 exports incluindo variantes Default, hooks (`useToast`), e objetos (`defaultIcons`)

**Problemas:**
- Maior snapshot — maior superfície de quebra
- Não diferencia componentes de hooks/utilitários

---


#### 4.1 Header.test.js.snap

**Finalidade:** Snapshot do componente `Header` (cabeçalho com navegação).

**Conteúdo:**
```html
<div>
  <header>
    <h1>Caminhar com Deus</h1>
    <nav>
      <a href="/">Início</a>
      <a href="/posts">Posts</a>
    </nav>
  </header>
</div>
```

**Problemas:**
- **Código morto potencial:** Se Header mudar título, adicionar link, ou classes CSS, snapshot quebra — exigindo `--updateSnapshot`. Para componente tão simples, snapshot pode ser excessivo.
- Não testa comportamento (clique em links, mobile menu, scroll fixo) — apenas estrutura.

**Melhorias:**
- Substituir snapshot por testes de: presença de `nav`, número de links, `href` corretos
- Se snapshot mantido, adicionar teste de `altText` de logo se existir

---


#### 5.1 Helper `mockGlobalFetch`
- Criado em `tests/helpers/console.js`
- Atribui `global.fetch = jest.fn()` diretamente
- Muitos testes usam `global.fetch.mockResolvedValueOnce` em vez do `fetchMock` retornado — o `fetchMock` é declarado mas não utilizado diretamente.

#### 5.2 Helper `suppressConsoleError`
- Usado em quase todos os testes de componentes que fazem fetch
- **Risco:** mascara erros reais do React (ex: "key" missing, prop types inválidos)
- Melhor prática: usar `expect(console.error).not.toHaveBeenCalled()` ao final de testes bem-sucedidos

#### 5.3 Duplicação de Mocks
- Mock de `MusicCard` em `MusicGallery.test.js` e `MusicGallery.edge.test.js`
- Mock de `PostCard` em `BlogSection.test.js`
- Mock de `LazyIframe` em `VideoCard.test.js`
- **Solução:** criar `__mocks__/` lado a lado ou helpers de mock

#### 5.4 Uso de `jest.spyOn(React, 'useState')`
- Presente apenas em `ContentTabs.test.js` teste 4
- **Antipadrão**: acopla teste à implementação interna do React
- Deve ser removido

#### 5.5 Referências a linhas do componente real
- Em `UrlField.test.js`: "Lines 70-71", "Lines 126-127"
- **Problema**: refatoração do componente (adicionar/remover linhas) quebra nomes de testes sem alterar comportamento
- **Correção:** substituir por descrição semântica

#### 5.6 Inconsistência de idiomas
- Testes em português, mas mensagens de erro/asserts em inglês às vezes
- Componentes usam `titulo` (PT) mas testes de Video usam `title` (EN) — potencial incompatibilidade real

---


| Prioridade | Ação | Arquivos afetados |
|-----------|------|-------------------|
| **Alta** | Remover `jest.spyOn(React, 'useState')` | ContentTabs.test.js |
| **Alta** | Remover duplicidade de testes de erro HTTP | VideoGallery.test.js |
| **Média** | Corrigir `global.fetch` vs `fetchMock` inconsistency | BlogSection.test.js, MusicGallery.test.js, VideoGallery.test.js |
| **Média** | Remover referências a "Lines X" nos nomes de testes | UrlField.test.js |
| **Média** | Expandir cobertura de VideoCard (2→5 testes) | VideoCard.test.js |
| **Baixa** | Parametrizar testes de whitelist | Products/styles.test.js |
| **Baixa** | Substituir barrel snapshots por testes de tipo | Todos os `index.test.js.snap` |
| **Baixa** | Consolidar mocks de componentes em `__mocks__/` | MusicGallery, BlogSection, VideoGallery |

---


| Componente | Testes | Cobertura subjetiva |
|-----------|--------|---------------------|
| TextAreaField | 4 | Alta |
| TextField | 4 | Alta |
| ToggleField | 2 | Baixa |
| UrlField | 9 | Alta |
| BlogSection | 8 | Alta |
| PostCard | 4 | Média |
| ContentTabs | 4 | Média (1 teste problemático) |
| MusicCard | 7 | Alta |
| MusicGallery | 9 + 5 (edge) | Alta |
| ProductCard | 12 | Alta |
| ProductList | 17 | Alta |
| Testimonials | 4 | Média |
| VideoCard | 2 | Baixa |
| VideoGallery | 8 | Alta (1 duplicado) |
| Styles | 5 | Alta |
| Snapshots | 6 | N/A (snapshot) |
| Header | 1 | Baixa (snapshot) |

---

*Documentação gerada em 2026-09-23 por Hermes Agent — análise estática de 24 arquivos de teste do projeto Caminhar.*


---


## 16.1. Testes Unitários — Pages API Restantes

## Sumário por Arquivo

| # | Arquivo | Testes | Linhas | Handler | Status |
|---|---------|--------|--------|---------|--------|
| 1 | `admin/dicas.edge.test.js` | 2 | 54 | `dicas.js` | ✅ Bom |
| 2 | `admin/fetch-ml.edge.test.js` | 6 | 197 | `fetch-ml.js` | ✅ Bom |
| 3 | `admin/fetch-spotify.edge.test.js` | 1 | 59 | `fetch-spotify.js` | ⚠️ Fraco |
| 4 | `admin/posts.edge.test.js` | 10 | 165 | `posts.js` | ✅ Bom |
| 5 | `admin/rate-limit.test.js` | 12 | 211 | `rate-limit.js` | ✅ Bom |
| 6 | `admin/roles.edge.test.js` | 4 | 121 | `roles.js` | ✅ Bom |
| 7 | `admin/stats.edge.test.js` | 2 | 64 | `stats.js` | ⚠️ Fraco |
| 8 | `auth/login.edge.test.js` | 1 | 62 | `login.js` | ⚠️ Fraco |
| 9 | `upload-image.edge.test.js` | 1 | 66 | `upload-image.js` | ⚠️ Fraco |

**Total: 39 testes | 989 linhas**

---


#### Finalidade
Testa o handler `POST` e `PUT` do endpoint `pages/api/admin/dicas.js` em cenários de borda:
- Valor padrão de `published = true` quando omitido no body
- Fallback de IP via `req.socket = {}` (força IP '127.0.0.1')
- Acionamento correto de `logActivity` com IP e action

#### Relações
- **Handler:** `pages/api/admin/dicas.js`
- **Mocks:** `lib/infra/db.js` (via `mockDb`), `lib/auth/auth.js`, `lib/domain/audit.js`
- **Helpers:** `node-mocks-http` para `createMocks`
- **Padrão:** Usa `jest.mock` factory + `mockResolvedValueOnce` para simular queries

#### Análise Detalhada

#### Teste 1 — POST com `published` omitido
```
db.query → mockResolvedValueOnce({ rows: [{ id: 1, name: 'Dica Nova' }] })
Verifica: db.query chamada com params ['Dica Nova', 'Conteúdo da Dica', true]
Verifica: logActivity com IP '127.0.0.1'
```
**Cobertura:** Linha 36 do handler (`published !== undefined ? published : true` → fallback para `true`).

#### Teste 2 — PUT com `published` omitido
```
db.query → mockResolvedValueOnce({ rows: [{ id: 99, ... published: true }] })
Verifica: db.query com params ['Dica Atualizada', 'Atualizado', true, 99]
```
**Cobertura:** Linha 62 do handler (`req.body.published !== undefined` → usa `current.published`).

#### Problemas

1. **Cobertura parcial do DELETE:** O handler tem `handleDelete` (linhas 84-93) que não é testado neste arquivo.
2. **Ausência de teste de validação Zod:** O schema `dicaSchema` rejeita `name` ou `content` vazios — nenhum teste verifica retorno 400.
3. **Ausência de teste de 404 no PUT:** Se a dica não existe, retorna 404 (linha 54) — não testado.
4. **IP fixo `127.0.0.1`:** O `req.socket = {}` força o fallback para `127.0.0.1`, mas não testa cenários com IP real (ex: `req.headers['x-forwarded-for']`).
5. **Falta teste de `invalidateCache`:** O handler chama `await invalidateCache('dicas:public:*')` (linhas 39, 79, 90), mas o mock do db-module não inclui cache — este mock é aplicado via `require('../../../../mocks/db-module').mockDb()` que substitui apenas `db.js`, não `cache.js`.

#### Melhorias Sugeridas

- Adicionar teste de `DELETE` cobrindo `DELETE` e `invalidateCache`
- Adicionar teste de validação Zod (nome vazio → 400)
- Adicionar teste de 404 no PUT (dica inexistente)
- Mockar explicitamente `lib/cache/cache.js` para verificar `invalidateCache`
- Testar fallback de IP com `x-forwarded-for` header

#### Duplicidades
- O padrão de setup (`createMocks`, `req.user = { username: 'admin' }`) é repetido em múltiplos arquivos (posts, roles). Pode ser extraído para helper compartilhado.

#### Código Morto
Nenhum identificado.

---


#### Finalidade
Testa o handler `POST` de `pages/api/admin/fetch-ml.js` em cenários de borda complexos:
- Priorização de ID explícito (`item_id=MLB2222`) na ordenação de IDs extraídos da URL
- Fallback para produto de catálogo quando `descRes.ok = false`
- Scraping HTML com meta tags (og:title, og:image, og:description)
- Preço inválido no título (`isNaN(price)`)
- Fallback de imagens (`url` em vez de `secure_url`)
- Tratamento de erro no scraping HTML

#### Relações
- **Handler:** `pages/api/admin/fetch-ml.js`
- **Mocks:** `lib/auth/auth.js` (completo), `lib/infra/logger.js` (completo), `global.fetch` (via `mockGlobalFetch`)
- **Helpers:** `mockGlobalFetch` de `tests/helpers/console.js`

#### Análise Detalhada

#### Teste 1 — Ordenação com `b === explicitId` (linha 35)
```
URL: 'https://produto.mercadolivre.com.br/MLB-1111-produto?outro=MLB2222&item_id=MLB2222'
Mock: fetch.ok = false para todas as chamadas
Verifica: global.fetch.mock.calls[0][0] contém 'MLB2222'
Verifica: status 500 (todas falharam)
```
**Cobertura:** Linha 53 do handler (`b === explicitId ? 1 : 0`).

#### Teste 2 — Produto de catálogo com `descRes.ok = false` (linhas 50-52)
```
URL: MLB-3333
Mock: items/MLB3333/description → ok: false
Mock: items/MLB3333 → ok: false
Mock: products/MLB3333 → ok: true (buy_box_winner com item_id MLB3333REAL)
Mock: MLB3333REAL/description → ok: false
Verifica: description: '' (fallback)
```
**Cobertura:** Linha 84 do handler (`if (descRes.ok) description = ...`).

#### Teste 3 — Fallback HTML com `content` antes da property e `isNaN(price)` (linhas 71-72, 98)
```
URL: MLB-4444
Mock: api.mercadolibre.com → ok: false (força scraping)
Mock: HTML com meta content antes de property
Verifica: price: 0 (isNaN), title: 'Título no Fallback'
```
**Cobertura:** Linhas 112-113 do handler (regex alternativa `content antes de property`) e linha 137 (`isNaN(price) ? 0 : price`).

#### Teste 4 — Fallback HTML com `priceMatch` e título da tag `<title>` (linhas 117, 122)
```
URL: MLB-6666
Mock: HTML com product:price:amount e sem og:title
Verifica: title: 'Produto Teste', price: 99.9
```
**Cobertura:** Linhas 116-119 do handler.

#### Teste 5 — Item padrão sem price e fallback de imagens (url vs secure_url) (linha 69)
```
URL: MLB-7777
Mock: items/MLB7777 → ok: true (pictures com url, não secure_url)
Verifica: price: 0, images: 'http://pic.jpg'
```
**Cobertura:** Linhas 68-69 do handler (`itemData.price || 0`, `pic.secure_url || pic.url`).

#### Teste 6 — Catch do fallback de scraping (linha 144)
```
URL: MLB-5555
Mock: HTML fetch → text() lança erro
Verifica: status 500, logger.error com 'FetchML'
```
**Cobertura:** Linha 143-145 do handler (`catch (scrapeErr)`).

#### Problemas

1. **Cobertura de `itemRes` com descrição:** Não há teste para o caso onde `itemRes.ok = true` E `descRes.ok = true` com `plain_text` (linha 70).
2. **Sem teste de validação de URL inválida:** O schema `urlSchema` rejeita URLs inválidas (linha 27-32) — não testado.
3. **Sem teste de `logActivity`:** O handler chama `req.adminUtils.logActivity('FETCH MERCADO LIVRE', ...)` (linha 152) — nenhum teste verifica isso.
4. **Sem teste de timeout (`fetchWithTimeout`):** A função de timeout (linhas 14-23) não é testada.
5. **Mock de `createMocks` repetido:** Cada teste cria mocks independentes — poderia ser extraído para `beforeEach`.
6. **Falta `clearAllMocks` entre testes:** Os mocks de `global.fetch` são reconfigurados via `mockImplementation`, mas não há `jest.clearAllMocks()` no `beforeEach` (o `mockGlobalFetch` apenas substitui o global.fetch).

#### Melhorias Sugeridas

- Adicionar teste de item com descrição bem-sucedida (plain_text)
- Adicionar teste de URL inválida (Zod validation → 400)
- Adicionar teste de `logActivity` com ação 'FETCH MERCADO LIVRE'
- Adicionar teste de timeout (fetch abortado)
- Verificar se `fetchWithTimeout` é testável (dependendo de como `clearTimeout` interage com timers)

#### Duplicidades
- O padrão `mockGlobalFetch()` é usado em múltiplos arquivos (fetch-spotify, fetch-ml integration tests).
- O setup de `auth.getAuthToken` e `auth.verifyToken` é repetido nos arquivos de fetch.

#### Código Morto
Nenhum identificado.

---


#### Finalidade
Testa o handler `POST` de `pages/api/admin/fetch-spotify.js` no cenário onde todas as 3 estratégias de fetch falham simultaneamente.

#### Relações
- **Handler:** `pages/api/admin/fetch-spotify.js`
- **Mocks:** `lib/auth/auth.js`, `lib/infra/logger.js`, `global.fetch` (via `mockGlobalFetch`)

#### Análise Detalhada

#### Teste único — 3 estratégias falham (linhas 48, 75, 104)
```
Mock: fetch.mockRejectedValue(new Error('Erro Forçado de Rede'))
Verifica: logger.error chamado para 'oEmbed', 'Iframe', 'HTML principal'
Verifica: status 500, error: 'Não foi possível identificar a música'
```
**Cobertura:** Linhas 48, 75, 104 (3 catch blocks) e linha 108-109 (fallback final).

#### Problemas

1. **Apenas 1 teste para handler com 3 estratégias:** Muito fraco. Não testa:
   - Estratégia 1 (oEmbed) com sucesso
   - Estratégia 2 (iframe) com sucesso
   - Estratégia 3 (HTML scraping) com sucesso
   - Parcial: título via oEmbed, artista via iframe
   - Parcial: título via iframe (quando oEmbed falha)
   - URL inválida (Zod validation)
   - `logActivity` com 'FETCH SPOTIFY'

2. **Mock de fetch com `mockRejectedValue`:** Deveria ser `mockRejectedValue` (rejeita a promise), mas o teste usa `mockRejectedValue` — está correto para simular falhas de rede.

3. **Falta `jest.clearAllMocks()`:** Os mocks de `logger.error` persistem entre testes (embora haja apenas 1 teste, isso é problemático para manutenção).

4. **Sem `beforeEach` de `auth.verifyToken`:** Diferente de `fetch-ml`, este arquivo não configura `auth.verifyToken` no `beforeEach` — o teste seta inline.

#### Melhorias Sugeridas

- Adicionar testes de sucesso para cada estratégia individualmente
- Adicionar teste de URL inválida (Zod)
- Adicionar teste de `logActivity`
- Adicionar teste de parcial sucesso (oEmbed ok, iframe falha)
- Adicionar teste de `trackMatch` falhando (URL sem track ID)

#### Duplicidades
- Estrutura similar a `fetch-ml.edge.test.js` (mockGlobalFetch, logger mock, auth mock)

#### Código Morto
Nenhum identificado.

---


#### Finalidade
Testa o handler `pages/api/admin/posts.js` em cenários de borda para todos os métodos HTTP (GET, POST, PUT, DELETE) e validações.

#### Relações
- **Handler:** `pages/api/admin/posts.js`
- **Mocks:** `lib/auth/auth.js`, `lib/infra/db.js`, `lib/cache/cache.js`, `lib/domain/posts.js`, `lib/crud/crud.js`, `lib/domain/audit.js`
- **Helpers:** `node-mocks-http`

#### Análise Detalhada

| # | Teste | Código Coberto | Status |
|---|-------|----------------|--------|
| 1 | `req.user = null` → 401 | Linha 59-60 | ✅ |
| 2 | `role: 'editor'` sem permissão → 403 | Linha 65-70 | ✅ |
| 3 | Sem permissões no banco → 403 | Linha 73-78 | ✅ |
| 4 | `image_url` inválida no POST → 400 (Zod) | Linha 13-16 | ✅ |
| 5 | ID inválido (`-1`) no PUT → 400 | Linha 93-94 | ✅ |
| 6 | Sem dados no PUT (só ID) → 400 | Linha 105-106 | ✅ |
| 7 | `image_url` inválida no PUT → 400 | Linha 25-28 | ✅ |
| 8 | DELETE falha no catch → 500 | Linha 118 | ✅ |
| 9 | PUT falha no catch → 500 | Linha 109 | ✅ |
| 10 | PATCH (não permitido) → 405 | Linha 146 | ✅ |
| 11 | Reordenar posts (reorder) → 200 | Linha 73-85 | ✅ |

#### Problemas

1. **Cobertura de `getPaginatedPosts`:** O `handleGet` (linhas 42-53) não é testado — não há teste de GET com sucesso.
2. **Cobertura de `createPost` com sucesso:** Não há teste de POST com sucesso (201).
3. **Cobertura de `updatePost` com sucesso:** Não há teste de PUT com sucesso (200).
4. **Cobertura de `deletePost` com sucesso:** Não há teste de DELETE com sucesso (200).
5. **Cobertura de `updateRecords` no reorder:** O teste de reorder verifica sucesso, mas não mocka `updateRecords` para verificar chamadas individuais.
6. **Falta `invalidateCache`:** O handler usa `cacheKeys: 'posts:*'` no `createAdminHandler`, mas não há verificação de invalidação de cache.
7. **Mock de `db.query` compartilhado:** O `mockDb()` do `db-module` fornece um mock padrão, mas alguns testes precisam de múltiplas chamadas (`mockResolvedValueOnce` em sequência).

#### Melhorias Sugeridas

- Adicionar teste de GET com paginação e busca
- Adicionar teste de POST com sucesso (201 + logActivity)
- Adicionar teste de PUT com sucesso (200 + logActivity)
- Adicionar teste de DELETE com sucesso (200 + logActivity)
- Verificar `invalidateCache` após mutações
- Adicionar teste de 404 no PUT/Delete (post inexistente)

#### Duplicações
- O padrão de permissões (`db.query` → `permissions`) é repetido em múltiplos arquivos (roles, posts).
- O setup de `createMocks` é similar a `dicas.edge.test.js`.

#### Código Morto
Nenhum identificado.

---


#### Finalidade
Testa o handler `pages/api/admin/rate-limit.js` em todos os cenários de gerenciamento de rate limit: consulta de IPs bloqueados, whitelist, auditoria, exportação CSV, e operações POST/DELETE.

#### Relações
- **Handler:** `pages/api/admin/rate-limit.js`
- **Mocks:** `@upstash/redis`, `lib/infra/redis.js`, `lib/auth/auth.js`
- **Padrão:** Usa `jest.resetModules()` + `require()` dinâmico no `getHandler()` para permitir teste de variáveis de ambiente

#### Análise Detalhada

| # | Teste | Cenário | Status |
|---|-------|---------|--------|
| 1 | Redis não configurado → 501 | `delete process.env.UPSTASH_REDIS_REST_URL` | ✅ |
| 2 | Export CSV com filtros | `type=export_csv`, `startDate`, `endDate`, `search` | ✅ |
| 3 | IP atual (`::1` → `127.0.0.1`) | `type=current_ip`, socket remoteAddress | ✅ |
| 4 | Listar whitelist | `type=whitelist`, `smembers` | ✅ |
| 5 | Logs de auditoria paginados | `type=audit`, `search=admin` | ✅ |
| 6 | IPs bloqueados (count > 5) | `redisScan` + `pipeline` | ✅ |
| 7 | Redis vazio → `[]` | `redisScan` retorna chaves vazias | ✅ |
| 8 | Adicionar à whitelist (POST) | `sadd`, `del`, `lpush` | ✅ |
| 9 | POST sem IP → 400 | Body vazio | ✅ |
| 10 | Remover da whitelist (DELETE) | `srem`, type=whitelist | ✅ |
| 11 | Desbloquear IP (DELETE) | `del`, fallback 'Sistema' | ✅ |
| 12 | DELETE sem IP → 400 | Query vazia | ✅ |
| 13 | Método não permitido → 405 | `PUT` | ✅ |
| 14 | Erro interno → 500 | `pipeline.exec` rejeita | ✅ |

#### Problemas

1. **Mock de `pipeline` inconsistente:** O `mockRedisInstance.pipeline` retorna um objeto fixo no mock inicial (linhas 11-15), mas alguns testes sobresvem com `mockImplementationOnce` (linhas 126-130, 199-203). Isso pode causar confusão sobre qual implementação está ativa.

2. **`mockRedisInstance.pipeline` inicial retorna dados vazios:** O mock padrão retorna `{ get: jest.fn(), ttl: jest.fn(), exec: jest.fn().mockResolvedValue([]) }` — isso pode mascarar bugs onde o pipeline não é chamado corretamente.

3. **Falta `redisExpire` nos mocks:** O mock inicial não inclui `redisExpire`, mas o handler pode usá-lo em cenários de rate limit (não testado).

4. **Cache de `blockedIpsCache` (linhas 26-43):** O teste 5 (IPs bloqueados) não limpa o cache entre execuções — se rodado após teste 6 (Redis vazio), o cache pode conter dados stale. Na prática, `jest.resetModules()` no `beforeEach` reseta o módulo, mas a variável `blockedIpsCache` é um singleton em memória que pode persistir.

5. **Sem teste de `redisSafe` com rate limit Upstash:** A função `redisSafe` (linhas 50-67) tem lógica para tratar erros de rate limit do Upstash — não testada.

6. **Sem teste de paginação completa:** O teste 5 verifica paginação básica, mas não testa múltiplas páginas.

7. **`getHandler()` dinâmico:** O uso de `require()` para obter o handler (linha 58) é necessário para testar `process.env`, mas impede o uso de `import` estático — pode causar confusão.

#### Melhorias Sugeridas

- Adicionar teste de `redisSafe` com rate limit Upstash
- Adicionar teste de cache hit (segunda chamada retorna cached)
- Adicionar teste de paginação com múltiplas páginas
- Adicionar teste de `invalidateBlockedIpsCache` após POST/DELETE
- Limpar `blockedIpsCache` explicitamente entre testes

#### Duplicações
- O mock de `@upstash/redis` é único e complexo — poderia ser extraído para `tests/mocks/redis-module.js`.

#### Código Morto
Nenhum identificado.

---


#### Finalidade
Testa o handler `pages/api/admin/roles.js` em cenários de borda para GET, POST, PUT e DELETE de cargos (roles).

#### Relações
- **Handler:** `pages/api/admin/roles.js`
- **Mocks:** `lib/auth/auth.js` (com `withAuth` custom que chama `res.status(401).json()`), `lib/infra/db.js`, `lib/crud/crud.js`, `lib/domain/audit.js`

#### Análise Detalhada

| # | Teste | Cenário | Código Coberto |
|---|-------|---------|----------------|
| 1 | Cargo misterioso → 403 | `db.query` retorna `[]` | Linha 21 do handler (fallback permissões vazias) |
| 2 | POST com permissões string | `createRecord` com `permissions: '["Leitura"]'` | Linha 52 (`JSON.stringify`) |
| 3 | PUT com ID na query, sem permissões | `updateRecords` retorna `[]` → fallback `{}` | Linhas 61-72 |
| 4 | DELETE com fallback no log | `SELECT name FROM roles` retorna `[]` → usa ID | Linhas 68-72 |

#### Problemas

1. **Mock de `withAuth` com `res.status(401).json()`:** O mock de `auth.withAuth` (linhas 13-24) chama `res.status(401).json()` diretamente, mas o handler do Jest (`node-mocks-http`) pode não ter o método `.json()` encadeado como o Express real. Isso pode causar `TypeError: res.status(...).json is not a function` em alguns cenários — embora os testes atuais passem porque `verifyToken` retorna truthy.

2. **Falta teste de `handleGet` com tabela inexistente:** O handler tem lógica de criar tabela se não existir (linhas 22-37, código `42P01`) — não testada.

3. **Falta teste de `handleGet` com sucesso:** Não há teste de GET que retorne lista de roles.

4. **Falta teste de DELETE com `deleteRecords` falhando:** O handler chama `deleteRecords` (linha 79) sem try/catch interno — se falhar, o erro propagaria para o catch do `createAdminHandler`. Não testado.

5. **`db.query` mockImplementation complexo:** O mock usa `sql.includes('SELECT permissions FROM roles')` para rotear respostas — funciona, mas é frágil a mudanças na query.

6. **Sem teste de validação Zod:** O `roleSchema` rejeita nome vazio — não testado.

#### Melhorias Sugerias

- Adicionar teste de `handleGet` com tabela inexistente (criação automática)
- Adicionar teste de `handleGet` com sucesso
- Adicionar teste de DELETE com `deleteRecords` falhando
- Adicionar teste de validação Zod (nome vazio → 400)
- Adicionar teste de `handlePut` com permissões como array

#### Duplicações
- Estrutura similar a `dicas.edge.test.js` e `posts.edge.test.js` (auth mock + db mock + crud mock).

#### Código Morto
Nenhum identificado.

---


#### Finalidade
Testa o handler `pages/api/admin/stats.js` em cenários de borda: método não permitido e erro no banco de dados.

#### Relações
- **Handler:** `pages/api/admin/stats.js`
- **Mocks:** `lib/auth/auth.js` (com `withAuth` custom), `lib/infra/db.js` (via `mockDb`)

#### Análise Detalhada

| # | Teste | Cenário | Status |
|---|-------|---------|--------|
| 1 | POST → 405 | Método não permitido | ✅ |
| 2 | Erro no DB → 500 | `db.query.mockRejectedValue` | ✅ |

#### Problemas

1. **Cobertura extremamente fraca:** O handler faz 18 queries simultâneas (linhas 14-33) com `Promise.all` — nenhum teste verifica:
   - Retorno 200 com todas as contagens
   - Parsing correto de `parseInt`
   - Estrutura do objeto retornado

2. **Sem teste de `handleGet` com sucesso:** O teste mais básico (GET → 200 com dados) está faltando.

3. **Mock de `db.query.mockReset()`:** O teste 2 usa `db.query.mockReset()` (linha 53) para limpar o mock padrão do `mockDb()` — isso é necessário porque `mockDb` já fornece um mockResolvedValue padrão.

4. **Sem verificação de `logActivity`:** O handler não chama `logActivity` (é apenas leitura), mas o teste não verifica que NENHUMA atividade é registrada.

#### Melhorias Sugeridas

- Adicionar teste de GET com sucesso (200 + objeto de stats)
- Adicionar teste de parsing de `parseInt` com valores não-numéricos
- Adicionar teste de `Promise.all` com queries parciais falhando
- Adicionar teste de `db.query` retornando `{ rows: [{ count: '0' }] }`

#### Duplicações
- Mock de `withAuth` idêntico ao de `roles.edge.test.js` (linhas 7-25) — poderia ser extraído para helper.

#### Código Morto
Nenhum identificado.

---


#### Finalidade
Testa o handler `pages/api/auth/login.js` no cenário de erro interno durante a autenticação.

#### Relações
- **Handler:** `pages/api/auth/login.js`
- **Mocks:** `lib/auth/auth.js` (authenticate, generateToken, setAuthCookie, authenticateAndGenerateToken), `lib/cache/cache.js` (checkRateLimit), `lib/infra/logger.js`

#### Análise Detalhada

#### Teste único — Erro interno (linha 50-53)
```
Mock: authenticateAndGenerateToken.mockRejectedValue(new Error('Erro Forçado no Banco de Dados'))
Verifica: logger.error chamado com 'Auth', 'Erro interno durante a autenticação:'
Verifica: status 500, error: 'Internal Server Error'
```
**Cobertura:** Linhas 50-53 do handler (catch de erro interno).

#### Problemas

1. **Apenas 1 teste para handler complexo:** O handler tem ~100 linhas com múltiplos cenários:
   - `req.method !== 'POST'` → 405 (não testado)
   - `detectSpoofedIP` com `isSpoofed = true` → 403 (não testado)
   - `result.error === 'RATE_LIMITED'` → 429 (não testado)
   - `result.error === 'INVALID_CREDENTIALS'` → 401 (não testado)
   - `result.error === 'MISSING_FIELDS'` → 400 (não testado)
   - `responseMode === 'body'` → retorna token no body (não testado)
   - Modo padrão → cookie httpOnly (não testado)

2. **Mock de `logger` estranho:** O mock retorna `{ ...mockMethods, logger: { ...mockMethods } }` (linhas 19-31) — isso cria duplicação (`logger.error` e `logger.logger.error`). O handler usa `logger.error` (importado de `lib/infra/logger.js`), mas o mock também exporta `logger.error` diretamente. Pode haver confusão sobre qual é o correto.

3. **Sem `beforeEach` de `jest.clearAllMocks()`:** Diferente de outros arquivos, este usa `jest.clearAllMocks()` no `beforeEach`, mas isso pode limpar mocks que deveriam persistir entre testes.

4. **Sem teste de `checkRateLimit`:** O handler chama `cache.checkRateLimit` via `authenticateAndGenerateToken`, mas o mock retorna `false` (não rate limited) — nenhum teste verifica o caminho de rate limit.

#### Melhorias Sugeridas

- Adicionar teste de método não permitido (GET → 405)
- Adicionar teste de IP spoofing detectado (403)
- Adicionar teste de credenciais inválidas (401)
- Adicionar teste de campos faltando (400)
- Adicionar teste de rate limit (429)
- Adicionar teste de sucesso com cookie (200)
- Adicionar teste de sucesso com `?response=body` (200 + token no body)
- Corrigir mock de `logger` para evitar duplicação

#### Duplicações
- O mock de `authenticateAndGenerateToken` é similar a outros arquivos de auth.

#### Código Morto
Nenhum identificado.

---


#### Finalidade
Testa o handler `pages/api/upload-image.js` no cenário de criação do diretório de upload quando ele não existe.

#### Relações
- **Handler:** `pages/api/upload-image.js`
- **Mocks:** `fs` (existsSync, mkdirSync, promises.rename, promises.unlink), `sharp` (metadata), `formidable` (parse), `lib/domain/settings.js` (updateSetting), `lib/auth/auth.js` (withAuth)

#### Análise Detalhada

#### Teste único — Criação de diretório (linhas 42-44)
```
Mock: fs.existsSync → false (para paths contendo 'uploads')
Mock: formidable.parse → { uploadType: 'post_image' }, { image: [{ mimetype: 'image/jpeg', size: 1000, ... }] }
Mock: sharp → metadata: { width: 800, height: 600, format: 'jpeg' }
Verifica: fs.mkdirSync chamado com path contendo 'uploads'
Verifica: status 200
```
**Cobertura:** Linhas 42-44 do handler (criação do diretório).

#### Problemas

1. **Apenas 1 teste para handler complexo:** O handler tem ~90 linhas com múltiplos cenários:
   - `req.method !== 'POST'` → 405 (não testado)
   - Nenhuma imagem enviada → 400 (não testado)
   - Mimetype inválido → 400 (não testado)
   - Arquivo muito grande → 400 (não testado)
   - Arquivo corrompido (sharp falha) → 400 (não testado)
   - Dimensões muito grandes → 400 (não testado)
   - Upload tipo `setting_home_image` → updateSetting (não testado)
   - Erro interno → 500 (não testado)

2. **Mock de `fs.existsSync` incompleto:** O mock retorna `false` apenas para paths contendo 'uploads' — mas o handler usa `path.join(process.cwd(), 'public', 'uploads')`. Se `process.cwd()` mudar, o mock pode não corresponder.

3. **Mock de `formidable` retorna estrutura fixa:** O mock retorna `{ image: [{ mimetype: 'image/jpeg', size: 1000, ... }] }` — mas o handler acessa `files.image?.[0] || files.image` (linha 60). O mock pode não corresponder ao comportamento real do formidable v3 (que retorna arrays).

4. **Spy de `console.error` problemático:** O teste cria um spy que lança erros (linha 54-57):
   ```js
   const consoleSpy = jest.spyOn(console, 'error').mockImplementation((msg, err) => {
     if (err) throw err;
     throw new Error(msg);
   });
   ```
   Isso pode mascarar erros reais do handler — se o handler logar um erro, o teste falhará com o erro em vez de verificar o comportamento.

5. **Sem `beforeEach`:** Diferente de outros arquivos, este usa `afterEach` com `jest.restoreAllMocks()`, mas não tem `beforeEach` para setup comum.

6. **Falta `await` em `formidable.parse`:** O mock de `formidable` usa `cb` síncrono, mas o handler espera uma Promise. O mock pode não simular corretamente o comportamento assíncrono.

#### Melhorias Sugeridas

- Adicionar teste de método não permitido (GET → 405)
- Adicionar teste de nenhuma imagem enviada (400)
- Adicionar teste de mimetype inválido (400)
- Adicionar teste de arquivo muito grande (400)
- Adicionar teste de arquivo corrompido (400)
- Adicionar teste de dimensões muito grandes (400)
- Adicionar teste de upload tipo `setting_home_image` (updateSetting chamado)
- Adicionar teste de erro interno (500)
- Remover spy de `console.error` problemático

#### Duplicações
- Nenhuma significativa.

#### Código Morto
Nenhum identificado.

---

## Padrões e Convenções Identificados

#### Padrão de Setup (comum a 6/9 arquivos)
```js
beforeEach(() => {
  const mocks = createMocks({ method: 'GET', headers: {}, socket: {}, body: {} });
  req = mocks.req;
  res = mocks.res;
  req.user = { username: 'admin' }; // ou role: 'admin'
});
```

#### Padrão de Mock de Auth (comum a 4/9 arquivos)
```js
jest.mock('../../../../../lib/auth/auth.js', () => ({
  withAuth: jest.fn((h) => h) // ou versão async com token
}));
```

#### Padrão de Mock de DB (comum a 5/9 arquivos)
```js
jest.mock('../../../../../lib/infra/db.js', () => require('../../../../mocks/db-module').mockDb());
```

#### Padrão de Mock de Logger (comum a 3/9 arquivos)
```js
jest.mock('../../../../../lib/infra/logger.js', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn(), success: jest.fn() }
}));
```

---

## Resumo de Problemas Transversais

#### Críticos
1. **Cobertura insuficiente em 4 arquivos** (fetch-spotify, stats, login, upload-image) com apenas 1 teste cada
2. **Ausência de testes de sucesso** nos handlers (a maioria testa apenas erros/edge cases)

#### Moderados
3. **Mocks de `withAuth` duplicados** em roles.js e stats.js — deveriam usar helper compartilhado
4. **Mock de `db-module` não cobre cache** — `invalidateCache` não é verificado
5. **Spy de `console.error` problemático** em upload-image.js

#### Menores
6. **Padrão `req.socket = {}`** para forçar IP — funciona mas é frágil
7. **Falta `jest.clearAllMocks()`** em alguns arquivos
8. **Paths de import muito longos** (`../../../../../`) — poderiam usar aliases Jest

---

## Recomendações Prioritárias

1. **Adicionar testes de sucesso** para todos os handlers (GET 200, POST 201, PUT 200, DELETE 200)
2. **Extrair mocks comuns** para `tests/mocks/redis-module.js` e `tests/mocks/auth-module.js`
3. **Adicionar validação de `logActivity`** nos handlers que usam `adminUtils`
4. **Criar helper `createAdminMocks()`** em `tests/helpers/admin.js` para padronizar setup de req/res com autenticação
5. **Adicionar testes de cache** (`invalidateCache`, `checkRateLimit`) onde aplicável
6. **Corrigir spy de `console.error`** em upload-image.js para não mascarar erros

---

*Documento gerado em 2026-09-23 | Projeto Caminhar | Subagent Hermes*


---


## 17.1. Testes Unitários — Scripts Restantes


Os testes cobrem scripts de infraestrutura (backup, limpeza de banco, migração, seed, reset de senha) e utilitários (constants, date-format, load-env, cleanup). O padrão dominante é mockar `pg`, `fs`, `dotenv` e o módulo compartilhado `lib/infra/db.js` via `tests/mocks/db-module.js`.

A maioria dos testes é superficial: verifica **exports** e chamadas de mock, sem exercitar a lógica real dos scripts. Isso é agravado pelo fato de os scripts terem guards `if (process.argv[1] ...)` que impedem a execução direta no import — os testes contornam isso importando o módulo inteiro, mas raramente chamam as funções de alto nível (`run()`, `createBackup()`, `clearDatabase()`).

---


#### 1. `tests/unit/scripts/backup.test.js`

| Aspecto | Detalhe |
|---------|---------|
| **Finalidade** | Verificar se `scripts/backup.js` exporta 7 funções públicas. |
| **Relações** | Importa `../../../scripts/backup.js`. Mocks de `child_process`, `fs`, `date-fns`, `scripts/utils/constants.js`. |
| **Escopo** | Apenas `describe('Funções exportadas')` — testa `typeof` de cada export. |
| **Problemas** | 1. **Não testa lógica alguma**: `createBackup`, `restoreBackup`, `cleanupOldBackups`, `getAvailableBackups`, `getBackupLogs`, `initializeBackupSystem`, `checkDiskBeforeBackup` nunca são invocadas. 2. **Mock de `date-fns` desnecessário**: o script real importa de `./utils/date-format.js`, não de `date-fns` (o import real foi substituído, mas o mock permanece). 3. **Mock manual do fs é frágil**: duplica a superfície do módulo `fs` e omite funções usadas pelo script real (e.g., `fs.statfs`, `fs.promises.stat`, `fs.promises.rename`). |
| **Melhorias** | 1. Testar `generateBackupFilename` e a geração de timestamps. 2. Testar `getBackupFiles` (deduplicação por base-name, ordenação). 3. Testar `cleanupOldBackups` com limite `MAX_BACKUPS`. 4. Testar sanitização de senha em `logBackupOperation`. 5. Testar `restoreBackup` com path `.enc` vs `.sql.gz`. |
| **Código morto** | `existsSync`, `readdirSync`, `statSync` no mock do fs são declarados mas nunca usados nos testes. |
| **Duplicação** | Mock de `fs` manual que espelha (imperfeitamente) a estrutura real; outros arquivos usam `jest.mock('fs')` que é mais simples e equivalente. |

---

#### 2. `tests/unit/scripts/clean-orphaned-images.test.js`

| Aspecto | Detalhe |
|---------|---------|
| **Finalidade** | Testar `cleanOrphanedImages` de `scripts/clean-orphaned-images.js`. |
| **Relações** | Importa `../../../scripts/clean-orphaned-images.js`. Usa `mockQuery` do `pg` mockado automático (`__mocks__/pg.js` não existe; usa `jest.mock('pg')` + importação de `mockQuery` do `pg` mockado). |
| **Escopo** | 5 cenários: remoção de órfão, diretório inexistente, erro de banco, coluna inexistente, arquivos irrelevantes. |
| **Problemas** | 1. **Importação frágil de `mockQuery`**: `import { mockQuery } from 'pg'` depende de `pg` exportar `mockQuery` como named export — mas o script mockado padrão do Jest não faz isso; a suíte só funciona se houver um `__mocks__/pg.js` (não encontrado). 2. **SQL injection via template string**: o script concatena `SELECT ${column} FROM ${table}` sem validação — não há teste de segurança para nomes maliciosos. 3. **Teste de "erro de banco"** silencia `console.error` mas não verifica a mensagem. 4. **Teste de coluna inexistente** espera string `"Aviso: Coluna 'image_url' não encontrada na tabela 'posts'"`, mas o mock rejeita com código `42703` **sem especificar a tabela** — o teste pode passar por sorte se a primeira iteração do loop for a tabela `posts`. |
| **Melhorias** | 1. Criar `__mocks__/pg.js` com `mockQuery` exportado. 2. Testar com nomes de tabela contendo caracteres especiais para validar segurança. 3. Testar com múltiplas tabelas (o loop atual só testa a primeira erro). 4. Verificar a mensagem exata de `console.error` e `console.warn`. |
| **Código morto** | `jest.mock('fs')` é usado apenas para `fs.existsSync` e `fs.readdirSync` — `fs.unlinkSync` é chamado pelo script mas seu mock é automático. Sem problemas, mas o mock poderia ser `jest.mock('fs', () => ({ existsSync: jest.fn(), readdirSync: jest.fn(), unlinkSync: jest.fn() }))` para ser mais explícito. |
| **Duplicação** | Padrão de `jest.mock('fs')` + `jest.mock('pg')` + `jest.mock('dotenv')` repetido em vários arquivos; o `cleanup.test.js` replica o mesmo arranjo. |

---

#### 3. `tests/unit/scripts/clear-db.test.js`

| Aspecto | Detalhe |
|---------|---------|
| **Finalidade** | Verificar que `clear-db.js` importa dependências e executa TRUNCATE. |
| **Relações** | Mocks de `pg`, `fs`, `dotenv`, `lib/infra/db.js` (via `tests/mocks/db-module`), `load-env.js`. |
| **Escopo** | 4 testes: importação, TRUNCATE nas tabelas corretas, fechamento de conexão, cancelamento do usuário. |
| **Problemas** | 1. **Testa o mock, não o script**: todas as asserções são sobre `libDb.query` (o mock de `lib/infra/db.js`), não sobre o script `clear-db.js` em si. O script real nunca é importado ou executado. 2. **Teste de "cancelamento" é inócuo**: `const answer = false; if (!answer) { expect(...) }` — não exercita a função `askConfirmation()` do script, apenas verifica uma variável local `false`. 3. **TRUNCATE é hardcoded no teste**: a query SQL aparece como literal no teste, mas poderia asser contra o valor real extraído do script. |
| **Melhorias** | 1. Importar `clear-db.js` e executar `clearDatabase()` com `readline` mockado para simular "s" e "n". 2. Verificar que `clearUploadsDir` é chamada após TRUNCATE. 3. Testar caminho de erro (query falha). 4. Validar a lista exata de tabelas no TRUCE. |
| **Código morto** | `jest.mock('pg')` e `jest.mock('fs')` são desnecessários — o teste só importa `lib/infra/db.js` e `load-env.js`. |
| **Duplicação** | Padrão de mock idêntico a `clear-musicas.test.js` (ambos testam o mock `db-module`). |

---

#### 4. `tests/unit/scripts/clear-musicas.test.js`

| Aspecto | Detalhe |
|---------|---------|
| **Finalidade** | Verificar que `clear-musicas.js` executa DELETE FROM musicas e fecha conexão. |
| **Relações** | Mesmo arranjo de `clear-db.test.js`: mocks de `pg`, `fs`, `dotenv`, `lib/infra/db.js`, `load-env.js`. |
| **Escopo** | 2 testes: DELETE e closeDatabase. |
| **Problemas** | 1. **Não testa o script**: novamente, tudo é sobre o mock de `db.js`, não sobre `clear-musicas.js`. 2. **Teste de "DELETE" não verifica rowCount**: o mock retorna `rowCount: 5`, mas a asserção é apenas `stringContaining('DELETE')`. 3. **Código redundante com clear-db**: poderia ser um único teste parametrizado para scripts de limpeza. |
| **Melhorias** | 1. Importar o script e testar `clearMusicRecords()`. 2. Simular confirmação do usuário via `readline` mock. 3. Verificar que `process.exit(1)` é chamado em caso de erro. |
| **Código morto** | `jest.mock('pg')`, `jest.mock('fs')`, `jest.mock('dotenv')` — nenhum é usado indiretamente. |
| **Duplicação** | Replica exatamente a estrutura de `clear-db.test.js`, apenas com query diferente. |

---

#### 5. `tests/unit/scripts/db/connection.test.js`

| Aspecto | Detalhe |
|---------|---------|
| **Finalidade** | Testar `scripts/db/connection.js` (getPool, closePool, query). |
| **Relações** | Mock manual de `pg` via `jest.unstable_mockModule`. |
| **Escopo** | 3 grupos: `getPool()`, `closePool()`, `query()` — 7 testes. |
| **Problemas** | 1. **Não testa `resetPool` diretamente**: a função existe no script e é usada no `beforeAll`, mas não há teste dedicado. 2. **Mock de `pg` é verboso e frágil**: duplica implementação interna do `pg.Pool`. 3. **Teste de query com parâmetros** não verifica que `undefined` params cai no branch correto (existe `if (params !== undefined)` no script, mas o teste sempre passa array). |
| **Melhorias** | 1. Testar `resetPool` isoladamente. 2. Testar `query` sem params (branch `params === undefined`). 3. Testar erro no `Pool` constructor. 4. Verificar que `pool.end()` é chamado exatamente uma vez em `closePool`. |
| **Código morto** | `mockConnect` no mock do `pg` nunca é usado nos testes (a função `query` do connection usa `pool.query`, não `pool.connect`). |
| **Duplicação** | Mock manual de `pg` é idêntico em estrutura ao de `migrate.test.js` e `validate-schema.test.js`. |

---

#### 6. `tests/unit/scripts/init-table.test.js`

| Aspecto | Detalhe |
|---------|---------|
| **Finalidade** | Testar `scripts/utils/init-table-utils.js`: buildCreateTableSQL, getSeedValues, buildSeedSQL, getTableName, validateIdentifier. |
| **Relações** | Importação estática dos utilitários; não há mocks de `pg`/`fs`. |
| **Escopo** | 4 grupos, ~10 testes. |
| **Problemas** | 1. **Teste de `validateIdentifier` está implícito**: a função é chamada para gerar `safeName`, mas nunca há um teste direto para entradas inválidas (e.g., `'; DROP TABLE`). 2. **SQL injection em `buildSeedSQL`**: o escape de aspas simples (`' -> ''`) é testado implicitamente em `getSeedValues`, mas não há teste de valor com aspas mistas. 3. **Testes de `getTableName` manipulam `process.argv` diretamente** sem `beforeAll` para salvar o original (usa `afterAll` para restaurar, mas um `beforeAll` seria mais idiomático e seguro). 4. **Esquemas de teste hardcoded**: `musicasSchema` e `dicasSchema` são declarados múltiplas vezes em diferentes describes. |
| **Melhorias** | 1. Testar `validateIdentifier` com nomes inválidos (espaços, ponto e vírgula, SQL keywords). 2. Testar `buildCreateTableSQL` com schema vazio. 3. Testar `buildSeedSQL` com valores `null` e `undefined`. 4. Testar `getTableName` com `--help`. 5. Extrair os esquemas de teste para fixtures. |
| **Código morto** | `musicasSchema` é declarado em 3 describes diferentes — cada um é independente, mas o nome idêntico gera confusão. |
| **Duplicação** | Padrão de declaração de schema repetido 3 vezes. |

---

#### 7. `tests/unit/scripts/migrate.test.js`

| Aspecto | Detalhe |
|---------|---------|
| **Finalidade** | Testar `scripts/migrate.js`: listMigrationFiles, migrationNameFromFile, ensureMigrationTable, getAppliedMigrations. |
| **Relações** | Mocks manuais de `pg`, `fs`, `load-env.js`, `scripts/db/connection.js`. |
| **Escopo** | 4 grupos, 4 testes. |
| **Problemas** | 1. **Não testa `applyMigration`, `revertLastMigration`, `run`, `listStatus`**: as funções principais do script são ignoradas. 2. **Mock de `connection.js` é redundante**: o script importa `getPool` e `closePool` de `connection.js`, mas o mock substitui por `{ getPool, closePool }` — o mock do `pg` embutido não é usado pelo script (que usa `getPool()` do connection). 3. **Teste de `listMigrationFiles`** mocka `fs.promises.readdir` mas não testa o cenário de diretório inexistente (que faz `process.exit(1)`). 4. **CLI guard impede execução**: como o script tem `if (isMainModule)`, os testes importam o módulo mas não chamam `run()`. |
| **Melhorias** | 1. Testar `applyMigration` com mock de migração válida. 2. Testar `revertLastMigration`. 3. Testar `run()` com `--help`, `--status`, `--revert`. 4. Testar erro de diretório inexistente (esperando `process.exit`). |
| **Código morto** | `mockAccess` (fs.promises.access) é declarado no mock do `fs` mas nunca usado nos testes. `mockConnect` do `pg` mock também não é usado. |
| **Duplicação** | Mock manual de `pg` e `connection.js` são muito similares aos de `connection.test.js` e `validate-schema.test.js`. |

---

#### 8. `tests/unit/scripts/reset-password.test.js`

| Aspecto | Detalhe |
|---------|---------|
| **Finalidade** | Verificar que `reset-password.js` chama `hashPassword`, executa UPDATE, INSERT e fecha conexão. |
| **Relações** | Mocks de `pg`, `fs`, `dotenv/config`, `lib/auth/auth.js`, `lib/infra/db.js`. |
| **Escopo** | 4 testes: hash, update, insert, close. |
| **Problemas** | 1. **Testa o mock, não o script**: `reset-password.js` nunca é importado; tudo é sobre `libDb.query` e `libAuth.hashPassword`. 2. **Caminho feliz do script não é executado**: a função `resetPassword()` (que lê `process.argv`, chama `hashPassword`, decide UPDATE vs INSERT) nunca é chamada. 3. **Teste de INSERT** tem lógica confusa: `mockResolvedValueOnce` é chamado após já ter `mockResolvedValue` — a sequência real do script é UPDATE seguido condicional de INSERT, mas o teste não simula isso corretamente (o `mockResolvedValue` anterior já retorna `rowCount: 1`, então o UPDATE sempre "acha" o usuário). |
| **Melhorias** | 1. Importar `reset-password.js` e executar `resetPassword()` com `process.argv` controlado. 2. Mockar `readline` ou `process.stdin` para interatividade (se houver). 3. Testar caminho de usuário inexistente (UPDATE retorna rowCount: 0). 4. Testar erro de `hashPassword`. |
| **Código morto** | `jest.mock('pg')`, `jest.mock('fs')`, `jest.mock('dotenv/config')` — nenhum é usado diretamente. |
| **Duplicação** | Estrutura idêntica a `clear-db.test.js` e `clear-musicas.test.js`. |

---

#### 9. `tests/unit/scripts/seed-all.test.js`

| Aspecto | Detalhe |
|---------|---------|
| **Finalidade** | Verificar que `seed-all.js` checa conexão e executa seeds em ordem. |
| **Relações** | Mocks de `pg`, `fs`, `dotenv`, `lib/infra/db.js`. |
| **Escopo** | 2 testes: conexão (SELECT 1) e ordem dos seeds. |
| **Problemas** | 1. **Teste de "ordem dos seeds" é falso**: `const seeds = ['seed-posts.js', ...]` é um array local, não exercita o script de forma alguma — é apenas `expect(seeds[0]).toBe(...)`. 2. **Script nunca importado**: `seedAll()`, `runSeed()`, `checkDatabaseReady()` nunca são testadas. 3. **Não testa a opção `--clean`** que executa `npm run db:reset`. 4. **Não testa falha de conexão** (que deveria abortar). |
| **Melhorias** | 1. Importar e testar `seedAll()` com `child_process.execSync` mockado. 2. Testar ordem real de execução via mock dos módulos de seed. 3. Testar aborto em caso de `SELECT 1` falhar. 4. Testar `--clean`. |
| **Código morto** | `jest.mock('pg')`, `jest.mock('fs')`, `jest.mock('dotenv')` — desnecessários (só importa `lib/infra/db.js`). |
| **Duplicação** | Mesmo padrão dos scripts de limpeza. |

---

#### 10. `tests/unit/scripts/utils/cleanup.test.js`

| Aspecto | Detalhe |
|---------|---------|
| **Finalidade** | Testar `scripts/utils/cleanup.js`: loadEnv, cleanTableByPattern (indiretamente). |
| **Relações** | Mocks de `pg`, `fs`, `dotenv`. Importa `scripts/utils/cleanup.js`. |
| **Escopo** | 2 testes: loadEnv com e sem `.env.local`. |
| **Problemas** | 1. **Testa apenas `loadEnv` re-exportada**: `cleanTableByPattern` (a função principal) nunca é testada. 2. **Não testa conexão com banco**: o script usa `getPool()` e `closePool()` de `../db/connection.js`, mas o teste não mocka o pool nem verifica queries. 3. **Teste de `.env.local`**: mocka `fs.existsSync` mas não verifica que `dotenv.config` é chamado com `{ path: '.env.local' }` — apenas que foi chamado 2 vezes (número mágico). |
| **Melhorias** | 1. Testar `cleanTableByPattern` com mock de pool query. 2. Testar com `showDeleted: true`. 3. Testar erro de query. 4. Verificar o SQL gerado (WHERE clause com múltiplos LIKE). |
| **Código morto** | `jest.mock('pg')` e `jest.mock('dotenv')` — não são usados (só `fs` é mockado). |
| **Duplicação** | Nenhuma duplicação interna, mas o `loadEnv` é o mesmo testado em `load-env.test.js`. |

---

#### 11. `tests/unit/scripts/utils/constants.test.js`

| Aspecto | Detalhe |
|---------|---------|
| **Finalidade** | Verificar que `scripts/utils/constants.js` exporta valores específicos. |
| **Relações** | Importação estática; sem mocks. |
| **Escopo** | 12 testes: 11 valores individuais + 1 teste de undefined. |
| **Problemas** | 1. **Testes frágeis**: se uma constante for adicionada/removida, o teste quebra. 2. **Valores mágicos nos testes**: `MAX_BACKUPS = 10`, `DEFAULT_LIST_LIMIT = 50` etc. são hardcoded nos testes — se mudar no script, o teste quebra sem indicar o motivo. 3. **Não testa tipos**: todos os valores são verificados com `toBe`, mas não há verificação de que são do tipo correto (number, string). |
| **Melhorias** | 1. Agrupar constantes por domínio (backup, servidor) em `describe`s separados. 2. Verificar tipos (`typeof`). 3. Testar que constantes numéricas são positivas/finitas. 4. Extrair valores esperados para um único objeto de fixture para facilitar manutenção. |
| **Código morto** | Nenhum. |
| **Duplicação** | Não há duplicação interna. O valor `MAX_BACKUPS = 10` é mockado em `backup.test.js` com os mesmos valores. |

---

#### 12. `tests/unit/scripts/utils/date-format.test.js`

| Aspecto | Detalhe |
|---------|---------|
| **Finalidade** | Testar `scripts/utils/date-format.js`: formatISODate e formatLogDate. |
| **Relações** | Importação estática; sem mocks. |
| **Escopo** | 2 grupos, 10 testes. |
| **Problemas** | 1. **Teste de "data atual" é frágil**: verifica se o timestamp está dentro de ±1000ms, mas a execução pode demorar mais em CI lento. 2. **Regex de extração de timestamp** é complexa e poderia ser simplificada. 3. **Não testa fuso horário**: o script usa `toISOString()` (UTC), mas não há teste que verifique explicitamente que o resultado está em UTC. 4. **Teste de formato** usa `toMatch` com regex e depois `toBe` com string exata — redundante. |
| **Melhorias** | 1. Testar datas de borda (meia-noite, fim de mês, ano bissexto). 2. Verificar que `formatISODate` substitui `:` por `-` em todos os lugares. 3. Mockar `Date` para tornar testes determinísticos. 4. Remover redundância `toMatch` + `toBe`. |
| **Código morto** | Nenhum. |
| **Duplicação** | Não há duplicação interna. O `date-fns` mockado em `backup.test.js` é um vestígio — o script real usa `date-format.js`, não `date-fns`. |

---

#### 13. `tests/unit/scripts/utils/load-env.test.js`

| Aspecto | Detalhe |
|---------|---------|
| **Finalidade** | Testar `scripts/utils/load-env.js`: loadEnv e requireDatabaseUrl. |
| **Relações** | Mocks de `fs` e `dotenv`. Importação dinâmica do módulo. |
| **Escopo** | 2 grupos, 5 testes. |
| **Problemas** | 1. **Mock de `dotenv` incompleto**: `jest.mock('dotenv')` cria mock automático, mas o script usa `dotenv.config` que é uma função — o mock deveria verificar o path exato (`.env.local` vs `.env`). 2. **Teste de `.env.local` existente** espera `toHaveBeenCalledTimes(2)` — número mágico sem explicação. 3. **Teste de requireDatabaseUrl vazio** define `DATABASE_URL = ''` — a condição no script é `if (!process.env.DATABASE_URL)` que é truthy para string vazio, OK, mas não testa whitespace-only. |
| **Melhorias** | 1. Verificar o path exato passado para `dotenv.config`. 2. Testar `requireDatabaseUrl` com URL válida (não deveria lançar). 3. Testar `loadEnv` com `.env.local` inválido (erro do dotenv). |
| **Código morto** | `fs` mockado é usado apenas para `existsSync` — `path` não é mockado nem usado. |
| **Duplicação** | Testes de `loadEnv` duplicados em `cleanup.test.js` (mas o cleanup re-exporta de load-env). |

---

#### 14. `tests/unit/scripts/validate-schema.test.js`

| Aspecto | Detalhe |
|---------|---------|
| **Finalidade** | Testar `scripts/validate-schema.js`: validateSchema. |
| **Relações** | Mocks manuais de `pg`, `load-env.js`. Importação dinâmica com `isolateModules`. |
| **Escopo** | 3 testes: export, schema correto, erro de conexão. |
| **Problemas** | 1. **Mock de `load-env` via `jest.mock` em vez de `unstable_mockModule`**: o comentário no código explica que o Babel compila `import` para `require`, então `unstable_mockModule` não intercepta — isso é uma fragilidade da toolchain, não do teste, mas o comentário é longo e poderia ir para um README. 2. **Teste de "schema correto"** define manualmente `expectedColumnsByTable` espelhando o `EXPECTED_SCHEMA` do script — se o schema mudar, o teste quebra silenciosamente. 3. **Não testa schema faltando**: não há teste para quando uma tabela ou coluna está faltando (caminho que retorna `false` parcial). 4. **Não testa `closePool` no finally**: o script chama `closePool()` no finally, mas o teste não verifica isso. 5. **Spy de console é global**: `logSpy` e `errorSpy` são criados em `beforeEach` mas restaurados em `afterEach` — OK, mas o spy de `log` pode mascarar bugs reais no script. |
| **Melhorias** | 1. Testar tabela faltando (resultado `false` com mensagem específica). 2. Testar coluna faltando. 3. Verificar que `closePool` é chamado mesmo em caso de erro. 4. Extrair `expectedColumnsByTable` para fixture compartilhada com o script (importar do próprio schema, se extraído). 5. Encurtar o comentário sobre ESM/CJS. |
| **Código morto** | `errorSpy` é criado mas usado apenas em 1 teste — `logSpy` é criado mas nunca explicitamente asserado (apenas para silenciar saída). |
| **Duplicação** | Mock manual de `pg` similar aos de `connection.test.js` e `migrate.test.js`. |

---

## Resumo de problemas transversais

#### Problemas estruturais

1. **Testam mocks, não scripts**: `clear-db.test.js`, `clear-musicas.test.js`, `reset-password.test.js`, `seed-all.test.js` nunca importam ou executam os scripts reais — apenas o mock de `lib/infra/db.js`. Isso dá falsa sensação de cobertura.

2. **CLI guards impedem teste de `run()`**: scripts com `if (process.argv[1] ...)` são importados mas a função principal nunca é invocada nos testes.

3. **Mock manual de `pg` repetido**: `connection.test.js`, `migrate.test.js`, `validate-schema.test.js` reconstroem o mock de `pg` com estrutura idêntica — candidato a fixture compartilhada.

4. **Dependência de `__mocks__/pg.js`**: `clean-orphaned-images.test.js` importa `{ mockQuery }` de `pg`, mas o arquivo `__mocks__/pg.js` não existe na árvore de testes — a suíte falha silenciosamente se o mock automático do Jest não exportar `mockQuery`.

#### Problemas de cobertura

- Funções principais não testadas: `createBackup`, `restoreBackup`, `cleanupOldBackups`, `getAvailableBackups`, `getBackupLogs`, `initializeBackupSystem`, `clearDatabase`, `clearMusicRecords`, `resetPassword`, `seedAll`, `applyMigration`, `revertLastMigration`, `run`, `listStatus`, `cleanTableByPattern`.
- Caminhos de erro raramente testados (apenas `validate-schema.test.js` testa erro de conexão).
- Interação com `readline` (confirmação do usuário) nunca é mockada/testada.

#### Problemas de qualidade

- **Números mágicos em asserções**: `toHaveBeenCalledTimes(2)`, `rowCount: 5`, `MAX_BACKUPS = 10`.
- **Testes redundantes**: `toMatch` seguido de `toBe` com mesma string.
- **Teste falso positivo**: `seed-all.test.js` verifica array local, não o script.
- **Teste de cancelamento inócuo**: `clear-db.test.js` usa variável local `false` em vez de testar `askConfirmation()`.

#### Código morto

- `existsSync`, `readdirSync`, `statSync` no mock de `fs` em `backup.test.js`.
- `mockConnect` nos mocks de `pg` de `connection.test.js`, `migrate.test.js`, `validate-schema.test.js`.
- `jest.mock('pg')`, `jest.mock('fs')`, `jest.mock('dotenv')` em arquivos que não usam esses módulos indiretamente (`clear-db`, `clear-musicas`, `reset-password`, `seed-all`, `cleanup`, `reset-password`).
- `mockAccess` em `migrate.test.js`.

#### Duplicações

- Mock manual de `pg` em 3 arquivos (`connection.test.js`, `migrate.test.js`, `validate-schema.test.js`).
- Estrutura de teste idêntica para `clear-db`, `clear-musicas`, `reset-password`, `seed-all` (todos testam `lib/infra/db.js` mockado).
- `loadEnv` testado em `load-env.test.js` e `cleanup.test.js`.
- `musicasSchema` declarado 3 vezes em `init-table.test.js`.
- `expectedColumnsByTable` em `validate-schema.test.js` espelha `EXPECTED_SCHEMA` do script.
- Mock de `date-fns` em `backup.test.js` é vestígio — o script real usa `date-format.js`.

---

## Recomendações consolidadas

1. **Refatorar testes de scripts de infraestrutura** para importar e executar as funções principais, mockando apenas `process.argv`, `readline` e dependências externas.
2. **Extrair `__mocks__/pg.js`** com `mockQuery` exportado como named export para uso consistente.
3. **Criar fixture compartilhada para mock de `pg`** para eliminar a duplicação de 3 arquivos.
4. **Testar caminhos de erro**: query falha, schema faltando, usuário inexistente, diretório inexistente, confirmação negativa.
5. **Eliminar mocks desnecessários**: `jest.mock('pg')` etc. em scripts que só importam `lib/infra/db.js`.
6. **Extrair schema de validate-schema para módulo compartilhado** para evitar espelhamento.
7. **Adicionar cobertura para `applyMigration`, `revertLastMigration`, `run`** em `migrate.test.js`.
8. **Remover mock de `date-fns`** de `backup.test.js` e testar via `date-format.js` real.
9. **Parametrizar testes de constants** para facilitar manutenção.
10. **Documentar a fragilidade ESM/CJS** em um README de testes, não em comentário inline de 10 linhas.


---

