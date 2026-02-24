
# O Caminhar com Deus

Um site cristão moderno e dinâmico para compartilhar reflexões e ensinamentos sobre fé, espiritualidade e a jornada cristã.

## 📖 Índice de Documentação

Para detalhes técnicos específicos, consulte as documentações dedicadas na pasta `docs/`. Cada documento inclui visão geral, comandos essenciais e guias práticos:

| Documentação | Visão Geral | Comandos Essenciais | Público-Alvo |
|--------------|-------------|-------------------|--------------|
| **Arquitetura** | Visão completa da estrutura do projeto, incluindo Frontend, Backend, fluxo de dados, Design System e padrões de código. | `npm run dev`, `npm run build` | Desenvolvedores, Arquitetos |
| **Guia de Deploy** | Passo a passo para implantar a aplicação em servidores (VPS, Hostinger) e na Vercel. Inclui configuração de ambiente e Nginx. | `pm2 start`, `nginx -t` | DevOps, Administradores |
| **Testes & Qualidade** | Detalhes sobre a suíte de testes: unitários (Jest), integração, carga (k6) e E2E (Cypress). Garante mais de 90% de cobertura. | `npm test`, `npm run cypress:run`, `npm run test:load` | QA, Desenvolvedores |
| **API Reference** | Documentação da API RESTful (v1) para consumo externo. Detalha endpoints, autenticação, schemas e exemplos. | `curl`, `fetch` | Desenvolvedores Frontend, Integrações |
| **Sistema de Backup** | Guia do sistema de backups automáticos do PostgreSQL, incluindo comandos para criar, restaurar e verificar backups. | `npm run create-backup`, `npm run restore-backup` | Administradores, DevOps |
| **Cache & Performance** | Explicação da estratégia de cache com Redis (Upstash), incluindo chaves, TTLs e invalidação para otimizar a performance. | `npm run clear-cache` | Desenvolvedores, DevOps |
| **SEO Toolkit** | Documentação do kit de SEO, cobrindo componentes de meta tags, dados estruturados (Schema.org) e otimização de performance. | `npm run test:seo` | Marketing, Desenvolvedores |
| **Relatórios Técnicos** | Histórico de análises técnicas, benchmarks de performance (k6), e relatórios de migração e evolução da arquitetura. | `k6 run ...` | Gerentes, Stakeholders |
| **Segurança** | Políticas de segurança, autenticação, proteção de API e infraestrutura. | `npm run test:security` | Security Ops, Desenvolvedores |

---

## ✨ Funcionalidades Principais

- **Página Principal (HOME)**: Exibe título e subtítulo dinâmicos, frase de apresentação e imagem hero configurável.
- **Painel Administrativo (ADMIN)**: Área protegida para gerenciar posts, músicas, vídeos e backups.
- **ContentTabs**: Navegação organizada em abas (Reflexões, Músicas, Vídeos).
- **Integrações**: Suporte a Spotify e YouTube.
- **Performance**: Cache de API (Redis), otimização de imagens e lazy loading.
- **Segurança**: Autenticação JWT, Cookies HTTP-only e proteção contra força bruta.

##  Como Executar (Quickstart)

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
