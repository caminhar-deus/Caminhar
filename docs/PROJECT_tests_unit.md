# Documentação Testes Unitários

Arquivo gerado automaticamente. Contém análise e documentação de todos os testes unitários do projeto.

---

## 📋 Sumário

| Arquivo | Propósito | Linhas | Cobertura |
|---------|-----------|--------|-----------|
| `[slug].test.js` | Teste da página individual de post do Blog | 151 | ✅ 3 casos |
| `clean-test-db.test.js` | Teste do script de limpeza de banco de dados de teste | 52 | ✅ 2 casos |
| `index.test.js` | Teste da página principal do Blog (lista de posts) | 130 | ✅ 2 casos |
| `settings-cache.test.js` | Teste da API de Configurações com Cache Redis | 184 | ✅ 3 casos |
| `videos_validation.test.js` | Teste de validação da API de Vídeos | 107 | ✅ 4 casos |
| `scripts/clean-orphaned-images.test.js` | Teste do script de limpeza de imagens órfãs | 92 | ✅ 5 casos |
| `pages/api/products.edge.test.js` | Teste de edge cases da API de Produtos | 155 | ✅ 8 casos |
| `pages/api/upload-image.edge.test.js` | Teste de edge cases da API de Upload de Imagens | 65 | ✅ 1 caso |
| `pages/api/admin/dicas.edge.test.js` | Teste de edge cases da API Administrativa de Dicas | 57 | ✅ 2 casos |
| `pages/api/admin/fetch-ml.edge.test.js` | Teste de edge cases da API de Extração Mercado Livre | 193 | ✅ 6 casos |
| `pages/api/admin/fetch-spotify.edge.test.js` | Teste de edge cases da API de Extração Spotify | 59 | ✅ 1 caso |
| `pages/api/admin/posts.edge.test.js` | Teste de edge cases da API Administrativa de Posts | 175 | ✅ 11 casos |
| `pages/api/admin/rate-limit.test.js` | Teste da API Administrativa de Rate Limit | 198 | ✅ 14 casos |
| `pages/api/admin/roles.edge.test.js` | Teste de edge cases da API Administrativa de Cargos/Permissões | 103 | ✅ 4 casos |
| `pages/api/admin/stats.edge.test.js` | Teste de edge cases da API Administrativa de Estatísticas | 53 | ✅ 2 casos |
| `pages/api/auth/login.edge.test.js` | Teste de edge cases da API de Autenticação Login | 55 | ✅ 1 caso |
| `domain/posts.test.js` | Teste da camada de Domínio - Posts | 160 | ✅ 8 casos |
| `domain/settings.test.js` | Teste da camada de Domínio - Configurações | 112 | ✅ 6 casos |
| `domain/videos.test.js` | Teste da camada de Domínio - Vídeos | 137 | ✅ 8 casos |

---

## 🔍 Detalhamento dos Arquivos

---

### 1. Arquivo: `/tests/unit/[slug].test.js`

#### ✅ Propósito
Testa a renderização e comportamento da página individual de post do Blog (componente `BlogPost`).

#### 📁 Estrutura
- **Framework**: Jest + React Testing Library
- **Mocks Utilizados**: `next/link`, `next/head`, módulo CSS `Blog.module.css`
- **Componente Testado**: `BlogPost`

#### 🧪 Casos de Teste Cobertos:
1.  **Renderização correta do conteúdo do post**
    - Verifica título, data, parágrafos separados, imagem e link de retorno
    - Valida formatação de data em padrão pt-BR
2.  **Botões de compartilhamento com URLs corretas**
    - Verifica links do WhatsApp e Facebook
    - Valida encode correto do título e presença do slug na URL
3.  **Renderização condicional de imagem**
    - Não renderiza elemento `<img>` quando não existe `image_url` no post

#### 💡 Observações
- Componente mockado internamente no arquivo de teste
- Testes validam comportamento visual e interativo do componente
- Cobre cenários felizes e cenários de borda

---

### 2. Arquivo: `/tests/unit/clean-test-db.test.js`

#### ✅ Propósito
Testa o script de limpeza automática dos arquivos de banco de dados utilizados durante os testes.

#### 📁 Estrutura
- **Framework**: Jest
- **Mock Utilizado**: Módulo nativo `fs` (File System)
- **Função Testada**: `cleanTestDb()`

#### 🧪 Casos de Teste Cobertos:
1.  **Remoção de arquivos existentes**
    - Verifica que arquivos `test.db` e `caminhar-test.db` são removidos quando existem
    - Confirma que `unlinkSync` é chamado exatamente 2 vezes para ambos os bancos
2.  **Não executa operação quando arquivos não existem**
    - Valida que nenhuma chamada de remoção é realizada quando os arquivos não estão presentes
    - Garante comportamento seguro sem erros

#### 💡 Observações
- Teste de script de manutenção e utilitário
- Valida comportamento idempotente do script
- Arquivos alvo estão localizados no diretório `data/`

---

### 3. Arquivo: `/tests/unit/index.test.js`

#### ✅ Propósito
Testa a renderização e comportamento da página principal do Blog (lista de posts - componente `BlogIndex`).

#### 📁 Estrutura
- **Framework**: Jest + React Testing Library
- **Mocks Utilizados**: `next/link`, `next/head`, módulo CSS `Blog.module.css`
- **Componente Testado**: `BlogIndex`

#### 🧪 Casos de Teste Cobertos:
1.  **Renderização do cabeçalho e lista de posts**
    - Valida cabeçalho principal e subtítulo do blog
    - Verifica renderização de múltiplos posts com título, resumo, data e link de leitura
    - Cobre cenário com múltiplos registros
2.  **Mensagem amigável quando não existem posts**
    - Renderiza texto "Nenhum post publicado ainda." quando lista está vazia
    - Garante boa experiência do usuário em estado vazio

#### 💡 Observações
- Componente mockado internamente no arquivo de teste
- Teste cobre estados vazios e preenchidos
- Valida estrutura visual e organização do grid de posts

---

---

### 4. Arquivo: `/tests/unit/settings-cache.test.js`

#### ✅ Propósito
Teste de integração end-to-end da API de Configurações, com foco especial no comportamento e ciclo de vida do cache Redis.

#### 📁 Estrutura
- **Framework**: Jest + node-mocks-http
- **Mocks Utilizados**: `lib/db.js`, `lib/auth.js`, `lib/redis.js`
- **Endpoint Testado**: API `/api/settings` (handler da rota)

#### 🧪 Casos de Teste Cobertos:
1.  **Cache Miss (Primeira requisição)**
    - Valida que primeira requisição busca dados diretamente do banco de dados
    - Verifica que dados são salvos no Redis com TTL de 30 minutos (1800 segundos)
2.  **Cache Hit (Requisições subsequentes)**
    - Confirma que requisições seguintes não acessam o banco de dados
    - Dados são retornados diretamente do cache Redis sem acesso a disco
3.  **Invalidação de Cache em atualização**
    - Quando uma configuração é alterada via método PUT, cache é automaticamente invalidado
    - Verifica deleção das chaves `settings:v1:all` e chave individual da configuração atualizada

#### 💡 Observações
- Teste mais complexo e completo do conjunto de testes unitários
- Cobre todo ciclo de vida do cache: criação, utilização e invalidação
- Valida comportamento de autenticação e autorização da API
- Mock do Redis implementado com store em memória para testes determinísticos
- TTL de cache parametrizado em 30 minutos

---

### 5. Arquivo: `/tests/unit/videos_validation.test.js`

#### ✅ Propósito
Teste de validação de limites e regras de negócio da API administrativa de Vídeos.

#### 📁 Estrutura
- **Framework**: Jest + node-mocks-http
- **Mocks Utilizados**: `lib/auth.js`, `lib/domain/videos.js`, `lib/cache.js`
- **Endpoint Testado**: API `/api/admin/videos`

#### 🧪 Casos de Teste Cobertos:
1.  **Limite máximo de 500 caracteres na descrição (método POST)**
    - Retorna erro 400 quando descrição excede 500 caracteres
2.  **Limite máximo de 500 caracteres na descrição (método PUT)**
    - Valida mesmo limite para atualização de vídeos existentes
3.  **Permite descrição com 500 caracteres exatos**
    - Valida o limite superior permitido sem erros
4.  **Retorno 404 para vídeo inexistente na atualização**
    - Trata corretamente tentativa de atualizar vídeo que não existe no banco

#### 💡 Observações
- Middleware de autenticação é mockado para simular usuário admin
- Testes focados exclusivamente nas regras de validação dos dados
- Cobertura de limites e cenários de borda da API

---

### 6. Arquivo: `/tests/unit/scripts/clean-orphaned-images.test.js`

#### ✅ Propósito
Teste completo do script de manutenção que remove imagens carregadas mas não referenciadas em nenhum registro do banco de dados.

#### 📁 Estrutura
- **Framework**: Jest
- **Mocks Utilizados**: `fs`, `dotenv`, `pg` (PostgreSQL)
- **Função Testada**: `cleanOrphanedImages()`

#### 🧪 Casos de Teste Cobertos:
1.  **Remoção correta de arquivos órfãos**
    - Identifica e remove apenas arquivos que não possuem referência no banco
    - Garante que arquivos em uso NÃO são removidos
2.  **Comportamento seguro quando diretório não existe**
    - Não executa nenhuma operação se diretório `/uploads` não for encontrado
3.  **Tratamento de erros de banco de dados**
    - Script não quebra mesmo com falha na conexão ou consulta ao banco
4.  **Tratamento de coluna inexistente em tabelas**
    - Continua execução normal e gera aviso quando coluna `image_url` não existe em alguma tabela
5.  **Ignora arquivos irrelevantes**
    - Não remove arquivos que não correspondem aos prefixos conhecidos de upload

#### 💡 Observações
- Teste de script de manutenção crítica do sistema
- Cobre múltiplos cenários de falha e recuperação
- Garante comportamento resiliente e seguro do script

---

### 7. Arquivo: `/tests/unit/pages/api/products.edge.test.js`

#### ✅ Propósito
Testes especializados em cenários de borda e casos extremos da API de Produtos. Foca em situações que normalmente não são testadas nos fluxos padrão.

#### 📁 Estrutura
- **Framework**: Jest
- **Mocks Utilizados**: `lib/db.js`, `lib/auth.js`, `lib/cache.js`
- **Endpoint Testado**: API `/api/products`

#### 🧪 Casos de Teste Cobertos:
1.  **Bloqueio de métodos HTTP não permitidos (405 Method Not Allowed)**
2.  **Tratamento de erro interno não tratado (500 Internal Server Error)**
3.  **Fallback de IP e formatação automática de preço no POST**
4.  **Fallbacks quando banco retorna valores vazios ou nulos no GET**
5.  **Tratamento silencioso de falha na autenticação no GET**
6.  **Fallbacks de ID, log e retorno no método PUT**
7.  **Fallbacks de ID e título no método DELETE**
8.  **Funcionamento do Rate Limit (429 Too Many Requests)**

#### 💡 Observações
- Testes focados exclusivamente em edge cases
- Cobre falhas silenciosas, fallbacks e recuperação de erros
- Valida robustez e resiliência da API em cenários adversos
- Suprime logs de console durante execução dos testes

---

---

### 8. Arquivo: `/tests/unit/pages/api/upload-image.edge.test.js`

#### ✅ Propósito
Teste de cenário de borda da API de Upload de Imagens.

#### 📁 Estrutura
- **Framework**: Jest
- **Mocks Utilizados**: `fs`, `formidable`, `lib/db.js`, `lib/middleware.js`
- **Endpoint Testado**: API `/api/upload-image`

#### 🧪 Casos de Teste Cobertos:
1.  **Criação automática do diretório de uploads**
    - Verifica que diretório `/public/uploads` é criado automaticamente caso não exista
    - Valida criação com flag `recursive: true`

#### 💡 Observações
- Teste de caso extremo específico
- Garante que API funciona mesmo em instalação limpa sem diretório pré-criado
- Mock do fs mantém funcionalidades originais exceto o que precisa ser testado

---

---

### 9. Arquivo: `/tests/unit/pages/api/admin/dicas.edge.test.js`

#### ✅ Propósito
Teste de cenários de borda da API administrativa de gerenciamento de Dicas.

#### 📁 Estrutura
- **Framework**: Jest
- **Mocks Utilizados**: `lib/db.js`, `lib/auth.js`
- **Endpoint Testado**: API `/api/admin/dicas`

#### 🧪 Casos de Teste Cobertos:
1.  **Fallback de IP unknown e valor padrão published=true no POST**
    - Valida que o IP é definido como 'unknown' quando não disponível
    - Verifica que valor padrão `true` é usado quando campo `published` não é enviado
2.  **Fallback de IP unknown e valor padrão published=true no PUT**
    - Mesmos comportamentos validados para método de atualização

#### 💡 Observações
- Middleware de autenticação é ignorado para focar na lógica interna
- Testes focados em valores padrão e fallbacks da API
- Valida também o log de atividades gerado automaticamente

---

### 10. Arquivo: `/tests/unit/pages/api/admin/fetch-ml.edge.test.js`

#### ✅ Propósito
Teste completo de cenários de borda e fallbacks da API de extração automática de dados de produtos do Mercado Livre.

#### 📁 Estrutura
- **Framework**: Jest
- **Mocks Utilizados**: `lib/auth.js`, `global.fetch`
- **Endpoint Testado**: API `/api/admin/fetch-ml`

#### 🧪 Casos de Teste Cobertos:
1.  **Ordenação de IDs quando existe ID explícito na URL**
2.  **Fallback para produto de catálogo quando requisição de item falha**
3.  **Fallback de scraping HTML quando API oficial falha com preço inválido**
4.  **Fallback de scraping HTML com extração de preço de meta tag**
5.  **Fallback de preço 0 e URL de imagem não segura**
6.  **Tratamento de erro quando fallback de scraping falha**

#### 💡 Observações
- Teste mais complexo de edge cases da API
- Cobre toda a cadeia de fallbacks da extração: API Oficial -> Catálogo -> Scraping HTML
- Valida todos os pontos de falha e recuperação do sistema
- Mock completo do fetch global para simular respostas HTTP

---

### 11. Arquivo: `/tests/unit/pages/api/admin/fetch-spotify.edge.test.js`

#### ✅ Propósito
Teste de cenário de borda da API de extração de dados de músicas do Spotify.

#### 📁 Estrutura
- **Framework**: Jest
- **Mocks Utilizados**: `lib/auth.js`, `global.fetch`
- **Endpoint Testado**: API `/api/admin/fetch-spotify`

#### 🧪 Casos de Teste Cobertos:
1.  **Falha simultânea das 3 estratégias de extração**
    - Valida comportamento quando oEmbed, iframe e scraping HTML falham todos
    - Verifica que todos os erros são logados no console
    - Confirma retorno da mensagem de erro final amigável para o usuário

#### 💡 Observações
- Teste de cenário de falha total do sistema
- Valida resiliência e tratamento correto de múltiplas falhas consecutivas
- Confirma que API não quebra mesmo com todas as estratégias falhando

---

---

### 12. Arquivo: `/tests/unit/pages/api/admin/posts.edge.test.js`

#### ✅ Propósito
Teste completo de cenários de borda da API administrativa de gerenciamento de Posts.

#### 📁 Estrutura
- **Framework**: Jest
- **Mocks Utilizados**: `lib/auth.js`, `lib/db.js`, `lib/cache.js`, `lib/domain/posts.js`, `lib/crud.js`, `lib/domain/audit.js`
- **Endpoint Testado**: API `/api/admin/posts`

#### 🧪 Casos de Teste Cobertos:
1.  Retorno 401 quando usuário não está autenticado
2.  Retorno 403 quando usuário não tem permissão
3.  Fallback para array vazio quando usuário não tem permissões cadastradas
4.  Erro de validação Zod para URL de imagem inválida no POST
5.  Erro de validação para ID negativo no PUT
6.  Erro quando nenhum dado é fornecido para atualização no PUT
7.  Erro de validação Zod para URL de imagem inválida no PUT
8.  Tratamento de erro 500 quando operação DELETE falha
9.  Tratamento de erro 500 quando operação PUT falha
10. Bloqueio de métodos HTTP não permitidos (405)
11. Funcionamento da operação de reordenação de posts

#### 💡 Observações
- Maior quantidade de casos de teste entre todos os arquivos
- Cobre autenticação, autorização, validações, erros e operações especiais
- Valida toda a cadeia de segurança e tratamento de erros da API
- 11 casos de teste cobrindo todos os fluxos da API

---

---

### 13. Arquivo: `/tests/unit/pages/api/admin/rate-limit.test.js`

#### ✅ Propósito
Teste completo da API administrativa de gerenciamento de Rate Limit e bloqueios de IP.

#### 📁 Estrutura
- **Framework**: Jest
- **Mocks Utilizados**: `@upstash/redis`, `lib/auth.js`
- **Endpoint Testado**: API `/api/admin/rate-limit`

#### 🧪 Casos de Teste Cobertos:
1.  Retorno 501 quando Redis não está configurado
2.  Exportação CSV com filtros de data e busca
3.  Retorno do IP atual com normalização ::1 → 127.0.0.1
4.  Listagem da whitelist de IPs
5.  Listagem de logs de auditoria com paginação e busca
6.  Listagem de IPs bloqueados com filtro de limite de tentativas
7.  Retorno array vazio quando não existem chaves ativas
8.  Adição de IP à whitelist com auditoria
9.  Validação de IP obrigatório no POST
10. Remoção de IP da whitelist
11. Desbloqueio manual de IP com fallback de usuário no log
12. Validação de IP obrigatório no DELETE
13. Bloqueio de métodos HTTP não permitidos (405)
14. Tratamento de erro interno e retorno 500

#### 💡 Observações
- Maior arquivo de teste unitário do projeto
- 14 casos de teste cobrindo todos os fluxos da API
- Mock completo da instância Redis
- Valida comportamento de whitelist, auditoria, exportação e gerenciamento de bloqueios

---

### 14. Arquivo: `/tests/unit/pages/api/admin/roles.edge.test.js`

#### ✅ Propósito
Teste de cenários de borda da API administrativa de gerenciamento de Cargos e Permissões.

#### 📁 Estrutura
- **Framework**: Jest
- **Mocks Utilizados**: `lib/auth.js`, `lib/db.js`
- **Endpoint Testado**: API `/api/admin/roles`

#### 🧪 Casos de Teste Cobertos:
1.  Fallback para permissões vazias quando cargo não existe
2.  Processamento de permissões enviadas como string JSON no POST
3.  Extração de ID da query e fallback de retorno vazio no PUT
4.  Fallback de nome para ID no log de auditoria no DELETE

#### 💡 Observações
- Testes focados em casos não padrão e fallbacks
- Valida comportamento da API com dados e formatos inesperados
- Cobre tratamento de tipos e valores não documentados

---

### 15. Arquivo: `/tests/unit/pages/api/admin/stats.edge.test.js`

#### ✅ Propósito
Teste de cenários de borda da API administrativa de Estatísticas.

#### 📁 Estrutura
- **Framework**: Jest
- **Mocks Utilizados**: `lib/auth.js`, `lib/db.js`
- **Endpoint Testado**: API `/api/admin/stats`

#### 🧪 Casos de Teste Cobertos:
1.  Bloqueio de métodos HTTP diferentes de GET (405)
2.  Tratamento de erro de banco de dados e retorno 500

#### 💡 Observações
- Teste básico de edge cases
- Valida segurança e tratamento de erros da API

---

---

### 16. Arquivo: `/tests/unit/pages/api/auth/login.edge.test.js`

#### ✅ Propósito
Teste de cenário de borda da API de autenticação Login.

#### 📁 Estrutura
- **Framework**: Jest
- **Mocks Utilizados**: `lib/auth.js`, `lib/cache.js`
- **Endpoint Testado**: API `/api/auth/login`

#### 🧪 Casos de Teste Cobertos:
1.  Tratamento de erro interno durante autenticação
    - Valida log de erro no console
    - Confirma retorno de mensagem amigável para usuário
    - Garante que API não quebra com falha no banco de dados

#### 💡 Observações
- Teste de resiliência e tratamento de falhas
- Valida comportamento da API em cenário de erro

---

---

### 17. Arquivo: `/tests/unit/domain/posts.test.js`

#### ✅ Propósito
Teste completo da camada de domínio para gerenciamento de Posts. Testa a lógica de negócio isolada das rotas da API.

#### 📁 Estrutura
- **Framework**: Jest
- **Mocks Utilizados**: `lib/db.js`, `lib/crud.js`, `lib/domain/audit.js`
- **Módulo Testado**: `lib/domain/posts.js`

#### 🧪 Casos de Teste Cobertos:
1.  **getRecentPosts():** Cálculo correto de limit, offset e totalPages
2.  **getRecentPosts():** Adição de filtros de busca na query
3.  **getPaginatedPosts():** Ordenação específica por posição para painel administrativo
4.  **getAllPosts():** Busca de todos os posts sem filtros
5.  **createPost():** Tratamento de valores ausentes e preenchimento de defaults
6.  **updatePost():** Inclusão automática do timestamp atual via função raw SQL
7.  **deletePost():** Chamada correta ao módulo CRUD
8.  **createPostWithAudit():** Garantia de transação compartilhada entre criação do post e log de auditoria

#### 💡 Observações
- Primeiros testes da camada de domínio do projeto
- Valida lógica de paginação, transações e valores padrão
- Garante que a camada de negócio funciona corretamente independente das rotas API

---

### 18. Arquivo: `/tests/unit/domain/settings.test.js`

#### ✅ Propósito
Teste completo da camada de domínio para gerenciamento de Configurações do sistema.

#### 📁 Estrutura
- **Framework**: Jest
- **Mocks Utilizados**: `lib/db.js`, `lib/crud.js`
- **Módulo Testado**: `lib/domain/settings.js`

#### 🧪 Casos de Teste Cobertos:
1.  **getSetting():** Retorno do valor quando configuração existe no banco
2.  **getSetting():** Retorno do valor padrão quando configuração não existe
3.  **getSettings():** Retorno de objeto mapeado chave-valor com todas as configurações
4.  **updateSetting():** Preparação correta dos dados e chamada ao upsertRecord
5.  **setSetting():** Verificação que é um alias exato para updateSetting
6.  **getAllSettings():** Retorno do array completo com todos os registros

#### 💡 Observações
- Testes cobrem todos os métodos públicos do módulo
- Valida comportamento de fallback e valores padrão
- Verifica funcionamento do upsert com timestamp automático

---

### 19. Arquivo: `/tests/unit/domain/videos.test.js`

#### ✅ Propósito
Teste completo da camada de domínio para gerenciamento de Vídeos.

#### 📁 Estrutura
- **Framework**: Jest
- **Mocks Utilizados**: `lib/db.js`, `lib/crud.js`
- **Módulo Testado**: `lib/domain/videos.js`

#### 🧪 Casos de Teste Cobertos:
1.  **getPaginatedVideos():** Cálculo correto de paginação sem busca
2.  **getPaginatedVideos():** Inclusão de filtros de busca LIKE na query
3.  **getPublicPaginatedVideos():** Filtro obrigatório `publicado = true` para API pública
4.  **createVideo():** Atribuição automática da próxima posição disponível
5.  **createVideo():** Atribuição da posição 1 quando tabela está vazia
6.  **updateVideo():** Chamada correta ao módulo CRUD
7.  **deleteVideo():** Chamada correta ao módulo CRUD
8.  **reorderVideos():** Atualização atômica de posições dentro de transação única

#### 💡 Observações
- Cobre lógica de ordenação e posicionamento automático dos vídeos
- Valida separação entre rotas públicas e administrativas
- Testa comportamento de transação e atomicidade nas operações de reordenação

---

## 📊 Estatísticas Gerais

| Métrica | Valor |
|---------|-------|
| Total de arquivos de teste | 19 |
| Total de linhas de código de teste | 2238 |
| Total de casos de teste | 91 |
| Cobertura média por arquivo | 4,8 casos |
| Tipos de teste: | Componente React, Script Utilitário, API Backend, Edge Cases, Integração, Segurança, Camada de Domínio |

---

## ✅ Padrões Observados

1.  **Todos os testes são determinísticos e independentes**
2.  Uso consistente de mocks para dependências externas
3.  Estrutura padrão `describe -> beforeEach -> it`
4.  Testes cobrem cenários felizes e cenários de borda
5.  Nomenclatura clara e objetiva para todos os casos
6.  Sem dependências externas durante execução dos testes