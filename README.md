# Projeto Caminhar

O "Caminhar" é uma plataforma de conteúdo moderna e performática, construída com Next.js, focada em oferecer uma experiência de leitura e administração de alta qualidade.

## ✨ Visão Geral

Este projeto serve como um sistema de gerenciamento de conteúdo (CMS) completo, com uma API pública otimizada para performance e um painel administrativo robusto para gestão de posts, vídeos e outras mídias.

### Funcionalidades Principais

- **Gestão de Conteúdo**: CRUD completo para posts/artigos, vídeos e músicas.
- **Painel Administrativo**: Interface centralizada para gerenciar todo o conteúdo, usuários e configurações do site.
- **API Pública**: Endpoints otimizados com cache (Redis) e proteção contra abuso (Rate Limiting) para servir o conteúdo ao público.
- **Sistema de Testes**: Suíte de testes completa, incluindo testes unitários, de integração e de carga (performance e estresse).
- **Autenticação**: Sistema seguro baseado em JWT para proteger as rotas administrativas.

## 🚀 Tecnologias Utilizadas

- **Frontend**: Next.js / React
- **Backend**: Node.js (via Next.js API Routes)
- **Banco de Dados**: PostgreSQL
- **Cache & Rate Limiting**: Redis
- **Testes Unitários/Integração**: Jest & React Testing Library
- **Testes de Carga**: k6 (Grafana)
- **Estilização**: CSS Modules

## 🏁 Como Começar

Siga os passos abaixo para configurar e executar o projeto em seu ambiente local.

## 📚 Documentação Completa

Para aprofundar em áreas específicas do projeto, consulte nossa documentação dedicada na pasta `/docs`:

- Padrões de API e Respostas (API.md)
- Design Tokens e Estilização (DESIGN_TOKENS.md)
- Diretrizes de Testes (TESTING.md)
- Ferramentas e Boas Práticas de SEO (SEO_TOOLKIT.md)

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 20 ou superior)
- [Docker](https://www.docker.com/) (para rodar o banco de dados e o Redis facilmente)

### 1. Instalação

Clone o repositório e instale as dependências:

```bash
git clone <url-do-repositorio>
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