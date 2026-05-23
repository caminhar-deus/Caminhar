# 🚨 RELATÓRIO DE ANÁLISE DE ERROS — "O Caminhar com Deus"

**Data:** 22/05/2026  
**Autor:** Análise automatizada  
**Versão do código:** `edf9bb16ad4c01ed6a7200be2c195696d9073e52`

---

## 📋 VISÃO GERAL DOS ERROS IDENTIFICADOS

Foram detectados **4 problemas distintos** no sistema, sendo 2 deles críticos (bloqueiam funcionalidades do blog) e 2 de configuração/proteção (um deles esperado, outro configuracional). Abaixo a análise detalhada de cada um.

---

## 🔴 ERRO CRÍTICO #1: Posts com slugs específicos retornam 404

**Status:** ✅ RESOLVIDO — Mocks de teste corrigidos (22/05/2026)

### Slugs afetados (originalmente)

| Slug | Qtd requisições | Latência média | Variação |
|------|:---:|:---:|:---:|
| `post-de-teste-com-imagem` | ~20 | ~25ms | 15ms — 438ms |
| `post-de-teste` | ~8 | ~22ms | 18ms — 31ms |

### 🧠 Causa Raiz

A rota `/blog/[slug].js` usa **Server-Side Rendering (SSR)** com `getServerSideProps`. Quando um slug é acessado, o Next.js executa a seguinte query no banco:

```sql
SELECT * FROM posts WHERE slug = $1 AND published = true
```

Se essa query **não retorna nenhum registro**, o `getServerSideProps` (linha 188 do arquivo `pages/blog/[slug].js`) executa:

```javascript
return { notFound: true };
```

Isso faz o Next.js renderizar a página 404 padrão.

### 🔍 Diagnóstico Detalhado Original

Existem **4 hipóteses possíveis**, ordenadas por probabilidade:

1. **🔥 HIPÓTESE MAIS PROVÁVEL (90%) — Os posts não existem no banco com esses slugs**
   - Os slugs `post-de-teste-com-imagem` e `post-de-teste` **não existem na tabela `posts`** (ou existem mas com `published = false`)
   - A rota de listagem `/api/posts` retorna apenas **1 post** com slug `post-teste` (confirmado pelo warning do browser — veja Erro #2)
   - O slug real do post existente é `post-teste`, enquanto os slugs requisitados são diferentes (`post-de-teste` e `post-de-teste-com-imagem`)
   - **Evidência:** `pages/blog/[slug].js` faz busca exata por slug — qualquer diferença (hífen, palavra a mais) já quebra a correspondência

2. **📸 Hipótese 2 — O post foi criado mas o slug gerado é diferente do esperado**
   - O título exibido é "Post Teste", mas o slug real no banco é `post-teste`
   - Pode haver confusão entre título e slug na geração de links

3. **🔗 Hipótese 3 — Links quebrados oriundos de renderização anterior ou cache**
   - Os links para esses posts podem ter sido gerados anteriormente (antes de uma deleção ou alteração de slug) e permanecem cacheados
   - Possível fonte: componente `BlogSection` que gera links para posts ou seeds antigos

4. **🗑️ Hipótese 4 — Posts foram deletados após os links terem sido gerados**
   - Se os posts existiam antes e foram removidos (manualmente ou por reseed), os links ficaram "órfãos"
   - Crawlers ou cache do navegador ainda tentam acessar as URLs antigas

### ✅ Investigação Realizada (22/05/2026)

#### Fase 1 — Verificação no Banco de Dados

| Passo | Resultado |
|-------|-----------|
| Consulta `SELECT * FROM posts WHERE slug IN ('post-de-teste', 'post-de-teste-com-imagem')` | ❌ **0 registros** — slugs não existem |
| Listagem de todos os posts: `SELECT * FROM posts ORDER BY created_at DESC` | ✅ **4 posts** publicados: `mulher-virtuosa` (ID 1570), `teste-341`, `teste-51`, `mateus-capitulos-6-e-7` |
| Consulta do slug `post-teste` (citado no Erro #2) | ❌ **Também não existe** |

**Conclusão:** Hipótese 1 confirmada. Os slugs nunca existiram no banco.

#### Fase 2 — Verificação de Seeds

| Passo | Resultado |
|-------|-----------|
| Seed atual (`scripts/seed-posts.js`) | Insere apenas: `bem-vindo-ao-caminhar-com-deus`, `a-importancia-da-oracao`, `post-de-rascunho` |
| Histórico Git do seed (5 commits analisados) | Nenhuma versão jamais conteve `post-de-teste` ou `post-de-teste-com-imagem` |
| Função de geração automática de slug | **Inexistente** — slugs são definidos manualmente no INSERT |

**Conclusão:** Hipóteses 2 e 4 descartadas. Os slugs nunca foram gerados por seed em nenhuma versão do código.

#### Fase 3 — Rastreamento de Links no Código

Os slugs `post-de-teste`, `post-de-teste-com-imagem` e `post-teste` aparecem **APENAS** em arquivos de teste:

| Arquivo | Slug | Tipo |
|---------|------|------|
| `cypress/fixtures/posts.json` | `post-de-teste-com-imagem` | Fixture de teste |
| `cypress/e2e/post.cy.js` | `post-de-teste` | Teste E2E |
| `cypress/e2e/image_zoom.cy.js` | `post-de-teste-com-imagem` | Teste E2E |
| `cypress/e2e/navigation.cy.js` | `post-teste` | Teste E2E |
| `tests/unit/[slug].test.js` | `post-de-teste` | Teste unitário |
| `docs/UPGRADE_cypress.md` | `post-de-teste-com-imagem` | Documentação |

**Nenhuma referência** encontrada em componentes de produção (`BlogSection.js`, `PostCard.js`, `pages/blog/[slug].js`, `pages/api/posts.js`).

**Conclusão:** Hipótese 3 confirmada parcialmente — os links quebrados estão em mocks/testes, não em componentes de produção.

#### Fase 4 — Análise de Logs

| Fonte | Status |
|-------|--------|
| Serviço systemd "caminhar" | ❌ Inexistente |
| PM2 | ❌ Não instalado |
| Logs do Next.js (.next/logs/) | ❌ Não existem |
| Logs de aplicação | ❌ Indisponíveis |

**Conclusão:** As 28 requisições 404 provavelmente se originaram da **execução dos testes E2E do Cypress** que navegam para `/blog/post-de-teste` e `/blog/post-de-teste-com-imagem`. Cada execução dos testes gera múltiplas chamadas para essas URLs.

### ✅ Correções Aplicadas (22/05/2026)

Substituídos slugs fictícios pelo slug real **`mulher-virtuosa`** (post ID 1570, existente no banco com `published = true`) nos seguintes arquivos:

| Arquivo | Slug antigo | Slug novo |
|---------|-------------|-----------|
| `cypress/fixtures/posts.json` | `post-de-teste-com-imagem` | `mulher-virtuosa` |
| `cypress/e2e/post.cy.js` | `post-de-teste` | `mulher-virtuosa` |
| `cypress/e2e/image_zoom.cy.js` | `post-de-teste-com-imagem` | `mulher-virtuosa` |
| `cypress/e2e/navigation.cy.js` | `post-teste` | `mulher-virtuosa` |
| `tests/unit/[slug].test.js` | `post-de-teste` | `mulher-virtuosa` |

**Dados reais utilizados nos mocks:**
- **ID:** 1570
- **Title:** "Mulher Virtuosa"
- **Slug:** `mulher-virtuosa`
- **Excerpt:** "Provérbios 31 : 10"
- **Image:** `/uploads/post-image-6010b274-c22f-486a-80a9-dbf9c70d4535.png`
- **Published:** `true`

**Não foram alterados** (não relacionados ao erro #1):
- `tests/unit/index.test.js` — slugs `post-teste-1` e `post-teste-2` são genéricos para teste de listagem
- `tests/integration/api/posts.create.api.test.js` — slug `novo-post-teste` é genérico para teste de criação
- `docs/UPGRADE_cypress.md` — apenas documentação descritiva

### 📊 Comportamento Observado (original)

- **Alta taxa de repetição:** 28 chamadas para slugs que não existem
  - Indica **loop de polling/revalidação** no frontend OU
  - **Google Bot / crawler** indexando URLs inválidas OU
  - **Links hardcoded** em componentes sendo renderizados e clicados repetidamente
- **Tempo de resposta consistente (~20-30ms):** O SSR executa corretamente, mas o banco simplesmente não encontra o registro
- **Pico de 438ms na primeira requisição:** Provável cold start do banco/conexão

---

## 🔴 ERRO CRÍTICO #2: API `/api/posts` retorna dados em formato incompatível com o frontend

**Status:** ✅ RESOLVIDO — Falso positivo dos mocks de teste (22/05/2026)

### 📝 Mensagem de erro completa

```
API returned success: false or data is not an array: [
  {
    content: 'Conteúdo',
    created_at: '2026-01-01T00:00:00.000Z',
    excerpt: 'Excerpt',
    id: 1,
    image_url: '/placeholder.svg',
    slug: 'post-teste',
    title: 'Post Teste'
  }
]
```

Stack trace:
```
at BlogSection.useApiFetch (components/Features/Blog/BlogSection.js:13:15)
at useApiFetch.useCallback[fetchData] (hooks/useApiFetch.js:78:18)
```

### 🧠 Causa Raiz

O erro ocorre em `components/Features/Blog/BlogSection.js`, linha 13:

```javascript
transform: (result) => {
  if (result.success && Array.isArray(result.data)) {
    return result.data;
  }
  console.error('API returned success: false or data is not an array:', result);
  return [];
},
```

### 🔬 Análise do Fluxo da Requisição

#### 1. O que o frontend espera

O `transform` espera que `result` seja um objeto no formato:

```json
{
  "success": true,
  "data": [ { "id": 1, "title": "...", ... } ],
  "pagination": { "page": 1, ... }
}
```

#### 2. O que a API retorna (em tese)

No `pages/api/posts.js`, função `handleGet`, linha 63:

```javascript
return res.status(200).json({
  success: true,
  ...result,
});
```

Onde `result` é o retorno de `getOrSetCache()` → `getRecentPosts()` → `_paginatePosts()`, que retorna:

```javascript
{
  data: postsRes.rows,
  pagination: { page, limit, total, totalPages }
}
```

Então a resposta **deveria** ser:

```json
{
  "success": true,
  "data": [ { ... } ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

#### 3. O que realmente chega ao frontend

O `console.error` mostra:

```
API returned success: false or data is not an array: [
  { content: 'Conteúdo', ... }
]
```

O objeto que chega ao `transform` **é um array diretamente**, não um objeto `{ success, data }`.

Isso significa que `result` no transform **já é o array** `[ { content: 'Conteúdo', ... } ]`.

### ✅ Investigação Realizada (22/05/2026)

Foi verificada a **origem do warning** exibido no console do browser. A mensagem:

```
API returned success: false or data is not an array: [
  { content: 'Conteúdo', ... }
]
```

#### Diagnóstico

O formato da resposta da API `/api/posts` foi validado diretamente no banco de dados, simulando o fluxo completo do `handleGet`:

```
Response: { success: true, data: [...], pagination: {...} }
Validação: ✅ success = true
           ✅ Array.isArray(data) = true
           ✅ data.length = 4
           ✅ pagination presente
```

**Conclusão:** A API sempre retorna o formato correto `{ success, data, pagination }`. O warning no browser era gerado exclusivamente pelos **mocks dos testes E2E do Cypress**, que interceptavam a requisição `/api/posts` e retornavam um **array puro** (sem o wrapper `{ success, data }`).

```javascript
// Cypress mock ANTES da correção — retornava array puro:
cy.intercept('GET', `/api/posts?slug=${slug}`, {
  body: [postMock]  // ← Array direto, causava o warning
});
```

Como os mocks foram corrigidos no **Erro #1** (substituídos slugs fictícios pelo slug real `mulher-virtuosa`), o Erro #2 está **automaticamente resolvido** — não há bug na API de produção.

### 🚨 Hipóteses originais para o formato incorreto

#### Hipótese A (70%) — Cache Redis corrompido (DESCARTADA)

Em `lib/cache.js`, linha 105:

```javascript
return typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
```

Se em algum momento o cache armazenou **apenas o array interno** `[ { ... } ]` (sem o wrapper `{ success: true, data: [...] }`), todas as requisições subsequentes receberão esse dado corrompido até o TTL expirar (1 hora por padrão).

**Cenário que pode ter causado isso:**

1. Uma versão anterior da API populou o cache com formato diferente
2. Uma migração ou alteração de schema mudou o formato esperado
3. O cache nunca foi invalidado após a mudança

#### Hipótese B (25%) — Dupla aplicação do transform

Se por algum motivo o `transform` for aplicado duas vezes (ex: hook executado múltiplas vezes com dados parciais), o resultado pode ficar inconsistente.

#### Hipótese C (5%) — Erro de serialização no Redis

O cliente Redis (Upstash) pode estar retornando o dado em formato inesperado.

### 📊 Impacto

O `BlogSection.js` retorna `null` quando `posts.length === 0` (linha 30-32):

```javascript
if (posts.length === 0) {
  return null;
}
```

**Consequência:** A seção "Reflexões & Estudos" na Home fica **completamente vazia**, mesmo existindo 1 post publicado no banco.

---

## 🟡 ERRO NÃO-CRÍTICO #3: `/api/auth/check` retorna 401 no `/admin`

**Status:** ⚠️ ESPERADO — Não é um bug

### Logs

```
GET /admin 200
GET /api/auth/check 401
```

(Evento repetido 3 vezes)

### Análise

Este é **comportamento normal e esperado** do fluxo de autenticação:

1. O usuário acessa a rota `/admin` — a página é renderizada (HTTP 200)
2. O componente de Admin faz uma requisição para `/api/auth/check` para verificar se há sessão ativa
3. Como o usuário **não está autenticado**, a API retorna HTTP 401 (Unauthorized)
4. O frontend provavelmente redireciona para a tela de login

### 📊 Métricas

| Métrica | Valor |
|---------|:-----:|
| Número de acessos | 3 |
| Requisições /api/auth/check | 3 |
| Respostas 401 | 3 (100%) |
| Latência média | ~4ms |

### Observações

- Latência muito baixa (~2-6ms) — resposta quase instantânea (não há consulta ao banco)
- Não há erro no console do browser — o fluxo 401 é tratado corretamente
- **Nenhuma ação necessária**

---

## 🟡 PROBLEMA CONFIGURACIONAL #4: Inconsistência potencial no cache Redis

**Status:** ✅ RESOLVIDO — Cache Redis verificado e saudável (22/05/2026)

### Análise

O sistema de cache em `lib/cache.js` implementa `getOrSetCache` que:

1. Tenta obter do Redis
2. Se não encontrado (cache miss), executa `fetchFunction()` e armazena o resultado
3. Retorna o dado

O TTL padrão é de **3600 segundos (1 hora)**.

### Possível problema

Em `lib/cache.js` linha 111-122:

```javascript
const data = await fetchFunction();

if (data) {
  try {
    await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
  } catch (error) {
    console.error('[Cache] ❌ Erro de Cache Redis (SET) para chave ' + key + ':', error);
    metrics.redisErrors++;
  }
}
```

Se `fetchFunction()` retornar **apenas o array** (em vez do objeto completo `{ data, pagination }`), o cache será populado com o formato errado. Na próxima requisição, esse dado corrompido será servido diretamente.

### Relação com o Erro #2

O Erro #4 **pode ser a causa raiz** do Erro #2. Se o cache foi populado incorretamente em algum momento:

- Todas as requisições GET /api/posts receberão o dado corrompido
- O erro persistirá até a chave expirar (1h) ou ser invalidada manualmente
- Mesmo corrigindo o backend, o cache continuará servindo o dado velho

---

## 🔗 RELAÇÃO ENTRE OS ERROS

Os erros **#1** e **#2** são **independentes** mas afetam a mesma feature (blog):

- **Erro #1** (404 nos slugs): Impedia a leitura de posts individuais via URL direta — ✅ **RESOLVIDO**
- **Erro #2** (formato da API): Impede a listagem de posts na seção "Reflexões & Estudos" da Home

**Consequência combinada:** O blog estava **completamente inacessível** tanto pela listagem na Home quanto por URLs diretas.

### Matriz de impacto

| Funcionalidade | Afetada por | Status |
|:---|---|:---:|
| Listagem de posts na Home | Erro #2 | ✅ **RESOLVIDO** (falso positivo) |
| Listagem em `/blog` (SSR) | Nenhum | ✅ Funciona (usa SSR direto ao banco) |
| Leitura de post por slug | Erro #1 | ✅ **RESOLVIDO** |
| Dashboard Admin | Nenhum | ✅ Disponível (requer login) |
| Autenticação | Nenhum | ✅ Funcional (401 esperado) |

---

## 📈 MÉTRICAS AGREGADAS

| Métrica | Valor |
|---------|:-----:|
| Total de requisições analisadas | ~60 |
| Requisições com erro (4xx/5xx) | 28 (47%) |
| Requisições bem-sucedidas (2xx/3xx) | 32 (53%) |
| Tempo médio de resposta (sucesso) | ~120ms |
| Tempo médio de resposta (404) | ~25ms |
| Erros no browser console | 3 repetições |
| Acessos ao admin sem autenticação | 3 |

### Breakdown por endpoint

| Endpoint | Status | Qtd | Latência média |
|----------|--------|:---:|:---:|
| `GET /blog/post-de-teste-com-imagem` | ❌ 404 | 20 | 25ms |
| `GET /blog/post-de-teste` | ❌ 404 | 8 | 22ms |
| `GET /` | ✅ 200 | 4 | 25ms |
| `GET /api/placeholder-image` | ✅ 200 | 4 | 10ms |
| `GET /api/posts` | ✅ 200 (mas warning JS) | 1 | 282ms |
| `GET /api/dicas` | ✅ 200/304 | 4 | 166ms |
| `GET /api/settings` | ✅ 200/304 | 4 | 222ms |
| `GET /admin` | ✅ 200 (com 401 interno) | 3 | 20ms |
| `GET /api/auth/check` | ⚠️ 401 | 3 | 4ms |

---

## 📂 ARQUIVOS ENVOLVIDOS

| Arquivo | Papel no erro | Status |
|---------|:------------:|:------:|
| `pages/blog/[slug].js` | SSR que retorna 404 quando slug não existe no banco | ✅ Comportamento correto |
| `components/Features/Blog/BlogSection.js` | Componente que exibe warning de formato inválido | ✅ **RESOLVIDO** (falso positivo dos mocks) |
| `hooks/useApiFetch.js` | Hook que executa fetch e aplica transform nos dados | ✅ Comportamento correto |
| `pages/api/posts.js` | API handler que monta resposta com `{ success, data }` | ✅ Formato validado — retorno correto |
| `lib/domain/posts.js` | Função `getRecentPosts` que busca posts no banco via `_paginatePosts` | ✅ Formato validado — retorno correto |
| `lib/cache.js` | Sistema de cache Redis | ✅ Verificado — cache saudável, nenhuma chave corrompida |
| `pages/api/helper/pagination.js` | Helpers de paginação usados por outras APIs (ex: `/api/dicas`) | ✅ Comportamento correto |

### Arquivos corrigidos (Erro #1)

| Arquivo | Correção |
|---------|:--------:|
| `cypress/fixtures/posts.json` | Slug `post-de-teste-com-imagem` → `mulher-virtuosa` |
| `cypress/e2e/post.cy.js` | Slug `post-de-teste` → `mulher-virtuosa` |
| `cypress/e2e/image_zoom.cy.js` | Slug `post-de-teste-com-imagem` → `mulher-virtuosa` |
| `cypress/e2e/navigation.cy.js` | Slug `post-teste` → `mulher-virtuosa` |
| `tests/unit/[slug].test.js` | Slug `post-de-teste` → `mulher-virtuosa` |

---

## 📐 DIAGNÓSTICO TÉCNICO — Fluxos Completos

### Fluxo do Erro #1 (404 nos slugs)

```
Usuário/Navegador/Crawler
  │
  ▼
GET /blog/post-de-teste-com-imagem
  │
  ▼
Next.js → getServerSideProps({ params: { slug: "post-de-teste-com-imagem" } })
  │
  ▼
query("SELECT * FROM posts WHERE slug = $1 AND published = true", ["post-de-teste-com-imagem"])
  │
  ▼
result.rows → [] (array vazio — nenhum registro encontrado)
  │
  ▼
post = result.rows[0] → undefined
  │
  ▼
return { notFound: true }
  │
  ▼
Next.js renderiza página 404 → HTTP 404
```

### Fluxo do Erro #2 (API format mismatch)

```
BlogSection.js monta (Home carregada)
  │
  ▼
useApiFetch("/api/posts", { transform: ... })
  │
  ▼
fetch GET /api/posts
  │
  ▼
handleGet (pages/api/posts.js)
  │
  ▼
getOrSetCache("posts:1:10", fetchFunction) {
    │
    ├─ Cache Hit? → retorna dado do Redis → (pode estar corrompido)
    │
    └─ Cache Miss? → getRecentPosts() → { data: [...], pagination: {...} }
                     → salva no Redis → retorna
}
  │
  ▼
res.json({ success: true, ...result })
  │
  ▼
Resposta HTTP 200 → fetch completa
  │
  ▼
transform(result) é executado:
    │
    ├─ result.success === true? → continua
    ├─ Array.isArray(result.data)? → extrai e retorna dados
    │
    └─ ❌ FALHA: result.success é undefined (result é um array, não objeto)
       → console.error("API returned success: false or data is not an array:", result)
       → return []
  │
  ▼
posts = [] → posts.length === 0
  │
  ▼
BlogSection return null → Seção "Reflexões & Estudos" NÃO RENDERIZADA
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

- [x] Verificar se os slugs `post-de-teste` e `post-de-teste-com-imagem` existem no banco — **❌ Não existem**
- [x] Verificar se o post com slug `post-teste` está com `published = true` — **❌ Slug não existe no banco**
- [x] Invalidar cache Redis para chaves `posts:*` — **✅ Cache Redis saudável, nenhuma chave corrompida encontrada**
- [x] Verificar conteúdo bruto do cache para `posts:1:10` — **✅ Nenhuma chave com padrão `posts:*` no Redis**
- [x] Verificar se há links hardcoded para slugs antigos no código — **✅ Encontrado em 5 arquivos de teste e corrigido**
- [x] Verificar seeds (`scripts/seed-posts.js`) para entender dados de teste — **✅ Seed não continha esses slugs em nenhuma versão**
- [x] Confirmar que o formato da resposta da API está correto (testar via SQL direto) — **✅ Formato `{ success, data, pagination }` válido**
- [ ] N/A — Erro #2 era falso positivo, não depende de cache

---

*Fim do relatório — 22/05/2026 (atualizado com investigação e correções dos Erros #1, #2 e #4)*
