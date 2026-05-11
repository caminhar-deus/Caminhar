# Relatório de Melhorias e Correções - `/pages`

> **Data:** 11/05/2026 (atualizado)
> **Objetivo:** Reportar problemas de duplicidade, inconsistências, oportunidades de melhoria de performance e correções necessárias nos arquivos da pasta `/pages`. Nenhuma correção deve ser aplicada; apenas reportar.

---

## Sumário

1. [Duplicidade de Código](#1-duplicidade-de-código)
2. [Inconsistências Arquiteturais](#2-inconsistências-arquiteturais)
3. [Problemas de Performance](#3-problemas-de-performance)
4. [Fragilidade e Falta de Validação](#4-fragilidade-e-falta-de-validação)
5. [Manutenibilidade e Padronização](#5-manutenibilidade-e-padronização)
6. [Segurança](#6-segurança)

---

## 1. Duplicidade de Código

### 1.1 Endpoints de Login Duplicados

**Arquivos:** 
- `/pages/api/auth/login.js`
- `/pages/api/v1/auth/login.js`

**Problema:** Duas implementações de login que fazem essencialmente a mesma coisa, mas com diferenças:
- `api/auth/login.js`: usa rate limiting por IP, retorna cookie JWT
- `api/v1/auth/login.js`: **não** tem rate limiting, retorna token JWT no corpo da resposta

**Impacto:** Manutenção em dobro, risco de dessincronização de regras de negócio. A versão v1 é menos segura por não ter rate limiting.

**Sugestão:** Unificar em um único endpoint de autenticação, com rate limiting em ambos e comportamento consistente.

---

### 1.2 Endpoints de Posts Duplicados

**Arquivos:**
- `/pages/api/posts.js` (raiz)
- `/pages/api/admin/posts.js` (admin)
- `/pages/api/v1/posts.js` (v1)

**Problema:** Três implementações diferentes para gerenciamento de posts:
- `api/posts.js`: GET público com cache e rate limiting
- `api/admin/posts.js`: CRUD completo para admin
- `api/v1/posts.js`: GET público com cache + POST autenticado

**Sobreposição:** `api/posts.js` e `api/v1/posts.js` fazem a mesma coisa (GET público). `api/v1/posts.js` e `api/admin/posts.js` fazem POST de post, mas com implementações diferentes.

**Impacto:** Complexidade desnecessária. Uma única rota de API poderia atender todos os casos com diferentes middlewares.

**Sugestão:** Consolidar em um único endpoint `/api/posts` com middlewares condicionais.

---

### 1.3 Páginas de Post Duplicadas (Conflito de Rotas)

**Arquivos:**
- `/pages/[slug].js` (rota catch-all)
- `/pages/blog/[slug].js` (rota específica do blog)

**Problema:** Ambas as páginas renderizam posts do blog, mas:
- `[slug].js`: faz query direta ao banco de dados via `query()` da `lib/db.js`
- `blog/[slug].js`: faz fetch HTTP para `/api/posts?slug=x`

**Conflito de rotas no Next.js:** Uma rota catch-all `[slug]` pode interceptar requisições destinadas a outras rotas, causando comportamento imprevisível.

**Impacto:** Manutenção duplicada, risco de conflito de rotas, abordagens diferentes para o mesmo problema.

**Sugestão:** Remover uma das páginas e padronizar o método de obtenção de dados.

---

### 1.4 Endpoints de Configurações Duplicados

**Arquivos:**
- `/pages/api/settings.js`
- `/pages/api/v1/settings.js`

**Problema:** Ambos gerenciam configurações, mas com capacidades diferentes:
- `api/settings.js`: GET público + PUT protegido (validação Zod simples)
- `api/v1/settings.js`: GET + POST + PUT (validação Zod, controle de permissões admin/editor)

**Impacto:** A versão v1 tem mais funcionalidades que a versão raiz, causando inconsistência.

**Sugestão:** Centralizar toda a lógica de configurações em um único endpoint.

---

### 1.5 Health Check vs Status

**Arquivos:**
- `/pages/api/v1/health.js`
- `/pages/api/v1/status.js`

**Problema:** Dois endpoints de diagnóstico:
- `health.js`: retorna apenas `{ status: 'ok' }` (4 linhas)
- `status.js`: retorna informações detalhadas (Node, uptime, DB, etc.)

**Impacto:** Endpoint `health.js` é tão minimalista que oferece pouco valor. Poderia ser incorporado ao `status.js` ou eliminado.

**Sugestão:** Unificar em um único endpoint `/api/v1/status` que retorne health check + diagnóstico.

---

### 1.6 Padrão Repetido de CRUD nos Endpoints Admin

**Arquivos:** Todos em `/pages/api/admin/` (14 arquivos)

**Problema:** Cada endpoint admin implementa manualmente o padrão GET/POST/PUT/DELETE com verificações de método HTTP, autenticação e operações de banco de dados. Há muita repetição de código (verificação de método, resposta 405, tratamento de erros try/catch, etc.).

**Impacto:** Qualquer mudança no padrão de autenticação ou tratamento de erros exige alteração em 14 arquivos.

**Sugestão:** Criar um handler factory ou middleware genérico para CRUD admin.

---

## 2. Inconsistências Arquiteturais

### 2.1 Modelos de Autenticação Misturados

**Problema:** O projeto usa diferentes abordagens de autenticação:
- `withAuth` middleware (em `api/upload-image.js`, `api/cleanup-test-data.js`, etc.)
- `authenticate()` + `generateToken()` + `setAuthCookie()` (em `api/auth/login.js`)
- Verificação manual de JWT com `getAuthToken()` + `verifyToken()` (em `api/v1/auth/check.js`)
- `authenticate()` + retorno de token no body (em `api/v1/auth/login.js`)

**Impacto:** Dificulta a manutenção e aumenta a superfície de bugs relacionados a autenticação.

**Sugestão:** Padronizar todo o fluxo de autenticação: usar `withAuth` como middleware padrão para rotas protegidas.

---

### 2.2 Cache com Implementações Diferentes

**Problema:** O cache é implementado de forma inconsistente:
- `api/musicas.js`: usa `getCachedData()` / `setCachedData()` diretamente
- `api/posts.js`, `api/videos.js`, `api/products.js`: usam cache + rate limiting como middleware

**Impacto:** Comportamento de cache diferente para endpoints similares. Manutenção duplicada.

**Sugestão:** Unificar a estratégia de cache em um middleware único.

---

### 2.3 Rate Limiting Aplicado de Forma Inconsistente

**Arquivos:**
- `api/posts.js`, `api/videos.js`, `api/products.js`: têm rate limiting (apenas em mutações no products.js)
- `api/musicas.js`, `api/dicas.js`, `api/settings.js`: **não** têm rate limiting
- `api/auth/login.js`: tem rate limiting por IP (5 tentativas/min)
- `api/v1/auth/login.js`: **não** tem rate limiting

**Item corrigido (11/05):** `api/products.js` — GET público (`?public=true`) agora permite requisições sem autenticação. A autenticação foi movida para dentro do switch/case, sendo exigida apenas em POST, PUT e DELETE. GET público ignora verificação de token.

**Impacto:** Alguns endpoints públicos estão desprotegidos contra abuso.

**Sugestão:** Aplicar rate limiting universalmente em todos os endpoints públicos.

---

### 2.4 Paginação Implementada de Forma Diferente

**Problema:** Cada endpoint implementa paginação manualmente:
- `api/posts.js`: slice manual com `(page - 1) * limit`
- `api/musicas.js`: query SQL com `OFFSET` e `LIMIT`
- `api/videos.js`: slice manual
- `api/dicas.js`: sem paginação (limite fixo de 100)
- `api/products.js`: slice manual

**Impacto:** Código duplicado e comportamentos potencialmente diferentes.

**Sugestão:** Criar um helper de paginação reutilizável.

---

### 2.5 Tratamento de Erros sem Padronização

**Problema:** Respostas de erro têm formatos diferentes:
- Alguns retornam `{ error: 'message' }`
- Outros retornam `{ error, message, timestamp }`
- Outros retornam apenas status code sem body
- Mensagens em português e inglês misturadas

**Impacto:** Dificulta o consumo da API por clients.

**Sugestão:** Definir um formato padrão de resposta de erro com código, mensagem e timestamp.

---

## 3. Problemas de Performance

### 3.1 CSS Crítico Inline Chamado em Toda Requisição

**Arquivo:** `/pages/_document.js`

**Problema:** A função `extractCriticalCSS()` é chamada a cada renderização do lado do servidor, potencialmente executando lógica pesada de parsing de CSS.

**Impacto:** Aumenta o tempo de resposta de cada requisição.

**Sugestão:** Pré-calcular o CSS crítico em build time e armazenar em cache.

---

### 3.2 Pré-carregamento de Fontes sem Estratégia de Fallback

**Arquivo:** `/pages/_document.js`

**Problema:** As fontes Montserrat e Inter são pré-carregadas com `preload`, mas não há estratégia de fallback caso o download falhe.

**Impacto:** FOIT (Flash of Invisible Text) se as fontes não carregarem.

**Sugestão:** Implementar font-display: swap ou fallback com fontes do sistema.

---

### 3.3 Múltiplos Preconnects sem Verificação de Necessidade

**Arquivo:** `/pages/_document.js`

**Problema:** São feitos preconnects para 6 domínios diferentes (Google Fonts, YouTube, Spotify, etc.) mesmo que a página atual não utilize todos eles.

**Impacto:** Conexões desnecessárias consumindo recursos do navegador.

**Sugestão:** Aplicar preconnect condicional baseado no conteúdo da página.

---

### 3.4 Fetch para API Interna em Server-Side

**Arquivos:**
- `/pages/blog/index.js` - faz `fetch('http://.../api/posts')` no servidor
- `/pages/blog/[slug].js` - faz `fetch('http://.../api/posts?slug=x')` no servidor

**Problema:** Em `getServerSideProps`, as páginas do blog fazem uma requisição HTTP local para a própria API, em vez de chamar a função de banco de dados diretamente. Isso adiciona latência de rede (localhost) e overhead de HTTP.

**Impacto:** Aumenta o tempo de resposta e adiciona pontos de falha desnecessários. Contraste com `[slug].js` que faz query direta ao banco.

**Sugestão:** Chamar a função de banco de dados diretamente no `getServerSideProps` ou usar um helper compartilhado.

---

### 3.5 TagManager Inline (_document.js)

**Arquivo:** `/pages/_document.js`

**Problema:** Scripts do Google TagManager são injetados inline no HTML, bloqueando a renderização.

**Impacto:** Impacta negativamente o Core Web Vitals (LCP).

**Sugestão:** Usar `next/script` com estratégia `afterInteractive` ou `lazyOnload`.

---

## 4. Fragilidade e Falta de Validação

### 4.1 Ausência de Sanitização em Upload de Imagem

**Arquivo:** `/pages/api/upload-image.js`

**Problema:** O nome original do arquivo é preservado no nome salvo (com timestamp prefixado). Não há verificação de conteúdo real do arquivo (apenas extensão). Não há limite de resolução.

**Impacto:** Risco de upload de arquivos maliciosos com extensão falsa. Possível ataque de sobrescrita se nomes coincidirem.

**Sugestão:** Validar o tipo MIME real do arquivo, gerar nome aleatório seguro e verificar dimensões.

---

### 4.2 Fallback Silencioso sem Dados

**Arquivo:** `/pages/blog/index.js`

**Problema:** Se a API de posts falhar, o fallback retorna `posts: []`, `currentPage: 1` sem nenhum aviso ao usuário.

**Impacto:** Usuário vê uma página de blog vazia sem entender o motivo.

**Sugestão:** Adicionar um estado de erro ou mensagem amigável quando a API falhar.

---

### 4.3 Validação Zod Inconsistente

**Problema:** Alguns endpoints usam validação Zod (`api/musicas.js`, `api/settings.js`, `api/v1/posts.js`, `api/v1/settings.js`), mas a maioria dos endpoints admin **não** usa validação nos dados de entrada.

**Impacto:** Dados mal formatados podem corromper o banco de dados.

**Sugestão:** Aplicar validação Zod em todos os endpoints que recebem dados do usuário.

---

### 4.4 Query SQL sem Prepared Statements

**Arquivo:** `/pages/[slug].js`

**Problema:** A query `SELECT * FROM posts WHERE slug = '${slug}' AND published = true` usa interpolação de string, vulnerável a SQL injection.

**Impacto:** Risco crítico de segurança.

**Sugestão:** Usar parâmetros preparados (placeholder `$1`) na query SQL.

---

### 4.5 Ausência de Tratamento para Timeout de API Externa

**Arquivos:**
- `/pages/api/admin/fetch-ml.js`
- `/pages/api/admin/fetch-spotify.js`
- `/pages/api/admin/fetch-youtube.js`

**Problema:** As chamadas a APIs externas (Letras.mus.br, Spotify, YouTube) não têm configuração explícita de timeout.

**Impacto:** Uma API externa lenta pode travar o endpoint Next.js, consumindo recursos do servidor.

**Sugestão:** Adicionar timeout com `AbortController` (ex: 5-10 segundos).

---

## 5. Manutenibilidade e Padronização

### 5.1 Tags Padrão Repetidas nos Endpoints Admin

**Arquivos:** Todos em `/pages/api/admin/`

**Problema:** Praticamente todos os endpoints admin repetem o bloco de verificação de método HTTP com retorno 405 e estrutura try/catch idêntica.

**Código repetido:**
```javascript
if (req.method !== 'GET') {
  return res.status(405).json({
    error: 'Method Not Allowed',
    message: 'Método não permitido'
  });
}
```

**Impacto:** Muito boilerplate, difícil de manter.

**Sugestão:** Criar helper `methodGuard(method)` ou usar um middleware que já trate o método.

---

### 5.2 Endpoints sem Versionamento Consistente

**Problema:** O projeto mistura endpoints sem versão (`/api/posts`) e versionados (`/api/v1/posts`), mas a lógica é essencialmente a mesma.

**Impacto:** Dúvida sobre qual endpoint usar. Manutenção duplicada entre versões.

**Sugestão:** Definir uma estratégia clara de versionamento e migrar gradualmente.

---

### 5.3 Nomenclatura Inconsistente de Rotas

**Problema:** Uso inconsistente de português e inglês:
- `/api/dicas.js` (português)
- `/api/posts.js` (inglês)
- `/api/musicas.js` (português)
- `/api/videos.js` (inglês)
- `/api/products.js` (inglês)

**Impacto:** Falta de padronização, confusão para desenvolvedores.

**Sugestão:** Definir um idioma padrão para nomes de rotas.

---

### 5.4 Tokens de Design Subutilizados

**Arquivos:** `/pages/styles/tokens/*.js` (11 arquivos)

**Problema:** Os tokens de design são definidos em arquivos JavaScript, mas os CSS Modules (`Home.module.css`, `DesignSystem.module.css`, `globals.css`) usam valores hardcoded em vez de referenciar os tokens.

**Impacto:** Mudanças de design exigem alterações em múltiplos arquivos. Os tokens perdem seu propósito.

**Sugestão:** Utilizar CSS Custom Properties (variáveis CSS) geradas a partir dos tokens, ou usar os tokens JS nos componentes de página.

---

### 5.5 Classes Utilitárias no CSS Global

**Arquivo:** `/pages/styles/globals.css`

**Classes definidas:** `.container`, `.btn`, `.btn-secondary`, `.input`, `.textarea`, `.form-group`, `.label`

**Problema:** Classes utilitárias em CSS global podem conflitar com CSS Modules ou bibliotecas de terceiros, causando estilos inesperados.

**Impacto:** Dificuldade de debug e possível vazamento de estilos.

**Sugestão:** Prefixar classes utilitárias (ex: `.g-container`, `.g-btn`) ou mover para um arquivo separado.

---

### 5.6 `overflow-y: scroll !important` Agressivo

**Arquivo:** `/pages/styles/globals.css`

**Problema:** `overflow-y: scroll !important` força a barra de rolagem vertical mesmo quando o conteúdo não ultrapassa a viewport, além do uso de `!important` que dificulta sobrescrita.

**Impacto:** Aparecimento desnecessário de barra de rolagem em páginas com pouco conteúdo.

**Sugestão:** Usar `overflow-y: auto` ou aplicar a regra seletivamente.

---

## 6. Segurança

### 6.1 Exposição de Informações em Log de Desenvolvimento

**Arquivo:** `/pages/_app.js`

**Problema:** O log `Route changed to: ${url}` em modo desenvolvimento fica ativo. Embora seja apenas em dev, a condição `process.env.NODE_ENV === 'development'` pode ser contornada.

**Impacto:** Baixo risco, mas boa prática remover logs sensíveis.

**Sugestão:** Remover logs de desenvolvimento ou usar um logger configurável.

---

### 6.2 Cookie de Logout sem Configuração Segura

**Arquivo:** `/pages/api/auth/logout.js`

**Problema:** O cookie é limpo com `Expires=Thu, 01 Jan 1970` mas sem as mesmas opções seguras usadas na criação (`httpOnly`, `secure`, `sameSite`, `path`).

**Impacto:** O cookie pode não ser limpo corretamente em todos os cenários.

**Sugestão:** Usar as mesmas opções de cookie da função `setAuthCookie` ao limpar.

---

### 6.3 Token JWT Retornado no Body vs Cookie

**Comparação:**
- `api/auth/login.js`: retorna cookie httpOnly (seguro)
- `api/v1/auth/login.js`: retorna token no corpo da resposta (menos seguro)

**Impacto:** Token exposto no body pode ser facilmente acessado por scripts ou logs.

**Sugestão:** Usar sempre cookie httpOnly para armazenar JWT.

---

## Resumo das Recomendações Prioritárias

| Prioridade | Item | Arquivos | Descrição |
|:----------:|:----:|:--------:|-----------|
| 🔴 Crítico | 4.4 | `[slug].js` | SQL injection - usar prepared statements |
| 🔴 Crítico | 4.3 | Múltiplos | Validação Zod ausente em endpoints admin |
| 🟠 Alto | 1.1 | `api/auth/login.js`, `api/v1/auth/login.js` | Login duplicado sem rate limiting no v1 |
| 🟠 Alto | 1.3 | `[slug].js`, `blog/[slug].js` | Conflito de rotas de página de post |
| 🟠 Alto | 3.4 | `blog/index.js`, `blog/[slug].js` | Fetch HTTP para API interna em SSR |
| 🟠 Alto | 5.4 | `styles/tokens/*.js` | Tokens não utilizados nos CSS |
| 🟡 Médio | 2.1 | Múltiplos | Modelos de autenticação misturados |
| 🟡 Médio | 2.2 | Múltiplos | Cache implementado de forma diferente |
| 🟡 Médio | 4.1 | `upload-image.js` | Sanitização de upload insuficiente |
| 🟡 Médio | 4.5 | `admin/fetch-*.js` | Timeout ausente em APIs externas |
| 🟢 Baixo | 5.5 | `globals.css` | Classes utilitárias sem prefixo |
| 🟢 Baixo | 5.6 | `globals.css` | `!important` agressivo no overflow |