# Changelog

Registro de alterações e atualizações do projeto Caminhar com Deus.

## [1.7.0] - 2026-03-07

### Adicionado
- Arquitetura de testes centralizada com factories, helpers e mocks
- Testes de API integrados para health check, status e cache admin
- Matchers customizados para validação de respostas HTTP
- Setup centralizado para todos os testes com polyfills

### Alterado
- Reorganização completa da estrutura de testes
- Configuração de Jest para suporte a ES modules
- Padronização de imports usando aliases `@tests/`
- Validação de testes flexíveis para campos adicionais

### Corrigido
- Erros de Babel e conflitos de transformação
- Problemas de importação de handlers e módulos
- Mocks de banco de dados e Redis
- Validação de autenticação

### Dependências
- Atualizado Jest para ES modules
- Adicionado configuração de transformIgnorePatterns

## [1.6.0] - 2026-02-26

### Quebrando
- Alteração no endpoint `/api/v1/posts` para `/api/posts`
- Mudança no schema da tabela `posts`

### Adicionado
- ID na listagem de posts no painel admin
- Zoom de imagem (lightbox) para posts
- Sistema de backup automático com rotação
- Cache de imagens e API com Redis
- ContentTabs com 5 abas (Reflexões, Músicas, Vídeos)
- Spotify e YouTube Integration completas
- Sistema de upload de imagens robusto
- Testes de performance, segurança e cross-browser

### Alterado
- Exibição de imagem do post com `object-fit: contain`
- Foco exclusivo em PostgreSQL (removido SQLite)
- Refatoração estrutural completa
- Migração para ES modules sem flags experimentais

### Corrigido
- Bug crítico de upload de imagem substituindo hero image
- Layout do admin e paginação de músicas
- Scripts de cache e comandos de documentação

### Dependências
- Atualizado Next.js 15.0.0 → 16.1.6
- Atualizado React 19.0.0 → 19.2.4
- Adicionado k6 para testes de carga
- Adicionado Redis client para cache distribuído

## [1.5.0] - 2026-02-22

### Adicionado
- Scripts de banco de dados: `db:clear`, `db:clear:musicas`, `db:reset:password`
- Testes de carga (k6) com relatórios HTML e 26 cenários avançados
- Configuração de testes com `env-config.json`
- Suíte de testes de carga completa

### Alterado
- Correção do script `seed-all.js`
- Aprimoramento do script `db:clear` para limpar uploads

### Corrigido
- Endpoints de testes de carga (removido prefixo `/v1`)
- Resiliência dos testes para banco de dados vazio

### Dependências
- Atualizado dependências de testes de carga
- Adicionado ferramentas de sanitização de logs

## [1.3.0] - 2026-02-21

### Adicionado
- Badge de status do build no README
- Comandos de diagnóstico avançado
- Documentação clara sobre cache Redis vs. Memória

### Alterado
- Foco exclusivo em PostgreSQL na documentação
- Alinhamento de deploy entre README e docs
- Roadmap estratégico reestruturado

### Corrigido
- Comandos incorretos na documentação
- Troubleshooting aprimorado para PostgreSQL

### Dependências
- Atualizado dependências de desenvolvimento
- Adicionado ferramentas de diagnóstico

## [1.2.0] - 2026-02-20

### Adicionado
- Sistema de cache avançado com Redis (Upstash)
- Performance otimizada com Core Web Vitals
- Segurança reforçada com JWT e rate limiting
- SEO completo com Schema.org e Open Graph
- API RESTful v1.4.0 documentada
- Sistema de backup automático diário
- Upload de imagens com validação de MIME e tamanho
- Polimento visual com animações e transições

### Alterado
- Arquitetura modernizada para produção
- Documentação técnica completa
- Estrutura de projetos organizada

### Corrigido
- Vulnerabilidades de segurança
- Performance de consultas ao banco
- Validação de uploads

### Dependências
- Atualizado PostgreSQL driver
- Adicionado @vercel/og para imagens Open Graph
- Atualizado Jest para ES modules

## [1.1.0] - 2026-02-19

### Adicionado
- Testes de carga com k6
- Testes de integração Cypress
- Testes unitários Jest
- Pipeline CI/CD automatizado
- Documentação técnica detalhada

### Alterado
- Estrutura de testes organizada
- Configuração de Jest otimizada

### Corrigido
- Bugs de performance
- Problemas de integração

### Dependências
- Adicionado k6 para testes de carga
- Atualizado Jest para versão mais recente

## [1.0.0] - 2026-02-18

### Adicionado
- Versão inicial de produção
- Sistema completo de posts
- Painel administrativo
- Autenticação JWT
- Banco de dados PostgreSQL
- Deploy automatizado

### Dependências
- Node.js 24.14.0+
- Next.js 15.0.0
- React 19.0.0
- PostgreSQL