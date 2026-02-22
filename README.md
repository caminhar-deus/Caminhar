
# O Caminhar com Deus
[![Link Checker](https://github.com/caminhar-deus/Caminhar/actions/workflows/check-links.yml/badge.svg)](https://github.com/caminhar-deus/Caminhar/actions/workflows/check-links.yml)

Um site cristão moderno e dinâmico para compartilhar reflexões e ensinamentos sobre fé, espiritualidade e a jornada cristã.

## 📖 Índice de Documentação

Para detalhes técnicos específicos, consulte as documentações dedicadas na pasta `docs/`. Cada documento inclui visão geral, comandos essenciais e guias práticos:

| Documentação | Visão Geral | Comandos Essenciais | Público-Alvo |
|--------------|-------------|-------------------|--------------|
| **[Arquitetura](docs/ARCHITECTURE.md)** | Estrutura modular, fluxo de dados e decisões técnicas. Documentação completa de módulos, design system e padrões de desenvolvimento. | `npm run dev`, `npm run build` | Desenvolvedores, Arquitetos |
| **[Guia de Deploy](docs/DEPLOY.md)** | Deploy para VPS e Vercel, configuração de ambiente, variáveis críticas e troubleshooting avançado. | `npm run deploy:vercel`, `npm run deploy:vps` | DevOps, Administradores |
| **[Testes & Qualidade](docs/TESTING.md)** | Estratégia completa: Unitários (Jest), E2E (Cypress), Carga (k6), Segurança, Performance. Cobertura >90%. | `npm test`, `npm run cypress:run`, `npm run test:load` | QA, Desenvolvedores |
| **[API Reference](pages/api/v1/README.md)** | API RESTful pública v1.2.0: endpoints, schemas, autenticação, rate limiting e exemplos de uso. | `curl`, `fetch`, `axios` | Desenvolvedores Frontend, Integrações |
| **[Sistema de Backup](docs/BACKUP.md)** | Sistema automático de backup: criação, rotação, restauração, validação e monitoramento. | `npm run backup:create`, `npm run backup:restore` | Administradores, DevOps |
| **[Cache & Performance](docs/CACHE.md)** | Cache Redis avançado: estratégias, TTL, invalidação, monitoramento e otimização de performance. | `redis-cli`, `npm run test:cache` | Desenvolvedores, DevOps |
| **[SEO Toolkit](docs/SEO.md)** | Otimização completa: Core Web Vitals, Schema.org, meta tags, performance e estratégias de ranqueamento. | `npm run test:seo`, `lighthouse` | Marketing, Desenvolvedores |
| **[Relatórios Técnicos](docs/REPORTS.md)** | Análises detalhadas: migração SQLite→PostgreSQL, benchmarks de performance, métricas de qualidade e evolução do projeto. | `npm run generate:report` | Gerentes, Stakeholders |

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
