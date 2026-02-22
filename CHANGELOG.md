# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2026-02-22

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