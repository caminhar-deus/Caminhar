# ADR-0002: Next.js 16 com Pages Router, sem App Router

- **Status:** Aceito
- **Data:** Registrado em 2026-10-14
- **Decisores:** Mantenedor do projeto (registro retroativo)
- **Relacionados:** [`../../README.md`](../../README.md) do projeto, [`../../design-system/MASTER.md`](../../design-system/MASTER.md), [`../../docs/PROJECT_pages.md`](../../docs/PROJECT_pages.md), [`../../next.config.js`](../../next.config.js)

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

O projeto nasceu em **2026-01-26** já com Pages Router, antes do App Router
existir: `next.config.js` apareceu no commit `81603e1`, em **2026-01-27**. Desde
então a escolha nunca foi revisada, mesmo com o App Router já consolidado como
caminho padrão do Next. Hoje o projeto tem 8 páginas em `pages/`
(`_app.js`, `_document.js`, `index.js`, `admin.js`, `login.js`,
`design-system.js`, `blog/index.js`, `blog/[slug].js`) e 32 arquivos de API em
`pages/api/`. Não existe pasta `app/`. O stack está declarado em
[`design-system/MASTER.md`](../../design-system/MASTER.md)
(linha 10) e no [`README.md`](../../README.md). São as páginas
`blog/index.js` e `blog/[slug].js` as que usam `getServerSideProps`;
`pages/admin.js`, `pages/login.js` e `pages/_app.js` usam `next/router`.

Não há registro documentado da motivação original além dos fatos acima; este
ADR registra a decisão como está em vigor.

## Decisão

Manter Pages Router.

## Alternativas consideradas

- **Migrar para o App Router:** não há registro à época de alternativas avaliadas
  nem de motivação para manter o Pages Router — esta ausência é registrada
  explicitamente aqui, em vez de inventar uma lista. A coexistência concreta
  hoje é o custo da migração: `next/head` em 6 páginas e `next/router` em 3.

## Consequências

### Positivas

- Nenhum custo de migração.
- A documentação do Pages Router continua disponível no pacote do Next
  (`node_modules/next/dist/docs/02-pages/`).
- O build com Turbopack está verde.

### Negativas e riscos

- Sem Server Components, sem streaming e sem o sistema de `metadata` do App Router.
- `next/head` é o padrão substituído por `metadata`.
- Padrões como `middleware` seguem o ciclo de depreciação do framework.

## Revisão

Reavaliar se surgir necessidade concreta de Server Components, streaming ou
`metadata` dinâmico; ou se o Pages Router sair do suporte do Next.js.
