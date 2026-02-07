# Cache de API com Redis

## Visão Geral

O sistema implementa cache via Redis para rotas de leitura frequente, seguindo o padrão **Cache-Aside**. O cache está configurado para as seguintes rotas:

- `GET /api/v1/settings` - Configurações do site
- `GET /api/v1/posts` - Posts públicos do blog

## Arquitetura

### Estrutura de Chaves

As chaves no Redis seguem um padrão de namespace:

- **Settings**: `settings:v1:all` (todas as configurações) e `settings:v1:{key}` (configuração específica)
- **Posts**: `posts:public:all` (todos os posts públicos)

### TTL (Time To Live)

- **Settings**: 1800 segundos (30 minutos) - Configurações mudam raramente
- **Posts**: 3600 segundos (1 hora) - Conteúdo de blog é estático após publicação

## Implementação

### Cache Layer (`lib/cache.js`)

```javascript
export async function getOrSetCache(key, fetchFunction, ttlSeconds = DEFAULT_TTL) {
  // 1. Tenta obter do Redis
  const cachedData = await redis.get(key);
  
  if (cachedData) {
    return JSON.parse(cachedData); // Cache Hit
  }
  
  // 2. Busca do banco de dados (Cache Miss)
  const data = await fetchFunction();
  
  // 3. Salva no Redis com TTL
  if (data) {
    await redis.set(key, JSON.stringify(data), { ex: ttlSeconds });
  }
  
  return data;
}
```

### Settings API (`pages/api/v1/settings.js`)

- **GET /api/v1/settings**: Busca todas as configurações com cache
- **GET /api/v1/settings?key={key}**: Busca configuração específica com cache
- **POST/PUT**: Cria/atualiza configuração e invalida cache

### Posts API (`pages/api/v1/posts.js`)

- **GET /api/v1/posts**: Busca todos os posts públicos com cache
- Apenas posts com `published = true` são retornados

## Estratégia de Invalidação

### Settings
Quando uma configuração é atualizada:
```javascript
await invalidateCache('settings:v1:all');
await invalidateCache(`settings:v1:${key}`);
```

### Posts
O cache de posts é invalidado quando:
- Um post é criado, atualizado ou deletado
- O status de publicação é alterado

## Benefícios

1. **Performance**: Reduz consultas ao banco de dados
2. **Escalabilidade**: Diminui carga no servidor principal
3. **Disponibilidade**: Resposta rápida mesmo com alta demanda
4. **Consistência**: Cache é invalidado quando dados são atualizados

## Monitoramento

O sistema inclui:
- Logs de erros de cache
- Fallback automático para banco de dados em caso de falha no Redis
- TTL configurável para diferentes tipos de dados

## Configuração do Redis

O Redis é configurado via variáveis de ambiente:
- `REDIS_URL`: URL de conexão com o Redis
- `REDIS_PASSWORD`: Senha de autenticação (se necessário)

## Testes

Os testes de cache estão implementados em:
- `settings-cache.test.js`: Testes de integração para cache de configurações
- Testes verificam Cache Miss, Cache Hit e invalidação de cache

## Considerações de Segurança

- Cache armazena apenas dados públicos ou com permissões verificadas
- Tokens de autenticação não são armazenados em cache
- Dados sensíveis são excluídos do cache quando necessário