# Projeto Caminhar

[![Status do Build](https://github.com/caminhar-deus/Caminhar/actions/workflows/pr-coverage.yml/badge.svg)](https://github.com/caminhar-deus/Caminhar/actions/workflows/pr-coverage.yml)

O "Caminhar" é uma plataforma de conteúdo moderna e performática, construída com Next.js, focada em oferecer uma experiência de leitura e administração de alta qualidade.

## ✨ Visão Geral

## ✨ Tecnologias Principais

- **Frontend**: Next.js / React
- **Backend**: Node.js (via Next.js API Routes)
- **Banco de Dados**: PostgreSQL
- **Cache**: Redis
- **Testes**: Jest, React Testing Library & k6

## 🚀 Começando

Siga os passos para configurar e executar o projeto localmente.

### Pré-requisitos

- Node.js (v20+)
- [Docker](https://www.docker.com/) (para rodar o banco de dados e o Redis facilmente)

### 1. Instalação

Clone o repositório e instale as dependências:

```bash
git clone https://github.com/caminhar-deus/Caminhar.git
cd Caminhar
npm ci
```

### 2. Configuração do Ambiente

Inicie os serviços de banco de dados e cache com Docker Compose:

```bash
docker-compose up -d
```

Crie um arquivo `.env.local` na raiz do projeto, copiando o conteúdo de `.env.example`, e preencha as variáveis de ambiente necessárias.

### 3. Banco de Dados

Execute as migrações para criar a estrutura do banco de dados de desenvolvimento:

```bash
npm run setup:dev-db
```

### 4. Executando o Projeto

Inicie o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

## 🧪 Testes

O projeto possui uma suíte de testes abrangente.

- **Executar todos os testes (unitários e integração)**:
  ```bash
  npm test
  ```

- **Executar um arquivo de teste específico**:
  ```bash
  npm test tests/caminho/para/o/arquivo.test.js
  ```

- **Executar testes de carga (requer k6 instalado)**:
  ```bash
  # Exemplo de teste de estresse
  npm run test:load:stress
  ```