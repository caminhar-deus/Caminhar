# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Não publicado]

### Corrigido

- **O agente `librarian` não existe mais: o slim 3.0.5 fundiu-o no `explorer`.** A tool `subagent` passou a recusar o nome, sem aviso. Não foi config do projeto — é mudança upstream entre 3.0.4 e 3.0.5, verificada no `dist/index.js` instalado (`MARKETPLACE_BUILTIN_RENAMES = { librarian: "explorer" }`, e `SUBAGENT_NAMES` perdeu o nome; o schema do 3.0.5 não menciona `librarian`). Duas armadilhas se somando: o alias `librarian -> explorer` funde campos mas **o canônico vence**, então as permissões do librarian não migravam sozinhas; e a linha `agent.librarian.permission` que sobrou no `opencode.jsonc` criava um **agente fantasma** — `mode: primary`, sem prompt, sem modelo — que aparecia no `opencode debug agents` e não confirmava nada. Por escolha do mantenedor, o contexto7 e o gh_grep migraram para o `explorer`, que passou a ser também o agente de documentação externa; as regras de conduta foram do `librarian_append.md` para o `explorer_append.md`. O modelo `deepseek-v4.1-flash-free`, que era do librarian, ficou órfão — está ativo no catálogo, sem dono, à espera de bateria de medição no papel novo. **Requer reinício do OpenCode**: o slim não recarrega config a quente.

- **Arquivo colocado em `/uploads/` executava script em navegação direta.** O diretório só recebe imagem pela API, que restringe a extensão a uma whitelist — mas nada impede que um arquivo seja colocado lá por fora, e o CSP da aplicação é `<meta http-equiv>` em `pages/_document.js`, que **por definição não vale para uma resposta servida como documento próprio**. Um `.svg` no diretório seria servido como `image/svg+xml` e rodaria script na origem do site, com o cookie de sessão travelling junto (é httpOnly, mas é enviado nas requisições). Agora `/uploads/:path*` recebe `Content-Security-Policy: default-src 'none'; sandbox` pelo `headers()` do `next.config.js` — e não pela rota, porque `headers` roda antes do filesystem e do `afterFiles` rewrite, o que faz a regra alcançar também o arquivo **legado** em `public/uploads/`, servido estaticamente e nunca passado pela rota. `X-Content-Type-Options: nosniff` já era global desde sempre e não foi repetido. Verificado com `next start`: os dois caminhos devolvem 200 com o header e os bytes idênticos, e uma página normal não o recebe.

- **O gate de conteúdo do upload era a única barreira contra payload forjado, e não tinha teste.** `imageFile.mimetype` vem do `Content-Type` da parte multipart, controlado pelo cliente (`Formidable.js:371`), então a validação de mimetype passa com qualquer payload declarado como imagem. O que realmente impede a gravação é o `sharp`, e nenhum teste cobria os dois ramos de rejeição dele. Agora `tests/integration/api/upload-image-disk.test.js` tem 5 casos com `formidable`, `fs` e `sharp` reais, incluindo imagem acima de 1920px e payload não-imagem declarado `image/jpeg`. **Mutation check**: remover a checagem de dimensão reprova 1 teste; burlar o `sharp` reprova 2. Junto: a mensagem "Arquivo corrompido ou formato não suportado" foi trocada por "Não foi possível ler a imagem. Envie um arquivo JPG, PNG, WebP ou GIF válido." — o `sharp` lê **só o header**, então um JPEG truncado com header íntegro passa, e o texto antigo prometia integridade que o gate não verifica.

- **Upload de imagem acima de 5MB devolvia 500 em vez de 413.** O `maxFileSize` do formidable abortava o parse e o erro caía no `catch` que responde 500, tornando inalcançável a checagem de tamanho do próprio handler. Agora o excesso de tamanho responde `413` com a mensagem do limite, e a mensagem chega ao usuário em vez de um rótulo genérico.

- **`expectedStatuses` não é uma chave válida de params do k6 — os 2 scripts que a usavam tinham a opção silenciosamente ignorada.** A opção correta é `responseCallback`, e `http.expectedStatuses(...)` é uma *função* que constrói o callback; como o parse de params do k6 não tem `default:`, a chave desconhecida era descartada sem warning. Em `security/ddos-search-test.js` isso fazia os 429 — que são justamente o **sinal de que a proteção funcionou** — contarem como requisição falha, e o artifact registrava `http_req_failed` em 99,94% num teste cuja proteção estava de pé. Em `functional/recovery-test.js` a mesma chave servia para aceitar qualquer status. Ambos agora usam `responseCallback`.

- **Versão do k6 não era pinada na CI.** `.github/workflows/test-base.yml` chamava `grafana/setup-k6-action@v1` sem `k6-version`, instalando a *latest* a cada semana — e uma troca de versão pode alterar métricas, thresholds e o comportamento de `responseCallback` sem que nada no repositório mude. Agora pinada em `2.3.0`, a versão que os runs #12–#14 instalaram: pinar não altera o comportamento já medido, só impede a deriva. O valor vai **sem o prefixo `v`**, porque a action monta a URL como `releases/download/v<k6-version>/…` — passar `v2.3.0` gera `vv2.3.0` e 404, que foi exatamente a falha do run #15 (18/10/2026).

- **`functional/recovery-test.js` não tinha nenhum threshold.** O perfil `recovery` define `thresholds: {}` e o script não acrescentava nada, sendo o único da bateria sem gate. Pior: o agregado `checks` dele é 100% por construção (cada ramo do `if` declara um único check que sempre passa), logo não distingue "saudável" de "caído". Agora tem a métrica própria `recovery_unhealthy_rate` com threshold `rate<0.10`, no mesmo padrão de `search_block_rate` e `ip_rotation_evasion_rate`. Baseline medida no run #14: 0,00%.

- **JWT do admin semeado vazava em texto claro no artifact do cron de carga.** O `sanitizeToken` do `load-tests/helpers/report.js` só ocultava o token quando `setup_data` chegava como objeto `{ token }`, mas `createLoadSetup` retorna `loginRes.json('data.token')` — uma **string crua**, forma que o sanitizador nunca alcançava. Resultado medido nos runs #12–#14 do cron: 2 dos 9 JSON com `setup_data` (`musicas_load_test.json` e `videos_load_test.json`) publicavam o token, e o artifact é baixável por qualquer pessoa durante a retenção de 30 dias. Agora os dois formatos são tratados. A cópia morta da função em `resource-test-runner.js` foi removida junto (ver `docs/UPGRADE_load-tests.md` §4.4).

- **4 dos 30 scripts k6 não gravavam relatório nenhum.** `cache-warmup-test`, `cache-performance-test`, `create-post-flow` e `health-check` não tinham `handleSummary`, o que explica o artifact de 28 arquivos para 30 scripts: as métricas desses quatro existiam só no log do job, que expira junto com o run. Agora gravam `reports/k6-summaries/{cache_warmup_test,cache_performance_test,create_post_flow,health_check}.json`. Mudança estritamente aditiva — nenhuma opção, threshold, cenário ou `setup`/`teardown` foi tocado.

### Documentação

- **Corrigido o dado de atraso do cron de carga.** O intervalo registrado (+6h4 a +19h1) era contaminado: o "+19h07 (pior caso)" vinha do `run_started_at` do run #7 na sua **segunda tentativa** (re-run manual), não do disparo do agendado. Medidos os 13 runs agendados de #1 a #14 (05–17/10/2026), o atraso real é **+4h19 a +7h46**, mediana +6h49 — e está diminuindo. Tabela, critério de medição e correção registrados em `.github/workflows/load-tests.yml`, que passa a ser a fonte única do dado (a tabela duplicada em `PROJECT_load-tests.md` virou ponteiro).
- **Runs #12, #13 e #14 do cron registrados** em `docs/PROJECT_load-tests.md`, com o resultado do experimento do **item AB** (ordem da bateria) em 3 amostras pós-mudança, e o outlier de p95 do run #14 atribuído à **região do runner** (`eastus` → `mexicocentral`), descartando por medição as hipóteses de stall de checkpoint e de regressão de código.

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

- Node.js 24.22.0 como engine
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