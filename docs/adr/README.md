# ADRs — decisões de arquitetura

Esta pasta registra o **porquê** das decisões técnicas: o `docs/PROJECT_*.md`
descreve o estado atual, o `CHANGELOG.md` descreve o que mudou, e o ADR guarda a
decisão versionada junto do código. O ai-memory guarda recall de sessão — é
apoio, não a fonte oficial; a decisão não é duplicada como página de memória.

## Índice

| Arquivo | Título | Status | Registrado em |
|---|---|---|---|
| [template.md](template.md) | Template a copiar | — | — |
| [0001](0001-record-architecture-decisions.md) | Registrar decisões de arquitetura em `docs/adr/` | Aceito | 2026-10-14 |
| [0002](0002-nextjs-pages-router.md) | Next.js 16 com Pages Router, sem App Router | Aceito | 2026-10-14 |
| [0003](0003-postgres-without-orm.md) | PostgreSQL com `pg` Pool nativo e SQL parametrizado, sem ORM | Aceito | 2026-10-14 |
| [0004](0004-two-level-cache-with-memory-fallback.md) | Cache em dois níveis (memória + Redis) com fallback em memória e single-flight | Aceito | 2026-10-14 |
| [0005](0005-jwt-http-only-rbac.md) | Autenticação com JWT, cookies httpOnly e RBAC | Aceito | 2026-10-14 |
| [0006](0006-jest-testcontainers-and-manual-pg-mock.md) | Estratégia de testes: Jest com Testcontainers e mock manual do `pg` | Aceito | 2026-10-14 |
| [0007](0007-e2e-without-pull-request-trigger.md) | E2E em push para `main` e `workflow_dispatch`, sem gatilho em `pull_request` | Aceito | 2026-10-14 |
| [0008](0008-modelos-free-por-agente-sem-repeticao.md) | Um modelo FREE distinto por agente, medido, sem repetição | Aceito | 2026-10-15 |
| [0009](0009-dead-code-removal-lib-api.md) | Remover o código morto de `lib/api/` e extrair os schemas de query | Aceito | 2026-10-15 |
| [0010](0010-admin-como-cargo-e-validacao-de-nome.md) | `ADMIN` é um cargo comum; autorização por cargo e permissão, com validação de nome | Aceito | 2026-10-16 |
| [0011](0011-erro-de-banco-503-e-refresh-token-fora-do-body.md) | Erro de banco no painel responde 503 e não vaza mensagem; refresh token fora do body | Aceito | 2026-10-16 |
| [0012](0012-gate-da-suite-k6-por-metrica-propria.md) | Na suíte k6, reprovação vem de métrica própria com threshold; `checks` agregado é diagnóstico | Aceito | 2026-10-17 |
| [0013](0013-agent-process-rules-vs-area-architecture-docs.md) | Regras de processo do agente no `AGENTS.md`; regras de proteção de cada área no seu documento de arquitetura | Aceito | 2026-10-21 |
| [0014](0014-padrao-significa-mais-recentes-e-curadoria-como-posicionados.md) | "Padrão" significa "Mais recentes" e a curadoria manual vira a opção "Posicionados" | Aceito | 2026-10-21 |
| [0015](0015-link-externo-assistir-no-youtube-no-cartao-de-video.md) | Link externo "Assistir no YouTube" no cartão de vídeo | Aceito | 2026-10-21 |
| [0016](0016-seletor-de-ordenacao-de-produtos-no-servidor.md) | Seletor de ordenação de Produtos com ordenação no servidor | Aceito | 2026-10-21 |
| [0017](0017-checagem-de-permissao-modulo-compartilhado-e-protecao-por-rota.md) | A checagem de permissão é um módulo compartilhado, e a proteção por rota passa a ser conferida no servidor | Aceito | 2026-10-21 |
| [0018](0018-rewrite-wip-history-before-publishing.md) | Reescrever o histórico de um WIP antes de publicar, nunca depois do merge | Aceito | 2026-10-22 |
| [0019](0019-pr-only-comment-steps-stay-in-coverage-report.md) | Os steps de comentário de PR ficam guardados dentro do job `coverage-report` | Aceito | 2026-10-22 |
| [0020](0020-supressao-de-console-error-local-por-teste.md) | Supressão de `console.error` é local ao teste que a provoca, nunca global no setup | Aceito | 2026-10-22 |
| [0021](0021-cobertura-do-handler-de-erro-fatal-do-pool-postgresql-em-lib-infra-db.js.md) | Cobertura do handler de erro fatal do pool PostgreSQL em `lib/infra/db.js` | Aceito | 2026-10-23 |

## Quando criar um ADR

Crie quando a decisão:

1. **É cara de reverter** — ex.: adotar Testcontainers na suíte de integração.
2. **Afeta vários módulos** — ex.: cache em dois níveis usado por rate limit e CRUD.
3. **Escolhe entre alternativas reais** — ex.: Pages Router x App Router.
4. **Vai gerar a pergunta "por que fizemos assim?"** — ex.: E2E sem gatilho em PR.

## Quando NÃO criar

Na dúvida, **não crie**. ADR é para decisões duradouras, não para rotina:

- correção de bug (vai no `CHANGELOG.md`); refactor local que não muda contrato;
- renomeação de arquivo, função ou variável; ajuste de estilo ou formatação;
- decisão facilmente reversível (trocar uma lib utilitária pequena);
- inventário de ferramentas ou listagem do que já existe (isso é `PROJECT_*`).

Criar ADR demais dilui o valor da pasta e transforma o índice em ruído.

## Como criar

1. Copie [template.md](template.md) para o próximo número: `NNNN-titulo-em-kebab-case.md`.
2. Preencha; **Status `Aceito` já na criação** — o projeto faz push direto na
   `main`, sem pull request ([ADR-0001](0001-record-architecture-decisions.md)).
3. Atualize a tabela do índice **no mesmo commit**.
4. Status `Proposto` só para decisão genuinamente em aberto. Pull request é
   **opcional**: use quando a mudança for revisada por outra pessoa.

**Ciclo de status:** `Proposto` → `Aceito` (ou `Rejeitado`); no tempo,
`Obsoleto` ou `Substituído por ADR-NNNN`.

**Como mudar uma decisão:** não reescreva um ADR aceito — crie um novo e altere
**apenas** o campo Status do antigo (ex.: `Substituído por ADR-NNNN`).

## Convenções

- Nome `NNNN-titulo-em-kebab-case.md`, em inglês; conteúdo em **português do Brasil**; um ADR por decisão.
- Links relativos ao próprio `docs/adr/`; sem segredos, tokens ou dados pessoais.
- O ADR no repositório é a fonte oficial da decisão; o ai-memory não a duplica.
