# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), e este projeto adere ao [Versionamento Semântico](https://semver.org/spec/v2.0.0.html).

## [1.6.0] - 2026-02-26

### Adicionado
- **ID na Listagem de Posts**: A tabela de posts no painel administrativo agora exibe a coluna "ID", facilitando a identificação e depuração.
- **Zoom de Imagem (Lightbox)**: Implementada a funcionalidade de ampliação (lightbox) para a imagem de capa na página de um post. O usuário pode clicar na imagem para vê-la em tela cheia e fechar com 'Esc' ou clicando fora.

### Alterado
- **Exibição de Imagem do Post**: A imagem de capa na página do artigo agora utiliza `object-fit: contain` para ser exibida por completo, sem cortes, melhorando a visualização da arte.

---

## [1.5.0] - 2026-02-22

### Adicionado
- **Scripts de Banco de Dados**: Novos comandos para gerenciamento de dados:
  - `npm run db:clear`: Limpa todos os dados de todas as tabelas e o diretório de uploads.
  - `npm run db:clear:musicas`: Limpa apenas a tabela de músicas.
  - `npm run db:reset:password`: Atalho para redefinir a senha de um usuário.
- **Testes de Carga (k6)**: Implementação de relatórios visuais HTML, sanitização de segurança e 26 novos cenários avançados (DDoS, Stress, IP Spoofing, etc.). Consulte `docs/TESTING.md` para a lista completa.
- **Configuração de Testes**: Suporte a arquivo `env-config.json` para variáveis de ambiente em testes de carga.

### Alterado
- **Scripts**: O script `seed-all.js` foi corrigido para chamar `npm run db:reset` corretamente.
- **Scripts**: O script `db:clear` foi aprimorado para também limpar o diretório `public/uploads`.
- **Refatoração Estrutural**:
  - Centralização de todos os testes na pasta `tests/`.
  - Limpeza da raiz do projeto e organização da pasta `lib/`.
  - Reorganização dos componentes administrativos em `components/Admin/Managers` e `Tools`.
  - Centralização de scripts utilitários em `scripts/`.

### Corrigido
- **Upload de Imagem**: Corrigido bug crítico onde o upload de uma imagem para um novo post substituía a imagem principal do site. A API de upload agora diferencia os tipos de imagem (`post` vs. `setting_home_image`) e salva os arquivos com prefixos distintos (`post-image-` vs. `hero-image-`).
- **Layout do Admin**: Ajustes de CSS para corrigir espaçamento e quebra de linha nas abas do painel administrativo, melhorando a responsividade.
- **Paginação de Músicas**: Correção na função `getPaginatedMusicas` que impedia a exibição de músicas no painel administrativo devido a uma construção incorreta da query SQL quando nenhum termo de busca era fornecido.
- **Scripts de Cache**: Melhoria no feedback do script `clear-cache.js` para ambientes sem Redis configurado.

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