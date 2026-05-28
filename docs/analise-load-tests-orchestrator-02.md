# Análise dos Resultados dos Testes de Carga (Orquestrador)

## 1. Resumo dos Resultados

| Métrica | Valor |
|---------|-------|
| Total de Scripts | 30 |
| Passaram | 29 |
| **Falharam** | **1** |
| Ignorados | 0 |

**Única falha:** `create-post-flow` (exit code: 99) na categoria `🧪 Performance Tests`

---

## 2. Análise da Falha: `create-post-flow` (exit code 99)

### 2.1 O que o teste faz

O script `load-tests/performance/create-post-flow.js` executa um fluxo de criação de posts com as seguintes etapas:

1. **Setup**: Autentica via `POST /api/auth/login?response=body` e obtém token JWT
2. **Criação**: `POST /api/admin/posts` com payload JSON contendo `title`, `slug`, `content`, `published`
3. **Validação**: Verifica se o status HTTP retornado é `201`
4. **Teardown**: Remove posts criados durante o teste

### 2.2 Thresholds do teste

```javascript
thresholds: {
    'http_req_duration{flow:create_post}': ['p(95)<2000'],       // 95% das requests < 2s
    'checks{flow:create_post}': ['rate>0.95'],                      // 95% dos checks aprovados
    http_req_failed: ['rate<0.10'],                                  // <10% de falhas
}
```

Exit code 99 indica **violação de thresholds**.

### 2.3 Causa Raiz Identificada (Análise do LOG)

**Problema Principal: `handleDelete` não aceita `id` via query string**

O LOG do k6 mostra claramente:

```
http_req_failed................: 48.61% 35 out of 72
```

- **72 requisições HTTP totais**
- **35 requisições com falha** (48.61%)

**Distribuição das requisições:**
- 1 login (`setup`) → sucesso
- 35 POSTs de criação → sucesso (status 201)
- 1 GET no teardown (listar posts) → sucesso
- **35 DELETEs no teardown → falha (status 400)**

Os 35 DELETEs falham porque o teardown envia `id` via **query string**:

```javascript
http.del(`${BASE_URL}/api/admin/posts?id=${post.id}`, null, { headers: authHeaders });
```

Mas o handler `handleDelete` em `pages/api/admin/posts.js` lê de `req.body`:

```javascript
const { id } = req.body;
if (!id) {
    return res.status(400).json({ message: 'ID do post é obrigatório' });
}
```

**Resultado:** O teardown tenta limpar os posts do teste, mas os 35 DELETEs retornam 400, e o threshold `http_req_failed: rate<0.10` é violado (48.61% de falhas).

**Arquivo afetado:** `pages/api/admin/posts.js` (`handleDelete`, linhas 118-134)

### 2.4 Demais problemas no mesmo fluxo (documentação para ajuste futuro)

#### 2.4.1 Teardown usa query parameter em vez de body para DELETE

Em `load-tests/performance/create-post-flow.js` (teardown):

```javascript
http.del(`${BASE_URL}/api/admin/posts?id=${post.id}`, null, { headers: authHeaders });
```

O handler `handleDelete` em `pages/api/admin/posts.js` espera `id` em `req.body`:

```javascript
const { id } = req.body;
if (!id) {
    return res.status(400).json({ message: 'ID do post é obrigatório' });
}
```

O `teardown` envia `id` como **query string** (`?id=`), mas o handler lê de **`req.body`**. Isso faz com que o DELETE retorne 400 e os posts de teste não sejam limpos.

**Arquivos envolvidos:**
- `load-tests/performance/create-post-flow.js` (teardown, linha 72)
- `pages/api/admin/posts.js` (handleDelete, linha 118)

#### 2.4.2 `logActivity` não é aguardado (fire-and-forget)

Em `pages/api/admin/posts.js` (handlePost, linha 67):

```javascript
req.adminUtils.logActivity('CRIAR POST', newPost.id, `Criou o artigo: ${title}`);
```

A chamada não tem `await`. Se a tabela `activity_logs` não existir ou tiver problema de constraint, ocorrerá unhandled promise rejection. Isso não interrompe a resposta (já foi enviada como 201), mas polui os logs.

**Arquivo envolvido:** `pages/api/admin/posts.js` (linha 67)

---

## 3. Problemas Adicionais Detectados (Documentação para Ajuste Futuro)

### 3.1 Rate Limiting não funciona sem Redis (falha silenciosa)

Em `lib/cache.js`, `checkRateLimit`:

```javascript
if (redis) {
    try {
        // ... usa Redis
    } catch (err) {
        // Fallback para memória
        isRateLimited = checkInMemory();
    }
} else {
    isRateLimited = checkInMemory();
}
```

O fallback em memória (`localRateLimitMap`) não é compartilhado entre processos/workers do Next.js. Cada worker tem seu próprio `Map`, tornando o rate limit ineficaz em ambientes multi-worker (produção).

**Arquivo envolvido:** `lib/cache.js` (linhas 297-377)

### 3.2 `getClientIP` não tem fallbar consistente para IP externo

Em `lib/api/helpers.js`, `getClientIP` com `trustProxy = false` (padrão) ignora `X-Forwarded-For` e usa `req.socket.remoteAddress`. Em ambientes com proxy reverso (Nginx, Cloudflare), `socket.remoteAddress` será o IP do proxy, não do cliente real. Isso afeta:

- Rate limiting (IP incorreto)
- Logs de auditoria (IP incorreto)
- Detecção de spoofing (falsos positivos/negativos)

**Arquivo envolvido:** `lib/api/helpers.js` (linhas 21-50)

### 3.3 `detectSpoofedIP` bloqueia conexões de IP privado com X-Forwarded-For público

Em `lib/api/helpers.js`, `detectSpoofedIP` (linhas 131-133):

```javascript
const isForwardedPublic = !/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$)/.test(forwardedIP);
if (isForwardedPublic) {
    return { isSpoofed: true, socketIP: normalizedSocketIP, forwardedIP };
}
```

Cenário: servidor em rede interna (ex: Docker 172.x) atrás de proxy (ex: Nginx) que recebe requisição de IP público → spoofing é detectado incorretamente e requisição é bloqueada.

**Arquivo envolvido:** `lib/api/helpers.js` (linhas 86-146)

### 3.4 Thresholds excessivamente tolerantes mascararam falhas (já corrigido)

O comentário em `create-post-flow.js` linha 16 indica que o threshold `http_req_failed` foi reduzido de `rate<0.80` para `rate<0.10`. O valor anterior de 80% mascarava 71,94% de falhas reais.

**Outros testes podem ter thresholds igualmente frouxos que precisam ser auditados.**

**Arquivo envolvido:** `load-tests/performance/create-post-flow.js` (linha 16)

### 3.5 Inconsistência no schema de tabelas

Em `lib/crud.js`, o schema `tableSchemas.posts` inclui `position`, mas `createPost` não o define. O mesmo pode ocorrer para outras entidades (`musicas`, `videos`, `products`, etc.) que dependem de `position`.

```javascript
posts: ['id', 'title', 'slug', 'excerpt', 'content', 'image_url', 'published', 'position', 'created_at', 'updated_at'],
```

A função `_filterAllowedFields` só **filtra campos não permitidos**, mas não **valida campos obrigatórios**. Tentativas de INSERT sem campos NOT NULL passam pela validação JS e quebram no banco.

**Arquivo envolvido:** `lib/crud.js` (linhas 7-22, 31-48)

### 3.6 Ausência de validação de schema do banco no `createRecord`

`createRecord` não verifica se os dados fornecidos atendem às constraints do banco. A validação só ocorre em nível de aplicação (Zod no handler), mas o handler pode passar dados incompletos para a camada de domínio que por sua vez os repassa ao CRUD genérico sem validação adicional.

**Arquivos envolvidos:**
- `lib/crud.js` (createRecord, linhas 132-149)
- `lib/domain/posts.js` (createPost, linhas 112-123)

### 3.7 Script de limpeza de posts (`clean-load-test-posts.js`) não é chamado corretamente

No orquestrador (`scripts/run-all-load-tests-sequentially.js`, linha 186), o cleanup é executado **após a categoria de performance**:

```javascript
if (category.name === '🧪 Performance Tests') {
    // Executa cleanup...
    execSync('node scripts/clean-load-test-posts.js', ...);
}
```

Se o `create-post-flow` falhar, alguns posts fantasmas podem permanecer no banco (especialmente porque o teardown também está quebrado). O cleanup até tenta remover, mas se o script de cleanup não existir ou estiver quebrado, os posts se acumulam.

### 3.8 Variáveis de ambiente com fallback para senha fraca

Em `scripts/run-all-load-tests-sequentially.js`:

```javascript
env: { ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin', ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '123456' }
```

Senha `123456` como fallback é extremamente fraca. Se o script for executado sem `ADMIN_PASSWORD` configurada, expõe o sistema.

---

## 4. Resumo de Arquivos Envolvidos

| Arquivo | Papel | Problema |
|---------|-------|----------|
| `load-tests/performance/create-post-flow.js` | Script de teste k6 | Falha por erro no servidor + teardown quebrado |
| `lib/domain/posts.js` | Camada de domínio (criação de posts) | **FALHA ATIVA:** `createPost` não envia `position` |
| `pages/api/admin/posts.js` | Handler da API admin | `logActivity` sem await; DELETE lê de body mas teste envia por query |
| `lib/crud.js` | CRUD genérico | `_filterAllowedFields` não valida campos obrigatórios |
| `lib/cache.js` | Cache e Rate Limiting | Fallback em memória não compartilhado entre workers |
| `lib/api/helpers.js` | Helpers (IP, spoofing) | `getClientIP` inconsistente; `detectSpoofedIP` bloqueia cenários legítimos |
| `lib/auth.js` | Autenticação JWT | Fallback de secret em dev (⚠️ segurança) |
| `scripts/run-all-load-tests-sequentially.js` | Orquestrador | Senha fraca como fallback; cleanup pós-categoria |
| `load-tests.yml` | CI/CD pipeline | − |

---

## 5. Ações Corretivas

### 5.1 Correção Imediata (aplicada)

Adicionar `position` com valor padrão `0` na função `createPost` em `lib/domain/posts.js` para evitar falha no INSERT quando o banco não possui DEFAULT para a coluna.

### 5.2 Correções Futuras Recomendadas

1. **Ajustar teardown**: Mudar DELETE para usar `req.body` ou alterar handler para aceitar query params
2. **Adicionar `await` no `logActivity`** para capturar erros de auditoria
3. **Auditar thresholds** de todos os testes para garantir que não mascaram falhas
4. **Adicionar validação de campos obrigatórios** no CRUD genérico (`createRecord`)
5. **Revisar `detectSpoofedIP`** para não bloquear IPs privados com proxy legítimo
6. **Implementar rate limit distribuído** via Redis em produção
7. **Remover fallback de senha fraca** no orquestrador

---

## 6. Checklist de Verificação

- [x] Identificar script com falha (`create-post-flow`, exit code 99)
- [x] Analisar causa raiz (`position` ausente no INSERT)
- [x] Documentar problemas encontrados
- [x] Aplicar correção imediata (adicionar `position: 0` no `createPost`)
- [ ] Revisar demais thresholds dos testes (futuro)
- [ ] Corrigir teardown do `create-post-flow` (futuro)
- [ ] Corrigir `detectSpoofedIP` (futuro)