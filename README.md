
# O Caminhar com Deus

[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)](https://github.com/caminhar-deus/Caminhar/actions)
[![Version](https://img.shields.io/badge/Version-1.4.0-blue)](https://github.com/caminhar-deus/Caminhar/releases)
[![Node.js](https://img.shields.io/badge/Node.js-24.14.0-green)](https://nodejs.org/)

Um site cristão moderno e dinâmico para compartilhar reflexões e ensinamentos sobre fé, espiritualidade e a jornada cristã.

## 📖 Índice de Documentação

Para detalhes técnicos específicos, consulte as documentações dedicadas na pasta `docs/`. Cada documento inclui visão geral, comandos essenciais e guias práticos:

| Documentação | Visão Geral | Comandos Essenciais | Público-Alvo |
|--------------|-------------|-------------------|--------------|
| **Arquitetura** | Visão completa da estrutura do projeto, incluindo Frontend, Backend, fluxo de dados, Design System e padrões de código. | `npm run dev`, `npm run build` | Desenvolvedores, Arquitetos |
| **Guia de Deploy** | Passo a passo para implantar a aplicação em servidores (VPS, Hostinger) e na Vercel. Inclui configuração de ambiente e Nginx. | `pm2 start`, `nginx -t` | DevOps, Administradores |
| **Testes & Qualidade** | Detalhes sobre a suíte de testes: unitários (Jest), integração, carga (k6) e E2E (Cypress). 41 testes passando (100% de sucesso), >90% de cobertura. Testes de carga validam performance e funcionalidade de vídeos, posts e músicas. | `npm test`, `npm run cypress:run`, `npm run test:load:all` | QA, Desenvolvedores |
| **API Reference** | Documentação da API RESTful (v1) para consumo externo. Detalha endpoints, autenticação, schemas e exemplos. | `curl`, `fetch` | Desenvolvedores Frontend, Integrações |
| **Sistema de Backup** | Guia do sistema de backups automáticos do PostgreSQL, incluindo comandos para criar, restaurar e verificar backups. | `npm run create-backup`, `npm run restore-backup` | Administradores, DevOps |
| **Cache & Performance** | Explicação da estratégia de cache com Redis (Upstash), incluindo chaves, TTLs e invalidação para otimizar a performance. | `npm run clear-cache` | Desenvolvedores, DevOps |
| **SEO Toolkit** | Documentação do kit de SEO, cobrindo componentes de meta tags, dados estruturados (Schema.org) e otimização de performance. | `npm run test:seo` | Marketing, Desenvolvedores |
| **SEO_TOOLKIT** | Documentação completa do kit de SEO e performance, incluindo componentes, schemas e exemplos de uso. | `npm run test:seo` | Marketing, Desenvolvedores |
| **Relatórios Técnicos** | Histórico de análises técnicas, benchmarks de performance (k6), e relatórios de migração e evolução da arquitetura. | `npm run test:load:all` | Gerentes, Stakeholders |
| **Segurança** | Políticas de segurança, autenticação, proteção de API e infraestrutura. | `npm run test:security` | Security Ops, Desenvolvedores |

---

## ✨ Funcionalidades Principais

- **ContentTabs**: Sistema de navegação moderno com 5 abas (Reflexões, Músicas, Vídeos, Em Desenvolvimento)
- **Spotify Integration**: Integração completa para reprodução de músicas
- **YouTube Integration**: Integração completa para reprodução de vídeos
- **Página Principal (HOME)**: Exibe título e subtítulo dinâmicos, frase de apresentação e imagem hero configurável
- **Painel Administrativo (ADMIN)**: Área protegida para gerenciar posts, músicas, vídeos e backups
- **Lightbox de Imagens**: Visualização expandida de imagens nos posts com zoom e navegação intuitiva
- **Cache de API**: Sistema avançado com Redis (80-90% redução nas consultas ao banco)
- **Performance**: Core Web Vitals otimizados, build com Turbopack, lazy loading
- **Segurança**: Autenticação JWT, Cookies HTTP-only, Rate Limiting avançado, 0 vulnerabilidades
- **Backup Automático**: Sistema de backup diário com compressão e rotação automática
- **SEO Completo**: Schema.org, Open Graph, Twitter Cards, Core Web Vitals
- **Upload de Imagens**: Sistema robusto com validação de tipos MIME e tamanho de arquivos
- **API RESTful v1.4.0**: Endpoints organizados e documentados para consumo externo
- **Testes de Carga**: 15 testes de carga (k6) validando performance, paginacão, validação e funcionalidades de vídeos, posts e músicas
- **Polimento Visual e Técnico**: Animações, transições e tratamento de erros aprimorados

##  Como Executar (Quickstart)

### Pré-requisitos
- Node.js 24.14.0+
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
    npm run db:init
    ```

4.  **Iniciar Servidor de Desenvolvimento**
    ```bash
    npm run dev
    ```
    Acesse: `http://localhost:3000`

### 🐳 Via Docker (Alternativa)
```bash
docker-compose up -d
docker-compose exec app npm run db:init
```

## 🎯 Status de Produção

**Prontidão para Produção: 100%**

✅ Todos os recursos funcionando  
✅ Segurança verificada (0 vulnerabilidades)  
✅ Performance otimizada  
✅ Documentação completa  
✅ Sistema de backup automático  
✅ API RESTful para consumo externo  
✅ Pipeline CI/CD funcional  
✅ Arquitetura moderna e escalável  
✅ Testes de Integrações Externas (Spotify, YouTube, Redis)  
✅ Testes de Performance e Segurança  
✅ Testes de Cross-Browser e Mobile  
✅ Testes de Carga (k6) - Videos, Posts, Músicas  
✅ Modernização ESM + Turbopack

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
