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
