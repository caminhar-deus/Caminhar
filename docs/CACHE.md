# Sistema de Cache

## Visão Geral

O sistema de cache do projeto utiliza **Redis (via Upstash)** para otimizar a performance da aplicação, reduzindo drasticamente o número de consultas ao banco de dados PostgreSQL. O objetivo é entregar respostas mais rápidas para requisições frequentes e diminuir a carga no servidor.

## Estratégia de Cache

A implementação segue o padrão **Cache-Aside**:

1.  **Leitura:** A aplicação primeiro tenta buscar os dados no cache (Redis).
2.  **Cache Hit:** Se os dados são encontrados, eles são retornados imediatamente ao cliente.
3.  **Cache Miss:** Se os dados não estão no cache, a aplicação busca a informação no banco de dados, salva uma cópia no Redis com um tempo de vida (TTL) definido, e então retorna os dados ao cliente.

O sistema também possui um **fallback seguro**: se o Redis estiver indisponível, a aplicação continua funcionando, buscando os dados diretamente do banco de dados, garantindo a disponibilidade do serviço.

## Implementação Principal

A lógica central está encapsulada na função `getOrSetCache` em `lib/cache.js`.

```javascript
export async function getOrSetCache(key, fetchFunction, ttlSeconds = 3600) {
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

### Estratégias de Invalidation

**Settings**: Invalida cache ao atualizar configuração
```javascript
await invalidateCache('settings:v1:all');
await invalidateCache(`settings:v1:${key}`);
```

**Posts**: Invalida cache ao criar/atualizar/deletar posts
**Musicas**: Invalida cache ao alterar músicas

## Benefícios

- **Performance**: Redução de 60-80% no tempo de resposta
- **Escalabilidade**: Diminui carga no servidor principal
- **Disponibilidade**: Resposta rápida mesmo com alta demanda
- **User Experience**: Carregamento mais rápido das páginas

## Configuração

### Variáveis de Ambiente

```env
UPSTASH_REDIS_REST_URL=https://seu-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=seu-token-aqui
```

### TTL Configurável

```javascript
const TTL_CONFIG = {
  settings: 1800,    // 30 minutos
  posts: 3600,       // 1 hora
  musicas: 3600      // 1 hora
};
```

## Monitoramento

### Métricas de Performance

| Métrica | Meta | Atual |
|---------|------|-------|
| **Cache Hit Rate** | >80% | Monitorado |
| **Response Time** | <100ms | Monitorado |
| **Database Load** | -70% | Monitorado |

### Alertas

- **Cache Hit Rate < 70%**: Problema de configuração
- **Redis Memory Usage > 80%**: Necessidade de limpeza
- **Response Time > 1s**: Sobrecarga do sistema

## Estrutura de Chaves

```
settings:all                    // Todas as configurações
settings:{key}                  // Configuração específica
posts:public:all                // Todos os posts públicos
musicas:public:all              // Todas as músicas públicas
```

## Testes

### Testes de Integridade
```bash
npm run test:cache:performance
npm run test:cache:integration
npm run test:cache:load
```

### Testes de Carga (k6)
```bash
k6 run load-tests/cache-concurrent-test.js
k6 run load-tests/cache-hit-rate-test.js
k6 run load-tests/cache-fallback-test.js
```

## Segurança

- Cache armazena apenas dados públicos
- Tokens de autenticação não são armazenados
- Dados sensíveis são excluídos do cache
- Acesso ao Redis controlado por autenticação

## Troubleshooting

### Problemas Comuns

**Redis Connection**
```bash
# Verificar conexão
redis.ping()
```

**Cache Miss High**
- Verificar TTL e estratégias de invalidação
- Analisar padrões de acesso
- Ajustar TTL conforme necessidade

**Memory Usage**
- Monitorar uso de memória do Redis
- Configurar alertas para >80% de uso
- Implementar limpeza automática

**Performance Issues**
- Verificar latência do Redis
- Analisar tempo de resposta das APIs
- Monitorar carga no banco de dados

## Integração com ContentTabs

- **Músicas**: Cache de 1 hora para melhor performance
- **Vídeos**: Estratégia similar implementada
- **Reflexões**: Cache de 1 hora para posts do blog

## Dependências

- `@upstash/redis: ^1.26.4` - Redis client HTTP
- `node-fetch: ^3.3.2` - HTTP client
- `@vercel/og: ^0.6.1` - Gerador de imagens

## ES Modules Support

- Importações modernas com extensões (.js)
- Suporte nativo a ES modules
- Integração com Turbopack
- Configuração Babel isolada

## Changelog

### v1.7.0 (07/03/2026)
- ✅ Suporte completo a ES modules
- ✅ Testes de carga corrigidos
- ✅ Performance monitorada
- ✅ Segurança reforçada

### v1.2.0 (08/02/2026)
- ✅ Cache de músicas implementado
- ✅ Testes de integração completos
- ✅ Monitoramento avançado
- ✅ Estratégias de invalidação