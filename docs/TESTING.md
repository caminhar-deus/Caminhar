# Diretrizes de Testes

## Visão Geral

Este documento descreve a estratégia de testes do projeto, cobrindo desde testes unitários até testes de carga, e como executá-los.

## Stack de Testes

- **Jest & React Testing Library:** Para testes unitários, de componentes e de integração.
- **Cypress:** Para testes End-to-End (E2E) que simulam a jornada do usuário.
- **k6 (Grafana):** Para testes de carga, estresse e performance da API.

## Como Executar os Testes

### Testes Unitários e de Integração (Jest)

- **Executar todos os testes:**
  ```bash
  npm test
  ```

- **Executar um arquivo de teste específico:**
  ```bash
  npm test tests/caminho/para/o/arquivo.test.js
  ```

- **Executar testes com relatório de cobertura:**
  ```bash
  npm test -- --coverage
  ```

### Testes End-to-End (Cypress)

- **Abrir a interface do Cypress (modo interativo):**
  ```bash
  npm run test:e2e
  ```

- **Executar testes E2E em modo headless (terminal):**
  ```bash
  npm run test:e2e:run
  ```

### Testes de Carga (k6)

- **Executar um cenário de teste de carga específico:**
  ```bash
  # Exemplo: Teste de estresse na busca
  npm run test:load:stress
  
  # Exemplo: Teste de performance do cache
  npm run test:load:cache
  ```

## Tipos de Teste

### 1. Testes Unitários e de Integração (Jest)
- **Localização:** `/tests/unit` e `/tests/integration`.
- **Objetivo:** Validar a lógica de negócio em funções isoladas (unitários) e o comportamento de endpoints da API (integração), mockando dependências externas como o banco de dados.

### 2. Testes End-to-End (Cypress)
- **Localização:** `/cypress/e2e`.
- **Objetivo:** Simular fluxos completos do usuário em um navegador real, como o processo de login, criação de um post ou navegação pelo painel administrativo.

### 3. Testes de Carga e Performance (k6)
- **Localização:** `/load-tests`.
- **Objetivo:** Garantir que a aplicação seja performática e resiliente sob estresse, simulando picos de tráfego e medindo tempos de resposta e taxas de erro.

## Ambiente de Testes e CI/CD

### Ambiente Local
- Para rodar testes de integração localmente, é necessário ter **Docker** com contêineres de **PostgreSQL** e **Redis** em execução.
- Configure as variáveis de ambiente para testes em um arquivo `.env.test.local` (ou similar), seguindo o exemplo do `.env.example`.

### Integração Contínua (GitHub Actions)
- **`pr-coverage.yml`**: Este workflow é acionado a cada Pull Request. Ele executa a suíte de testes do Jest e bloqueia o PR se os testes falharem ou se a cobertura de código cair abaixo do limite estabelecido (atualmente 20%).
- **`load-tests.yml`**: Executa os testes de carga do k6 diariamente para monitorar a performance da aplicação ao longo do tempo.

> **⚠️ Aviso Importante:** Relatórios e logs gerados localmente (ex: `/reports/k6-summaries/`) **não devem ser commitados** no repositório.
