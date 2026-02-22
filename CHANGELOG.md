# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-02-22

## [1.5.0] - 2026-02-22

### Testes de Carga e Performance (k6)
- **Relatórios Visuais**: Implementação de relatórios HTML (`k6-reporter`) gerados automaticamente após os testes.
- **Segurança em Relatórios**: Adicionada sanitização automática (`handleSummary`) para ocultar tokens JWT nos arquivos de log JSON e HTML.
- **Novos Cenários Avançados**:
  - `stress-test-combined.js`: Cenário unificado de estresse com monitoramento de memória em paralelo.
  - `ddos-search-test.js`: Simulação de ataque DDoS na rota de busca com evasão de cache.
  - `ip-spoofing-test.js`: Teste de robustez do Rate Limit simulando múltiplos IPs via headers.
  - `backup-verification-test.js`: Validação binária (Magic Bytes) da integridade dos arquivos de backup `.gz`.
  - `recovery-test.js`: Teste de monitoramento de recuperação (TTR) após falha simulada de infraestrutura.
  - `cache-headers-test.js`: Validação funcional dos headers `Cache-Control` nas APIs públicas.
  - `search-content-test.js`: Validação de relevância dos resultados da rota de busca de posts.
  - `login-negative-test.js`: Teste de segurança para validação de credenciais inválidas.
  - `rate-limit-test.js`: Validação de bloqueio por excesso de requisições (429).
  - `pagination-test.js`: Validação funcional da lógica de paginação da API de posts.
  - `videos-filter-test.js`: Validação de filtros por título na API de vídeos.
  - `video-validation-test.js`: Validação de integridade de URLs do YouTube na criação de vídeos.
  - `musicas-sort-test.js`: Validação de ordenação cronológica na API de músicas.
  - `posts-tags-test.js`: Validação de filtro por tags na API de posts.
  - `posts-cursor-pagination-test.js`: Validação de paginação eficiente (keyset) na API de posts.
  - `videos-pagination-test.js`: Validação funcional da lógica de paginação da API de vídeos.
  - `musicas-pagination-test.js`: Validação funcional da lógica de paginação da API de músicas.
  - `musicas-filter-test.js`: Validação de filtros por artista na API de músicas.
  - `musicas-search-test.js`: Validação de busca por título na API de músicas.
  - `videos-sort-test.js`: Validação de ordenação cronológica na API de vídeos.
  - `clean-k6-reports.js`: Script de manutenção para rotação e limpeza automática de relatórios antigos (>7 dias).
- **Configuração Flexível**: Suporte a arquivo `env-config.json` para gerenciar variáveis de ambiente dos testes sem poluir a linha de comando.

### Refatoração (Architecture Cleanup)
- **Organização de Testes**: Centralização de todos os testes na pasta `tests/`, divididos em `unit/` e `integration/`.
- **Limpeza da Raiz**: Remoção de arquivos de teste e scripts soltos na raiz do projeto.
- **Estrutura da Lib**: Organização da pasta `lib/` removendo testes e scripts de manutenção, mantendo apenas lógica de domínio e infraestrutura.
- **Componentes Admin**: Reorganização dos componentes administrativos em subpastas `Managers/` e `Tools/` dentro de `components/Admin/`.
- **Scripts**: Centralização de scripts utilitários e de manutenção na pasta `scripts/`, organizados por categoria (`db`, `auth`, `maintenance`, `utils`).
- **Load Tests**: Movimentação de testes de carga k6 para a pasta dedicada `load-tests/`.

## [1.3.0] - 2026-02-21

### Adicionado
- **Badge de Status**: Adicionado badge de status do build (GitHub Actions) ao `README.md` para visibilidade imediata da saúde do projeto.
- **Diagnóstico Avançado**: Incluídos novos comandos de diagnóstico no `README.md` (`npm run check-env`, `npm run analyze`, `gzip -t`) para facilitar a manutenção.
- **Documentação de Cache**: Adicionada explicação clara no `README.md` sobre o comportamento de fallback do cache (Redis vs. Memória).

### Alterado
- **Foco em PostgreSQL**: Removidas todas as referências legadas ao SQLite da documentação. O `README.md` e `docs/DEPLOY.md` agora refletem uma arquitetura 100% PostgreSQL.
- **Alinhamento de Deploy**: `README.md` e `docs/DEPLOY.md` foram sincronizados, com avisos críticos sobre a limitação de uploads locais em ambientes Serverless (Vercel).
- **Consistência do Cache**: A documentação de deploy e troubleshooting foi corrigida para refletir o uso exclusivo do Upstash Redis (via HTTP), removendo menções a `redis-server` local ou `redis-cli`.
- **Roadmap Estratégico**: A seção "Melhorias Futuras" no `README.md` foi reestruturada para separar itens de **Infraestrutura/Engenharia** e funcionalidades de **Produto**.

### Corrigido
- **Comandos de Documentação**: Corrigidos comandos incorretos ou obsoletos na seção de Troubleshooting do `README.md` (ex: `npm run init-db` para `npm run init-posts`).
- **Troubleshooting Aprimorado**: A seção de solução de problemas foi refinada para abordar problemas mais realistas relacionados a PostgreSQL, permissões e deploy em Serverless.

### Removido
- **Comandos Legados**: Removidos scripts e menções a comandos de migração de SQLite (`migrate-sqlite-pg`) que não são mais necessários.