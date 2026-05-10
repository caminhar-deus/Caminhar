# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] - 2026-05-10

### Adicionado

- **Sistema de Testes de Carga com k6** (28 scripts)
  - Testes de carga para músicas, vídeos e posts (CRUD, paginação, busca, filtro, ordenação)
  - Testes de segurança: DDoS search, rate limit, login negativo, IP spoofing
  - Testes de saúde: health check, backup, recovery
  - Testes de cache: headers de cache e performance
  - Fluxos combinados: stress test e upload flow
  - Workflow CI/CD no GitHub Actions com execução diária e upload de relatórios

- **Workflow de Testes de Segurança** (`security-tests.yml`)
  - Execução automatizada de testes de segurança com k6
  - Cenários: DDoS, Rate Limit, Login Negativo, IP Spoofing

- **Sistema de Backup com Criptografia**
  - Compressão gzip, criptografia AES-256-GCM, verificação SHA-256
  - Retenção configurável (10 backups), agendador cron
  - Operações: criar, restaurar, limpar, listar backups

- **Rate Limiting para Rota de Login**
  - Limite: 5 tentativas por IP a cada 15 minutos
  - Whitelist para IPs locais e configurável via variável de ambiente
  - Sistema de banimento progressivo com multiplicador de tempo
  - Notificação webhook para bloqueios recorrentes
  - Fallback entre Redis e memória local

### Melhorado

- **Cobertura de Testes**
  - Thresholds mínimos: branches 92%, funções 95%, linhas 98%, statements 98%
  - ~157 arquivos de teste no total (39 integração + ~96 unitários + infraestrutura)
  - Matchers customizados: toBeISODate, toBeValidJSON, toHaveHeader, toHaveProperties, toHaveStatus
  - Factories para posts, músicas, vídeos e usuários

- **Infraestrutura de Cache**
  - Cache com Redis (Upstash) + fallback local
  - Padrão Cache-Aside com `getOrSetCache`
  - Métricas de monitoramento de cache

- **Sistema de Autenticação**
  - JWT com 1h de expiração, cookies httpOnly
  - Middleware `withAuth()` para proteção de rotas
  - Criação de admin via variáveis de ambiente

### Segurança

- Headers de segurança no Next.js: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`
- CORS configurado para rotas `/api/*` com suporte a `ALLOWED_ORIGINS`
- SQL parametrizado em todas as operações CRUD com validação preventiva contra SQL injection
- Middleware de segurança: validação de token JWT, rate limit distribuído, logging de requisições

### SEO

- Geração automática de sitemaps XML e `robots.txt` via `next-sitemap`
- Schema.org JSON-LD: Article, Organization, BreadcrumbList, Website, Music, Video
- Open Graph e Twitter Cards em todas as páginas públicas
- Componentes de SEO: `SEOHead`, `ArticleSchema`, `BreadcrumbSchema`, `MusicSchema`, `VideoSchema`, `OrganizationSchema`, `WebsiteSchema`

### Componentes UI

- Biblioteca de componentes: Alert, Badge, Button, Card, Input, Modal, Select, Spinner, TextArea, Toast
- Componentes de layout: Container, Grid, Stack, Sidebar
- Componentes de performance: ImageOptimized, LazyIframe, PreloadResources, CriticalCSS
- Componentes de admin: AdminCrudBase (CRUD genérico), AdminDashboard, AdminUsers, AdminPosts, AdminMusicas, AdminVideos, AdminProducts, AdminDicas, AdminAudit
- Componentes de funcionalidades: BlogSection, PostCard, MusicGallery, MusicCard, MusicPlayer, ContentTabs, Testimonials, ProductCard, ProductList

### Infraestrutura

- Next.js 16 com Pages Router
- React 19
- PostgreSQL + SQLite (desenvolvimento local)
- Redis (Upstash) para cache e rate limiting
- Jest 30 para testes unitários e de integração
- Cypress 15 para testes E2E
- k6 para testes de carga
- GitHub Actions para CI/CD (3 workflows: CI, cobertura em PRs, testes de carga)

---

## [1.3.0] - 2026-04-XX

### Adicionado

- **Páginas da Aplicação**
  - Página inicial (`/`) com hero image, ContentTabs e Testimonials
  - Página dinâmica de posts (`/[slug]`) com SEO completo
  - Painel administrativo (`/admin`)
  - Página de design system (`/design-system`)

- **API REST**
  - Endpoints públicos: `/api/posts`, `/api/musicas`, `/api/videos`, `/api/products`, `/api/settings`, `/api/dicas`, `/api/stats`, `/api/status`
  - Endpoints administrativos: CRUD completo para todos os recursos
  - API versão 1: `/api/v1/health`, `/api/v1/posts`, `/api/v1/settings`, `/api/v1/status`
  - Autenticação: `/api/auth/login`, `/api/auth/logout`

- **Hooks Customizados**
  - `useTheme`: gerenciamento de tema light/dark com tokens de design
  - `useAuth`: contexto global de autenticação
  - `useAdminAuth`: autenticação específica do admin com redirect
  - `useAdminCrud`: CRUD reutilizável para painéis admin
  - `useApiFetch`: hook genérico de fetch com loading/error/cache
  - `useDebounce`: hook utilitário de debounce
  - `usePerformanceMetrics`: monitoramento de Core Web Vitals

### Infraestrutura

- Configuração Jest com ambiente jsdom, transformação Babel e mapeamento de aliases
- Setup global de testes com polyfills para JSDOM
- Teardown global com fechamento de conexões Redis e PostgreSQL
- Configuração Cypress para testes E2E

---

## [1.2.0] - 2026-03-XX

### Adicionado

- **Sistema de Admin**
  - Componente base genérico `AdminCrudBase` para operações CRUD
  - Tabela com colunas configuráveis, ordenação e paginação
  - Formulário dinâmico baseado em configuração de campos
  - Drag & Drop para reordenação
  - Exportação CSV, busca local
  - Toggle de status (Publicado/Rascunho) com atualização otimista
  - Validação via Zod

- **Gerenciadores Admin**
  - BackupManager: gerenciamento de backups
  - CacheManager: gerenciamento de cache Redis
  - IntegrityCheck: verificação de integridade
  - RateLimitViewer: visualizador de rate limit

### Infraestrutura

- Configuração Babel exclusiva para testes Jest
- Mocks manuais: cookie, pg, styleMock
- Mocks globais para testes: db.js, fetch.js, next.js

---

## [1.1.0] - 2026-02-XX

### Adicionado

- **Scripts de Automação**
  - Scripts de inicialização: init-server, seed-all, seed por recurso
  - Scripts de banco de dados: db-shell, create-backup, restore-backup, clear-db
  - Scripts de manutenção: clean-orphaned-images, clean-k6-reports, monitor-disk-space
  - Scripts de migração de banco de dados
  - Scripts de diagnóstico
  - Scripts de teste: validação de schema, verificação de servidor

- **Exemplos de Implementação**
  - SEO para posts de blog (exemplo completo com 242 linhas)
  - SEO para homepage
  - SEO para seção de músicas
  - SEO para seção de vídeos

---

## [1.0.0] - 2026-01-XX

### Adicionado

- **Lançamento Inicial do Projeto "Caminhar com Deus"**
  - Configuração Next.js com Pages Router
  - Estrutura de banco de dados PostgreSQL
  - Sistema de autenticação com JWT e bcrypt
  - Layout responsivo com suporte a tema light/dark
  - Integração com Spotify, YouTube e Mercado Livre
  - Estrutura inicial de componentes e páginas
  - Configuração de CI/CD básica

### Infraestrutura Inicial

- Node.js 24.15.0 como engine
- ES Modules como padrão
- Configuração de lint e formatação
- Estrutura de diretórios do projeto
- Configuração de aliases de importação (`@/`, `@tests/`, `@factories/`, etc.)

---

[1.4.0]: https://github.com/caminhar-deus/Caminhar/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/caminhar-deus/Caminhar/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/caminhar-deus/Caminhar/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/caminhar-deus/Caminhar/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/caminhar-deus/Caminhar/releases/tag/v1.0.0