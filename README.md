
Um site cristão moderno e dinâmico para compartilhar reflexões e ensinamentos sobre fé, espiritualidade e a jornada cristã.

## 📖 Índice de Documentação

Para detalhes técnicos específicos, consulte as documentações dedicadas na pasta `docs/`:

| Documentação | Descrição |
|--------------|-----------|
| **Arquitetura** | Estrutura do projeto, fluxo de dados e decisões técnicas. |
| **Guia de Deploy** | Instruções de produção (VPS, Vercel), variáveis de ambiente e troubleshooting. |
| **Testes & Qualidade** | Guia de testes (Unitários, E2E, Carga), comandos e estratégias. |
| **API Reference** | Documentação da API RESTful pública (v1). |
| **Sistema de Backup** | Detalhes do sistema automático de backup e restauração. |
| **Cache & Performance** | Implementação de Cache (Redis) e estratégias de performance. |
| **SEO Toolkit** | Guia de otimização para motores de busca e Core Web Vitals. |
| **Relatórios Técnicos** | Análises de migração, benchmarks e relatórios de evolução. |

---

## ✨ Funcionalidades Principais

- **Página Principal (HOME)**: Exibe título e subtítulo dinâmicos, frase de apresentação e imagem hero configurável.
- **Painel Administrativo (ADMIN)**: Área protegida para gerenciar posts, músicas, vídeos e backups.
- **ContentTabs**: Navegação organizada em abas (Reflexões, Músicas, Vídeos).
- **Integrações**: Suporte a Spotify e YouTube.
- **Performance**: Cache de API (Redis), otimização de imagens e lazy loading.
- **Segurança**: Autenticação JWT, Cookies HTTP-only e proteção contra força bruta.

## 🛠️ Tecnologias (Resumo)

- **Frontend**: Next.js 16, React 19, CSS Modules.
- **Backend**: Node.js (API Routes), PostgreSQL.
- **Infraestrutura**: Docker, Redis (Upstash), Nginx, PM2.
- **Qualidade**: Jest, Cypress, k6, GitHub Actions.

## 🚀 Como Executar (Quickstart)

### Pré-requisitos
- Node.js 18+
- PostgreSQL (Local ou Docker)

----
----
----
----
----
----
----
## 📖 Índice de Documentação

Para detalhes técnicos específicos, consulte as documentações dedicadas na pasta `docs/`:

| Documentação | Descrição |
|--------------|-----------|
| **Arquitetura** | Estrutura do projeto, fluxo de dados e decisões técnicas. |
| **Guia de Deploy** | Instruções de produção (VPS, Vercel), variáveis de ambiente e troubleshooting. |
| **Testes & Qualidade** | Guia de testes (Unitários, E2E, Carga), comandos e estratégias. |
| **API Reference** | Documentação da API RESTful pública (v1). |
| **Sistema de Backup** | Detalhes do sistema automático de backup e restauração. |
| **Cache & Performance** | Implementação de Cache (Redis) e estratégias de performance. |
| **SEO Toolkit** | Guia de otimização para motores de busca e Core Web Vitals. |
| **Relatórios Técnicos** | Análises de migração, benchmarks e relatórios de evolução. |

---

## ✨ Funcionalidades Principais

- **Página Principal (HOME)**: Exibe título e subtítulo dinâmicos, frase de apresentação e imagem hero configurável.
- **Painel Administrativo (ADMIN)**: Área protegida para gerenciar posts, músicas, vídeos e backups.
- **ContentTabs**: Navegação organizada em abas (Reflexões, Músicas, Vídeos).
- **Integrações**: Suporte a Spotify e YouTube.
- **Performance**: Cache de API (Redis), otimização de imagens e lazy loading.
- **Segurança**: Autenticação JWT, Cookies HTTP-only e proteção contra força bruta.

## 🛠️ Tecnologias (Resumo)

- **Frontend**: Next.js 16, React 19, CSS Modules.
- **Backend**: Node.js (API Routes), PostgreSQL.
- **Infraestrutura**: Docker, Redis (Upstash), Nginx, PM2.
- **Qualidade**: Jest, Cypress, k6, GitHub Actions.

## 🚀 Como Executar (Quickstart)

### Pré-requisitos
- Node.js 18+
- PostgreSQL (Local ou Docker)

### Passo a Passo

1.  **Configurar Variáveis de Ambiente**
    ```bash
    cp .env.example .env
    # Edite o .env com suas credenciais do banco de dados (DATABASE_URL) e JWT_SECRET
    ```

2.  **Instalar Dependências**
    ```bash
    npm install
    ```

3.  **Inicializar Banco de Dados**
    ```bash
    npm run init-posts
    ```

4.  **Iniciar Servidor de Desenvolvimento**
    ```bash
    npm run dev
    ```
    Acesse: `http://localhost:3000`

### 🐳 Via Docker (Alternativa)
```bash
docker-compose up -d
docker-compose exec app npm run init-posts
```

## 🤝 Contribuição

Contribuições são bem-vindas! Consulte o Guia de Testes antes de submeter um PR.

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está licenciado sem restrições. Sinta-se livre para usar e modificar.

## 📞 Contato

Para suporte técnico ou dúvidas, abra uma issue neste repositório.
