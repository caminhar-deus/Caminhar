# Documentação dos Testes de Carga
> Arquivo gerado com análise completa dos arquivos indicados

---

## 📋 Visão Geral
Todos os testes abaixo são implementados utilizando **k6** como ferramenta de teste de carga e performance. Cada teste possui um propósito específico, thresholds definidos e cenários otimizados para validação do sistema.

---

## 🔍 Análise Individual dos Arquivos

---

### ✅ `/load-tests/authenticated-flow.js`
**Propósito**: Teste de carga para fluxo de autenticação e acesso a rotas protegidas

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Carga |
| **Alvo** | Fluxo completo: Login + Acesso a rota protegida |
| **Cenário** | Ramp-up gradual de usuários virtuais |

#### Funcionamento:
1.  Realiza login na API com credenciais de administrador
2.  Valida se o token de autenticação é retornado corretamente
3.  Utiliza o token recebido para acessar a rota `/api/v1/settings`
4.  Simula comportamento natural do usuário com intervalo de 2 segundos entre requisições

#### Regras e Thresholds:
- ✅ 95% das requisições devem responder em menos de **1000ms**
- ✅ Taxa de sucesso de login > **99%**
- ✅ Taxa de sucesso de acesso a rota protegida > **99%**
- ❌ Aborta execução imediatamente se o servidor não estiver disponível

#### Observações:
- Credenciais podem ser passadas por variáveis de ambiente (`ADMIN_USERNAME`, `ADMIN_PASSWORD`)
- Possui abortamento automático em caso de falha de conexão
- Possui logs detalhados em caso de falha no login

---

### ✅ `/load-tests/backup-verification-test.js`
**Propósito**: Teste funcional de validação do sistema de backups

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste Funcional |
| **Alvo** | Endpoint de listagem de backups administrativos |
| **Execução** | Apenas 1 iteração com 1 usuário |

#### Funcionamento:
1.  Realiza login como administrador
2.  Acessa o endpoint `/api/admin/backups`
3.  Valida a estrutura da resposta JSON
4.  Verifica existência e integridade da lista de backups e do último backup registrado

#### Regras e Thresholds:
- ✅ **100%** das verificações devem passar
- ✅ Status HTTP deve ser 200
- ✅ Header `Content-Type` deve ser `application/json`
- ✅ Estrutura do retorno deve conter array de backups e objeto `latest`

#### Observações:
- Gera relatório JSON automaticamente em `./reports/k6-summaries/`
- Oculta token de autenticação nos relatórios de saída por segurança
- Exibe no terminal quantidade de backups encontrados

---

### ✅ `/load-tests/cache-headers-test.js`
**Propósito**: Validação da presença e configuração correta dos headers de cache

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste Funcional / Validação |
| **Alvo** | Headers de Cache na rota pública `/api/posts` |
| **Execução** | 5 iterações sequenciais |

#### Funcionamento:
1.  Realiza requisição GET para rota `/api/posts`
2.  Verifica a existência dos headers de cache obrigatórios
3.  Valida as diretivas de cache recomendadas para performance
4.  Exibe log do header recebido em cada iteração

#### Verificações Realizadas:
- ✅ Header `Cache-Control` está presente
- ✅ Contém diretiva `s-maxage` (para cache compartilhado / CDN)
- ✅ Contém diretiva `stale-while-revalidate` (para revalidação em segundo plano)

#### Observações:
- Modo Soft Fail: Não falha a execução, apenas exibe avisos no terminal
- Gera relatórios em formato JSON e HTML
- Ideal para validação rápida de configurações de cache em ambientes de desenvolvimento

---

### ✅ `/load-tests/cache-performance-test.js`
**Propósito**: Teste de performance e validação de efetividade do sistema de cache

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Carga / Performance |
| **Alvo** | Rotas cacheadas públicas e autenticadas |
| **Cenário** | Warm-up + Carga Alta Simultânea |

#### Funcionamento:
1.  **Fase 1 (Warm-up)**: 5 usuários por 5 segundos para popular o cache
2.  **Fase 2 (Carga Alta)**: 50 usuários simultâneos por 15 segundos
3.  Simula IPs diferentes para evitar bloqueio por rate limit
4.  Testa duas rotas diferentes:
    - `/api/v1/settings` (Autenticada)
    - `/api/posts` (Pública)

#### Regras e Thresholds:
- ✅ **95%** das requisições cacheadas devem responder em menos de **100ms**
- ✅ Taxa de erro deve ser menor que **1%**
- ✅ Corpo da resposta deve ser válido e não vazio

#### Observações:
- Utiliza spoofing de IP para simular usuários reais diferentes
- Valida tanto a latência quanto a integridade do conteúdo retornado
- Aborta automaticamente se o servidor não estiver disponível ou login falhar

---

### ✅ `/load-tests/ip-spoofing-test.js`
**Propósito**: Teste de vulnerabilidade para validação de confiança no cabeçalho X-Forwarded-For e evasão de Rate Limit

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Segurança / Vulnerabilidade |
| **Alvo** | Sistema de Rate Limit + Rota de Login |
| **Execução** | 10 usuários simultâneos por 20 segundos |

#### Funcionamento:
1.  Gera endereços IPv4 aleatórios para cada requisição
2.  Injeta IP falso no cabeçalho `X-Forwarded-For`
3.  Realiza tentativas de login com senha inválida
4.  Verifica se o servidor aceita o IP ou bloqueia globalmente

#### Regras e Verificações:
- ✅ **Sucesso do ataque**: Receber status 401 (credencial inválida) significa que o Rate Limit foi evadido
- ✅ **Falha do ataque**: Receber status 429 significa que o Rate Limit funcionou corretamente

#### Observações:
- Este teste serve para validar se o sistema confia cegamente no cabeçalho de IP do proxy
- Em produção este cabeçalho deve ser aceito somente de fontes confiáveis

---

### ✅ `/load-tests/login-negative-test.js`
**Propósito**: Teste de segurança para validação de comportamento correto em logins inválidos

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Segurança / Negativo |
| **Alvo** | Rota de autenticação |
| **Execução** | 10 usuários simultâneos |

#### Cenários Testados:
1.  **Usuário existente, senha incorreta**: Deve retornar 401
2.  **Usuário inexistente**: Deve retornar 401 com MESMA mensagem genérica

#### Regras e Thresholds:
- ✅ 95% das respostas de erro devem responder em menos de **300ms**
- ✅ Taxa de sucesso das verificações > **99%**
- ✅ Ambos os cenários devem retornar a mesma mensagem "Credenciais inválidas" (nunca revelar se o usuário existe)

---

### ✅ `/load-tests/musicas-crud-test.js`
**Propósito**: Teste de carga completo do fluxo CRUD do módulo de músicas

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Carga (Operações Completas) |
| **Alvo** | API Administrativa de Músicas |
| **Cenário** | Ciclo completo: CREATE → UPDATE → DELETE |

#### Funcionamento:
1.  Cria uma nova música com dados únicos
2.  Atualiza os dados da música criada
3.  Deleta a música criada
4.  Contadores personalizados para cada tipo de erro

#### Regras e Thresholds:
- ✅ 95% das requisições devem responder em menos de **800ms**
- ✅ **ZERO ERROS** permitidos em criação, atualização e deleção
- ✅ Todas as operações devem retornar status HTTP correto

#### Observações:
- Cada iteração cria uma música própria e limpa ela no final
- Não deixa lixo no banco de dados
- Gera relatórios em JSON e HTML
- Oculta token de autenticação nos relatórios

---

### ✅ `/load-tests/musicas-filter-test.js`
**Propósito**: Teste funcional de validação do sistema de busca e filtro de músicas

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste Funcional |
| **Alvo** | Rota pública de busca de músicas |
| **Execução** | 5 iterações sequenciais |

#### Funcionamento:
1.  Seleciona aleatoriamente nome de artistas conhecidos
2.  Realiza busca na API pública
3.  Valida estrutura da resposta
4.  Verifica se o termo buscado está presente no resultado

#### Regras e Thresholds:
- ✅ **100%** das verificações devem passar
- ✅ 95% das requisições devem responder em menos de **500ms**
- ✅ Resposta deve ser um array válido

---

### ✅ `/load-tests/musicas-load-test.js`
**Propósito**: Teste de carga para listagem administrativa de músicas

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Carga |
| **Alvo** | Rota administrativa `/api/admin/musicas` |
| **Cenário** | Carga moderada controlada |

#### Funcionamento:
1.  Realiza login uma única vez na fase de setup
2.  Utiliza spoofing de IP para evitar bloqueio por Rate Limit
3.  Realiza requisições de listagem com 5 usuários simultâneos
4.  Valida conteúdo e tempo de resposta

#### Regras e Thresholds:
- ✅ 95% das requisições devem responder em menos de **300ms**
- ✅ Taxa de erro < **1%**
- ❌ Aborta automaticamente se login falhar ou servidor não estiver disponível

---

### ✅ `/load-tests/musicas-pagination-test.js`
**Propósito**: Teste funcional de validação da lógica de paginação

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste Funcional |
| **Alvo** | Paginação na rota pública de músicas |
| **Execução** | Apenas 1 iteração |

#### Funcionamento:
1.  Requisita página 1 com limit=5
2.  Extrai IDs dos registros retornados
3.  Requisita página 2 com mesmo limit
4.  Valida que não existem registros duplicados entre as páginas
5.  Verifica que o conteúdo das páginas é diferente

#### Regras e Thresholds:
- ✅ **100%** das verificações devem passar
- ✅ IDs não devem se repetir entre páginas

#### Observações:
- Se houver poucos registros no banco o teste exibe aviso mas não falha
- Testa a integridade da lógica de paginação e offset

---

### ✅ `/load-tests/musicas-search-test.js`
**Propósito**: Teste funcional de busca por título de músicas

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste Funcional |
| **Alvo** | Busca textual na rota pública de músicas |
| **Execução** | 5 iterações sequenciais |

#### Funcionamento:
1.  Seleciona termos comuns encontrados em títulos de músicas
2.  Realiza busca na API pública
3.  Valida estrutura da resposta
4.  Verifica se pelo menos um resultado contém o termo buscado no título

#### Regras e Thresholds:
- ✅ **100%** das verificações devem passar
- ✅ 95% das requisições devem responder em menos de **500ms**

---

### ✅ `/load-tests/musicas-sort-test.js`
**Propósito**: Teste funcional de validação da ordenação por data

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste Funcional |
| **Alvo** | Ordenação decrescente por data de criação |
| **Execução** | Apenas 1 iteração |

#### Funcionamento:
1.  Requisita músicas com ordenação `created_at DESC`
2.  Valida que cada registro é mais antigo que o registro anterior
3.  Verifica a integridade da ordenação em toda a lista retornada

#### Regras e Thresholds:
- ✅ **100%** das verificações devem passar
- ✅ Registros devem estar ordenados do mais recente para o mais antigo

---

### ✅ `/load-tests/pagination-test.js`
**Propósito**: Teste funcional de validação da paginação offset padrão para posts

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste Funcional |
| **Alvo** | Paginação na rota pública `/api/posts` |
| **Execução** | Apenas 1 iteração |

#### Funcionamento:
1.  Requisita página 1 com limit=5
2.  Extrai IDs dos registros retornados
3.  Requisita página 2 com mesmo limit
4.  Valida que não existem registros duplicados entre as páginas
5.  Verifica que o conteúdo das páginas é diferente

#### Regras e Thresholds:
- ✅ **100%** das verificações devem passar
- ✅ IDs não devem se repetir entre páginas

#### Observações:
- Se houver poucos registros no banco o teste exibe aviso mas não falha
- Testa a integridade da lógica de paginação padrão baseada em número de página

---

### ✅ `/load-tests/posts-cursor-pagination-test.js`
**Propósito**: Teste funcional de validação da paginação por cursor para posts

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste Funcional |
| **Alvo** | Paginação por cursor na rota pública `/api/posts` |
| **Execução** | Apenas 1 iteração |

#### Funcionamento:
1.  Requisita primeira página sem cursor
2.  Extrai o ID do último registro como cursor
3.  Requisita próxima página utilizando o cursor
4.  Valida que não há repetição do registro cursor na próxima página

#### Regras e Thresholds:
- ✅ **100%** das verificações devem passar
- ✅ O registro cursor não deve aparecer na página seguinte

---

### ✅ `/load-tests/posts-tags-test.js`
**Propósito**: Teste funcional de validação do filtro por tags para posts

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste Funcional |
| **Alvo** | Filtro por tags na rota pública `/api/posts` |
| **Execução** | 5 iterações sequenciais |

#### Funcionamento:
1.  Seleciona tags comuns existentes no sistema
2.  Realiza requisição com parâmetro `?tag=`
3.  Valida estrutura da resposta
4.  Verifica se pelo menos um resultado contém a tag filtrada

#### Regras e Thresholds:
- ✅ **100%** das verificações devem passar
- ✅ 95% das requisições devem responder em menos de **500ms**

---

### ✅ `/load-tests/rate-limit-test.js`
**Propósito**: Teste de validação e efetividade do sistema de Rate Limit

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Resiliência |
| **Alvo** | Sistema de Rate Limit na rota de login |
| **Execução** | 50 usuários simultâneos |

#### Funcionamento:
1.  Simula ataque de força bruta na rota de login
2.  Envia requisições sem intervalo para maximizar taxa
3.  Inclui todos os cabeçalhos padrão de IP de proxies
4.  Conta quantas vezes o Rate Limit foi acionado

#### Regras e Thresholds:
- ✅ O teste é considerado SUCESSO se o servidor retornar status 429 pelo menos uma vez
- ✅ Se o Rate Limit não for acionado o teste exibe aviso de configuração

#### Observações:
- Não falha a suíte de testes para não bloquear CI enquanto a infraestrutura é ajustada
- No final do teste exibe aviso se o Rate Limit não foi acionado
- Valida também a mensagem de erro retornada

---

### ✅ `/load-tests/recovery-test.js`
**Propósito**: Teste de monitoramento e medição do tempo de recuperação do sistema após falha

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Resiliência / Chaos |
| **Alvo** | Recuperação automática do sistema após falha |
| **Execução** | 1 usuário monitorando por 2 minutos |

#### Funcionamento:
1.  Monitora continuamente a disponibilidade do sistema verificando a rota de posts
2.  Detecta automaticamente quando o sistema cai
3.  Inicia cronômetro no momento da falha
4.  Detecta automaticamente quando o sistema volta
5.  Calcula e registra o tempo total de indisponibilidade

#### Regras e Thresholds:
- ✅ O teste passa se o sistema se recuperar pelo menos uma vez
- ✅ Mede métrica personalizada `recovery_time_ms` (Tempo Para Recuperação)

#### Observações:
- Teste para ser executado enquanto o operador derruba e sobe o banco manualmente
- Não falha se o sistema permanecer estável durante todo o teste
- Verifica a cada 500ms para máxima precisão na medição

---

### ✅ `/load-tests/search-content-test.js`
**Propósito**: Teste funcional completo da busca textual no conteúdo dos posts

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste Funcional |
| **Alvo** | Busca global na rota pública `/api/posts` |
| **Execução** | 10 iterações sequenciais |

#### Funcionamento:
1.  Seleciona termos comuns encontrados no conteúdo
2.  Realiza busca na API com paginação explícita
3.  Valida estrutura da resposta
4.  Verifica se o termo buscado está presente em título, conteúdo ou tags

#### Regras e Thresholds:
- ✅ **100%** das verificações devem passar
- ✅ 95% das requisições devem responder em menos de **500ms**

---

### ✅ `/load-tests/stress-test-combined.js`
**Propósito**: Teste de estresse completo combinado com monitoramento de memória

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Estresse |
| **Alvo** | API Administrativa de Vídeos |
| **Execução** | 2 cenários paralelos |

#### Funcionamento:
✅ **Cenário 1 - Estresse**:
1.  Ramp-up gradual até 100 usuários simultâneos
2.  Cada usuário executa ciclo completo: CREATE → UPDATE → DELETE
3.  Gera IDs únicos de vídeo compatíveis com validação da API

✅ **Cenário 2 - Monitoramento**:
1.  A cada 1 segundo consulta o endpoint de status do Node.js
2.  Coleta métricas de memória: RSS, Heap Total, Heap Used
3.  Alerta se a memória utilizada ultrapassar 1GB

✅ **Limpeza Automática**:
- No final do teste apaga automaticamente todos os vídeos criados pelo teste

#### Regras e Thresholds:
- ✅ 95% das requisições devem responder em menos de **500ms**
- ✅ Taxa de erro < **1%**
- ✅ Taxa de sucesso das verificações > **98%**
- ✅ Memória Heap utilizada < **1GB**

---

### ✅ `/load-tests/upload-flow.js`
**Propósito**: Teste de carga para fluxo de upload de arquivos e imagens

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Carga |
| **Alvo** | Rota de upload de imagens |
| **Execução** | 5 usuários simultâneos |

#### Funcionamento:
1.  Utiliza uma imagem GIF transparente em Base64 embutida no teste (sem dependências externas)
2.  Envia arquivo utilizando multipart/form-data nativo do k6
3.  Verifica se o upload retorna sucesso e URL do arquivo
4.  Realiza requisição GET na URL retornada para confirmar que o arquivo foi salvo no disco

#### Regras e Thresholds:
- ✅ 95% dos uploads devem responder em menos de **2000ms**
- ✅ Taxa de erro < **1%**
- ❌ Aborta automaticamente se o upload retornar sucesso mas o arquivo não for acessível

---

### ✅ `/load-tests/videos-crud-test.js`
**Propósito**: Teste de carga completo do fluxo CRUD do módulo de vídeos

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Carga (Escrita) |
| **Alvo** | API Administrativa de Vídeos |
| **Cenário** | Ciclo completo: CREATE → UPDATE → DELETE |

#### Funcionamento:
1.  Realiza login uma única vez na fase setup
2.  Gera IDs de vídeo do YouTube válidos com 11 caracteres exatos para passar na validação Regex da API
3.  Cada usuário executa fluxo completo: Cria, Atualiza e Deleta o vídeo
4.  Possui limpeza automática (`teardown`) que apaga qualquer vídeo fantasma deixado por execuções interrompidas

#### Regras e Thresholds:
- ✅ **Criação**: 95% < 800ms | taxa de sucesso > 98%
- ✅ **Atualização**: 95% < 600ms | taxa de sucesso > 98%
- ✅ **Deleção**: 95% < 500ms | taxa de sucesso > 98%

#### Observações:
- Cada operação possui métricas e thresholds separados e específicos
- Limpeza automática no final do teste remove todos os vídeos criados pelo K6
- Token de autenticação é ocultado automaticamente nos relatórios de saída

---

### ✅ `/load-tests/videos-filter-test.js`
**Propósito**: Teste funcional de validação da paginação e filtro de vídeos

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste Funcional |
| **Alvo** | Paginação na rota pública `/api/videos` |
| **Execução** | 5 iterações sequenciais |

#### Funcionamento:
1.  Testa combinações aleatórias de página (1, 2, 3) e limit (5, 10, 20)
2.  Valida estrutura da resposta e integridade dos metadados de paginação
3.  Verifica se a quantidade de registros retornados corresponde ao limit solicitado
4.  Valida que os valores de página e limite retornados correspondem aos valores solicitados

#### Regras e Thresholds:
- ✅ **100%** das verificações devem passar
- ✅ 95% das requisições devem responder em menos de **500ms**

#### Observações:
- Teste tolera banco de dados vazio sem falhar
- Apenas exibe aviso se não houver vídeos cadastrados para validação completa

---

### ✅ `/load-tests/videos-load-test.js`
**Propósito**: Teste de carga para listagem administrativa de vídeos

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Carga |
| **Alvo** | Rota pública de vídeos |
| **Cenário** | Carga moderada controlada |

#### Funcionamento:
1.  Realiza login uma única vez na fase setup
2.  Utiliza spoofing de IP para evitar bloqueio por Rate Limit
3.  Testa tanto a página padrão quanto a página 2 com limite específico
4.  Valida conteúdo, estrutura e metadados de paginação em ambas as requisições

#### Regras e Thresholds:
- ✅ 95% das requisições devem responder em menos de **300ms**
- ✅ Taxa de erro < **1%**
- ❌ Aborta automaticamente se login falhar ou servidor não estiver disponível

---

### ✅ `/load-tests/videos-pagination-test.js`
**Propósito**: Teste funcional de validação da lógica de paginação para vídeos

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste Funcional |
| **Alvo** | Paginação na rota pública `/api/videos` |
| **Execução** | Apenas 1 iteração |

#### Funcionamento:
1.  Requisita página 1 com limit=5
2.  Extrai IDs dos registros retornados
3.  Requisita página 2 com mesmo limit
4.  Valida que não existem registros duplicados entre as páginas
5.  Verifica que o conteúdo das páginas é diferente

#### Regras e Thresholds:
- ✅ **100%** das verificações devem passar
- ✅ IDs não devem se repetir entre páginas

#### Observações:
- Se houver poucos registros no banco o teste exibe aviso mas não falha
- Testa a integridade da lógica de paginação e offset

---

### ✅ `/load-tests/videos-sort-test.js`
**Propósito**: Teste funcional de validação da ordenação padrão de vídeos

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste Funcional |
| **Alvo** | Ordenação padrão na rota pública `/api/videos` |
| **Execução** | Apenas 1 iteração |

#### Funcionamento:
1.  Testa a ordenação padrão da API (sempre por `created_at DESC`)
2.  Valida que os registros estão ordenados do mais recente para o mais antigo
3.  Verifica que a API aceita parâmetros de ordenação sem retornar erro (mesmo que os ignore)

#### Regras e Thresholds:
- ✅ **100%** das verificações devem passar

#### Observações:
- Teste tolera banco de dados vazio sem falhar
- Apenas exibe aviso se houver menos de 2 vídeos cadastrados
- Gera relatórios em JSON e HTML

---

### ✅ `/load-tests/video-validation-test.js`
**Propósito**: Teste funcional de validação das regras de URLs de vídeos

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste Funcional |
| **Alvo** | Validação de URL na API administrativa de vídeos |
| **Execução** | Apenas 1 iteração |

#### Funcionamento:
Testa 3 cenários diferentes:
1.  ✅ **URL Válida do YouTube**: Deve retornar 201 Created
2.  ❌ **URL Inválida (Outro domínio)**: Deve retornar 400 Bad Request
3.  ❌ **URL Malformada**: Deve retornar 400 Bad Request

#### Regras e Thresholds:
- ✅ **100%** das validações devem passar
- ❌ Aborta automaticamente se login falhar

#### Observações:
- Modo Soft Fail: Se a validação estiver desativada o teste exibe aviso mas não falha
- Verifica também a mensagem de erro retornada

---

## 📊 Resumo Comparativo

| Arquivo | Tipo | Usuários Máx | Latência Esperada | Falha Automática | Relatórios |
|---|---|---|---|---|---|
| `authenticated-flow.js` | Carga | 5 | < 1000ms | ✅ | ❌ |
| `backup-verification-test.js` | Funcional | 1 | N/A | ✅ | ✅ JSON |
| `cache-headers-test.js` | Validação | 1 | N/A | ❌ | ✅ JSON + HTML |
| `cache-performance-test.js` | Performance | 50 | < 100ms | ✅ | ❌ |

---

## 🚀 Como Executar

Todos os testes podem ser executados individualmente com o comando:
```bash
k6 run load-tests/nome-do-arquivo.js
```

Para passar variáveis de ambiente:
```bash
k6 run -e ADMIN_USERNAME=admin -e ADMIN_PASSWORD=senha load-tests/authenticated-flow.js
```

---


---

### ✅ `/load-tests/create-post-flow.js`
**Propósito**: Teste de carga para fluxo de criação de conteúdo (operações de escrita)

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Carga (Escrita) |
| **Alvo** | Criação de posts na API administrativa |
| **Cenário** | Carga controlada para operações de escrita no banco |

#### Funcionamento:
1.  Realiza login uma única vez na fase `setup()` e compartilha o token com todos usuários virtuais
2.  Gera dados únicos para cada post (slug exclusivo com VU, iteração e timestamp) para evitar violação de constraints UNIQUE
3.  Cria posts como rascunho para não poluir o ambiente público
4.  Simula intervalo de 3 segundos após cada criação (comportamento natural do usuário)

#### Regras e Thresholds:
- ✅ 95% das requisições de criação devem responder em menos de **800ms**
- ✅ Taxa de sucesso de criação > **98%**

#### Observações:
- Token de autenticação é obtido uma única vez e reutilizado por todos VUs
- Posts são criados como não publicados para não aparecerem na área pública
- Possui logs detalhados em caso de falha na criação

---

### ✅ `/load-tests/ddos-search-test.js`
**Propósito**: Teste de resiliência e validação do Rate Limit sob ataque de negação de serviço

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Resiliência / DDoS |
| **Alvo** | Rota de busca pública + Sistema de Rate Limit |
| **Cenário** | Pico repentino de tráfego (Flash Crowd) |

#### Funcionamento:
1.  Ramp-up agressivo até 500 usuários simultâneos
2.  Utiliza termos de busca aleatórios + parâmetro de cache busting
3.  Dispara requisições sem intervalo (`sleep()` removido intencionalmente) para máxima carga
4.  Monitora especificamente erros 5xx do servidor

#### Regras e Thresholds:
- ✅ Status 200 e 429 são considerados respostas válidas e esperadas
- ❌ **ABORTA AUTOMATICAMENTE** se erros 500 ultrapassarem 10% das requisições

#### Observações:
- Objetivo não é ter 100% de sucesso, mas validar que o servidor não cai
- Rate Limit funcionando e retornando 429 é considerado comportamento CORRETO
- Métrica personalizada para contagem exclusiva de erros internos do servidor

---

### ✅ `/load-tests/env-config.json`
**Propósito**: Arquivo de configuração padrão e valores padrão para testes

| Característica | Detalhe |
|---|---|
| **Tipo** | Configuração |
| **Formato** | JSON |
| **Uso** | Valores padrão para todos os testes de carga |

#### Valores definidos:
| Variável | Valor Padrão |
|---|---|
| `BASE_URL` | `http://localhost:3000` |
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD` | `123456` |

#### Observações:
- Este arquivo contém os valores padrão utilizados quando nenhuma variável de ambiente é fornecida
- Todos os testes primeiro verificam variáveis de ambiente e usam estes valores como fallback
- Não deve conter credenciais reais de ambientes de produção

---

### ✅ `/load-tests/health-check.js`
**Propósito**: Teste básico de disponibilidade e latência do endpoint de saúde da aplicação

| Característica | Detalhe |
|---|---|
| **Tipo** | Teste de Sanidade / Disponibilidade |
| **Alvo** | Endpoint `/api/v1/health` |
| **Cenário** | Carga baixa e estável |

#### Funcionamento:
1.  Simula 20 usuários simultâneos acessando o endpoint de health
2.  Verifica status HTTP 200 e corpo da resposta `{"status": "ok"}`
3.  Intervalo de 1 segundo entre requisições

#### Regras e Thresholds:
- ✅ 95% das requisições devem responder em menos de **100ms**
- ✅ Taxa de erro < **1%**

---

## 📊 Resumo Comparativo

| Arquivo | Tipo | Usuários Máx | Latência Esperada | Falha Automática | Relatórios |
|---|---|---|---|---|---|
| `authenticated-flow.js` | Carga | 5 | < 1000ms | ✅ | ❌ |
| `backup-verification-test.js` | Funcional | 1 | N/A | ✅ | ✅ JSON |
| `cache-headers-test.js` | Validação | 1 | N/A | ❌ | ✅ JSON + HTML |
| `cache-performance-test.js` | Performance | 50 | < 100ms | ✅ | ❌ |
| `create-post-flow.js` | Carga (Escrita) | 3 | < 800ms | ✅ | ❌ |
| `ddos-search-test.js` | Resiliência | 500 | N/A | ✅ | ✅ JSON |
| `env-config.json` | Configuração | - | - | - | - |
| `health-check.js` | Sanidade | 20 | < 100ms | ❌ | ❌ |
| `ip-spoofing-test.js` | Segurança | 10 | N/A | ❌ | ✅ JSON |
| `login-negative-test.js` | Segurança | 10 | < 300ms | ❌ | ✅ JSON |
| `musicas-crud-test.js` | Carga | 5 | < 800ms | ✅ | ✅ JSON + HTML |
| `musicas-filter-test.js` | Funcional | 1 | < 500ms | ❌ | ✅ JSON |
| `musicas-load-test.js` | Carga | 5 | < 300ms | ✅ | ❌ |
| `musicas-pagination-test.js` | Funcional | 1 | N/A | ❌ | ✅ JSON |
| `musicas-search-test.js` | Funcional | 1 | < 500ms | ❌ | ✅ JSON |
| `musicas-sort-test.js` | Funcional | 1 | N/A | ❌ | ✅ JSON |
| `pagination-test.js` | Funcional | 1 | N/A | ❌ | ✅ JSON |
| `posts-cursor-pagination-test.js` | Funcional | 1 | N/A | ❌ | ✅ JSON |
| `posts-tags-test.js` | Funcional | 1 | < 500ms | ❌ | ✅ JSON |
| `rate-limit-test.js` | Resiliência | 50 | N/A | ❌ | ✅ JSON |
| `recovery-test.js` | Resiliência | 1 | N/A | ❌ | ✅ JSON |
| `search-content-test.js` | Funcional | 1 | < 500ms | ❌ | ✅ JSON |
| `stress-test-combined.js` | Estresse | 100 | < 500ms | ✅ | ✅ JSON + HTML |
| `upload-flow.js` | Carga | 5 | < 2000ms | ✅ | ✅ JSON |
| `videos-crud-test.js` | Carga (Escrita) | 3 | < 800ms | ✅ | ✅ JSON |
| `videos-filter-test.js` | Funcional | 1 | < 500ms | ❌ | ✅ JSON |
| `videos-load-test.js` | Carga | 5 | < 300ms | ✅ | ❌ |
| `videos-pagination-test.js` | Funcional | 1 | N/A | ❌ | ✅ JSON |
| `videos-sort-test.js` | Funcional | 1 | N/A | ❌ | ✅ JSON + HTML |
| `video-validation-test.js` | Funcional | 1 | N/A | ✅ | ✅ JSON |

---

> 📌 Esta documentação reflete o estado atual dos arquivos de teste na versão do projeto analisada.
