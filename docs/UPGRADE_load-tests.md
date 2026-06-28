# 🔧 Plano de Melhorias — `/load-tests`

> **Propósito:** Levantamento analítico de possíveis melhorias, correções e ajustes para a suíte de testes de carga, sem alterar nenhum arquivo do projeto.
> **Data da análise:** 28/06/2026

---

## Sumário

1. [Duplicidades e Redundâncias](#1-duplicidades-e-redundâncias)
2. [Código Morto e Inutilizado](#2-código-morto-e-inutilizado)
3. [Problemas de Configuração e Ambiente](#3-problemas-de-configuração-e-ambiente)
4. [Thresholds Inconsistentes](#4-thresholds-inconsistentes)
5. [Problemas de Segurança](#5-problemas-de-segurança)
6. [Documentação Desatualizada](#6-documentação-desatualizada)
7. [Melhorias Estruturais e Organizacionais](#7-melhores-estruturais-e-organizacionais)
8. [Melhorias de Ferramentas e Manutenção](#8-melhorias-de-ferramentas-e-manutenção)
9. [Observações Técnicas Relevantes](#9-observações-técnicas-relevantes)

---

## 1. Duplicidades e Redundâncias

### 1.1 `musicas-search-test.js` vs `musicas-filter-test.js` — Redundância Crítica

**Arquivos:** `load-tests/performance/musicas-search-test.js` e `load-tests/performance/musicas-filter-test.js`

**Problema:** Ambos testam exatamente o mesmo endpoint (`/api/musicas?search=...`) com a mesma lógica de validação (GET, check status 200, verificar match do termo nos campos). A única diferença são os termos de busca:
- `musicas-filter-test.js`: usa artistas (`'Aline Barros'`, `'Fernandinho'`, etc.)
- `musicas-search-test.js`: usa termos genéricos (`'Graça'`, `'Santo'`, `'Amor'`, etc.)

Além disso, `musicas-search-test.js` foi implementado manualmente (não usa o factory pattern), enquanto `musicas-filter-test.js` usa `createFilterTest()` do `resource-test-runner.js`.

**Sugestão:** Unificar em um único teste que use `createFilterTest()` com uma lista combinada de search values (artistas + termos genéricos). Isso reduziria de 6 para 5 testes de músicas.

### 1.2 `musicas-filter-test.js` e `videos-filter-test.js` — Lógica Quase Idêntica

**Arquivos:** `load-tests/performance/musicas-filter-test.js` e `load-tests/performance/videos-filter-test.js`

**Problema:** São estruturalmente idênticos — apenas diferem no endpoint e nos search values. O uso do factory pattern já elimina ~80% da duplicação, mas ambos continuam sendo arquivos separados. Isso é aceitável para organização, mas poderia ser parametrizado em um único teste genérico de filtro.

**Sugestão:** (Baixa prioridade) Avaliar se faz sentido manter testes separados ou criar um arquivo de configuração centralizada que defina todos os recursos e execute os testes dinamicamente.

### 1.3 `videos-load-test.js` vs `videos-pagination-test.js` — Sobreposição

**Arquivos:** `load-tests/performance/videos-load-test.js` e `load-tests/performance/videos-pagination-test.js`

**Problema:** `videos-load-test.js` já testa paginação como parte de sua execução (faz requisições para página 1 e página 2 com validação de metadados de paginação como `pagination.page` e `pagination.limit`). Isso sobrepõe parcialmente o propósito do `videos-pagination-test.js`, que testa exclusivamente paginação.

**Sugestão:** Avaliar se `videos-load-test.js` precisa manter as requisições extras de página 2, ou se essa validação pode ficar apenas no teste de paginação dedicado.

### 1.4 `posts-tags-test.js` — Checks Redundantes

**Arquivo:** `load-tests/functional/posts-tags-test.js`

**Problema:** Os checks `'Filtro por tag retornou resultados'` e `'Retornou lista de posts'` validam exatamente a mesma condição (se a resposta contém um array). Um deles é completamente redundante e não agrega valor.

**Sugestão:** Remover o check duplicado.

### 1.5 `resource-test-runner.js` — Função `sanitizeToken()` Duplicada

**Arquivo:** `load-tests/helpers/resource-test-runner.js`

**Problema:** O módulo `resource-test-runner.js` possui sua própria cópia local da função `sanitizeToken()` (linhas 24-29), que é idêntica à versão em `helpers/report.js`. Isso viola o princípio DRY.

**Sugestão:** Importar `sanitizeToken` de `helpers/report.js` em vez de manter uma cópia local.

### 1.6 `stress-test-combined.js` vs `videos-crud-test.js` — Sobreposição de Funcionalidade

**Arquivos:** `load-tests/performance/stress-test-combined.js` e `load-tests/performance/videos-crud-test.js`

**Problema:** O cenário `stress_test` do `stress-test-combined.js` executa CRUD completo de vídeos (POST → PUT → DELETE), que é exatamente o que `videos-crud-test.js` testa, porém com 33× mais VUs (3 vs 100). Há sobreposição de funcionalidade.

**Sugestão:** (Baixa prioridade) Considerar se o CRUD de vídeos no stress test poderia ser substituído por um cenário diferente para aumentar a cobertura.

---

## 2. Código Morto e Inutilizado

### 2.1 `config.js` — Função `getConfig()` não utilizada

**Arquivo:** `load-tests/helpers/config.js`

**Problema:** A função `getConfig()` (linhas 11-17) não é chamada por nenhum outro módulo ou arquivo de teste. As constantes `BASE_URL`, `USERNAME` e `PASSWORD` são exportadas diretamente e usadas por todos os testes, tornando a função redundante.

**Sugestão:** Remover a função `getConfig()` para eliminar código morto.

### 2.2 Documentação referenciada com conteúdo divergente

**Arquivo:** `load-tests/helpers/network.js`

**Problema:** O comentário na linha 3 diz "Consulte a seção 2.2 do UPGRADE_load-tests.md para discussão sobre isso", esperando que a seção 2.2 aborde o tópico de IP spoofing. No entanto, a seção 2.2 atual deste documento trata de "Documentação referenciada com conteúdo divergente" — não sobre spoofing. O conteúdo esperado pelo comentário não corresponde ao que a seção entrega.

**Sugestão:** Atualizar o comentário em `network.js` para referenciar corretamente a seção que aborda IP spoofing (seção 5.2) ou remover a referência cruzada.

---

## 3. Problemas de Configuração e Ambiente

### 3.1 Fallbacks de credenciais com valores reais

**Arquivo:** `load-tests/helpers/config.js`

**Problema:** Os fallbacks `USERNAME` e `PASSWORD` usam valores reais (`'admin'` e `'123456'`). Embora seja um ambiente de desenvolvimento local, manter credenciais reais no código-fonte é uma prática de segurança questionável. Isso pode levar a exposição acidental em logs ou relatórios.

**Sugestão:** Alterar os fallbacks para valores que forçam falha explícita (ex: `'CHANGE_ME'`), obrigando a configuração via variáveis de ambiente em todos os ambientes, inclusive desenvolvimento local. Isso já foi feito em versões anteriores do arquivo (conforme documentação antiga) mas parece ter sido revertido.

### 3.2 Constantes avaliadas estaticamente

**Arquivo:** `load-tests/helpers/config.js`

**Problema:** As constantes `BASE_URL`, `USERNAME` e `PASSWORD` são avaliadas **uma única vez** no momento da importação do módulo. Se as variáveis de ambiente (`__ENV`) forem alteradas durante a execução (improvável em k6, mas conceitualmente frágil), as constantes não refletirão a mudança. Além disso, em alguns runners do k6, `__ENV` pode não estar disponível no momento da importação (apenas dentro das funções `setup()`/`default()`).

**Sugestão:** Considerar usar uma função getter (como a já existente `getConfig()`, mas atualmente não utilizada) que seja chamada dentro de `setup()` ou `default()`, garantindo que as variáveis de ambiente estejam disponíveis.

### 3.3 Ausência de arquivo `env-config.json`

**Problema:** O documento antigo menciona um arquivo `env-config.json` na raiz de `/load-tests/`, que serviria como configuração de ambiente centralizada. Este arquivo não existe mais na estrutura atual. Não está claro se foi removido intencionalmente ou se deveria ser recriado.

**Sugestão:** Verificar se a remoção foi intencional. Se positivo, remover referências no código e documentação. Se negativo, recriar o arquivo ou documentar a decisão.

---

## 4. Thresholds Inconsistentes

### 4.1 Níveis de tolerância diferentes entre testes equivalentes

**Problema:** Testes estruturalmente equivalentes (CRUD, filtro, paginação, ordenação) possuem thresholds diferentes entre músicas e vídeos:

| Tipo | Músicas | Vídeos | Diferença |
|------|---------|--------|-----------|
| Paginação | checks `rate==1.0` (100%) | checks `rate>0.85` (85%) | 15% de diferença |
| Ordenação | checks `rate==1.0` (100%) | checks `rate>0.85` (85%) | 15% de diferença |

Não há justificativa técnica clara para essa diferença, já que ambos são endpoints públicos que retornam dados do mesmo banco.

**Sugestão:** Unificar os thresholds entre pares equivalentes ou documentar explicitamente o motivo da diferença.

### 4.2 Thresholds excessivamente tolerantes mascaram problemas

**Arquivo:** `load-tests/performance/create-post-flow.js`

**Problema:** O threshold `http_req_failed: ['rate<0.10']` (10% de falhas toleradas) é excessivamente permissivo para um fluxo de criação de post. O próprio código-fonte contém um comentário indicando isso: "Reduzido de 80% para 10% — o threshold anterior mascarava 71,94% de falhas reais". Embora tenha sido reduzido, 10% ainda é alto para operações de escrita.

**Sugestão:** Reduzir gradualmente o threshold para `rate<0.05` ou `rate<0.02` após confirmar que as falhas foram corrigidas.

### 4.3 Ausência de thresholds específicos para tags de requisição

**Problema:** Vários testes usam tags para marcar requisições (`tags: { name: 'SearchPosts' }`, `tags: { type: 'cached_settings' }`), mas não definem thresholds específicos para essas tags em `options`. Sem thresholds específicos, as tags servem apenas para organização visual e filtragem manual.

**Sugestão:** Revisar todos os testes que usam tags e adicionar thresholds específicos onde aplicável.

### 4.4 Perfil `light` com latência irrealista

**Arquivo:** `load-tests/helpers/profiles.js` — perfil `light`

**Problema:** O perfil `light` define `http_req_duration: ['p(95)<500']`. Para testes funcionais com 1 VU, p(95) < 50ms seria mais realista. Muitos testes que usam o perfil `light` fazem apenas 1 requisição por iteração, tornando o threshold pouco útil (a amostra é pequena demais para percentis).

**Sugestão:** Reduzir o threshold de latência do perfil `light` para `p(95)<100ms` e aumentar o número de iterações mínimas para 10.

---

## 5. Problemas de Segurança

### 5.1 IP fixo para evasão de rate limit

**Arquivo:** `load-tests/security/rate-limit-test.js`

**Problema:** O teste de rate limit usa IP fixo `203.0.113.1` para todos os VUs, em vez de variar o IP por VU/iteração. Isso reduz a eficácia do teste, pois o rate limit pode ser acionado apenas para aquele IP específico, não representando um teste realista de rate limit global.

**Sugestão:** Usar `getRandomIP()` para gerar IPs variados, ou usar uma lógica que rode IPs diferentes entre VUs (ex: `${__VU}.0.0.1`).

### 5.2 Spoofing de IP não detectado

**Arquivos:** `load-tests/security/ip-spoofing-test.js` e `load-tests/helpers/network.js`

**Problema:** O teste `ip-spoofing-test.js` documenta explicitamente que "66.67% das respostas indicam que o spoofing não foi detectado". Isso significa que a proteção contra IP spoofing não está funcionando — o servidor aceita o header `X-Forwarded-For` falsificado e o utiliza para rate limit, permitindo evasão.

**Impacto:** Um atacante pode burlar rate limits simplesmente rotacionando o header `X-Forwarded-For` em cada requisição.

**Sugestão:** Implementar detecção de IP spoofing no middleware da aplicação (validar consistência entre o IP real do socket e o header `X-Forwarded-For`).

### 5.3 Ausência de rate limit em endpoint de busca

**Arquivo:** `load-tests/security/ddos-search-test.js`

**Problema:** O teste documenta que "o servidor NÃO aciona rate limit para buscas, mesmo com 500 VUs". Isso significa que o endpoint `GET /api/posts?search=...` não possui proteção contra abuso, podendo ser usado para ataques de negação de serviço.

**Sugestão:** Implementar rate limit para endpoints de leitura pública (busca, listagem). Pode ser um limite mais generoso que o de login (ex: 100 req/min por IP), mas deve existir.

### 5.4 Exposição de token JWT em logs de erro

**Problema:** Vários testes (ex: `create-post-flow.js`, `authenticated-flow-test.js`, `stress-test-combined.js`) usam `console.error()` com `res.body.substring(0, 200)` em caso de falha. Se a resposta da API incluir o token JWT no body (comum em respostas de erro de autenticação), o token pode vazar nos logs de saída padrão do k6.

**Sugestão:** Implementar sanitização nos logs de erro, similar à já existente em `helpers/report.js` para os relatórios JSON.

---

## 6. Documentação Desatualizada

### 6.1 Comentário quebrado em `network.js`

**Arquivo:** `load-tests/helpers/network.js`

**Problema:** Referencia seção 2.2 do `UPGRADE_load-tests.md` que não existe mais.

**Sugestão:** Remover a referência ou atualizar para apontar para a seção correta.

### 6.2 Documentação antiga (`docs/antigos/PROJECT_load-tests.md`) desatualizada

**Arquivo:** `docs/antigos/PROJECT_load-tests.md`

**Problema:** O documento antigo contém informações que não correspondem mais à realidade atual:
- Menciona `env-config.json` (não existe mais)
- Menciona scripts de segurança (5) — atualmente são 4
- Menciona `helpers/sleep.js` como parte do total de helpers, mas não o lista em nenhuma seção dedicada
- Menciona versão `0.0.4` do `k6-summary` (correto), mas o documento antigo ainda referenciava `0.0.2`

**Sugestão:** Manter o documento atualizado na pasta `docs/` principal e arquivar a versão antiga. Isso já foi feito com a criação do `PROJECT_load-tests.md` atual.

---

## 7. Melhorias Estruturais e Organizacionais

### 7.1 Factory pattern incompleto

**Problema:** Dos 17 testes de performance, 10 usam o factory pattern (`resource-test-runner.js`) e 7 têm implementação manual. Os testes manuais são:

| Teste | Categoria |
|-------|-----------|
| `cache-warmup-test.js` | Performance |
| `cache-performance-test.js` | Performance |
| `authenticated-flow-test.js` | Performance |
| `create-post-flow.js` | Performance |
| `pagination-test.js` | Performance |
| `musicas-search-test.js` | Performance |
| `stress-test-combined.js` | Performance |

Alguns desses (como `musicas-search-test.js`) poderiam ser facilmente convertidos para o factory pattern. Outros (como `stress-test-combined.js` com cenários paralelos) justificam a implementação manual.

**Sugestão:** Avaliar cada teste manual individualmente para possível conversão ao factory pattern. Priorizar `musicas-search-test.js` e `pagination-test.js`.

### 7.2 Nomenclatura inconsistente de relatórios

**Problema:** Os nomes de relatórios seguem dois padrões diferentes:
- Padrão snake_case: `backup_verification_test`, `cache_headers_test`, `search_content_test`
- Padrão kebab-case (via factory): `musicas_crud_test`, `videos_crud_test`

Além disso, `upload-flow-test.js` gera relatório com nome `upload-flow-summary`, que difere do padrão `{nome}_test`.

**Sugestão:** Padronizar todos os nomes de relatório para um único formato (snake_case com sufixo `_test`).

### 7.3 `musicas-search-test.js` — não usa factory pattern

**Arquivo:** `load-tests/performance/musicas-search-test.js`

**Problema:** Este teste tem implementação manual (63 linhas) e poderia ser substituído por uma chamada a `createFilterTest()` com os termos de busca apropriados, já que a única diferença para `musicas-filter-test.js` são os search values.

**Sugestão:** Substituir a implementação manual por uma chamada a `createFilterTest()`, unificando com ou substituindo `musicas-filter-test.js`.

### 7.4 `videos-sort-test.js` — campo `useExplicitSort` não utilizado

**Arquivo:** `load-tests/performance/videos-sort-test.js`

**Problema:** O teste declara `useExplicitSort: true` no config, mas o factory `createSortTest()` em `resource-test-runner.js` não faz referência a esse campo. O parâmetro não tem efeito no comportamento do teste.

**Sugestão:** Remover o campo ou implementar a funcionalidade correspondente no runner.

---

## 8. Melhorias de Ferramentas e Manutenção

### 8.1 Versão fixa da biblioteca `k6-summary`

**Arquivo:** `load-tests/helpers/report.js`

**Problema:** A importação usa versão fixa `0.0.4` da jslib `k6-summary`:
```javascript
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.4/index.js';
```

Isso impede que melhorias ou correções na biblioteca sejam automaticamente incorporadas. Por outro lado, versões fixas garantem consistência entre execuções.

**Sugestão:** Avaliar se faz sentido usar `latest` ou manter versão fixa. Se fixa, considerar adicionar um processo de atualização periódica. Se `latest`, atualizar a importação.

### 8.2 Cache de dependências k6 no CI

**Arquivo:** `load-tests.yml` (na raiz do projeto)

**Problema:** O workflow do GitHub Actions implementa cache de dependências k6 (`~/.local/share/k6`), mas a importação via URL (`https://jslib.k6.io/...`) não é afetada por esse cache — as bibliotecas são baixadas toda vez que o script é executado.

**Sugestão:** Verificar se o cache realmente está funcionando para as jslibs ou considerar usar o k6 com módulos pré-downloadados.

### 8.3 Ausência de validação de schemas de resposta

**Problema:** Nenhum teste valida o schema completo das respostas JSON. As validações são superficiais (status code + presença de campos), sem verificar tipos, formatos ou estrutura completa. Isso significa que uma mudança que altere o schema da resposta (ex: renomear `data.posts` para `data.items`) passaria despercebida.

**Sugestão:** Implementar validação de schema usando um mecanismo similar a JSON Schema, mesmo que simplificado. Pode ser uma função helper que verifica a estrutura esperada.

### 8.4 Testes deletam dados de produção? — Prefixo de identificação inconsistente

**Problema:** Diferentes testes usam prefixos diferentes para identificar dados de teste:
- `create-post-flow.js`: prefixo `K6` no título
- `musicas-crud-test.js` e `videos-crud-test.js`: prefixo `K6` no título
- `stress-test-combined.js`: prefixo `[TEST-K6]` (mais robusto)

Além disso, a remoção via teardown usa lógicas diferentes em cada teste. Em caso de falha do teardown (ex: servidor cai durante a execução), dados de teste podem acumular no banco.

**Sugestão:**
1. Padronizar o prefixo de identificação para um formato único (ex: `[K6-TEST]`)
2. Implementar um script de limpeza global que varra todo o banco removendo dados com esse prefixo
3. Considerar usar um banco de dados de teste dedicado (não o de produção)

---

## 9. Observações Técnicas Relevantes

### 9.1 Compatibilidade ES5 no k6 (runtime goja)

**Problema:** O k6 utiliza o runtime goja (Go), que não implementa todas as funcionalidades ES6+. Funções como `Array.some()`, `Array.includes()` e arrow functions podem não funcionar. No entanto, alguns testes usam essas features:

- `search-content-test.js`: usa `posts.some()` (linha 63) e `Array.isArray()` (funciona)
- `posts-tags-test.js`: usa `Array.isArray()` (funciona)
- `pagination-test.js`: explicitamente usa sintaxe ES5.1 (`var`, `for` loops, `function()`)

**Observação:** O suporte a ES6 no goja tem melhorado em versões recentes do k6 (v0.54+). É possível que as funções ES6 usadas funcionem. No entanto, a inconsistência no estilo de código entre os testes (alguns ES5.1, outros ES6+) pode causar problemas se o k6 for executado em uma versão mais antiga.

### 9.2 Warm-up duplicado

**Problema:** Existem dois mecanismos de warm-up independentes:
1. `cache-warmup-test.js` — Teste dedicado que deve ser executado antes dos testes de performance (5 rounds × 4 endpoints)
2. `search-content-test.js` — Warm-up embutido na primeira iteração (3 requisições)

Não há garantia de que o `cache-warmup-test.js` seja sempre executado antes dos demais testes no CI. O orquestrador executa em ordem alfabética ou por categoria, mas não impõe essa dependência.

**Sugestão:** Extrair o warm-up do `search-content-test.js` e garantir que o `cache-warmup-test.js` seja executado explicitamente antes de qualquer teste de performance no pipeline de CI.

### 9.3 Dados de teste insuficientes

**Problema:** Vários testes de paginação exibem warnings como "Adicione mais posts ao banco para um teste de paginação completo" — indicando que o banco de dados de teste pode não ter dados suficientes para validar a paginação adequadamente.

**Sugestão:** Garantir que o seed de dados de teste insira pelo menos 20 registros de cada tipo (posts, músicas, vídeos) para permitir testes de paginação significativos.

---

> **Total de itens identificados:** 32
> ⚠️ **Críticos:** 4 (duplicidade música-search/filter, spoofing não detectado, ausência de rate limit em busca, exposição de JWT em logs)
> 🟡 **Médios:** 24 (thresholds inconsistentes, código morto, configuração, documentação desatualizada, nomenclatura, warm-up duplicado, compatibilidade ES5)
> 🔵 **Leves:** 4 (testes de filtro quase idênticos, perfil light com latência irrealista, validação de schemas, cache de dependências CI)
