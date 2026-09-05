# Relatório de Melhorias e Correções — `/pages`

> **Data da análise:** 01/08/2026
> **Objetivo:** Levantamento analítico de possíveis melhorias identificadas nos 42 arquivos atuais da pasta `/pages`. **Nenhuma correção deve ser aplicada** — apenas documentar.
> **Baseado em:** Análise profunda dos arquivos atuais (01/08/2026), com apoio dos documentos anteriores em `/docs/antigos/` e `/docs/resolvidos/` apenas quando relevantes. Em caso de divergência, prevalece a análise atual.

---

## Índice

1. [Correções de Código (Bugs)](#1-correções-de-código-bugs)
2. [Duplicidade de Código](#2-duplicidade-de-código)
3. [Inconsistências Arquiteturais](#3-inconsistências-arquiteturais)
4. [Segurança](#4-segurança)
5. [Performance](#5-performance)
6. [Manutenibilidade e Padronização](#6-manutenibilidade-e-padronização)
7. [Pontos Irrelevantes ou Obsoletos](#7-pontos-irrelevantes-ou-obsoletos)

---

## 1. Correções de Código (Bugs)

### 1.1 `await await` duplicado em `admin/users.js`

**Arquivo:** `/pages/api/admin/users.js`

**Problema:** As linhas 68, 99 e 115 contêm `await await` duplicado antes de `req.adminUtils.logActivity(...)`:
```js
// linha 68
await await req.adminUtils.logActivity('CRIAR USUÁRIO', ...);
// linha 99
await await req.adminUtils.logActivity('ATUALIZAR USUÁRIO', ...);
// linha 115
await await req.adminUtils.logActivity('EXCLUIR USUÁRIO', ...);
```

**Impacto:** Em JavaScript, `await await` é sintaticamente válido (o segundo `await` resolve o resultado do primeiro), então **funciona**, mas é um erro de digitação que confunde a leitura e pode mascarar problemas se a função retornar algo inesperado. Não está no padrão dos demais arquivos admin (que usam `await` único).

**Sugestão:** Remover o `await` duplicado nas 3 linhas, mantendo apenas `await req.adminUtils.logActivity(...)`.

---

### 1.2 Import sem extensão no padrão ESM em `admin/backups.js`

**Arquivo:** `/pages/api/admin/backups.js`

**Problema:** A linha 1 importa `createBackup` de `'../../../scripts/backup'` **sem a extensão `.js`**:
```js
import { createBackup } from '../../../scripts/backup';
```
Enquanto todos os demais imports do projeto usam a extensão explícita (padrão ESM, ex: `'../../../lib/api/adminCrudHandler.js'`).

**Impacto:** No Node.js com ES Modules estrito (indicação do projeto via `"type": "module"` ou `next.config`), imports sem extensão podem gerar `ERR_MODULE_NOT_FOUND` em runtime, dependendo da configuração de resolução.

**Sugestão:** Adicionar a extensão `.js`: `from '../../../scripts/backup.js'`.

---

### 1.3 Invalidação de cache redundante em `api/posts.js`

**Arquivo:** `/pages/api/posts.js`

**Problema:** Após criar um post, o endpoint executa três invalidações de cache:
```js
await invalidateCache('posts:list:*');
await invalidateCache('posts:search:*');
await invalidateCache('posts:*');
```
O padrão glob `posts:*` já cobre `posts:list:*` e `posts:search:*`. As duas primeiras chamadas são **redundantes**.

**Impacto:** Três operações de Redis no lugar de uma, aumentando latência da criação de post e consumo de requisições Redis.

**Sugestão:** Manter apenas `invalidateCache('posts:*')`.

---

### 1.4 405 sem header `Allow` em `api/auth/check.js`

**Arquivo:** `/pages/api/auth/check.js`

**Problema:** O retorno 405 para métodos não-GET **não inclui** `res.setHeader('Allow', ['GET'])`, ao contrário de `login.js` e `refresh.js` que definem o header.

**Impacto:** Clientes HTTP que dependem do header `Allow` para descobrir métodos suportados (padrão RFC 7231) podem falhar ou fazer retries incorretos.

**Sugestão:** Adicionar `res.setHeader('Allow', ['GET'])` antes do retorno 405, padronizando com os demais endpoints auth.

---

## 2. Duplicidade de Código

### 2.1 Função `fetchWithTimeout()` duplicada em 3 fetchers admin

**Arquivos:**
- `/pages/api/admin/fetch-ml.js`
- `/pages/api/admin/fetch-spotify.js`
- `/pages/api/admin/fetch-youtube.js`

**Problema:** Os três arquivos definem a **mesma função** `fetchWithTimeout(url, options, timeout=8000)` com `AbortController` — cerca de 10 linhas idênticas em cada um. Os schemas Zod de validação de URL (`urlSchema`) também são idênticos nos três.

**Impacto:** Manutenção triplicada — se o timeout precisar mudar ou a função evoluir (ex: adicionar retry), são 3 pontos de alteração. Risco de divergência futura.

**Sugestão:** Extrair `fetchWithTimeout` para um utilitário compartilhado em `lib/` (ex: `lib/api/fetchWithTimeout.js`) e importá-lo nos três arquivos.

---

### 2.2 Paginação manual reimplementada em `posts.js` e `videos.js`

**Arquivos:**
- `/pages/api/posts.js`
- `/pages/api/videos.js`

**Problema:** Ambos reimplementam manualmente o parse/validação de paginação:
```js
const parsedPage = parseInt(req.query.page);
const page = !isNaN(parsedPage) ? parsedPage : 1;
const parsedLimit = parseInt(req.query.limit);
const limit = !isNaN(parsedLimit) ? parsedLimit : 10;
if (page < 1 || limit < 1 || limit > 100) { ... }
```
Enquanto o helper `helper/pagination.js` (`paginate()`) já centraliza exatamente essa lógica e é usado por `dicas.js` e `products.js`.

**Impacto:** Código duplicado; divergência de comportamento possível (ex: `parseInt` sem radix vs com radix no helper, mensagens de erro diferentes).

**Sugestão:** Migrar `posts.js` e `videos.js` para usar `paginate()` do helper, tratando o erro `INVALID_PAGINATION_PARAMS` de forma padronizada.

---

### 2.3 Padrão de reordenação (`action: 'reorder'`) repetido nos CRUDs admin

**Arquivos:**
- `/pages/api/admin/posts.js`
- `/pages/api/admin/musicas.js`
- `/pages/api/admin/videos.js`

**Problema:** Os três CRUDs implementam o mesmo padrão de reordenação em massa:
- `posts.js`: valida `reorderSchema`/`reorderItemSchema` e chama `updateRecords('posts', { position }, { id })` em loop.
- `musicas.js`: define `reorderSchema`/`reorderItemSchema` idênticos e chama `updateRecords('musicas', { position }, { id })`.
- `videos.js`: delega para `reorderVideos()` de `lib/domain/videos.js` (padrão diferente dos outros dois).

**Impacto:** Três implementações do mesmo conceito, duas com schemas Zod duplicados. `videos.js` usa a camada de domínio enquanto `posts.js`/`musicas.js` usam `updateRecords` direto. Divergência arquitetural entre CRUDs equivalentes.

**Sugestão:** Padronizar a reordenação: ou todos delegam para a camada de domínio (como `videos.js`), ou todos usam um helper comum de reordenação.

---

### 2.4 `admin.js` — Funções utilitárias de imagem embutidas e não exportadas

**Arquivo:** `/pages/admin.js`

**Problema:** `resizeImage()` (linhas 51-83) e `getCroppedImg()` (linhas 86-109) estão definidas dentro do arquivo do painel, sem exportação, somando ~58 linhas de lógica de processamento de imagem no mesmo arquivo do componente.

**Impacto:** Não reutilizável; difícil de testar isoladamente; infla o maior arquivo da pasta.

**Sugestão:** Extrair para `utils/` ou `lib/` (ex: `utils/imageUtils.js`) e importar no admin.

---

### 2.5 `admin.js` — Mapeamento manual de 4 CSS Modules + estilos inline

**Arquivo:** `/pages/admin.js`

**Problema:** O admin importa 4 CSS Modules do diretório `components/Admin/styles/` (login, tabs, form, misc) e faz um mapeamento manual (`const styles = { container: loginStyles.container, ... }`). Além disso, dezenas de elementos usam `style={{...}}` inline (botão de logout, cabeçalho de boas-vindas, controles do cropper, preview, etc.).

**Impacto:** Se uma classe for renomeada/removida no módulo, o mapeamento quebra sem erro em build. Estilos inline dificultam manutenção e não usam os tokens de forma consistente.

**Sugestão:** Consolidar em um único CSS Module do admin (ex: `Admin/Admin.module.css`) e mover os estilos inline recorrentes para classes.

---

### 2.6 `admin.js` — Bloco de estilos `<style>` duplicado para scroll

**Arquivo:** `/pages/admin.js`

**Problema:** O bloco `<style>{ html, body { overflow-y: scroll !important; } }</style>` aparece **duplicado** — na tela de login (linhas 369-374) e no painel autenticado (linhas 417-422). O `!important` força a barra de rolagem mesmo quando o conteúdo cabe na viewport.

**Impacto:** Duplicação; `!important` é prática CSS desaconselhada; UX prejudicada em telas pequenas.

**Sugestão:** Remover ambos os blocos e, se necessário, aplicar `overflow-y: auto` via classe CSS Module condicional.

---

### 2.7 `variables.css` — Token `shadow-glow` duplicado

**Arquivo:** `/pages/styles/variables.css`

**Problema:** O token `--shadow-glow: 0 0 15px rgba(37, 99, 235, 0.3)` aparece **duas vezes** — nas linhas 278 e 290 (na linha 290 ele é redefinido com o mesmo valor antes de `shadow-glowPrimary`).

**Impacto:** Redefinição redundante com o mesmo valor — sem impacto funcional, mas polui o fonte e sugere possível intenção de valores diferentes que nunca foram separados.

**Sugestão:** Remover a segunda definição (linha 290), mantendo apenas uma ocorrência.

---

## 3. Inconsistências Arquiteturais

### 3.1 `products.js` fora do padrão `createAdminHandler()`

**Arquivo:** `/pages/api/products.js`

**Problema:** Enquanto todos os 15 endpoints admin usam o factory `createAdminHandler()`, o CRUD de produtos implementa seu próprio middleware `requireAuth()` inline, sem `withAuth`, sem `req.adminUtils.logActivity()` (usa `logActivity` importado diretamente de `lib/domain/audit`) e sem a invalidação automática de cache do factory (faz manualmente com `invalidateCache('products:*')`). Também não usa validação Zod nos dados de entrada de POST/PUT.

**Impacto:** Fragilidade de consistência — se o `createAdminHandler()` evoluir (novo formato de erro, nova proteção), `products.js` precisa de ajuste manual separado. Validação de entrada mais fraca que os demais CRUDs admin.

**Sugestão:** Considerar migrar `products.js` para `createAdminHandler()` (mantendo o modo público via `?public=true`), ou criar um factory que suporte endpoints híbridos público+admin.

---

### 3.2 `auth/check.js` não usa `withAuth` (validação manual)

**Arquivo:** `/pages/api/auth/check.js`

**Problema:** O endpoint valida manualmente com `getAuthToken()` + `verifyToken()` em vez de usar o middleware `withAuth` padronizado no projeto. A documentação anterior (28/06/2026) chegou a listar este endpoint como "GET protegido via `withAuth`", mas o código atual não usa `withAuth`.

**Impacto:** Padrão de autenticação divergente — futuras melhorias no `withAuth` (ex: renovação automática de token, blacklist) não se aplicariam ao `check.js` automaticamente.

**Sugestão:** Avaliar se `check.js` deve usar `withAuth` (que injeta `req.user`) para padronizar, preservando o formato de resposta atual (`{ success, data: { authenticated, user } }`).

---

### 3.3 Posicionamento do rate limit inconsistente entre endpoints públicos

**Arquivos:**
- `/pages/api/musicas.js` — rate limit **dentro** do callback de cache (`getOrSetCache`)
- `/pages/api/posts.js` — rate limit **dentro** do callback de cache
- `/pages/api/dicas.js` — rate limit **dentro** do callback de cache
- `/pages/api/videos.js` — rate limit **antes** do cache
- `/pages/api/products.js` — rate limit **antes** do cache

**Problema:** Há duas estratégias conflitantes: rate limit dentro do callback (não penaliza cache hits, comentado no código como intencional) vs rate limit antes do cache (garante proteção mesmo em cache hits).

**Impacto:** Comportamento de proteção diferente por endpoint. Quem define a regra? Um atacante pode explorar o padrão mais fraco.

**Sugestão:** Definir uma política única e documentada (recomenda-se rate limit **antes** do cache, pois é mais seguro: protege mesmo quando o CDN/Redis devolve hit) e aplicá-la em todos os endpoints públicos.

---

### 3.4 Cache-Control inconsistente entre endpoints

**Arquivos:**
- `/pages/api/dicas.js`, `musicas.js`, `posts.js`, `videos.js` — `public, max-age=0, s-maxage=300, stale-while-revalidate=600`
- `/pages/api/settings.js` (GET público) — `public, s-maxage=120, stale-while-revalidate=600`
- `/pages/api/placeholder-image.js` — `public, max-age=86400, immutable`
- `/pages/api/admin/*` (GET) — `no-store` em posts/musicas/videos; sem header nos demais

**Problema:** Três políticas diferentes de Cache-Control para endpoints públicos (300s, 120s, 86400s). A de settings (120s) e a de conteúdo (300s) não têm documentação sobre a intenção.

**Impacto:** Comportamento de cache imprevisível para consumidores da API.

**Sugestão:** Centralizar políticas em constantes (ex: `CACHE_SHORT=120`, `CACHE_MEDIUM=300`, `CACHE_IMMUTABLE=86400`) e documentar quando usar cada uma.

---

### 3.5 Formato de resposta diverge entre endpoints

**Arquivos:** endpoints públicos

**Problema:** O formato de resposta de sucesso não é uniforme:
- `dicas.js` usa `paginatedResponse()` → `{ success, data, pagination }`
- `musicas.js` retorna `{ success, data, pagination }`
- `posts.js` retorna `{ success, ...result }` por padrão, e `{ success, data, pagination, timestamp }` com `?response=v1`
- `videos.js` retorna `{ success, ...result }`
- `products.js` retorna diretamente o `result` vindo da camada de domínio (`getPaginatedProducts()`/`getAllProducts()`), sem passar pelo envelope padronizado `paginatedResponse()` do helper
- `settings.js` (público) retorna `settings` direto (objeto), e com `?response=v1` retorna `{ success, data, count, timestamp }`
- `status.js` retorna `{ success, data, message, timestamp }`

**Impacto:** Consumidores precisam tratar formatos diferentes por endpoint; incompatibilidade com o helper `paginatedResponse()` em parte deles.

**Sugestão:** Adotar um envelope padrão único de sucesso (ex: `{ success, data, pagination? }`) em todos os endpoints públicos, mantendo `?response=v1` apenas como camada de compatibilidade legada.

---

## 4. Segurança

### 4.1 `admin.js` — `console.log` de dados do usuário no navegador

**Arquivo:** `/pages/admin.js`, linha 226

**Problema:** Após login bem-sucedido, o código executa `console.log('Login successful:', data.user)` — expõe todo o objeto `user` (username, role, permissions, possivelmente ID) no console do navegador.

**Impacto:** Em ambientes compartilhados ou com extensões maliciosas, vazamento mínimo de informações do usuário logado.

**Sugestão:** Remover o log ou reduzir a `console.log('Login bem-sucedido para usuário:', data.user.username)` (sem o objeto completo).

---

### 4.2 `rate-limit.js` — IP atual lido de `x-forwarded-for` sem validação

**Arquivo:** `/pages/api/admin/rate-limit.js`, linha 99

**Problema:** No modo `type=current_ip`, o código usa:
```js
const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
```
Isso confia no header `x-forwarded-for` diretamente, **sem a validação de spoofing** que o projeto padronizou em `getClientIP()` / `detectSpoofedIP()` (usados em `login.js` e nos endpoints públicos).

**Impacto:** Um cliente pode forjar `X-Forwarded-For` e fazer o endpoint de visualização de rate limit exibir um IP falso — quebra da confiança da ferramenta de diagnóstico.

**Sugestão:** Usar `getClientIP(req)` de `lib/api/helpers.js` (que aplica a mesma lógica segura de detecção de spoofing dos demais endpoints).

---

### 4.3 `cleanup-test-data.js` — Verificação de admin por username apenas

**Arquivo:** `/pages/api/cleanup-test-data.js`

**Problema:** A checagem de admin é feita comparando `req.user.username !== process.env.ADMIN_USERNAME && req.user.username !== 'admin'`. Se um usuário com role `admin` tiver um username diferente (ex: "root"), o endpoint pode bloqueá-lo indevidamente; inversamente, a checagem é por string fixa, não por role no banco.

**Impacto:** Comportamento imprevisível dependendo dos usuários cadastrados; não segue o padrão RBAC dos demais endpoints admin (que consultam a tabela `roles`).

**Sugestão:** Alinhar à verificação de permissão padrão do `createAdminHandler()` ou verificar a role no banco, em vez de comparar username.

---

### 4.4 `admin.js` — Sem proteção server-side na página (toda a segurança depende do client)

**Arquivo:** `/pages/admin.js`

**Problema:** A página trata a autenticação via `useState(isAuthenticated)` no cliente. O acesso às APIs é protegido no servidor, mas a **página** em si `pages/admin.js` não tem verificação server-side (ex: `getServerSideProps` com redirect se não autenticado). Qualquer usuário pode acessar `/admin` e ver a tela de login; a proteção real depende inteiramente das APIs.

**Impacto:** Baixo risco prático (as APIs protegem os dados), mas a página renderiza mesmo sem sessão, e não há redirect/SSR guard.

**Sugestão:** Considerar SSR guard no `admin.js` (validar cookie no servidor e redirecionar) ou aceitar explicitamente a arquitetura client-side atual e documentá-la.

---

## 5. Performance

### 5.1 `index.js` — Timestamp na URL da imagem anula o cache

**Arquivo:** `/pages/index.js`, linha 17

**Problema:** A URL da imagem hero usa `?t=${Date.now()}` para evitar Hydration Mismatch:
```js
setImageSrc(`/api/placeholder-image?t=${Date.now()}`);
```
Isso invalida o cache agressivo definido no endpoint (`max-age=86400, immutable`), pois cada carregamento gera uma query string nova.

**Impacto:** Uma nova requisição HTTP para a mesma imagem a cada carregamento de página; o `ETag`/`immutable` do endpoint são anulados.

**Sugestão:** Usar estratégia diferente para resolver o mismatch — por exemplo, definir a URL estável no SSR e atualizar apenas quando o usuário fizer upload de nova imagem, ou detectar a imagem via server-side.

**Status:** ✅ Implementado — o timestamp foi removido (`/pages/index.js` usa URL estável) e o endpoint `/api/placeholder-image` ganhou cache em memória do filename resolvido (TTL 5 min), `Last-Modified` estável (baseado no `mtime`) e resposta `304` via `If-None-Match` sem reler o arquivo.

---

### 5.2 `admin.js` — `handleSaveSettings` faz duas requisições HTTP

**Arquivo:** `/pages/admin.js`, linhas 303-343

**Problema:** Para salvar título e subtítulo, o código executa **dois `fetch('/api/settings')` sequenciais** (um para `site_title`, outro para `site_subtitle`).

**Impacto:** Dobra o tempo da operação (autenticação + validação + log + invalidação de cache em cada uma) e expõe risco de estado parcial (título salvo, subtítulo falhou).

**Sugestão:** Ou executar as duas requisições em paralelo com `Promise.all`, ou (melhor) permitir envio de múltiplas configurações em uma única chamada ao endpoint `/api/settings`.

---

### 5.3 `index.js` — Cache em `sessionStorage` com TTL curto e por aba

**Arquivo:** `/pages/index.js`

**Problema:** O cache de configurações em `sessionStorage` tem TTL de 1 minuto e é **por aba** do navegador (é limpo ao fechar a aba; não persiste entre abas).

**Impacto:** Cada nova aba dispara nova requisição; o TTL curto reduz o benefício do cache.

**Sugestão:** Avaliar `localStorage` com TTL maior, ou um estado global gerenciado (Context), se o frescor permitir.

---

### 5.4 `_document.js` — Preconnects para domínios nem sempre usados

**Arquivo:** `/pages/_document.js`

**Problema:** O documento faz preconnect/dns-prefetch para 6 domínios (Google Fonts×2, YouTube×2, Spotify×2) em **todas** as páginas. Páginas que não exibem músicas/vídeos (home simples, blog, admin) abrem conexões desnecessárias.

**Impacto:** Conexões TCP+TLS abertas sem necessidade, principalmente em mobile/rede lenta.

**Sugestão:** (Já foi parcialmente tratado em 12/05/2026, quando preconnects foram reduzidos; hoje voltaram a existir 6 domínios.) Mover preconnects de YouTube/Spotify para as páginas/componentes que realmente os usam (galeria de vídeos, galeria de músicas), mantendo apenas Google Fonts no `_document.js`.

---

### 5.5 `integrity.js` — Recursão síncrona para calcular tamanho de uploads

**Arquivo:** `/pages/api/admin/integrity.js`

**Problema:** `calculateSize()` usa `fs.readdirSync`/`fs.statSync` recursivos de forma **síncrona** sobre `public/uploads`. Com muitos arquivos, bloqueia o event loop do Node durante o diagnóstico.

**Impacto:** Endpoint de diagnóstico pode travar o servidor Node temporariamente se a pasta de uploads crescer.

**Sugestão:** Usar versões assíncronas (`fs.promises.readdir`, `fs.promises.stat`) ou limitar a profundidade/quantidade de arquivos escaneados.

---

## 6. Manutenibilidade e Padronização

### 6.1 `admin.js` — Arquivo excessivamente grande (780 linhas)

**Arquivo:** `/pages/admin.js`

**Problema:** O painel concentra: lógica de autenticação, upload/crop de imagem, mapeamento de 4 CSS Modules, dezenas de estilos inline, 10 blocos condicionais de abas (+4 sub-abas de segurança) e o formulário de cabeçalho. É o maior arquivo da pasta `/pages` e da aplicação.

**Impacto:** Dificuldade de navegação, manutenção e testes. Qualquer mudança pequena exige localizar o ponto em 780 linhas.

**Sugestão:** Extração em componentes (ex: `AdminLogin`, `AdminHeaderConfig`, `AdminImageUploader`, `AdminImageCrop`), mantendo `admin.js` apenas como orquestrador de abas e estado.

---

### 6.2 `admin.js` — 10 blocos condicionais de abas repetidos

**Arquivo:** `/pages/admin.js`, linhas 446-544 e 547-776

**Problema:** Cada aba tem um bloco `{hasPermission('X') && (<button>...)}` na barra e outro `{activeTab === 'x' && hasPermission('X') && (<AdminComponent />)}` no conteúdo. Adicionar uma nova aba exige alterar botões + conteúdo + permissões em pelo menos 3 lugares.

**Impacto:** Código verboso e propenso a erro (ex: a aba de produtos usa `activeTab === 'projetos02'` enquanto o rótulo é "Gestão de Produtos" — nome interno inconsistente).

**Sugestão:** Configuração declarativa de abas (array `{ key, label, icon, permission, component }`) e iteração para renderizar botões e conteúdos.

---

### 6.3 Nomenclatura inconsistente de rotas (pt/en)

**Arquivos:** `/pages/api/` inteiro

**Problema:** Mistura de português e inglês nas rotas de API:
- PT: `dicas.js`, `musicas.js`
- EN: `posts.js`, `videos.js`, `products.js`, `settings.js`, `status.js`, `upload-image.js`, `placeholder-image.js`

**Impacto:** Falta de padronização dificulta a descoberta e memorização das rotas para novos desenvolvedores.

**Sugestão:** Definir idioma padrão para nomes de rota. Como o domínio é cristão em português e o próprio código usa mensagens PT-BR, recomenda-se manter coerência ou documentar a convenção adotada.

---

### 6.4 `products.js` — `parseInt` sem validação Zod (padrão mais frágil que os demais CRUDs)

**Arquivo:** `/pages/api/products.js`

**Problema:** Enquanto `musicas.js` valida query com Zod e os CRUDs admin validam body com Zod, `products.js` usa apenas validação manual mínima (nome e preço obrigatórios no POST; sem validação de tipos no PUT). `updateProduct` recebe `req.body` inteiro sem sanitização.

**Impacto:** Dados mal formatados podem chegar à camada de domínio e ao banco.

**Sugestão:** Adicionar schemas Zod para criação/atualização de produtos, alinhando ao padrão dos demais CRUDs.

---

### 6.5 `role` padrão `'admin'` na criação de usuário

**Arquivo:** `/pages/api/admin/users.js`, linha 10

**Problema:** O schema `userCreateSchema` define `role: z.string().optional().default('admin')` — **novos usuários são criados como admin por padrão** no POST.

**Impacto:** Risco de segurança: se o formulário do painel não enviar `role`, o usuário criado vira administrador com acesso total, sem intenção explícita.

**Sugestão:** Alterar o default para `'user'` (papel restrito) e exigir `role` explícito para elevação de privilégio, com validação de que o `role` informado existe na tabela `roles`.

---

### 6.6 `settings.js` — Valores padrão hardcoded no endpoint

**Arquivo:** `/pages/api/settings.js`, linhas 68-74

**Problema:** Quando uma chave não existe no banco, o endpoint retorna valores padrão **hardcoded no arquivo da rota** (`site_name: 'Caminhar'`, `site_description`, `posts_per_page`, `videos_per_page`, `musicas_per_page`).

**Impacto:** Lógica de negócio embutida na camada de API; valores podem divergir das configurações reais semeadas no banco (ex: `scripts/seed-settings.js`).

**Sugestão:** Mover os defaults para a camada de domínio (`lib/domain/settings.js`) ou para o seed, evitando duplicidade de fonte de verdade.

---

### 6.7 `backups.js` e `integrity.js` — Lógica de listagem de arquivos duplicada

**Arquivos:**
- `/pages/api/admin/backups.js` (lista arquivos de `data/backups` com `.sql/.gz/.enc`)
- `/pages/api/admin/integrity.js` (lista os mesmos arquivos, com `.sql/.dump/.gz/.enc`)

**Problema:** Ambas leem `data/backups`, filtram por extensão e ordenam por data, mas com filtros levemente diferentes (`.dump` presente só no integrity) e estruturas de metadados distintas.

**Impacto:** Duplicidade de lógica de leitura do diretório de backups com pequenas divergências.

**Sugestão:** Extrair um helper comum (ex: `listBackupFiles()`) em `lib/` ou `scripts/utils/` usado pelos dois endpoints.

---

### 6.8 `design-system.js` — Dependência externa de placeholder

**Arquivo:** `/pages/design-system.js`, linha 194

**Problema:** O Card com mídia usa `https://via.placeholder.com/400x200/...` (serviço externo).

**Impacto:** Se o serviço via.placeholder estiver indisponível/offline, a demo de card com imagem quebra.

**Sugestão:** Usar o endpoint interno `/api/placeholder-image` ou um SVG inline, eliminando a dependência externa.

---

### 6.9 `fetch-ml.js` — Manipulação de strings de decodificação de HTML frágil

**Arquivo:** `/pages/api/admin/fetch-ml.js`, linhas 122 e 139

**Problema:** A limpeza de entidades HTML usa substituições parciais e específicas:
```js
title.replace(/"/g, '"').replace(/&#39;/g, "'").replace(/&/g, '&');
```
Além disso, há um possível problema de ordem: substituir `&` por `&` pode corromper entidades já decodificadas (ex: `&` → `&amp;` em casos de double-encoding).

**Impacto:** Títulos com entidades HTML complexas (ex: `&eacute;`, `&Aacute;`) podem não ser decodificados corretamente.

**Sugestão:** Usar um decodificador de entidades robusto (ex: `he` ou `entities` do npm) em vez de replace manual.

---

## 7. Pontos Irrelevantes ou Obsoletos

### 7.1 Seções de tokens removidas — documentação deve refletir

**Arquivos (removidos do projeto):**
- `/pages/styles/tokens/*.js` (11 arquivos)
- `/pages/styles/generateTokensCSS.js`

**Problema:** Não existem mais no disco. Documentos antigos (`docs/antigos/PROJECT_pages.md`) ainda os descrevem como arquivos ativos na seção 8.

**Impacto:** Confusão para quem consulta a documentação antiga.

**Sugestão:** A documentação atual (`docs/PROJECT_pages.md`) já os marca como removidos — manter assim e não recriá-los a partir dos docs antigos.

### 7.2 Rota `?response=v1` — legado transitório

**Arquivos:** `/pages/api/posts.js`, `/pages/api/settings.js`

**Problema:** A compatibilidade `?response=v1` existe para clientes que migraram de `/api/v1/*` (removido em 13/05/2026). Se nenhum cliente externo utiliza, é código morto.

**Sugestão:** Auditar se há consumidores externos de `?response=v1`; se não houver, considerar remoção futura para simplificar.

---

## Resumo das Recomendações

| Prioridade | Item | Arquivo(s) | Descrição |
|:----------:|:----:|:----------:|-----------|
| 🔴 Alta | 1.1 | `admin/users.js` | `await await` duplicado (3 ocorrências) |
| 🔴 Alta | 1.2 | `admin/backups.js` | Import sem extensão `.js` no padrão ESM |
| 🔴 Alta | 4.3 | `cleanup-test-data.js` | Verificação de admin por username em vez de role |
| 🔴 Alta | 6.5 | `admin/users.js` | Default `role: 'admin'` na criação de usuário — risco de privilégio acidental |
| 🟠 Média | 1.3 | `api/posts.js` | Invalidação de cache redundante (3 chamadas) |
| 🟠 Média | 1.4 | `api/auth/check.js` | 405 sem header `Allow` |
| 🟠 Média | 2.1 | `admin/fetch-*.js` | `fetchWithTimeout()` e `urlSchema` duplicados em 3 arquivos |
| 🟠 Média | 2.2 | `api/posts.js`, `api/videos.js` | Paginação manual em vez de usar `helper/pagination.js` |
| 🟠 Média | 2.3 | `admin/posts.js`, `admin/musicas.js`, `admin/videos.js` | Padrão `reorder` triplicado com abordagens diferentes |
| 🟠 Média | 2.4 | `admin.js` | Funções de imagem embutidas (~58 linhas) sem reuso |
| 🟠 Média | 2.5 | `admin.js` | 4 CSS Modules mapeados manualmente + estilos inline |
| 🟠 Média | 3.1 | `api/products.js` | Fora do padrão `createAdminHandler()`; sem Zod |
| 🟠 Média | 3.2 | `api/auth/check.js` | Não usa `withAuth` |
| 🟠 Média | 3.3 | Endpoints públicos | Rate limit dentro vs antes do cache inconsistente |
| 🟠 Média | 3.4 | Endpoints públicos | Cache-Control com 3 políticas diferentes |
| 🟠 Média | 3.5 | Endpoints públicos | Formato de resposta de sucesso não uniforme |
| 🟠 Média | 4.1 | `admin.js` | `console.log` do objeto user completo no navegador |
| 🟠 Média | 4.2 | `admin/rate-limit.js` | `current_ip` confia em `x-forwarded-for` sem spoofing check |
| 🟠 Média | 5.1 | `index.js` | Timestamp na URL anula cache da imagem hero |
| 🟠 Média | 5.5 | `admin/integrity.js` | `fs.readdirSync`/`statSync` recursivo bloqueia event loop |
| 🟠 Média | 6.2 | `admin.js` | 10 blocos condicionais de abas + sub-abas |
| 🟠 Média | 6.4 | `api/products.js` | Sem validação Zod em POST/PUT |
| 🟠 Média | 6.6 | `api/settings.js` | Defaults hardcoded na camada de rota |
| 🟠 Média | 6.7 | `admin/backups.js`, `admin/integrity.js` | Lógica de listagem de backups duplicada |
| 🟡 Baixa | 2.6 | `admin.js` | Bloco `<style>` de scroll duplicado + `!important` |
| 🟡 Baixa | 2.7 | `styles/variables.css` | `--shadow-glow` duplicado |
| 🟡 Baixa | 5.2 | `admin.js` | Duas requisições para salvar configurações |
| 🟡 Baixa | 5.3 | `index.js` | Cache sessionStorage TTL curto e por aba |
| 🟡 Baixa | 5.4 | `_document.js` | Preconnects para domínios não usados em todas as páginas |
| 🟡 Baixa | 6.1 | `admin.js` | Arquivo muito grande (780 linhas) |
| 🟡 Baixa | 6.3 | `/pages/api/` | Nomenclatura pt/en inconsistente |
| 🟡 Baixa | 6.8 | `design-system.js` | Placeholder externo via.placeholder.com |
| 🟡 Baixa | 6.9 | `admin/fetch-ml.js` | Decodificação de entidades HTML via replace manual frágil |
| 🟢 Observação | 7.1 | `styles/tokens/*`, `generateTokensCSS.js` | Arquivos removidos — não recriar |
| 🟢 Observação | 7.2 | `api/posts.js`, `api/settings.js` | Check de uso da compat `?response=v1` |

---

## Pontos de Atenção Técnica para Revisão Futura (Resumo Rápido)

1. **`admin/users.js`** — `await await` (3x) + default `role='admin'` — **correção prioritária**.
2. **`admin/backups.js`** — import ESM sem extensão — risco de runtime error.
3. **`api/products.js`** — único CRUD fora do factory admin e sem Zod — inconsistência significativa.
4. **`admin/rate-limit.js`** — leitura de IP sem a proteção anti-spoofing padrão do projeto — falha de confiança na ferramenta.
5. **`api/auth/check.js`** — documentação anterior dizia "usa `withAuth`", mas o código atual não usa — a documentação foi corrigida neste levantamento.
6. **Duplicidade `fetchWithTimeout` + `urlSchema`** nos 3 fetchers — oportunidade clara de extração para `lib/`.
7. **Padrão híbrido de rate limit** (dentro vs antes do cache) — precisa de decisão de arquitetura única.
8. **Cache-Control** (300s vs 120s vs 86400s) — precisa de política centralizada e documentada.

---

## Implementações Aplicadas

### `pages/api/admin/dicas.js` — invalidação de cache no POST e no DELETE

**Descrição:** O CRUD administrativo de dicas passou a invalidar o cache público `dicas:public:*` também no POST (após o `INSERT`) e no DELETE (após o `DELETE`), alinhando-se ao PUT que já invalidava. Dica criada ou excluída no Painel Administrativo passa a refletir imediatamente na página pública, independentemente do TTL do cache.

> 📝 Este documento é analítico — as seções 1–7 servem como guia para futuras refatorações e correções; a seção "Implementações Aplicadas" registra as implementações realizadas após a elaboração deste relatório.
