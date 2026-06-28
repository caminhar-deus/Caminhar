# 📁 Scripts do Projeto — Análise de Melhorias, Correções e Duplicidades

> **Data:** 28/06/2026
> **Projeto:** Caminhar  
> **Diretório:** `/scripts`  
> **Objetivo deste documento:** Reportar problemas identificados, sugestões de melhoria, oportunidades de performance, código duplicado e más práticas encontradas nos scripts. Nenhuma correção foi aplicada — trata-se apenas de levantamento analítico.

---

## Índice

1. [Duplicidade de Código e Funcionalidades](#1-duplicidade-de-código-e-funcionalidades)
2. [Arquivos Fora de Lugar ou Irrelevantes](#2-arquivos-fora-de-lugar-ou-irrelevantes)
3. [Problemas de Padronização e Consistência](#3-problemas-de-padronização-e-consistência)
4. [Ausência de Boas Práticas em Scripts Específicos](#4-ausência-de-boas-práticas-em-scripts-específicos)
5. [Oportunidades de Performance e Segurança](#5-oportunidades-de-performance-e-segurança)
6. [Falhas de Manutenibilidade](#6-falhas-de-manutenibilidade)
7. [Observações sobre Documentação e Comentários](#7-observações-sobre-documentação-e-comentários)
8. [Sugestões de Arquitetura Futura](#8-sugestões-de-arquitetura-futura)

---

## 1. Duplicidade de Código e Funcionalidades

### 1.1. `utils/cleanup-test-data.js` — subconjunto funcional de `clean-load-test-posts.js`
- **Arquivos:**
  - `scripts/clean-load-test-posts.js`
  - `scripts/utils/cleanup-test-data.js`
- **Problema:** Ambos os scripts executam operações sobrepostas de limpeza de posts de teste, utilizando o mesmo módulo compartilhado `cleanup.js`, a mesma função `cleanTableByPattern()` e a mesma sequência de `loadEnv()` + delegamento. No entanto, possuem escopos diferentes:
  - `clean-load-test-posts.js` — remove posts com slugs nos padrões `post-carga-%` **e** `k6-%` (2 padrões)
  - `cleanup-test-data.js` — remove apenas posts com slug `post-carga-%` (1 padrão, subconjunto do primeiro)
- **Impacto:** Manutenção duplicada. Qualquer alteração no comportamento precisa ser replicada em dois lugares, ou um deles ficará desatualizado. Confusão para novos desenvolvedores sobre qual script usar e se `cleanup-test-data.js` cobre ou não os posts `k6-%`.
- **Sugestão:** Remover um dos dois scripts ou transformar um deles em entry point que invoca o outro (wrapper explícito), unificando a lista de padrões.

### 1.2. `scripts/db/verify-migration.js` é um handler de API, não um script de migração
- **Arquivo:** `scripts/db/verify-migration.js`
- **Problema:** O nome e a localização sugerem que é um script de verificação de migrações, mas o conteúdo é um handler Next.js (`export default withAuth(handler)`). Ele importa de `../../../lib/auth` e `../../../lib/db`, caminhos que só fazem sentido se o arquivo estivesse em uma subpasta de `pages/api/`.
- **Impacto:** Localização enganosa. Alguém procurando por scripts de migração encontrará este arquivo e será confundido.
- **Sugestão:** Mover para `pages/api/verify-migration.js` ou remover se não estiver em uso.

### 1.3. `scripts/db/verify-db-functions.js` — script obsoleto
- **Arquivo:** `scripts/db/verify-db-functions.js`
- **Problema:** Importa de `./db.js`, módulo que não existe mais em `scripts/db/`. Verifica se a função `getSetting` existe em `lib/db.js`, mas todos os scripts foram migrados para usar `scripts/db/connection.js`. Script evidentemente residual de uma refatoração anterior.
- **Impacto:** Não executável no estado atual (quebra com erro de módulo não encontrado). Apenas ocupa espaço.
- **Sugestão:** Remover ou atualizar para importar de `./connection.js` se ainda houver motivo para existir.

---

## 2. Arquivos Fora de Lugar ou Irrelevantes

### 2.1. `scripts/db/verify-migration.js`
- Já detalhado no item 1.2. Reforça-se: a localização atual em `scripts/db/` é inadequada.

### 2.2. `scripts/db/verify-db-functions.js`
- Já detalhado no item 1.3. Script sem utilidade atual.

### 2.3. `scripts/init-server.js` — dependência desatualizada
- **Arquivo:** `scripts/init-server.js`
- **Problema:** Ainda importa de `../lib/db.js` em vez de usar o módulo compartilhado `scripts/db/connection.js` que foi adotado como padrão pelos demais scripts do projeto.
- **Sugestão:** Migrar para `import { query, closePool } from './db/connection.js'` para alinhar com o padrão atual do projeto. Verificar também se ainda usa `dotenv` diretamente ou se poderia usar `loadEnv()`.

---

## 3. Problemas de Padronização e Consistência

### 3.1. Carregamento de ambiente não uniforme
- **Arquivos que ainda carregam dotenv manualmente:**
  - `scripts/check-db-status.js` — usa `dotenv.config()` diretamente
  - `scripts/check-env.js` — usa `dotenv.config()` diretamente
  - `scripts/check-sql-injection.js` — não carrega dotenv (não precisa)
  - `scripts/clean-orphaned-images.js` — usa `dotenv.config()` diretamente
  - `scripts/db-shell.js` — carrega `.env.local` e `.env` manualmente com `fs.existsSync` + `dotenv.config()`
  - `scripts/init-server.js` — usa `dotenv` diretamente
  - `scripts/monitor-disk-space.js` — não carrega dotenv (usa apenas constantes)
  - `scripts/tests/manual-api-test.js` — provavelmente sem carregamento de env
  - `scripts/tests/manual-rate-limit.js` — provavelmente sem carregamento de env
  - `scripts/utils/list-settings.js` — provável dotenv manual
  - `scripts/utils/list-table-columns.js` — provável dotenv manual
  - `scripts/utils/update-setting.js` — usa `dotenv.config()` diretamente
  - `scripts/backup.js` — usa `dotenv.config()` diretamente (justificado por ser módulo importado, não entry point)
- **Impacto:** Mais da metade dos scripts ainda não usa o módulo compartilhado `loadEnv()`, perpetuando a duplicação que a refatoração anterior (21/05/2026) buscou eliminar.
- **Sugestão:** Migrar todos os scripts listados acima para `import { loadEnv } from './utils/load-env.js'`.

### 3.2. Fechamento do pool de conexão inconsistente
- **Problema:** Vários scripts que usam `scripts/db/connection.js` não chamam `closePool()` no final da execução. Exemplos identificados:
  - `scripts/seed-settings.js` — chama `process.exit(0)` sem fechar o pool
  - `scripts/seed-products.js` — não fecha o pool explicitamente
  - `scripts/clear-cache.js` — não usa `connection.js` diretamente, mas pode deixar conexões abertas
- **Impacto:** Vazamento de conexões PostgreSQL se os scripts forem executados em loop ou por ferramentas que não encerram o processo imediatamente.
- **Sugestão:** Garantir que todo script que usa `getPool()` ou `query()` chame `closePool()` no `finally` antes de `process.exit()`.

### 3.3. Nomenclatura inconsistente entre scripts de seed
- **Problema:** Os nomes dos scripts de seed misturam inglês e português:
  - `seed-musicas.js` — português
  - `seed-posts.js` — inglês
  - `seed-products.js` — inglês
  - `seed-videos.js` — inglês
  - `seed-settings.js` — inglês
- **Impacto:** Inconsistência perceptual. Se o padrão adotado foi unificar em inglês nas funções (item 5.3 do UPGRADE anterior), os nomes dos arquivos deveriam seguir o mesmo padrão: `seed-songs.js` ou `seed-musics.js`.
- **Sugestão:** Renomear `seed-musicas.js` para inglês (ex: `seed-songs.js`) ou renomear todos para português. Manter consistência.

### 3.4. `scripts/check-server.js` não usa `loadEnv()`
- **Arquivo:** `scripts/check-server.js`
- **Problema:** Lê `process.env.PORT` diretamente sem carregar variáveis de ambiente primeiro. Se `PORT` estiver definida apenas em `.env.local` ou `.env`, não será encontrada.
- **Sugestão:** Adicionar `loadEnv()` antes de ler `process.env.PORT` para garantir que a porta customizada seja respeitada.

### 3.5. `scripts/db-shell.js` carrega dotenv manualmente
- **Arquivo:** `scripts/db-shell.js`
- **Problema:** Usa `fs.existsSync` + `dotenv.config()` manual em vez do módulo compartilhado `loadEnv()`.
- **Sugestão:** Substituir por `import { loadEnv } from './utils/load-env.js'`.

---

## 4. Ausência de Boas Práticas em Scripts Específicos

### 4.1. `scripts/seed-settings.js` — não fecha pool
- **Arquivo:** `scripts/seed-settings.js`
- **Problema:** O script executa as queries, imprime "Seed concluído" e chama `process.exit(0)` sem fechar o pool de conexão. Embora o `process.exit()` force o encerramento, em cenários de execução controlada (ex: testes), isso pode deixar conexões pendentes.
- **Sugestão:** Adicionar `closePool()` antes do `process.exit(0)`.

### 4.2. `scripts/seed-settings.js` — configurações hardcoded
- **Arquivo:** `scripts/seed-settings.js`
- **Problema:** As 5 configurações padrão estão hardcoded no array `DEFAULT_SETTINGS` dentro do script. Se novas configurações forem adicionadas no futuro, o script precisa ser modificado.
- **Sugestão:** Considerar carregar configurações de um arquivo JSON externo (similar ao que `init-table.js` faz com os schemas), permitindo adicionar novas configurações sem modificar o código.

### 4.3. `scripts/warm-routes.js` — slugs hardcoded
- **Arquivo:** `scripts/warm-routes.js`
- **Problema:** Os slugs de seed (`SEED_SLUGS`) estão hardcoded no script. Se os seeds forem alterados, o warm-routes pode ficar desatualizado e tentar aquecer slugs que não existem mais, ou deixar de aquecer slugs novos.
- **Sugestão:**
  - Carregar slugs do banco de dados consultando a tabela `posts` diretamente
  - Ou ler de um arquivo de configuração compartilhado com os seeds

### 4.4. `scripts/warm-routes.js` — valor `development` hardcoded para rota SSR
- **Arquivo:** `scripts/warm-routes.js` (linha 181)
- **Problema:** O caminho `/_next/data/development/blog/${slug}.json` contém `development` hardcoded. Em ambientes de produção ou preview, o valor do buildId é diferente.
- **Sugestão:** Detectar dinamicamente o buildId fazendo uma requisição a `/_next/buildId` ou extrair de uma página HTML da aplicação.

---

## 5. Oportunidades de Performance e Segurança

### 5.1. `scripts/clear-cache.js` — Redis `flushall` sem confirmação
- **Arquivo:** `scripts/clear-cache.js`
- **Problema:** Executa `flushall` no Redis sem pedir confirmação do usuário. Em produção, isso limparia todo o cache de uma só vez, potencialmente causando impacto de performance ao recarregar todos os dados.
- **Sugestão:** Adicionar prompt de confirmação (similar ao `clear-db.js` e `clear-musicas.js`).

### 5.2. `scripts/clear-test-auth-locks.js` — IPs fixos de teste
- **Arquivo:** `scripts/clear-test-auth-locks.js`
- **Problema:** Opera apenas em IPs fixos de teste (`203.0.113.1`, `127.0.0.1`, `::1`). Se novos IPs de teste forem adicionados nos scripts de segurança, este script precisará ser atualizado manualmente.
- **Sugestão:** Aceitar IPs como argumento de linha de comando, mantendo os atuais como default.

### 5.3. `scripts/run-all-load-tests-sequentially.js` — timeout fixo de 10 min
- **Arquivo:** `scripts/run-all-load-tests-sequentially.js`
- **Problema:** Timeout de 10 minutos por script de teste é fixo. Se algum teste levar mais tempo (ex: ambiente lento), será abortado prematuramente.
- **Sugestão:** Tornar o timeout configurável via argumento `--timeout=N` ou variável de ambiente.

### 5.4. `scripts/backup.js` — criptografia ainda usa dotenv diretamente
- **Arquivo:** `scripts/backup.js`
- **Problema:** O `backup.js` carrega dotenv manualmente (linha de `dotenv.config()`) em vez de usar `loadEnv()`. Na refatoração anterior, isso foi considerado "justificado" por ser um módulo importado, não entry point. No entanto, ele executa carregamento de ambiente como side effect no top-level.
- **Sugestão:** Remover o carregamento direto de dotenv de `backup.js` e exigir que os entry points (`create-backup.js`, `restore-backup.js`, etc.) já tenham carregado o ambiente antes de importar o módulo. Isso alinharia com o padrão dos demais módulos compartilhados.

---

## 6. Falhas de Manutenibilidade

### 6.1. `scripts/init-server.js` — não refatorado para padrões atuais
- **Arquivo:** `scripts/init-server.js`
- **Problema:** Este script parece não ter passado pelas refatorações de 21/05/2026 e 07/06/2026. Ainda:
  - Importa `dotenv` diretamente (não usa `loadEnv()`)
  - Importa de `../lib/db.js` (não usa `scripts/db/connection.js`)
  - Pode ter I/O síncrono (necessário verificar)
- **Sugestão:** Refatorar para usar os módulos compartilhados, alinhando com o restante dos scripts.

### 6.2. Schemas JSON não incluem a coluna `position`
- **Arquivos:** `scripts/schemas/musicas.json`, `scripts/schemas/posts.json`, `scripts/schemas/videos.json`
- **Problema:** Os schemas JSON não incluem a coluna `position` que foi adicionada pelas migrações 007, 008 e 009. Se um novo banco for criado via `init-table.js`, a coluna `position` não estará presente e precisará ser adicionada via migração.
- **Impacto:** `init-table.js` cria tabelas sem a coluna `position`, mesmo sendo uma coluna já estabelecida no schema atual. A migração 007/008/009 ainda funcionaria, mas seria uma etapa adicional desnecessária.
- **Sugestão:** Atualizar os schemas JSON para incluir `position` como coluna padrão.

### 6.3. Schemas JSON não incluem a coluna `views` em `posts.json`
- **Arquivo:** `scripts/schemas/posts.json`
- **Problema:** Mesmo caso do item 6.2: a coluna `views` (adição da migração 001) não está no schema base de `posts.json`.
- **Sugestão:** Atualizar `posts.json` para incluir `views` como coluna padrão.

### 6.4. Duplicação de manutenção para colunas pós-migração
- **Problema geral dos itens 6.2 e 6.3:** As colunas `position` e `views` existem em todas as bases atuais (aplicadas via migração), mas não constam nos schemas base. Isso cria duas fontes de verdade para a definição da tabela: os schemas JSON e as migrações.
- **Sugestão:** Definir uma política clara: os schemas JSON devem representar o estado mais recente da tabela (incluindo colunas adicionadas por migrações passadas) ou devem representar apenas a estrutura mínima inicial (exigindo migrações para completar). A situação atual é ambígua.

---

## 7. Observações sobre Documentação e Comentários

### 7.1. `scripts/generate-load-report.js` documenta 6 testes, mas `run-all-load-tests-sequentially.js` executa 29
- **Problema:** O script `generate-load-report.js` tem comentários/documentação mencionando 6 testes k6, enquanto `run-all-load-tests-sequentially.js` executa 29. Pode causar confusão sobre quantos testes realmente são executados em cada cenário.
- **Sugestão:** Atualizar a documentação do `generate-load-report.js` para refletir que ele executa uma bateria específica (6 testes) diferente da bateria completa (29 testes).

### 7.2. `scripts/warm-routes.js` — documentação extensa versus simplicidade do problema
- **Problema:** O script possui 241 linhas, sendo ~40 linhas de comentários/documentação e ~200 de implementação. Embora bem documentado, o problema que resolve (pré-aquecimento de rotas) poderia ser resolvido de forma mais simples.
- **Sugestão:** Avaliar se o bug do Turbopack que motivou este script ainda é relevante na versão atual do Next.js em uso. Se corrigido, o script pode se tornar desnecessário.

### 7.3. Ausência de testes para scripts críticos
- **Arquivos sem testes unitários:**
  - `scripts/backup.js` — módulo mais complexo do projeto, sem testes
  - `scripts/clear-cache.js` — opera com Redis, sem testes
  - `scripts/clean-orphaned-images.js` — opera com sistema de arquivos, sem testes
  - `scripts/monitor-disk-space.js` — opera com disco, sem testes
  - `scripts/warm-routes.js` — 241 linhas sem testes
  - `scripts/check-sql-injection.js` — análise estática, sem testes
  - `scripts/generate-load-report.js` — orquestrador complexo, sem testes
  - Todos os scripts de diagnóstico (5 em `diagnostics/`)
  - Todos os scripts de manutenção (5 em `maintenance/`)
  - `scripts/db-shell.js`
  - `scripts/run-all-load-tests-sequentially.js`
  - `scripts/seed-products.js` (usa faker, dados complexos)
  - `scripts/seed-settings.js`
  - `scripts/init-server.js`
- **Impacto:** Módulos complexos e críticos não têm garantia de funcionamento correto após alterações.
- **Sugestão:** Priorizar criação de testes para `backup.js`, `monitor-disk-space.js` e `clear-cache.js` por serem os mais críticos.

---

## 8. Sugestões de Arquitetura Futura

### 8.1. Unificar scripts de seed de dados de teste em um único módulo parametrizável
- **Atual:** 4 scripts separados (`seed-musicas.js`, `seed-posts.js`, `seed-products.js`, `seed-videos.js`) + orquestrador (`seed-all.js`).
- **Sugestão:** Seguir o mesmo padrão de `init-table.js`: um único `seed-table.js` que recebe o nome da tabela como argumento e carrega dados de seed de um arquivo JSON em `scripts/seed-data/`. Reduziria de 5 scripts para 2 (executor + orquestrador).

### 8.2. Criar módulo compartilhado para detecção de build ID do Next.js
- **Motivação:** O script `warm-routes.js` hardcoda `development` como buildId. Se outros scripts precisarem do buildId no futuro, cada um implementará sua própria detecção.
- **Sugestão:** Criar `scripts/utils/build-id.js` com função `getNextBuildId(baseUrl)` que consulta `/_next/buildId` ou extrai de uma página.

### 8.3. Centralizar operações de Redis em módulo compartilhado
- **Motivação:** Tanto `clear-cache.js` quanto `clear-test-auth-locks.js` operam no Redis, mas cada um tem sua própria lógica de conexão.
- **Sugestão:** Extrair funções comuns de Redis para um módulo utilitário (ex: `utils/redis-ops.js`), similar ao que foi feito com `cleanup.js` para operações de banco.

### 8.4. Agrupar scripts de teste manual em um único entry point
- **Motivação:** `tests/manual-api-test.js` e `tests/manual-rate-limit.js` são scripts de verificação rápida que poderiam ser combinados.
- **Sugestão:** Criar `tests/manual-test.js` com subcomandos `api` e `rate-limit`, ou manter separados mas garantir que sigam o mesmo padrão de carregamento de ambiente.

### 8.5. Considerar transformação de `scripts/backup.js` em módulo puro (sem side effects)
- **Motivação:** Atualmente `backup.js` executa carregamento de dotenv no top-level como side effect, o que é atípico para um módulo que será importado.
- **Sugestão:** Remover todo código executado no top-level (incluindo `dotenv.config()`) e transformar em módulo puramente funcional. Os entry points são responsáveis pelo setup.

---

## 📊 Resumo de Prioridades

| # | Problema | Gravidade | Esforço Est. | Prioridade |
|---|----------|:---------:|:------------:|:----------:|
| 1.1 | `cleanup-test-data.js` duplicata de `clean-load-test-posts.js` | 🟢 Baixa | Muito Baixo | Baixa |
| 1.2 | `verify-migration.js` fora de lugar | 🟢 Baixa | Baixo | Média |
| 1.3 | `verify-db-functions.js` obsoleto | 🟢 Baixa | Muito Baixo | Baixa |
| 2.3 | `init-server.js` com dependência desatualizada | 🟡 Média | Médio | **Alta** |
| 3.1 | Carregamento de ambiente não uniforme (~13 scripts) | 🟡 Média | Médio | **Alta** |
| 3.2 | Fechamento de pool inconsistente | 🟡 Média | Baixo | Média |
| 3.3 | Nomenclatura inconsistente (seed-musicas) | 🟢 Baixa | Baixo | Baixa |
| 3.4 | `check-server.js` não carrega env | 🟢 Baixa | Muito Baixo | Baixa |
| 3.5 | `db-shell.js` carrega dotenv manual | 🟢 Baixa | Muito Baixo | Baixa |
| 4.1 | `seed-settings.js` não fecha pool | 🟢 Baixa | Muito Baixo | Baixa |
| 4.3 | Slugs hardcoded em `warm-routes.js` | 🟡 Média | Médio | Média |
| 4.4 | `development` hardcoded em warm-routes | 🟡 Média | Baixo | Média |
| 5.1 | `clear-cache.js` sem confirmação | 🟡 Média | Baixo | Média |
| 5.3 | Timeout fixo em load tests | 🟢 Baixa | Baixo | Baixa |
| 6.1 | `init-server.js` não refatorado | 🟡 Média | Médio | **Alta** |
| 6.2/6.3 | Schemas JSON desatualizados (sem position, views) | 🟡 Média | Baixo | **Alta** |
| 6.4 | Dupla fonte de verdade para schemas | 🟡 Média | Baixo | Média |
| 7.3 | Ausência de testes em scripts críticos | 🔴 Alta | Alto | **Crítico** |
| 8.5 | backup.js com side effects no top-level | 🟢 Baixa | Baixo | Baixa |

---

> 📝 **Nota:** Este documento é puramente analítico. Nenhuma correção foi aplicada. As sugestões servem como guia para futuras refatorações e melhorias.