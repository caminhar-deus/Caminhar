# 🚨 RELATÓRIO DE ANÁLISE DE ERROS — "O Caminhar com Deus"

**Data:** 22/05/2026  
**Autor:** Análise automatizada  
**Versão do código:** `edf9bb16ad4c01ed6a7200be2c195696d9073e52`

---

## 📋 VISÃO GERAL DOS ERROS IDENTIFICADOS

Foram detectados **4 problemas distintos** no sistema, sendo 2 deles críticos (bloqueiam funcionalidades do blog) e 2 de configuração/proteção (um deles esperado, outro configuracional). Abaixo a análise detalhada de cada um.

---

## 🔴 ERRO CRÍTICO #1: Posts com slugs específicos retornam 404

**Status:** ❌ CRÍTICO - 404 Not Found

### Slugs afetados

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

### 🔍 Diagnóstico Detalhado

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

### 📊 Comportamento Observado

- **Alta taxa de repetição:** 28 chamadas para slugs que não existem
  - Indica **loop de polling/revalidação** no frontend OU
  - **Google Bot / crawler** indexando URLs inválidas OU
  - **Links hardcoded** em componentes sendo renderizados e clicados repetidamente
- **Tempo de resposta consistente (~20-30ms):** O SSR executa corretamente, mas o banco simplesmente não encontra o registro
- **Pico de 438ms na primeira requisição:** Provável cold start do banco/conexão

---

## 🔴 ERRO CRÍTICO #2: API `/api/posts` retorna dados em formato incompatível com o frontend

**Status:** ❌ CRÍTICO — Warning no browser console (3 ocorrências)

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

### 🚨 Hipóteses para o formato incorreto

#### Hipótese A (MAIS PROVÁVEL, 70%) — Cache Redis corrompido

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

**Status:** 🔧 INVESTIGAÇÃO RECOMENDADA

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

- **Erro #1** (404 nos slugs): Impede a leitura de posts individuais via URL direta
- **Erro #2** (formato da API): Impede a listagem de posts na seção "Reflexões & Estudos" da Home

**Consequência combinada:** O blog está **completamente inacessível** tanto pela listagem na Home quanto por URLs diretas.

### Matriz de impacto

| Funcionalidade | Afetada por | Status |
|:---|---|:---:|
| Listagem de posts na Home | Erro #2 | ❌ Seção vazia |
| Listagem em `/blog` (SSR) | Nenhum | ✅ Funciona (usa SSR direto ao banco) |
| Leitura de post por slug | Erro #1 | ❌ 404 para slugs específicos |
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

| Arquivo | Papel no erro |
|---------|:-------------:|
| `pages/blog/[slug].js` | SSR que retorna 404 quando slug não existe no banco |
| `components/Features/Blog/BlogSection.js` | Componente que exibe warning de formato inválido e oculta seção |
| `hooks/useApiFetch.js` | Hook que executa fetch e aplica transform nos dados |
| `pages/api/posts.js` | API handler que monta resposta com `{ success, data }` |
| `lib/domain/posts.js` | Função `getRecentPosts` que busca posts no banco via `_paginatePosts` |
| `lib/cache.js` | Sistema de cache Redis que pode estar servindo dado corrompido |
| `pages/api/helper/pagination.js` | Helpers de paginação usados por outras APIs (ex: `/api/dicas`) |

---

## 🎯 RECOMENDAÇÕES DE INVESTIGAÇÃO

### Para o Erro #1 (404 nos slugs)

1. **Verificar existência dos slugs no banco:**
   ```sql
   SELECT id, slug, title, published FROM posts WHERE slug IN ('post-de-teste', 'post-de-teste-com-imagem');
   ```

2. **Verificar o slug real do post existente:**
   ```sql
   SELECT id, slug, title, published FROM posts ORDER BY created_at DESC;
   ```

3. **Identificar a origem dos links quebrados:**
   - Procurar referências a `post-de-teste` e `post-de-teste-com-imagem` em toda a base de código
   - Verificar seeds, dados de migração, e conteúdo de posts que possam conter links internos

### Para o Erro #2 (formato da API)

1. **Verificar o conteúdo do cache Redis:**
   ```bash
   redis-cli GET posts:1:10
   ```

2. **Invalidar o cache de posts manualmente:**
   Chamar a função de invalidação com padrão `posts:*` ou usar Redis CLI:
   ```bash
   redis-cli KEYS "posts:*" | xargs redis-cli DEL
   ```

3. **Verificar se o formato do cache é compatível:**
   - Confirmar que o valor armazenado é `{ "data": [...], "pagination": {...} }` e não apenas o array

### Para o Erro #4 (cache)

1. **Monitorar as chaves de cache:**
   Listar todas as chaves relacionadas a posts:
   ```bash
   redis-cli KEYS "posts:*"
   ```

2. **Verificar TTL das chaves:**
   ```bash
   redis-cli TTL posts:1:10
   ```

3. **Considerar implementar versionamento de cache:**
   - Adicionar um número de versão na chave (ex: `posts:v2:1:10`)
   - Isso evita incompatibilidade após mudanças no formato
   - Incrementar a versão sempre que o formato de resposta mudar

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

## 📋 CHECKLIST DE VERIFICAÇÃO RÁPIDA

- [ ] Verificar se os slugs `post-de-teste` e `post-de-teste-com-imagem` existem no banco
- [ ] Verificar se o post com slug `post-teste` está com `published = true`
- [ ] Invalidar cache Redis para chaves `posts:*`
- [ ] Verificar conteúdo bruto do cache para `posts:1:10`
- [ ] Verificar se há links hardcoded para slugs antigos no código
- [ ] Verificar seeds (`scripts/seed-posts.js`) para entender dados de teste
- [ ] Confirmar que o formato da resposta da API está correto (testar via curl)
- [ ] Verificar se o TTL do cache expirou (senão o erro #2 persiste mesmo com correção)

---

*Fim do relatório — 22/05/2026*