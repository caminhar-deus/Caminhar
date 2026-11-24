# Auditoria Semanal — Fluxo de Design
## Projeto Caminhar | Registro central de auditorias e Planos de Ação

> Este documento acumula as auditorias semanais do fluxo de design. Cada ciclo é acrescentado ao final (§ "Histórico de ciclos"). Nenhum ciclo anterior deve ser apagado; apenas o **status** dos problemas e das ações pode ser atualizado quando houver evidência.
> Rotina somente de análise: **nenhuma alteração de código, CSS, componente, configuração ou documentação existente foi feita**. A implementação depende de autorização específica posterior.

**Convenção de classificação** (usada em todo o documento):

| Rótulo | Significado |
|---|---|
| **Confirmado** | Há evidência concreta (código, diff, cálculo reproduzível). |
| **Indício** | Há sinais, mas falta confirmar impacto real (ex.: validação visual). |
| **Hipótese** | Causa ou risco a investigar; não é erro confirmado. |
| **Processo validado** | Funcionamento adequado, com evidência indicada. |

**Convenção de IDs:** `DS-nn` = problema de **implementação/design** (o que está no código ou no CSS). `PR-nn` = problema de **processo** (como o trabalho é conduzido, validado e documentado). Os IDs são estáveis entre ciclos: um problema que reaparece reutiliza o ID e ganha uma linha em "Ocorrências".

**Registro consolidado (atualizar a cada ciclo):**

| ID | Resumo | Prioridade | Situação | Visto no ciclo |
|---|---|---|---|---|
| DS-01 | Tokens CSS inexistentes em `Home`, `ProductCard` e `AdminSales` (24 declarações) | Alta | Corrigido (19/11/2026; mantido verde em 23/11/2026) | 1 |
| DS-02 | Botões de marketplace: texto 12px com contraste < 4,5:1 e hex avulso | Média | Corrigido (19/11/2026; mantido verde em 23/11/2026; recorrência de classe em `DS-04`) | 1 |
| DS-03 | Estilo inline e campo duplicado em `AdminSales`/`checkout`; texto informativo em `--color-text-tertiary` | Baixa | Corrigido nos 2 arquivos originais (19/11/2026; recorrência de classe em `DS-04`) | 1 |
| PR-01 | Correção e guard de tokens restritos a um único arquivo | Alta | Corrigido para tokens `var(--*)` e `outline: none` nos 43 `.css` (19–20/11/2026; recorrência parcial de escopo em `PR-05`) | 1 |
| PR-02 | Páginas do visitante e Gestão de Vendas sem override em `design-system/pages/` | Média | Corrigido (19/11/2026; lacunas residuais de sincronia em `PR-06`) | 1 |
| PR-03 | Nenhuma validação visual, responsiva ou de acessibilidade registrada na janela | Média | Parcialmente corrigido — reincidência nos 6 commits visuais de 21/11 (Opção 2A ativa no Jest; inspeção visual em 4 viewports e Opção 2B pendentes) | 1, 2 |
| PR-04 | Rastreabilidade: commits `ATT - …` sem escopo e sem histórico por agente | Média | Encerrado por decisão do dono (20/11/2026 — Opção 1A: padrão atual mantido) | 1 |
| DS-04 | Correção parcial em `pages/blog/[slug].js` (`54ed1f3`): 12 `style={{`, falhas WCAG AA (WhatsApp 1,98:1 e data 2,31:1), zoom inacessível por teclado e sem `skip-link`/`<main>` | Alta | Aberto | 2 |
| DS-05 | Inconsistência de busca/foco/raios em `AdminSales` (`Pedidos`) e mistura `--border-radius-md`/`-lg` em `CustomerPages` (e `Login`) | Média | Aberto | 2 |
| DS-06 | Contraste < 4,5:1 na barra `Dicas` de `AdminDashboard` (`--color-secondary-700`, 4,09:1) e aperto potencial de `.statColumns` em 375px | Média | Aberto (contraste confirmado; 375px é Indício) | 2 |
| DS-07 | Assimetria de UX na paginação das galerias irmãs (`ProductList` × `MusicGallery`/`VideoGallery`) e dívidas menores pré-existentes (`Pagination`, `pages/404.js`, `pages/design-system.js`) | Baixa | Aberto | 2 |
| PR-05 | Guards de `style={{` (2 arquivos) e par de foco duplo (4 de 43 `.css`) restritos em `css-tokens.test.js`, somados a ajustes pontuais sem revisão de arquivo completo/irmãos | Alta | Aberto | 2 |
| PR-06 | Lacunas residuais em overrides (`login.md`, `posts.md`, `customer.md`, `/blog`) e conflito de `designer_append.md` saneado apenas no working tree em 23/11 | Média | Parcialmente corrigido | 2 |
| PR-07 | Observabilidade limitada entre OpenCode e Antigravity (`ai-memory` MCP negado + 20 warnings em `_lint/report.md`, `models:check` não verificado fora do host, 20 arquivos em working tree) | Baixa | Aberto | 2 |

---

# Ciclo 1 — 19/11/2026

## 6.1 Identificação da auditoria

- **Data e horário da execução:** 19/11/2026, 23:29 (America/Sao_Paulo, BRT).
- **Período auditado:** **12/11/2026 23:29 → 19/11/2026 23:29** (7 dias móveis). Na janela há **35 commits** (`git log --since`), o mais antigo em 13/11 07:53 e o mais recente em 19/11 22:28.
- **Executor:** Antigravity (rotina semanal). Primeira auditoria deste fluxo: não havia `melhoria_design.md` (verificado), então todos os registros são novos.
- **Escopo:** fluxo de design do Site Público e do Painel — tokens, CSS Modules, componentes, páginas do visitante (`/entrar`, `/minha-conta`, `/checkout/[id]`), Gestão de Vendas, ícones, documentação de design e validações. Fora de escopo: regras de negócio de pagamento e autenticação Google (têm `docs/melhoria_mercadopago.md` e `docs/melhoria_google.md`).
- **Fontes consultadas (somente leitura):**
  - Orientação: `AGENTS.md` (§0 a §7), `docs/ARQUITETURA_SITE_PUBLICO.md` (completo), `docs/ARQUITETURA_SITE_PRIVADO.md` (§1 a §2), `design-system/MASTER.md` (completo), `design-system/pages/*.md` (existência e buscas), `docs/adr/README.md`, `docs/melhoria_google.md` (formato de referência).
  - Git: `git log --since`, `git show`/`git blame` de `75fb1cb`, `80478dd`, `f161227`, `6424780`, `819bcb1`, `f46ebf4`; `git status` (árvore limpa).
  - Código: `pages/styles/variables.css`, `pages/styles/CustomerPages.module.css`, `pages/styles/Home.module.css`, `components/Features/Products/styles/ProductCard.module.css`, `components/Admin/styles/AdminSales.module.css`, `components/Admin/AdminSales.js`, `pages/checkout/[id].js`, `pages/entrar.js`, `components/UI/icons.js`, `components/Layout/Grid.js` e `Sidebar.js` (origem de variáveis dinâmicas), `pages/design-system.js` (cabeçalho).
  - Testes e logs: `tests/unit/pages/minha-conta.test.js` (diff de `75fb1cb`), `logs/tests-output.log` e `logs/coverage-output.log` (19/11 22:10–22:14), `cypress/e2e/*`.
  - Varredura própria (somente leitura, saída em `/tmp`, fora do projeto): lista de todos os `var(--*)` usados em 43 arquivos `.css` comparada com as 348 propriedades definidas em `variables.css`.
- **Limitações (nada foi presumido a partir delas):**
  1. **ai-memory (MCP) negado** nesta execução (`memory_query`): sessões e decisões do período só puderam ser inferidas do git e do que o hook injetou (handoff e sessão da auditoria do Google, sem relação com design). Não houve tentativa de contornar a negativa.
  2. **Histórico do OpenCode indisponível** (`~/.local/share/opencode` não existe; só há configuração em `~/.config/opencode`) e **só o transcript desta execução** existe no Antigravity. Não é possível atribuir commits a OpenCode ou Antigravity, nem confirmar quais documentos cada agente leu. Todos os commits têm o mesmo autor Git.
  3. **Nada foi renderizado.** Não foram abertos navegador, capturas de tela, Lighthouse ou axe. Impactos visuais abaixo são deduzidos do CSS e marcados como **Indício** quando dependem de ver a tela.
  4. **Testes não executados** nesta rodada (restrição de não alterar estado). Os logs de 19/11 22:10–22:14 indicam `235 suítes passaram, 1998 testes passaram, 8 suítes e 96 testes ignorados`, mas são **anteriores ao commit `f161227` (22:28)**.
  5. `.env*` não lido (`AGENTS.md` §6); GitHub Actions inacessível (sem rede).

## 6.2 Resumo do diagnóstico

O fluxo de design da semana teve **pouca atividade visual direta**: dos 35 commits, só três tocaram CSS ou apresentação (`819bcb1` 13/11, `80478dd` 19/11 e `75fb1cb` 19/11 — este último é o único dedicado a padrão visual, "Standards"). Nenhum commit alterou `design-system/MASTER.md`, os overrides de página ou os dois documentos de arquitetura **por motivo de design**; as edições em `ARQUITETURA_SITE_PUBLICO.md` foram de pagamentos e Google, em conformidade com `AGENTS.md` §0.2 item 5.

O achado principal é um **defeito sistêmico incompleto**: o commit `6424780` (08/11) escreveu CSS com tokens que não existem em `variables.css` (`--border-width-thin`, `--color-border-primary`, `--color-*-bg/-dark/-border`, `--transition-colors`). Em 19/11, `75fb1cb` corrigiu **só** `CustomerPages.module.css` e acrescentou um teste que vigia **só esse arquivo**. Os mesmos tokens inválidos continuam em outros três arquivos de CSS (24 declarações), com efeito visível provável: selos de status do painel sem cor, selos de modalidade dos produtos sem cor, e o botão "Entrar / Minha Conta" do cabeçalho público sem borda.

Foram registrados **7 problemas** (3 de implementação, 4 de processo), **nenhum corrigido por completo**. Há **reincidência dentro da janela** (mesma classe de defeito em 4 arquivos, corrigida em 1). Não há reincidência de ciclos anteriores, pois este é o primeiro.

## 6.3 Fluxo de trabalho identificado

**Rotinas e atores (segundo `AGENTS.md`, confirmado no código e nos documentos):**
- Tarefa de design identifica a área (público, painel ou ambas) e lê o documento de arquitetura da área (§0.1 e §0.3), depois `MASTER.md` e o override da página, se existir (§4).
- No `oh-my-opencode-slim`: orchestrator planeja, designer decide UI/UX e grava `design-system/`, fixer implementa, oracle revisa com o checklist. Fora dele (Antigravity), um único agente acumula os papéis (§2).
- Definição de pronto (§7): testes, design conforme MASTER, pendências da área conferidas, revisão do checklist, arquitetura e data atualizadas se houve mudança estrutural, `knip` e `lint:workflows`.

**Etapas observadas na janela (inferidas do git, não de transcritos):**
1. Mudança de produto (pagamento 13–18/11, Google 19/11) entra por commits grandes e misturados.
2. A documentação de arquitetura pública é atualizada junto (conforme §0.2 item 5).
3. Uma passada de "Standards" (`75fb1cb`, 19/11 12:13, ~32 min após `80478dd`) alinha CSS e ícones aos tokens e ao MASTER.
4. Validação por testes de Jest e Cypress (`checkout.cy.js` alterado em 16/11); sem verificação visual registrada.

**Onde o fluxo diverge do desenho:** a etapa de revisão do checklist e o designer não deixam rastro verificável (nenhum arquivo de `design-system/` mudou) e a revisão "Standards" foi limitada aos arquivos tocados pela mudança (ver PR-01).

## 6.4 Problemas encontrados

### DS-01 — Tokens CSS inexistentes em três arquivos
- **Descrição:** `variables.css` não define `--border-width-thin`, `--color-border-primary`, `--transition-colors` nem `--color-{success,warning,error,info}-{bg,dark,border}`. O uso inválido invalida a declaração inteira no momento do cálculo (`border`, `transition`, `background-color`, `color` voltam ao valor inicial).
- **Evidência (Confirmado):** varredura de 43 arquivos `.css` contra as 348 propriedades de `variables.css`. Restam: `Home.module.css` linhas 27 e 33 (`.accountLink`); `ProductCard.module.css` linhas 105–107, 114 e 200 (`.badgeInternal`, `.badgeExternal`, `.soldOutButton`); `AdminSales.module.css` linhas 10, 20, 27, 56, 71 e 101–124 (subabas, caixas e quatro selos de status). Total: **24 declarações**. As demais variáveis ausentes (`--cols-*`, `--min-width`, `--stack-gap`, `--main-margin`) são definidas em linha por `Grid.js`/`Sidebar.js` ou nas próprias classes de `Stack.module.css`, e têm *fallback*; **não são defeito**. Origem: `git blame` aponta `6424780` (08/11, anterior à janela). Em 19/11, `75fb1cb` trocou os mesmos tokens em `CustomerPages.module.css` (`--border-width-thin → --border-width-1`, `--color-border-primary → --color-border-light`, `--color-success-bg → --color-success-50` etc.).
- **Arquivos:** os três acima e `pages/styles/variables.css`.
- **Etapa:** implementação (escrita do CSS) e revisão (a passada de padrões não varreu os arquivos irmãos).
- **Causa:** tokens usados de memória, sem conferir `variables.css`; nenhuma verificação automática por token (PR-01).
- **Impacto:** (a) painel, Gestão de Vendas: selos de status de pagamento e pedido sem fundo, cor e borda, perdendo a semântica exigida por `design-system/pages/admin.md`; (b) vitrine: selos "Venda direta"/"Loja parceira" e botão "Esgotado" sem borda ou cor de estado; (c) cabeçalho público: botão "Entrar / Minha Conta" sem borda e sem transição, sobre fundo `#fafafa` em página `#f5f5f5` (**Indício**: contraste do contorno depende de validação visual). Afeta consistência entre público e painel e contraria `MASTER.md` §2 e §9.
- **Situação:** **parcialmente corrigido** (1 de 4 arquivos).

### DS-02 — Botões de marketplace com contraste insuficiente e hex avulso
- **Descrição:** `.linkShopee` usa `#fff` sobre `#ee4d2d` e `.linkAmazon` usa `#fff` sobre `#ff9900`, com texto `--font-size-xs` (12px), negrito, `min-height: 44px`.
- **Evidência (Confirmado por cálculo WCAG):** contraste ≈ **3,7:1** (Shopee) e ≈ **2,1:1** (Amazon), abaixo de 4,5:1 exigido para texto normal (`MASTER.md` §2 e §10). Mercado Livre (`#333` sobre `#ffe600`, ≈ 10:1) passa. Fonte de 12px também está abaixo do `--font-size-sm` previsto para botões (`ARQUITETURA_SITE_PUBLICO.md` §1.1 item 6).
- **Arquivos:** `components/Features/Products/styles/ProductCard.module.css` linhas ~174–187 (`.linkMercadoLivre`, `.linkShopee`, `.linkAmazon`).
- **Etapa:** projeto visual (decisão de cores de marca) e revisão de acessibilidade.
- **Causa/hipótese:** `MASTER.md` §7 autoriza cor de marca externa só na ação direta ao serviço, mas não registra a exceção de hex nem exige contraste. Origem anterior à janela; **verificado como estado atual**.
- **Impacto:** legibilidade do rótulo "Link para Shopee/Amazon" para baixa visão; hex fora de `variables.css` (anti-padrão do §9).
- **Situação:** aberto. Requer decisão do dono (ver ação M-01), pois muda aparência de marca.

### DS-03 — Estilo inline, campo duplicado e texto informativo em cor terciária
- **Descrição:** `AdminSales.js` define `ShippingTypeSelect` com `style={{…}}` próprio (label, contêiner e dica) em vez de usar o componente compartilhado de campo; a dica usa `--color-text-tertiary`. `checkout/[id].js` usa `style={{ marginTop… }}` em 5 pontos e `AdminSales.js` em cerca de 10.
- **Evidência (Confirmado):** `AdminSales.js` linhas 20–35, 489–493, 600 e 621; `pages/checkout/[id].js` linhas 999, 1008, 1129, 1169 e 1174. `git blame`: majoritariamente `6424780` (08/11), com ~22 linhas do checkout de `819bcb1` (13/11, dentro da janela). `MASTER.md` §9 proíbe "estilo inline no lugar de CSS Modules" e §2 restringe `--color-text-tertiary` a placeholder.
- **Etapa:** implementação.
- **Causa:** atalhos de espaçamento sem classe; reuso do componente `Input`/`Select` não conferido (hipótese).
- **Impacto:** manutenção e consistência; contraste da dica (`#a3a3a3`) abaixo de AA. Os valores inline usam tokens, então não há hex avulso.
- **Situação:** aberto.

### PR-01 — Correção e guard de tokens restritos a um único arquivo
- **Descrição:** a passada "Standards" (`75fb1cb`) e o teste novo cobrem só `CustomerPages.module.css`.
- **Evidência (Confirmado):** o teste está em `tests/unit/pages/minha-conta.test.js` e lê apenas esse CSS; não existe `stylelint` (nenhum `.stylelintrc*`; `package.json` sem a dependência); `npm run knip` e `lint:workflows` não verificam tokens. O mesmo defeito permaneceu em três arquivos (DS-01). Isto é **correção isolada com risco de inconsistência** (`§4.6` do pedido).
- **Etapa:** validação final.
- **Causa:** revisão orientada ao arquivo tocado, sem varredura global; guard escrito dentro do teste de uma página.
- **Impacto:** a mesma classe de erro pode voltar sem aviso (reincidência), como já ocorreu em 4 arquivos na mesma origem.
- **Situação:** aberto.

### PR-02 — Páginas do visitante e Gestão de Vendas sem override de design
- **Descrição:** `AGENTS.md` §4 manda persistir overrides em `design-system/pages/<pagina>.md`. Existem apenas `admin.md`, `home.md`, `login.md` e `posts.md`. O cabeçalho do `MASTER.md` (08/11) afirma especificar `/entrar`, `/minha-conta` e `/checkout/[id]`, mas o corpo não tem seção sobre elas (busca por `entrar|minha-conta|checkout` só encontra o próprio cabeçalho). `home.md` §198 cobre apenas o botão do cabeçalho.
- **Evidência (Confirmado):** listagem de `design-system/pages/` e `grep` em `MASTER.md`. Na janela, `/entrar` recebeu 283 linhas em `80478dd` (botão do Google com largura calculada, estados de carregamento) e `CustomerPages.module.css` recebeu ~150 linhas, sem contrapartida em `design-system/`.
- **Divergência documento × documento:** por `AGENTS.md` §0.2 item 4, **apontada ao dono; nada foi alterado** — decidir se o `MASTER.md` ou um novo override passa a ser a fonte dessas telas.
- **Etapa:** análise e planejamento (contexto de design).
- **Impacto:** o agente não tem contrato visual para as telas de maior mudança da semana; decisões ficam implícitas no CSS.
- **Situação:** aberto.

### PR-03 — Sem validação visual, responsiva ou de acessibilidade registrada
- **Descrição:** a Definição de pronto (§7) pede "Design segue o MASTER" e revisão do checklist; `MASTER.md` §10 pede 375/768/1024/1440, contraste e foco. Nenhum registro disso nos commits, ADRs ou logs da janela.
- **Evidência:** `cypress/e2e/` não tem teste de acessibilidade (`axe`/`a11y` ausentes em `package.json` e `cypress/`) nem captura visual; os testes de página verificam DOM e ícones; só um teste valida tokens, de um arquivo. Os defeitos DS-01 a DS-03 passam por testes e por `eslint` sem alerta (`logs/eslint.log` vazio).
- **Classificação:** **Hipótese / necessita investigação.** A validação pode ter ocorrido manualmente (o ADR-0042 cita validação ao vivo do Google), mas sem registro verificável para design.
- **Etapa:** validação final.
- **Impacto:** regressões visuais e de acessibilidade só aparecem em uso real.
- **Situação:** necessita investigação.

### PR-04 — Rastreabilidade das atividades de design
- **Descrição:** os 35 commits seguem o padrão `ATT - <tema>` e misturam código, documentação e arquivos gerados (`estrutura.html`, `estrutura.txt`, `docs/PROJECT_*`). Não há commit de design isolado e não é possível separar o trabalho de OpenCode e Antigravity.
- **Evidência:** `git log` da janela; `80478dd` altera 19 arquivos (auth, CSS, CSP, docs, testes e HTML gerado); histórico dos agentes indisponível (limitação 2).
- **Classificação:** **Hipótese** quanto ao efeito (dificulta auditar e reverter); a ausência de granularidade é **Confirmada**.
- **Etapa:** processo (comunicação e registro).
- **Impacto:** a auditoria semanal de design depende de inferência; difícil reverter só a parte visual.
- **Situação:** necessita investigação.

## 6.5 Pontos positivos

- **Documentação de arquitetura em dia onde houve mudança estrutural:** `ARQUITETURA_SITE_PUBLICO.md` foi atualizado em cada commit relevante da semana (Última atualização 19/11) e o privado em 14/11, última data com mudança no painel. Processo validado (evidência: `git log` dos dois arquivos).
- **Disciplina de tokens onde foi aplicada:** o CSS novo de 19/11 (`80478dd`) já usa `--border-width-1`, `--color-border-default`, `--transition-background` etc.; a passada `75fb1cb` corrigiu o arquivo inteiro e cobriu responsividade (`@media (max-width: 640px)` em `.narrowCard` e `.sectionCard`).
- **Ícones no padrão:** `chevronLeft` e `logout` entraram no `AppIcon` (`components/UI/icons.js`, mesmo traço) em vez de emoji ou SVG solto, com teste que impede o fallback "info". Nenhum emoji como ícone foi encontrado nas páginas auditadas.
- **Acessibilidade de base preservada:** o guard `prefers-reduced-motion` existe em `pages/styles/globals.css`; nenhum `outline: none` seco em `CustomerPages` e `AdminSales`; ambos têm `:focus`/`:focus-visible`.
- **Escopo protegido:** nenhum arquivo de abas, ordem de navegação ou regra de proteção foi alterado; mudanças dentro dos padrões do `AGENTS.md` §0.2.
- **Gate de qualidade ativo:** testes e cobertura verdes em 19/11 22:10–22:14 (235 suítes, 1998 testes), `eslint.log` vazio (0 linhas).
- **Sem decisão de arquitetura de design pendente de ADR:** nenhum ADR novo da janela (0038 a 0042) trata de design; as mudanças visuais seguiram o padrão do ADR-0036 já vigente.

## 6.6 Oportunidades de melhoria

| # | Oportunidade | Justificativa concreta |
|---|---|---|
| 1 | Verificação automática de tokens CSS para **todos** os `.css` | DS-01 permaneceu por 11 dias em 3 arquivos mesmo após uma correção parcial. |
| 2 | Contrato de design para `/entrar`, `/minha-conta`, `/checkout/[id]` | Maior volume de CSS novo da semana sem documento de referência (PR-02). |
| 3 | Registro curto de validação visual por entrega (viewports, foco, contraste) | `MASTER.md` §10 existe, mas não há evidência de execução (PR-03). |
| 4 | Contraste dos botões de marketplace | Falha de AA calculada (DS-02). |
| 5 | Usar `components/UI` e classes de módulo no lugar de estilo inline | Reduz duplicação em `AdminSales`/`checkout` e mantém a coerência público × painel (DS-03). |
| 6 | Mensagens de commit que indiquem a área (ex.: `design:`) | Permite auditar e reverter apenas a camada visual (PR-04). |

Nenhuma recomendação é estética: todas se apoiam em evidência de regra existente (`MASTER.md`, `AGENTS.md` ou WCAG).

## 6.7 Plano de Ação por prioridade

> **Nenhuma ação abaixo foi executada.** Implementar somente após autorização específica. Ordem de execução global: **A-01 → A-02 → M-01 → M-02 → M-03 → B-01 → M-04 → B-02 → B-03**.

### Prioridade alta (2 ações)

#### A-01 — Substituir os tokens inexistentes pelos equivalentes de `variables.css` (resolve DS-01)
- **Objetivo / problema:** restaurar bordas, transições e cores semânticas de status em `Home`, `ProductCard` e `AdminSales`.
- **Arquivos:** `pages/styles/Home.module.css` (`.accountLink`), `components/Features/Products/styles/ProductCard.module.css` (`.badgeInternal`, `.badgeExternal`, `.soldOutButton`), `components/Admin/styles/AdminSales.module.css` (subabas, caixas, selos).
- **Alterações recomendadas:** aplicar o **mesmo mapeamento já validado em `75fb1cb`**: `--border-width-thin → --border-width-1`; `--color-border-primary → --color-border-light` (ou `-default` onde o controle é interativo, como em `CustomerPages`); `--transition-colors → --transition-background, --transition-color` (+ `--transition-border` quando houver borda); `--color-X-bg/-dark/-border → --color-X-50/-800/-200` para `success`, `warning`, `error`, `info`.
- **Dependências e impactos:** muda aparência (selos ganham cor, botão ganha borda); alinha ao `admin.md` e ao padrão já usado em `CustomerPages`.
- **Riscos:** o selo de modalidade ficar mais forte que o esperado pelo dono; contraste de `--color-warning-800` sobre `-50`.
- **Cuidados:** não criar tokens novos nem renomear; reutilizar o mapeamento; não tocar nas variáveis dinâmicas de `Grid`/`Sidebar`; comparar com `CustomerPages.module.css` para manter paridade; conferir `design-system/pages/admin.md` e `home.md` §198 antes.
- **Validação:** varredura repetida retorna **0** tokens ausentes (exceto as 8 variáveis dinâmicas listadas em DS-01); inspeção visual em 375/768/1024/1440 do cabeçalho, vitrine e Gestão de Vendas; `npm test` e `npm run lint`.

#### A-02 — Transformar o guard de tokens em verificação global (resolve PR-01)
- **Objetivo / problema:** impedir reincidência de token inexistente em qualquer CSS.
- **Arquivos:** novo teste em `tests/unit/` (ou regra de CSS no gate) que percorra todos os `*.css` e compare com `pages/styles/variables.css`; remover/realocar o guard hoje dentro de `tests/unit/pages/minha-conta.test.js`.
- **Alterações recomendadas:** lista de exceções explícita e comentada para as variáveis dinâmicas definidas por componente (`--cols-*`, `--min-width`, `--stack-gap`, `--main-margin`); reportar arquivo e linha.
- **Dependências:** executar **depois de A-01**, senão o teste nasce vermelho. Não exige dependência nova (a varredura já foi feita com `grep`); se for preferido `stylelint`, é instalação e precisa de autorização (`AGENTS.md` §4 e §6).
- **Riscos:** falso positivo em variáveis locais; teste lento se mal escrito.
- **Cuidados:** não duplicar o guard existente (substituir); manter o padrão de testes do projeto.
- **Validação:** o teste falha ao reintroduzir um token falso e passa no estado corrigido; `npm test`.

### Prioridade média (4 ações)

#### M-01 — Decidir o contraste dos botões de marketplace (resolve DS-02)
- **Objetivo:** texto ≥ 4,5:1 nos botões Shopee e Amazon, sem perder a identificação da loja.
- **Arquivos:** `ProductCard.module.css` (`.linkShopee`, `.linkAmazon`, `.linkButton`); `design-system/MASTER.md` §7 (registrar exceção de cor de marca) — **só com autorização**, pois são arquivos protegidos de processo.
- **Alterações recomendadas (decisão do dono):** texto escuro (`--color-text-primary`) sobre o laranja da Amazon, ou fundo mais escuro da marca; elevar a fonte para `--font-size-sm`; registrar a exceção de hex de marca no `MASTER.md`.
- **Dependências/impactos:** aparência de marca; tem relação com o aviso de afiliados (§3.5).
- **Riscos:** descaracterizar a cor da marca parceira.
- **Cuidados:** manter o botão como ação direta do serviço (`MASTER.md` §7); não reutilizar a cor de marca fora dele.
- **Validação:** cálculo de contraste ≥ 4,5:1; inspeção em 375px.

#### M-02 — Definir o contrato de design das páginas do visitante (resolve PR-02)
- **Objetivo:** dar fonte de verdade a `/entrar`, `/minha-conta` e `/checkout/[id]`.
- **Arquivos:** `design-system/pages/` (novos overrides) ou seção própria em `MASTER.md`; ajuste do cabeçalho de `MASTER.md` que hoje declara uma especificação inexistente.
- **Alterações recomendadas:** descrever cartão estreito, botão do Google (largura 200–400px), estados de pagamento (PIX, cartão, boleto), selos de status e responsividade ≤ 640px, usando o que já está implementado (sem inventar padrão novo).
- **Dependências:** **decisão do dono** sobre onde documentar (§0.2 item 4); executar depois de A-01 para que o texto descreva o estado corrigido.
- **Riscos:** documentar comportamento que ainda é defeito.
- **Cuidados:** o override vence o MASTER (`AGENTS.md` §4); evitar duplicar `home.md` §198 e `login.md`.
- **Validação:** cada regra do novo texto confere com o CSS atual; data de "Última atualização" atualizada.

#### M-03 — Registrar validação visual, responsiva e de acessibilidade por entrega (resolve PR-03)
- **Objetivo:** tornar verificável o item "Design segue o MASTER" da Definição de pronto.
- **Arquivos:** hoje nenhum; possíveis: checklist no ADR/CHANGELOG da entrega e, se aprovado, teste Cypress com verificação de acessibilidade.
- **Alterações recomendadas:** registrar, por entrega de UI, viewports verificados (375/768/1024/1440), foco por teclado e contraste; avaliar teste de acessibilidade automatizado nas rotas `/`, `/entrar`, `/minha-conta`, `/checkout/[id]`.
- **Dependências:** autorização para qualquer dependência nova; estabilizar A-01 antes.
- **Riscos:** custo de manutenção dos testes; falsos positivos.
- **Cuidados:** não criar rotina paralela às de `AGENTS.md` §7; reutilizar o Cypress existente.
- **Validação:** a próxima auditoria encontra o registro para cada commit de UI.

#### M-04 — Padronizar mensagens de commit por área (resolve PR-04)
- **Objetivo:** separar trabalho de design e permitir auditoria e reversão.
- **Arquivos:** nenhum de código; convenção a ser discutida e, se aceita, registrada pelo dono em `AGENTS.md` (arquivo protegido).
- **Alterações recomendadas:** prefixo ou escopo curto (`design:`, `fix(css):`) e separar arquivos gerados (`estrutura.*`, `PROJECT_*`) do commit funcional.
- **Dependências:** decisão do dono; investigar se o OpenCode mantém histórico exportável.
- **Riscos:** burocracia sem ganho se não houver adesão.
- **Cuidados:** não reescrever histórico (`AGENTS.md` §6).
- **Validação:** na próxima janela, pelo menos os commits visuais são identificáveis sem abrir o diff.

### Prioridade baixa (3 ações)

#### B-01 — Substituir estilo inline por classes de módulo e reusar o campo compartilhado (resolve DS-03)
- **Objetivo:** consistência com o `MASTER.md` §9 e com o restante do painel.
- **Arquivos:** `components/Admin/AdminSales.js` (`ShippingTypeSelect`, linhas ~489–493 e 600–621), `pages/checkout/[id].js` (5 pontos).
- **Alterações:** mover para `AdminSales.module.css` e `CustomerPages.module.css`; verificar se `components/UI` (`Input`/`Select`) atende antes de manter o campo local; trocar `--color-text-tertiary` por `--color-text-secondary` nas dicas.
- **Dependências:** vem depois de A-01 (mesmos arquivos CSS).
- **Riscos:** regressão de espaçamento; testes de `AdminSales`.
- **Cuidados:** não criar novo componente se o existente servir; não refatorar além do inline.
- **Validação:** sem `style={{` de layout nesses pontos; testes de `AdminSales` e checkout passam; inspeção visual.

#### B-02 — Cobrir `.css` fora de `pages/styles` e `components/` no guard (complemento de A-02)
- **Objetivo:** garantir que o guard varra todo o repositório (43 arquivos hoje).
- **Cuidados:** excluir `node_modules`, `.next` e `coverage`. **Validação:** teste lista a contagem de arquivos varridos.

#### B-03 — Avaliar a exposição da rota `pages/design-system.js` (hipótese)
- **Objetivo:** confirmar se a página de demonstração fica acessível ao público em produção.
- **Evidência:** a rota existe (`pages/design-system.js`, última alteração em 10/07/2026); **não avaliada quanto à exposição**, por estar fora da janela e sem informação de configuração de produção.
- **Cuidados:** apenas investigar; qualquer mudança exige decisão do dono. **Validação:** conclusão registrada no próximo ciclo.

## 6.8 Pendências e acompanhamento

Para reavaliar no **Ciclo 2** (a partir de 26/11/2026):

1. **Validação futura — Opção 2B (`axe-core` + `cypress-axe` no Cypress):** item planejado mediante autorização futura do dono (a decisão atual manteve a **Opção 2A** em Jest sem instalar dependências). Especificação para implementação posterior:
   - **Pacotes necessários (sob autorização prévia):** `axe-core` e `cypress-axe` em `devDependencies` do `package.json`.
   - **Rotas-alvo:** `/`, `/blog`, `/entrar`, `/minha-conta` e `/checkout/[id]`.
   - **Exclusões obrigatórias:** excluir iframes e widgets de terceiros (embeds do Spotify em Músicas, YouTube em Vídeos, Google GSI em `/entrar` e scripts/iframes do Mercado Pago em `/checkout/[id]`) para evitar falsos positivos externos ao código do Caminhar.
   - **Critério de aceitação:** zero violações de severidade `critical` ou `serious` para WCAG 2.2 AA nas rotas próprias do projeto, executando apenas no fluxo E2E (`npm run test:e2e:isolated` / `npm run test:e2e`) sem onerar o `npm test` rápido do Jest.
2. **Inspeção visual ao vivo nos 4 viewports (`375×812`, `768×1024`, `1024×768` e `1440×900`):** tentativa no navegador integrado em 20/11/2026 foi bloqueada por permissão `execute_url` negada (`BLOCKED / ORIGIN_PERMISSION_REQUIRED`, `visited_origins: none`, `latest_screenshot: none` confirmados pelo host). A conferência visual ao vivo do botão `.accountLink`, dos cartões de `ProductCard`, de `/entrar` e de `Gestão de Vendas` permanece para verificação manual no navegador local com `npm run dev` em `http://localhost:3000`.
3. **Itens encerrados ou mitigados no Ciclo 1:** `DS-01` a `DS-03` e `PR-01` a `PR-03` (Opção 2A) estão cobertos pelos **7** invariantes de `tests/unit/tests-hygiene/css-tokens.test.js`; `PR-04` foi encerrado por decisão do dono (**Opção 1A**, mantendo o padrão atual `ATT - ...` sem alteração em `AGENTS.md`); `B-03` foi mitigado com `noindex, nofollow` e exclusão no sitemap.
4. **Acompanhamento de processo no próximo ciclo:** verificar se o histórico do OpenCode/ai-memory estará acessível e acompanhar eventuais novas alterações de CSS no período.

## 6.9 Conclusão

O fluxo de design da semana respeita o `AGENTS.md` nos pontos verificáveis: leu os documentos de arquitetura certos, manteve a identidade visual, atualizou a documentação nas mudanças estruturais e não alterou regras de proteção. A fragilidade está na **validação**: uma correção boa (`75fb1cb`) ficou limitada a um arquivo, e a verificação protegeu só esse arquivo, deixando 24 declarações com tokens inexistentes e efeito visual provável no painel, na vitrine e no cabeçalho público. Também não há registro verificável de validação visual/responsiva, nem contrato de design para as páginas do visitante.

**Próximos passos recomendados, depois da autorização:** A-01, depois A-02 (fecham o defeito e impedem a volta), seguidos de M-01 e M-02, que dependem de decisão do dono. Nada foi implementado nesta etapa.

## 6.10 Revisão pós-implementação e validação do processo (19/11/2026)

Após autorização do dono do projeto, todas as ações planejadas foram implementadas na sequência definida (**A-01 → A-02 → M-01 → M-02 → M-03 → B-01 → M-04 → B-02 → B-03**) e submetidas à revisão de processo e aos gates técnicos do repositório.

### Resumo do que foi implementado por ação

- **A-01 (DS-01 — Corrigido):** substituídos os tokens inexistentes em `pages/styles/Home.module.css` (`.accountLink` com `--border-width-1`, `--color-border-light` e `--transition-background/color/border/shadow`; `.settingsError` migrado para `--color-text-secondary`), `components/Features/Products/styles/ProductCard.module.css` (`.badgeInternal` com `--color-success-50`/`-800`/`-200`, `.badgeExternal` e `.soldOutButton` com `--border-width-1` e `--color-border-light`, `.stockHint` em `--color-text-secondary`) e `components/Admin/styles/AdminSales.module.css` (`.subTabsBar`, `.subTabButton`, `.filtersRow`, `.searchInput`, `.filterSelect` com `--border-radius-lg` e os 4 selos `.badgeApproved`, `.badgePending`, `.badgeRejected`, `.badgeInfo` nos tokens `-50`/`-800`/`-200`).
- **M-01 (DS-02 — Corrigido):** `.linkButton` elevado para `--font-size-sm` (`14px`) e `--font-weight-semibold`; contrastes de marca ajustados para conformidade WCAG AA (`≥ 4,5:1`): Mercado Livre (`#ffe600` + `--color-text-primary` `#171717`, **14,15:1**), Shopee (`#c53316` + `--color-text-inverse` `#fafafa`, **5,21:1**) e Amazon (`#ff9900` + `--color-text-primary` `#171717`, **8,37:1**), com a exceção e os pares documentados em `design-system/pages/home.md` §7.
- **B-01 (DS-03 — Corrigido):** removidas todas as ocorrências de `style={{` em `components/Admin/AdminSales.js` (8 ocorrências, substituídas pelas classes `.fieldWrapper`, `.fieldLabel`, `.fieldHint` em `--color-text-secondary`, `.ordersTableContainer`, `.ordersStatusMessage` e `.fullWidthControl` em `AdminSales.module.css`) e em `pages/checkout/[id].js` (5 ocorrências, substituídas por `.mt3`, `.mt4`, `.mt6` e `.summaryProductName` em `CustomerPages.module.css`).
- **A-02 e B-02 (PR-01 — Corrigido):** criado `tests/unit/tests-hygiene/css-tokens.test.js`, que varre todos os **43** arquivos `.css` do repositório contra `pages/styles/variables.css` (com suporte a propriedades definidas localmente e allowlist documentada para variáveis injetadas por `Grid.js` e `Sidebar.js`), testa sanidade do detector, bloqueia retorno de `style={{` nos arquivos auditados e verifica matematicamente o contraste WCAG AA (`≥ 4,5:1`) dos botões de marketplace. Removido o guard local duplicado de `tests/unit/pages/minha-conta.test.js`.
- **M-02 (PR-02 — Corrigido):** criado o override `design-system/pages/customer.md` cobrindo `/entrar`, `/minha-conta` e `/checkout/[id]`; adicionada a seção `## 5. Gestão de Vendas` em `design-system/pages/admin.md`; atualizada a linha 3 de `design-system/MASTER.md` preservando integralmente a numeração de linhas do arquivo.
- **M-03 (PR-03 — Opção 2A implementada; Opção 2B documentada para validação futura):** por decisão do dono em 20/11/2026, foi adotada a **Opção 2A** sem instalar novas dependências. O guard `tests/unit/tests-hygiene/css-tokens.test.js` foi ampliado de 4 para **7 testes** aprovados no Jest: (1) tokens `var(--*)` em todos os 43 `.css`, (2) sanidade do detector de tokens, (3) ausência de `style={{` em `AdminSales.js` e `pages/checkout/[id].js`, (4) contraste WCAG AA (`≥ 4,5:1`) dos botões de marketplace em `ProductCard.module.css`, (5) proibição de `outline: none` / `outline: 0` em seletores `:focus` / `:focus-visible` em todos os 43 `.css` (com sanidade), (6) par de foco duplo (`outline: 2px solid var(--color-focus-primary)` + `box-shadow: var(--color-focus-ring)`) em todos os blocos `:focus`/`:focus-visible` dos 4 CSS Modules auditados (`Home`, `CustomerPages`, `ProductCard`, `AdminSales`) e (7) presença do guard global `prefers-reduced-motion: reduce` em `pages/styles/globals.css`. A **Opção 2B** (`axe-core` + `cypress-axe` no Cypress) ficou formalmente documentada em §6.8 para validação futura. A inspeção visual ao vivo nos viewports `375`/`768`/`1024`/`1440` pelo navegador integrado foi bloqueada por permissão `execute_url` negada (`visited_origins: none`).
- **M-04 (PR-04 — Encerrado por decisão do dono: Opção 1A):** por decisão do dono em 20/11/2026, foi mantido o padrão atual de mensagens de commit (`ATT - ...`), sem adicionar nova regra em `AGENTS.md` e mantendo a filtragem por arquivos alterados para as auditorias futuras.
- **B-03 (Resolvido quanto à indexação):** adicionada `<meta name="robots" content="noindex, nofollow" />` em `pages/design-system.js` e incluído `'/design-system'` em `disallow` e `exclude` de `next-sitemap.config.js`, preservando a rota no código como consumidora dos componentes de `components/UI` e `components/Layout` para manter o `npm run knip` verde.

### Revisão do processo executado

1. **Aderência à hierarquia (`AGENTS.md` §0.1, §0.3, §4, §7):** todos os documentos pertinentes foram consultados antes das edições (`AGENTS.md`, `ARQUITETURA_SITE_PUBLICO.md`, `ARQUITETURA_SITE_PRIVADO.md`, `design-system/MASTER.md`, `home.md`, `admin.md`). Não houve mudança estrutural nas abas, rotas, campos ou permissões, mantendo `AGENTS.md` e os documentos de arquitetura intocados.
2. **Proteção de calibração do bench (`scripts/bench/ground-truth.js`):** a edição de `design-system/MASTER.md` restringiu-se à linha de cabeçalho sem alterar quebras de linha, e `pages/styles/variables.css` / `components/UI/Input.module.css` não foram tocados. Todos os **5** instrumentos do bench (`orchestrator`, `explorer`, `oracle`, `fixer`, `designer`) passaram com `ok: true` e `0` problemas.
3. **Checklist de pré-entrega (`MASTER.md` §10):** contraste AA verificado em código e por cálculo nos botões de marketplace e textos informativos; `:focus-visible` duplo preservado; zero tokens inexistentes nos 43 `.css`; zero estilos inline nos arquivos corrigidos; `prefers-reduced-motion` preservado; `knip` sem exports órfãos. Ponto fora do alcance desta execução: inspeção visual em navegador vivo (`localhost:3000`) nos quatro viewports.
4. **Gates executados após as edições:**
   - `npx jest tests/unit/tests-hygiene/css-tokens.test.js` (após ampliação da Opção 2A em 20/11): **1/1 suíte, 7/7 testes aprovados**.
   - `npx jest tests/unit/tests-hygiene/css-tokens.test.js tests/unit/pages/minha-conta.test.js tests/unit/components/Features/Products/ProductCard.test.js tests/unit/pages/entrar.test.js` (na entrega de 19/11, antes dos 3 invariantes extras da Opção 2A): **4/4 suítes, 32/32 testes aprovados**.
   - `npm test` (na entrega de 19/11): **236/236 suítes executadas aprovadas** (`8` suítes / `96` testes `skipped` — testes condicionais de banco/container), **2001 testes aprovados**, **6 snapshots aprovados** (`42,828 s`).
   - `npm run lint`, `npm run knip`, `npm run lint:workflows` e `npm run lint:chars`: reexecutados em 20/11 após a atualização final — todos aprovados com **0 erros** (`777 arquivo(s)` no `lint:chars`, `actionlint 1.7.12` sem erros, `knip` com `0 issues`).
   - `scripts/bench/ground-truth.js`: `orchestrator`, `explorer`, `oracle`, `fixer` e `designer` todos com `ok: true` e `0` problemas.

---

# Ciclo 2 — 23/11/2026

## 6.1 Identificação da auditoria

- **Data e horário da execução:** 23/11/2026, 12:00 (America/Sao_Paulo, BRT — `2026-11-23T12:00:51-03:00`).
- **Período auditado:** **16/11/2026 12:00 → 23/11/2026 12:00 (BRT)** (últimos 7 dias móveis exclusivos).
  - **Commits no período:** **39 commits** na branch `main` (`dc77185` de 16/11 12:24 até `ee4ed2e` de 22/11 17:18), dos quais **11 commits** tocaram diretamente UI, CSS, componentes visuais, páginas públicas/privadas ou `design-system/` (`80478dd`, `75fb1cb`, `f161227` em 19/11 — já cobertos na janela do Ciclo 1 — e **8 commits novos pós-Ciclo 1**: `a681cc5` em 20/11; `c1dd831`, `c64424a`, `54ed1f3`, `25081d9`, `00758a7`, `e934811`, `c676098` em 21/11; `ee4ed2e` em 22/11).
  - **Alterações locais não commitadas pré-existentes no working tree (23/11/2026):** 20 arquivos modificados antes do início desta auditoria, incluindo `AGENTS.md`, `docs/ARQUITETURA_SITE_PRIVADO.md`, `docs/ARQUITETURA_SITE_PUBLICO.md`, `docs/AGENTS_OPERACAO.md`, `.opencode/oh-my-opencode-slim/designer_append.md`, `.opencode/oh-my-opencode-slim/orchestrator_append.md`, `.opencode/oh-my-opencode-slim.json`, `CHANGELOG.md` e `docs/melhoria_agente.md`. Todos foram apenas consultados e preservados intactos.
- **Executor:** Antigravity (auditoria semanal somente de análise e planejamento — nenhuma implementação autorizada).
- **Escopo da análise:** fluxo completo de design do Site Público e do Painel Administrativo (`/admin`) — aderência ao `AGENTS.md` e aos dois documentos de arquitetura, overrides em `design-system/`, tokens em `pages/styles/variables.css`, todos os 43 arquivos `.css`, componentes e páginas alterados na janela, responsividade, acessibilidade (contraste WCAG AA, foco duplo, semântica, teclado, `prefers-reduced-motion`), higiene de testes/gates e configuração dos agentes (`@designer` / `@oracle`). Fora de escopo: regras de negócio de Mercado Pago (`docs/melhoria_mercadopago.md`), OAuth Google (`docs/melhoria_google.md`) e CI/cobertura geral (`docs/retorno_da_semana.md`).
- **Fontes consultadas (somente leitura):**
  - Hierarquia normativa e arquitetura: `AGENTS.md` (completo), `docs/ARQUITETURA_SITE_PUBLICO.md` (completo), `docs/ARQUITETURA_SITE_PRIVADO.md` (completo), `docs/AGENTS_OPERACAO.md`, `.opencode/oh-my-opencode-slim.json`, `.opencode/oh-my-opencode-slim/designer_append.md`, `.opencode/oh-my-opencode-slim/orchestrator_append.md`, `docs/adr/0043-admin-inactivity-timeout-and-unified-401-session-guard.md`, `CHANGELOG.md`, `docs/melhoria_design.md` (Ciclo 1), `docs/melhoria_agente.md` e `docs/retorno_da_semana.md` (contexto cruzado).
  - Design System: `design-system/MASTER.md` e todos os 5 overrides em `design-system/pages/` (`admin.md`, `customer.md`, `home.md`, `login.md`, `posts.md`).
  - Git: `git log --since="2026-11-16T12:00:51-03:00" --until="2026-11-23T12:00:51-03:00"`, `git show` de `a681cc5`, `c1dd831`, `c64424a`, `54ed1f3`, `25081d9`, `00758a7`, `e934811`, `c676098`, `ee4ed2e`; `git diff` (somente leitura) do working tree pré-existente; `git blame`/`git log` para separar origem pré-existente de alterações na janela.
  - Código e estilos: `pages/styles/variables.css`, `pages/styles/Home.module.css`, `pages/styles/CustomerPages.module.css`, `pages/styles/Login.module.css`, `pages/blog/[slug].js`, `pages/blog/index.js`, `pages/blog/Blog.module.css`, `components/Features/Products/ProductList.js`, `ProductList.module.css`, `ProductCard.module.css`, `components/Features/Music/MusicGallery.js`, `MusicGallery.module.css`, `MusicCard.module.css`, `components/Features/Video/VideoGallery.js`, `VideoGallery.module.css`, `components/Admin/AdminDashboard.js`, `dashboard.module.css`, `components/Admin/AdminSales.js`, `AdminSales.module.css`, `components/Admin/AdminCrudBase.js`, `crud.module.css`, `tabs.module.css`, `components/UI/Button.module.css`, `Input.module.css`, `Pagination.module.css`.
  - Verificações automatizadas somente leitura executadas em 23/11/2026:
    - `npx jest tests/unit/tests-hygiene/css-tokens.test.js tests/unit/scripts/bench-ground-truth.test.js --no-coverage` → **2/2 suítes, 21/21 testes aprovados** (7/7 no guard CSS; 14/14 no canário do bench, com os 5 papéis `orchestrator`, `explorer`, `oracle`, `fixer`, `designer` calibrados).
    - `npm run knip` (0 issues), `npm run lint` (0 erros), `npm run lint:workflows` (`actionlint 1.7.12`, 0 erros), `npm run lint:chars` (0 erros em 785 arquivos).
    - `npm run models:check` → `NÃO VERIFICADO (spawnSync opencode ENOENT)`; sintaxe de `.opencode/oh-my-opencode-slim.json` válida (preset `zen`, 6 modelos, 1 reserva).
    - Varreduras estáticas em memória (`node -e`, sem gravar arquivos): 43 arquivos `.css` contra 348 tokens de `variables.css` (tokens, hex fora de `variables.css`, blocos `:focus`/`:focus-visible`, `outline: none`, `--color-text-tertiary`); todos os `.js`/`.jsx` em `pages/` (exceto `api/`) e `components/` para `style={{`, hex literal e emojis; cálculo exato de contraste WCAG 2.x para 23+ pares de cores.
    - Timestamps de logs locais: `logs/tests-output.log` (22/11 17:16), `logs/coverage-output.log` (22/11 17:18), `logs/eslint.log` (21/11 18:09, 0 bytes).
- **Limitações registradas (conforme `AGENTS.md` §3 e §0.3 item 6):**
  1. **MCP `ai-memory` negado por permissão** nesta execução (`memory_briefing`, `memory_recent`, `memory_read_page`, `memory_query`): nenhum contorno por shell foi tentado. Trabalhou-se com o resumo injetado no `SessionStart` + Git + código + ADRs. **Aviso sinalizado ao operador:** o hook `SessionStart` reportou **20 warnings em `_lint/report.md`** do `ai-memory` (não legíveis sem o MCP).
  2. **Atribuição individual OpenCode × Antigravity indisponível:** todos os 39 commits têm autor Git único (`caminhar`) e o histórico local do OpenCode não está acessível no sandbox; portanto a separação por agente por commit é `NÃO DETERMINADO`.
  3. **`npm run models:check` retornou `NÃO VERIFICADO`:** esperado fora do host do OpenCode (`spawnSync opencode ENOENT`); o catálogo vivo dos modelos (`designer`: `opencode/big-pickle`; `oracle`: `opencode/beam-free` no working tree) precisa ser verificado no host do OpenCode.
  4. **Sem renderização em navegador vivo nesta rodada:** por ser auditoria somente de leitura/análise, não foi aberto navegador nem capturado screenshot. Aspectos dependentes de renderização real (ex.: `.statColumns` em 375px e largura da barra de filtros de `ProductList` em 1024–1440px) são classificados explicitamente como **Indício**.
  5. **`.env*` não lido** (`AGENTS.md` §6).

## 6.2 Resumo do diagnóstico

O período de **16/11 a 23/11/2026** marcou um **salto real de maturidade** no fluxo de design em comparação ao Ciclo 1: todas as 9 ações do Ciclo 1 (`A-01` a `B-03`) foram executadas em `a681cc5` (20/11), zerando os 24 tokens inexistentes (`DS-01`), corrigindo o contraste dos botões de marketplace (`DS-02`), criando `design-system/pages/customer.md` (`PR-02`) e instalando o guard permanente `tests/unit/tests-hygiene/css-tokens.test.js` com 7 invariantes (`PR-01`/`PR-03` Opção 2A). Além disso, entre 21/11 e 22/11, houve **alta atividade visual e estrutural** (8 commits pós-Ciclo 1) acompanhada, na maioria dos casos, de atualização síncrona dos overrides (`home.md`, `admin.md`, `login.md`) e dos documentos de arquitetura.

Contudo, a auditoria identificou **7 novos problemas** (4 de implementação: `DS-04` a `DS-07`; 3 de processo: `PR-05` a `PR-07`) e **1 reincidência de problema do Ciclo 1** (`PR-03`), revelando dois padrões centrais:
1. **Proteção assimétrica e intervenções parciais (`DS-04` + `PR-05`):** embora `css-tokens.test.js` vigie tokens `var(--*)` e `outline: none` em todos os 43 `.css`, seus guards de `style={{` (2 arquivos) e de par de foco duplo (4 arquivos) ficaram presos ao recorte do Ciclo 1. No dia seguinte (`21/11`), o commit `54ed1f3` editou `pages/blog/[slug].js` corrigindo apenas o botão "Voltar" e deixando intactos no mesmo arquivo **12 `style={{`**, **2 falhas severas de contraste WCAG AA** (WhatsApp `1,98:1` e data do artigo `2,31:1` em `--color-text-tertiary`), zoom de imagem inacessível por teclado e ausência de `skip-link`/`<main>`.
2. **Desalinhamentos residuais em telas editadas na semana e ausência de validação visual ao vivo (`DS-05`, `DS-06`, `PR-03`, `PR-06`):** `AdminSales` (`Pedidos`) ainda destoa de `AdminCrudBase`/`AdminAudit` (busca sem lupa nem botão limpar; `.subTabButton` em `6px` em vez de `8px`; `:focus-visible` sem `border-color`), `CustomerPages.module.css` mistura raios `6px` e `8px`, a barra `Dicas` de `AdminDashboard` (`--color-secondary-700`) mede **4,09:1** (< 4,5:1 AA apesar da afirmação em `ARQUITETURA_SITE_PRIVADO.md` §4.1), e os **6 commits visuais de 21/11** foram entregues sem registro de inspeção em viewports (`375/768/1024/1440`) nem validação ao vivo.

### Diferenciação temporal (regra de temporalidade)
- **Aconteceu na janela (`16/11 12:00 → 23/11 12:00`):** implementação completa do Ciclo 1 (`a681cc5`, 20/11); ajustes de barra de filtros (`c1dd831`), rolagem (`c64424a`) e botão Voltar do post (`54ed1f3`); ampliação da Visão Geral para 8 cartões/barras (`25081d9`); filtro `modality=external` em Produtos (`00758a7`); banner `.sessionNotice` no login (`e934811`, ADR-0043); cabeçalho/botões/ícone/CSV de `AdminSales` (`c676098`) e pré-contagem `Pedidos` (`ee4ed2e`); saneamento no working tree (23/11, não commitado) de `designer_append.md` e `AGENTS.md` §7.1–§7.2.
- **Pré-existente (anterior a 16/11), exposto ou mantido durante o período:** corpo inline de `pages/blog/[slug].js` (exposto durante `54ed1f3`), cor `--color-secondary-700` da barra `Dicas` em `AdminDashboard.js` (07/11, reafirmada como AA em `25081d9`), raios `6px` em `CustomerPages.module.css` (cristalizados em `customer.md` em 19/11), `Login.module.css` com `12px` e `rgba(...)` (revisitado em `e934811`), `Pagination.module.css` `.totalInfo` em `--color-text-tertiary`, `pages/404.js` inline e 10 emojis de demonstração em `pages/design-system.js` (tocado em `a681cc5`).

### Validação crítica do fluxo (10 critérios)

| # | Critério avaliado | Resultado | Evidência / Classificação |
|---|---|---|---|
| 1 | Instruções do `AGENTS.md` seguidas corretamente | **Parcial (em melhoria)** | **Confirmado:** arquitetura e overrides atualizados em 5 de 6 commits visuais pós-Ciclo 1; porém `54ed1f3` não checou o restante do arquivo nem `posts.md`, e `AGENTS.md` §7.2 (reforçando irmãos + `css-tokens.test.js`) só entrou no working tree em 23/11. |
| 2 | Agentes executando tarefas de design adequadamente | **Parcial (`NÃO DETERMINADO` por agente)** | **Indício / Confirmado em artefatos:** qualidade de tokens e testes melhorou muito pós-`a681cc5`, mas `AdminSales` precisou de 5 commits em 3 dias para convergir (`a681cc5`→`ee4ed2e`) e `designer_append.md` esteve contraditório até 23/11. |
| 3 | Análises acontecendo antes das implementações | **Parcial** | **Confirmado:** `a681cc5`, `25081d9`, `e934811` (ADR-0043) e `c676098` refletem análise prévia e atualização de spec; já `54ed1f3` e `c64424a` evidenciam correções reativas pontuais sem análise de irmãos/arquivo inteiro. |
| 4 | Arquivos corretos identificados e utilizados | **Sim (com ressalva em irmãos)** | **Confirmado:** nenhum componente duplicado novo foi criado na janela (`AdminCrudBase`, `Button`, `AppIcon`, `Blog.module.css` foram reutilizados); faltou inspecionar arquivos irmãos (`MusicGallery`/`VideoGallery`, `pages/blog/index.js`). |
| 5 | Divergências entre arquitetura documentada e código real | **Sim (3 pontuais de design)** | **Confirmado:** (a) `ARQUITETURA_SITE_PRIVADO.md` §4.1 afirma AA `≥ 4,5:1` nas 8 barras, mas `Dicas` (`--color-secondary-700`) é `4,09:1`; (b) §1.1 item 7 exige lupa + limpar na busca admin, ausentes em `AdminSales` (`Pedidos`); (c) `MASTER.md` §5/§1.1 exige `8px` (`--border-radius-lg`) em controles, mas `AdminSales` `.subTabButton` e `CustomerPages` usam `6px`. *(Divergências não-visuais de API/status já foram saneadas no working tree de 23/11 pela auditoria de agentes.)* |
| 6 | Procedimentos redundantes ou desnecessários | **Baixo (saneado)** | **Confirmado:** o guard duplicado em `minha-conta.test.js` foi removido em `a681cc5`. Permanece apenas ruído de arquivos gerados (`estrutura*.html`/`tree.txt`) misturados em commits funcionais (`PR-04`, encerrado pelo dono). |
| 7 | Problemas identificados recebendo soluções definitivas | **Sim para Ciclo 1; parcial para novos** | **Confirmado:** `DS-01` e `DS-02` estão resolvidos definitivamente com teste; `DS-03` e `PR-01` tiveram solução definitiva nos arquivos originais, mas escopo restrito permitiu recorrência de classe (`DS-04`, `PR-05`). |
| 8 | Validações realizadas são suficientes | **Não (lacuna em validação visual e cobertura do guard)** | **Confirmado:** gates estáticos e 2.090 testes Jest garantem integridade funcional e de tokens, mas faltam inspeção visual nos 4 viewports (`PR-03`) e ampliação de `css-tokens.test.js` para `style={{` e `:focus` globais (`PR-05`). |
| 9 | Melhorias propostas preservam funcionamento atual | **Sim** | **Confirmado:** nenhuma regra de proteção (§8 público / §9 privado) foi quebrada na janela; todas as ações do Ciclo 2 preservam navegação horizontal pública, sidebar lateral privada, abas, permissões e contratos de API. |
| 10 | Oportunidades para tornar o fluxo mais eficiente e previsível | **Sim** | **Confirmado:** consolidar baseline global no `css-tokens.test.js` (`C2-A02`), checklist curto de validação visual em viewports (`C2-M04`), commitar o alinhamento de `designer_append.md`/`AGENTS.md` (`C2-M03`) e fechar `DS-04`/`DS-05`/`DS-06`. |

## 6.3 Fluxo de trabalho identificado

### 4.1 Rotinas e atores
- **Fluxo prescrito (`AGENTS.md` §0–§7 + working tree 23/11):**
  1. Identificação da área (Público, Privado ou ambos) e leitura obrigatória de `ARQUITETURA_SITE_PUBLICO.md` (§1.1, §2, §7, §8) e/ou `ARQUITETURA_SITE_PRIVADO.md` (§1.1, §2, §8, §9).
  2. Leitura/atualização de `design-system/MASTER.md` e do override `design-system/pages/<pagina>.md` **antes** de codar (§4).
  3. No `oh-my-opencode-slim` (OpenCode): `orchestrator` (`deepseek-v4.1-flash-free`, reserva `nemotron-3.5-super-vl-free` no working tree 23/11) → `explorer` (`hy4-flash-free`, trocado na noite de 23/11 por latência medida — ADR-0008 §"23/11/2026") → `designer` (`big-pickle` + skill `ui-ux-pro-max`, sem MCPs) → `fixer` (`iceman-free`) → `oracle` (`beam-free` + `frontend-checklist-global` + MCP `frontend-checklist`). Fora do slim (Antigravity), o mesmo agente executa as fases sequencialmente usando guardrails locais (`frontend-checklist-global` + `MASTER.md`).
  4. Fechamento pela Definição de Pronto (§7): testes (`npm test`), canário `bench-ground-truth.test.js` (que vigia `MASTER.md`, `variables.css`, `components/UI/{Button,Input,BaseCard}.module.css`), guard `css-tokens.test.js`, `npm run knip`, `npm run lint:workflows`, `npm run lint` e atualização de arquitetura/data em mudança estrutural.
- **Rotinas padronizadas nesta janela:** criação do guard automatizado `tests/unit/tests-hygiene/css-tokens.test.js` (`a681cc5`) e inclusão explícita dele e do canário de design no `AGENTS.md` §7.1–§7.2 (working tree 23/11).
- **Rotinas ainda sem padronização efetiva:** validação visual nos 4 viewports (`375/768/1024/1440`) e checagem de contraste/acessibilidade em navegador real (`PR-03`).

### 4.2 Etapas e 4.3 Processos observados na janela (`16/11–23/11`)
1. **Recebimento e compreensão:** correções e evoluções visuais surgiram de duas frentes — (a) execução estruturada do Plano de Ação do Ciclo 1 (`a681cc5`) e de entregas planejadas com ADR (`25081d9`, `e934811` / ADR-0043); (b) ajustes pontuais de usabilidade detectados no uso (`c1dd831`, `c64424a`, `54ed1f3`, `00758a7`, `c676098`, `ee4ed2e`).
2. **Consulta prévia e atualização documental:** nos commits estruturais ou de layout (`a681cc5`, `c1dd831`, `25081d9`, `e934811`, `c676098`), os overrides em `design-system/pages/` e/ou `ARQUITETURA_SITE_PRIVADO.md` foram atualizados **no mesmo commit** — salto claro em relação ao Ciclo 1. Exceção: `54ed1f3` (`pages/blog/[slug].js`) não atualizou nenhum override (não existe spec para `/blog/[slug]`).
3. **Execução e validação:** todos os 8 commits pós-Ciclo 1 vieram acompanhados de testes unitários/integração dedicados (ex.: `AdminSales.test.js` +466 linhas entre `c676098` e `ee4ed2e`, `AdminDashboard.test.js` +173 linhas, `ProductList.test.js` +57 linhas, `blog.slug.test.js` +14 linhas) e mantiveram os gates estáticos 100% verdes (`241 suítes / 2.090 testes` em 22/11; `knip`/`eslint`/`lint:workflows`/`lint:chars`/`bench-ground-truth` verdes em 23/11). A lacuna de processo permanece na **revisão visual e de escopo ampliado** (arquivo inteiro + módulos irmãos + viewports).
4. **Conflito de instruções de agente detectado e em saneamento:** durante toda a janela até 23/11, `.opencode/oh-my-opencode-slim/designer_append.md` ainda instruía `design-system/<projeto>/MASTER.md` e `"HTML + Tailwind"`. Em 23/11 (working tree, ainda não commitado), esse anexo foi corrigido e `AGENTS.md` §2 passou a declarar precedência explícita sobre `*_append.md`.

### 4.6 Procedimentos que devem ser evitados (reforço baseado em ocorrências reais da janela)
- **Correções parciais em arquivo já aberto:** editar o topo de um arquivo com dívida visual (como `54ed1f3` em `pages/blog/[slug].js`) sem revisar nem registrar as 12 declarações `style={{` e falhas de contraste logo abaixo.
- **Guards automatizados restritos apenas aos arquivos do incidente anterior:** manter allowlists fechadas de 2 ou 4 arquivos em `css-tokens.test.js` gera falsa sensação de cobertura global (`PR-05`).
- **Ajustes em um módulo sem conferir irmãos e consumidores:** corrigir rolagem só em `ProductList.js` sem avaliar `MusicGallery`/`VideoGallery`, ou alterar `AdminSales` em 5 rodadas separadas por desalinhamento com `AdminCrudBase`, `AppIcon` (`"products"` vs `"package"`), `exportToCSV` e atalhos de `AdminDashboard`.
- **Cristalizar desvios do CSS ao escrever overrides:** transcrever `--border-radius-md` em `customer.md` quando `MASTER.md` §5 define `--border-radius-lg`, sem decisão explícita de override.
- **Criar componentes duplicados, hex avulsos fora de exceção documentada ou `style={{` de layout:** preservar reuso de `components/UI/` (`Button`, `Input`, `BaseCard`, `Modal`, `Pagination`, `AppIcon`) e `pages/styles/variables.css`.
- **Misturar padrões de navegação entre ambientes:** manter navegação horizontal exclusiva no Site Público e barra lateral esquerda recolhível exclusiva no `/admin`.

### 4.7 Correções realizadas nos últimos 7 dias (evidência de execução e validação)

| Data / Commit | Escopo / Problema resolvido | Aderência aos padrões | Retrabalho / Pendência |
|---|---|---|---|
| 19/11 `80478dd` + `75fb1cb` + `f161227` | UI do Google Sign-In em `/entrar` (`CustomerPages.module.css`), ícones `chevronLeft`/`logout` no `AppIcon`, remoção de botão morto quando não configurado | Alta em `CustomerPages` (tokens e `@media 640px`), mas `75fb1cb` corrigiu 1 de 4 arquivos (`DS-01`) | Gerou `a681cc5` no dia seguinte; cobertura funcional validada ao vivo (ADR-0042) |
| 20/11 `a681cc5` | Implementação integral do Ciclo 1 (`DS-01`..`DS-03`, `PR-01`..`PR-04`, `B-03`): 24 tokens corrigidos, contraste AA Shopee/Amazon/ML, 0 `style={{` em `AdminSales`/`checkout`, `customer.md`, `css-tokens.test.js` (7 testes), `noindex` em `design-system.js` | Alta — respeitou `bench-ground-truth` (5/5 `ok: true`) e todos os gates | Sem retrabalho nos itens fechados; inspeção visual em 4 viewports ficou bloqueada por permissão (`PR-03`) e escopo do guard ficou restrito em 2 testes (`PR-05`) |
| 21/11 `c1dd831` | Alinhamento em linha única da barra de filtros de `ProductList` em desktop (`ProductList.module.css` + `home.md`) | Alta — usou tokens, manteve `44px`, atualizou `home.md` | Sem inspeção visual registrada em 1024/1440/375 (`PR-03`) |
| 21/11 `c64424a` | Corrigida rolagem indesejada ao carregar/filtrar `ProductList.js` (`scrollIntoView` restrito à troca de página + teste) | Boa — comportamento limpo com teste unitário | Não verificou irmãs `MusicGallery`/`VideoGallery` (`DS-07`) |
| 21/11 `54ed1f3` | Alinhado link `← Voltar` e container `<article>` de `pages/blog/[slug].js` via `Blog.module.css` (`.postBackLinkWrapper`, `.article`, `.backLink` 44px + foco duplo) | **Parcial** — deixou 12 `style={{`, data `2,31:1`, WhatsApp `1,98:1` e zoom inacessível no mesmo arquivo (`DS-04`) | **Correção incompleta** — exige ação `C2-A01` |
| 21/11 `25081d9` | Visão Geral ampliada para 8 cartões/barras (`Gestão de Vendas` largo em 2 colunas + `Produtos Internos`), atualizando `dashboard.module.css`, `admin.md` e `ARQUITETURA_SITE_PRIVADO.md` | Alta nos 2 itens novos (barras AA `6,42:1` e `6,79:1`, foco duplo, `admin.md` atualizado) | Manteve barra `Dicas` em `4,09:1` e requer conferência de `.statColumns` em 375px (`DS-06`); gerou ajustes subsequentes em `00758a7`/`ee4ed2e` |
| 21/11 `00758a7` | Filtro `modality=external` na `Gestão de Produtos` (`AdminProducts`/`AdminCrudBase`/`useAdminCrud`) garantindo paridade com o cartão da Visão Geral | Alta — estendeu `AdminCrudBase` sem duplicar componente | Sem retrabalho |
| 21/11 `e934811` | Banner `.sessionNotice` (`role="status"`, `--color-warning-50`/`-800`/`-200`, contraste `6,84:1`) em `pages/login.js`, `Login.module.css` e `login.md` (ADR-0043) | Alta na parte nova — tokens canônicos, contraste AA e ADR | `login.md` ficou sem `Última atualização:` e com notas antigas (`PR-06`) |
| 21/11 `c676098` | Alinhamento do cabeçalho e botões `Sincronizar MP`/`Exportar CSV` de `AdminSales` (`Pedidos Internos`), correção do ícone inexistente `"products"` → `"package"`, correção da assinatura `exportToCSV`, atualização de `admin.md` | Alta — reaproveitou `crudStyles.sectionHeader` e `<Button>` com `.buttonLabel` | Retrabalho sobre entregas anteriores (`AdminSales`); busca sem lupa/limpar e `.subTabButton` `6px` permaneceram (`DS-05`) |
| 22/11 `ee4ed2e` | Pré-carregamento silencioso da contagem da subaba `Pedidos` em `AdminSales.js` (evitando `Pedidos (0)` falso ao entrar via atalho `Produtos Internos`) | Alta — corrigiu inconsistência visual de estado inicial + testes | 5º ajuste em `AdminSales` na janela; encerrado com testes |
| 23/11 *(working tree, não commitado)* | Alinhamento de `.opencode/oh-my-opencode-slim/designer_append.md` (CSS Modules + `design-system/MASTER.md`), `AGENTS.md` (§0.3, §2, §3, §7.1, §7.2) e documentos de arquitetura | Alta — elimina conflito normativo histórico do `@designer` | Pendente de commit e validação de `models:check` no host OpenCode (`PR-06`/`PR-07`) |

## 6.4 Problemas encontrados

### Reavaliação dos itens do Ciclo 1 (`DS-01`..`DS-03`, `PR-01`..`PR-04`)
- **`DS-01` (Tokens inexistentes):** **Corrigido e mantido verde** em 23/11 (`css-tokens.test.js` → 0 violações em 43 `.css`). Sem reincidência.
- **`DS-02` (Contraste botões de marketplace):** **Corrigido e mantido verde** em 23/11 (Mercado Livre `14,15:1`, Shopee `5,21:1`, Amazon `8,37:1`). *Recorrência da mesma classe (botão externo com hex avulso e contraste < 4,5:1)* identificada em `pages/blog/[slug].js` → registrada em **`DS-04`**.
- **`DS-03` (Estilo inline e `--color-text-tertiary` em `AdminSales`/`checkout`):** **Corrigido nos 2 arquivos originais** (0 `style={{` confirmados em 23/11). *Recorrência da mesma classe* identificada em `pages/blog/[slug].js` (`54ed1f3`) → registrada em **`DS-04`**.
- **`PR-01` (Correção/guard restrito a 1 arquivo):** **Corrigido para tokens `var(--*)` e `outline: none` em 43 `.css`**. *Recorrência parcial de escopo* nos demais invariantes de `css-tokens.test.js` (`style={{` em 2 arquivos; foco duplo em 4 arquivos) → registrada em **`PR-05`**.
- **`PR-02` (Overrides ausentes para visitante/Vendas):** **Corrigido** (`customer.md` criado; `admin.md`, `home.md`, `login.md` atualizados). *Lacunas residuais de sincronia* em `login.md`, `posts.md`, `customer.md` e `/blog` → registradas em **`PR-06`**.
- **`PR-03` (Validação visual/responsiva/acessibilidade — REINCIDÊNCIA):** **Parcialmente corrigido.** Opção 2A no Jest está ativa e passando (7 testes), porém **reincidiu nos 6 commits visuais de 21/11** (`c1dd831`, `c64424a`, `54ed1f3`, `25081d9`, `e934811`, `c676098`), nenhum deles com registro verificável de inspeção nos 4 viewports (`375/768/1024/1440`), teclado ou navegador real. A inspeção ao vivo pendente desde 20/11 e a Opção 2B (`axe-core` + `cypress-axe`) seguem abertas.
- **`PR-04` (Mensagens de commit `ATT - ...`):** **Encerrado por decisão do dono (Opção 1A, 20/11)** — decisão preservada sem reabertura.

---

### Novos problemas identificados no Ciclo 2

#### DS-04 — Correção parcial em `pages/blog/[slug].js` (`54ed1f3`): 12 estilos inline, 2 falhas WCAG AA (WhatsApp 1,98:1 e data 2,31:1), zoom inacessível por teclado e ausência de `skip-link`/`<main>`
- **Classificação:** **Confirmado** *(recorrência de classe de `DS-02` e `DS-03` em arquivo editado na janela)*.
- **Descrição:** Ao ajustar o botão "Voltar" no commit `54ed1f3` (21/11), apenas 3 `style={{` no topo de `pages/blog/[slug].js` foram migrados para `Blog.module.css`, mantendo imediatamente abaixo 12 blocos `style={{`, hexes avulsos, texto informativo em `--color-text-tertiary`, contraste reprovado no botão do WhatsApp, imagem clicável sem acesso por teclado, salto de heading e ausência de landmarks de acessibilidade.
- **Evidências:**
  - `pages/blog/[slug].js` L67, L68, L69, L78, L85, L100, L104, L105, L106, L111, L120, L138: **12 `style={{`** (viola `MASTER.md` §9).
  - `pages/blog/[slug].js:69`: data de publicação em `color: 'var(--color-text-tertiary)'` (`#a3a3a3`) sobre `--color-bg-secondary` (`#f5f5f5`) = **2,31:1** (< 4,5:1; viola `MASTER.md` §2 e §9).
  - `pages/blog/[slug].js:111,120,138`: botões de compartilhamento com hexes avulsos (`#3b5998` = 6,84:1; **`#25D366` + `white` = 1,98:1 — reprovado WCAG AA**; `#C13584` = 5,11:1), `borderRadius: '6px'` (vs `8px` `--border-radius-lg`), altura < 44px (`padding: '10px 20px'` + ícone `18px`), sem `:focus-visible` de anel duplo, `<svg>` inline sem `aria-hidden="true"`/`focusable="false"` e `<button>` na L125 sem `type="button"`.
  - `pages/blog/[slug].js:76-80`: `<div data-testid="image-zoom-container" onClick={() => setIsImageZoomed(true)}>` com `cursor: 'zoom-in'` sem `<button>` nem `role`/`tabIndex`/`onKeyDown`/foco visível.
  - `pages/blog/[slug].js:68,105`: salto de hierarquia `<h1>` → `<h3>` (sem `<h2>`).
  - Comparação com irmão `pages/blog/index.js:57,76`: `index.js` tem `<a href="#main-content" className="skip-link">` e `<main id="main-content">`, ausentes em `[slug].js`.
- **Arquivos/componentes relacionados:** `pages/blog/[slug].js`, `pages/blog/Blog.module.css`, `pages/blog/index.js`, `tests/unit/pages/blog.slug.test.js`.
- **Etapa em que ocorre:** implementação e revisão de entrega (`54ed1f3`).
- **Causa identificada:** ajuste estritamente pontual no botão "Voltar" sem auditoria do arquivo completo nem proteção de `pages/blog/[slug].js` no guard `css-tokens.test.js` (`PR-05`).
- **Impactos:** baixa legibilidade da data e do botão WhatsApp para pessoas com baixa visão; usuários de teclado/leitores de tela não conseguem acionar o zoom da imagem nem pular para o conteúdo principal; inconsistência visual e de manutenção na página pública de leitura de artigos.
- **Situação atual:** **aberto** (Prioridade Alta).

#### DS-05 — Inconsistências de busca, foco e raios em `AdminSales` (`Pedidos`) e mistura de `--border-radius-md`/`-lg` em `CustomerPages` (e `Login`)
- **Classificação:** **Confirmado**.
- **Descrição:** Controles interativos editados na janela (`a681cc5`, `c676098`, `e934811`) apresentam desvios de padronização em relação ao `MASTER.md` §5, `ARQUITETURA_SITE_PRIVADO.md` §1.1 itens 5 e 7, `ARQUITETURA_SITE_PUBLICO.md` §1.1 item 5 e aos componentes irmãos.
- **Evidências:**
  - `components/Admin/AdminSales.js:506-516` e `components/Admin/styles/AdminSales.module.css:67-88`: o campo de busca de `Pedidos` é um `<input>` puro sem ícone `AppIcon name="search"` nem botão interno `×` de limpar (ao contrário de `AdminCrudBase.js:278-308`, `AdminAudit.js` e `design-system/pages/admin.md` §4); além disso, `.searchInput:focus-visible`/`.filterSelect:focus-visible` omite `border-color: var(--color-primary-500)` e usa `:focus-visible` em vez de `:focus` (divergindo de `Input.module.css:42` e `ProductList.module.css:84,221`).
  - `components/Admin/styles/AdminSales.module.css:21`: `.subTabButton` usa `border-radius: var(--border-radius-md)` (`6px`), divergindo de `design-system/pages/admin.md` §3 (`--border-radius-lg` `8px`) e de `components/Admin/styles/tabs.module.css:105` (`--border-radius-lg --border-radius-lg 0 0`).
  - `pages/styles/CustomerPages.module.css`: mistura `--border-radius-md` (`6px`) em `.backLink` (L41), `.modeTabButton` (L83), `.input`/`.select` (L133) e `.paymentMethodOption` (L379) com `--border-radius-lg` (`8px`) em `.googleButton` (L250) e `<Button>` (`Button.module.css:10`), contrariando `MASTER.md` §5 (`8px` em campos e botões).
  - `pages/styles/Login.module.css:163,188,195` *(origem pré-existente, arquivo revisitado em `e934811`)*: `.input` usa `--border-radius-xl` (`12px`) em vez de `--border-radius-lg` (`8px`), e `.inputInvalid` usa `rgba(239, 68, 68, 0.1)` literal em vez do token já existente `--color-error-halo` (`variables.css`, usado em `Input.module.css:190`).
- **Arquivos/componentes relacionados:** `components/Admin/AdminSales.js`, `components/Admin/styles/AdminSales.module.css`, `pages/styles/CustomerPages.module.css`, `design-system/pages/customer.md`, `pages/styles/Login.module.css`, `design-system/pages/login.md`.
- **Etapa em que ocorre:** implementação e criação/atualização de overrides.
- **Causa identificada:** criação/edição isolada de CSS Modules sem conferência cruzada contra `AdminCrudBase`, `tabs.module.css`, `Input.module.css` e `MASTER.md` §5.
- **Impactos:** quebra sutil de unidade visual entre telas do painel (`Pedidos` vs demais CRUDs/subabas) e entre telas do visitante (`/entrar`, `/checkout/[id]`, `/login`) e o restante do Site Público.
- **Situação atual:** **aberto** (Prioridade Média).

#### DS-06 — Contraste abaixo de WCAG AA na barra `Dicas` de `AdminDashboard` (`4,09:1`) e aperto potencial de `.statColumns` em 375px (`25081d9`)
- **Classificação:** **Confirmado** (contraste da barra `Dicas`) / **Indício** (layout de `.statColumns` em 375px).
- **Descrição:** Em `25081d9` (21/11), `AdminDashboard` passou a exibir 8 cartões e 8 barras, e `ARQUITETURA_SITE_PRIVADO.md` §4.1 (L169) afirmou que todas as 8 barras usam cores tokenizadas de contraste AA (`≥ 4,5:1` sobre texto branco). As 2 novas barras (`Gestão de Vendas` `--color-info-700` = `6,42:1`; `Produtos Internos` `--color-warning-800` = `6,79:1`) passam com folga, mas a barra `Dicas` permanece em `--color-secondary-700`, abaixo de 4,5:1. Adicionalmente, o novo cartão largo `.statCardWide` mantém 2 colunas lado a lado mesmo abaixo de 640px.
- **Evidências:**
  - `components/Admin/AdminDashboard.js:185` e `pages/styles/variables.css`: `--color-text-inverse` (`#fafafa`) sobre `--color-secondary-700` (`#967628`) com `--font-size-xs` (`12px`, bold) = **4,09:1** (< 4,5:1 WCAG AA). O token vizinho já existente `--color-secondary-800` (`#7d5f26`) atinge **5,69:1** (AA aprovado). *(Origem da cor em `7955585` de 07/11; reafirmada como AA na atualização de `25081d9` em 21/11.)*
  - `components/Admin/styles/dashboard.module.css:131-165, 230-252` (criado em `25081d9`): em `@media (max-width: 640px)`, `.statCardWide` vira `grid-column: span 1; flex-direction: column; padding: var(--spacing-4)`, mas `.statColumns` mantém `grid-template-columns: 1fr 1fr`. Em viewport `375px` (descontando `16px×2` de `.adminMainContainer`, `16px×2` de `.adminPanel` e `16px×2` de `.statCardWide`), sobram ~`279px` (~`127px` úteis por coluna após `gap` e `padding-left`), o que tende a quebrar rótulos como `"Aguardando pagamento (0)"` em múltiplas linhas (**Indício** — exige conferência visual real em 375px).
- **Arquivos/componentes relacionados:** `components/Admin/AdminDashboard.js` (L185), `components/Admin/styles/dashboard.module.css` (L131–165, L230–252), `docs/ARQUITETURA_SITE_PRIVADO.md` (§4.1 L169), `design-system/pages/admin.md` (§4).
- **Etapa em que ocorre:** implementação (`25081d9`) e validação (contraste não recalculado para as 8 barras; 375px não inspecionado).
- **Causa identificada:** confiança na nota pré-existente do documento sem verificação matemática automatizada das cores de barra nem inspeção visual em 375px.
- **Impactos:** divergência real entre documento e código quanto a WCAG AA na barra `Dicas`; possível aperto visual no cartão de `Gestão de Vendas` em celulares estreitos.
- **Situação atual:** **aberto** (Prioridade Média).

#### DS-07 — Assimetria de UX na paginação das galerias públicas irmãs e dívidas menores pré-existentes fora do recorte auditado
- **Classificação:** **Confirmado**.
- **Descrição:** Melhorias aplicadas apenas em `ProductList.js` (`c64424a`, 21/11) não foram avaliadas para as galerias irmãs; além disso, a varredura global de 23/11 revelou pequenos desvios pré-existentes fora dos arquivos do Ciclo 1.
- **Evidências:**
  - `components/Features/Products/ProductList.js:108-120` (`c64424a`, 21/11) aplica rolagem suave controlada (`shouldScrollOnPageChange` + `scrollIntoView`), `pageLoading` suave e `min-height: 600px` anti-CLS (`.listViewport`); já `components/Features/Music/MusicGallery.js:86-88` e `components/Features/Video/VideoGallery.js:56-58` apenas chamam `setCurrentPage(page)` sem rolagem ao topo nem reserva de altura na troca de página.
  - *Dívidas menores pré-existentes (anteriores a 16/11, registradas para acompanhamento sem inflar prioridade):*
    - `components/UI/Pagination.module.css:58`: `.totalInfo` (`(Z itens)`) usa `--color-text-tertiary` sobre `--color-bg-secondary` = **2,31:1** (< 4,5:1, herdado de `home.md:126`);
    - `pages/styles/globals.css`: `.skip-link:focus` aplica `outline: 2px solid var(--color-focus-primary); outline-offset: 2px;` sem `box-shadow: var(--color-focus-ring)`;
    - `pages/404.js`: 6 ocorrências de `style={{` e 1 hex literal `#ffffff` (L90);
    - `pages/design-system.js` (tocado em `a681cc5` para `noindex, nofollow`): mantém 10 emojis decorativos em subtítulos/demo (`🎨`, `🔘`, `📝`, `🔍`, `🏷️`, `⚠️`, `🪟`, `🍞`, `📐`, `📚`) — página interna de demonstração fora da indexação.
- **Arquivos/componentes relacionados:** `components/Features/Music/MusicGallery.js`, `components/Features/Video/VideoGallery.js`, `components/UI/Pagination.module.css`, `pages/styles/globals.css`, `pages/404.js`, `pages/design-system.js`.
- **Etapa em que ocorre:** evolução incremental por aba e legado anterior ao Ciclo 1.
- **Causa identificada:** ajustes de UX feitos aba por aba sem revisão transversal das três galerias públicas; foco inicial nas rotas comerciais/visitante.
- **Impactos:** experiência de paginação levemente diferente entre Produtos e Músicas/Vídeos; baixo contraste no sufixo `(Z itens)` da paginação.
- **Situação atual:** **aberto** (Prioridade Baixa).

#### PR-05 — Escopo restrito nos guards de `style={{` e foco duplo em `css-tokens.test.js` + intervenções pontuais sem revisão de arquivo completo/irmãos
- **Classificação:** **Confirmado** *(vinculado/evolução de `PR-01`)*.
- **Descrição:** Embora `tests/unit/tests-hygiene/css-tokens.test.js` (`a681cc5`, 20/11) tenha globalizado a checagem de tokens `var(--*)` e de `outline: none` em `:focus` para todos os 43 `.css`, dois dos seus testes-chave permaneceram restritos a listas fixas pequenas, permitindo que defeitos da mesma classe passassem despercebidos já em 21/11.
- **Evidências:**
  - `tests/unit/tests-hygiene/css-tokens.test.js:171-188`: checagem de `style={{` restrita a **2 arquivos** (`AdminSales.js`, `pages/checkout/[id].js`), enquanto a varredura global de 23/11 encontrou **66 `style={{` em 27 arquivos** (parte legítima/dinâmica como `--cols-*`, `--main-margin`, `width: %`, `gridColumn`; parte estática indevida como os 12 de `pages/blog/[slug].js` e os 6 de `pages/404.js`).
  - `tests/unit/tests-hygiene/css-tokens.test.js:236-254`: checagem do par de foco duplo (`outline` + `box-shadow: var(--color-focus-ring)`) restrita a **4 de 43 `.css`** (`Home`, `CustomerPages`, `ProductCard`, `AdminSales`), deixando de fora `ProductList.module.css`, `Blog.module.css`, `dashboard.module.css`, `Login.module.css` e outros 35 arquivos.
  - Nenhum teste valida contraste das barras de `AdminDashboard.js` (`DS-06`) nem bloqueia `outline: none` em regra base sem reposição em `:focus`/`:focus-visible`.
  - No fluxo da janela, `AdminSales.js` sofreu **5 commits em 3 dias** (`a681cc5`, `25081d9`, `e934811`, `c676098`, `ee4ed2e`), incluindo correções reativas de ícone `"products"` inexistente, classes CSS erradas (`headerRow`/`headerControls`), assinatura antiga de `exportToCSV` e contagem falsa `Pedidos (0)`.
- **Arquivos/componentes relacionados:** `tests/unit/tests-hygiene/css-tokens.test.js`, `AGENTS.md` (§0.3 passo 5 e §7 item 2 — reforçados no working tree em 23/11).
- **Etapa em que ocorre:** validação final e definição de guards.
- **Causa identificada:** criação do guard espelhando apenas os arquivos do Ciclo 1, sem adotar modelo de baseline global com allowlist documentada para estilos estritamente dinâmicos.
- **Impactos:** risco contínuo de regressões visuais e de acessibilidade em qualquer arquivo fora da lista curta de 2/4 arquivos (já materializado em `54ed1f3`).
- **Situação atual:** **aberto** (Prioridade Alta).

#### PR-06 — Lacunas residuais em overrides de `design-system/pages/` e conflito histórico em `designer_append.md` (saneado apenas no working tree em 23/11)
- **Classificação:** **Confirmado** *(vinculado a `PR-02`)*.
- **Descrição:** Apesar do grande avanço na atualização de `customer.md`, `home.md`, `admin.md` e `login.md` na janela, restam imprecisões pontuais nos overrides e falta de cobertura documental para `/blog` e `/blog/[slug]`. Além disso, o anexo do agente `@designer` no OpenCode esteve contraditório durante toda a semana até 23/11.
- **Evidências:**
  - `design-system/pages/login.md` (editado em `e934811`, 21/11): não tem cabeçalho `> Última atualização:`, mantém aviso obsoleto na L212 (`npm run lint quebra no repo com 429 erros pré-existentes em .opencode/skills/**` — hoje `npm run lint` tem 0 erros) e mantém `rgba(239,68,68,.1)` (L109–110, L122–123) em vez de `--color-error-halo`.
  - `design-system/pages/posts.md:208`: mantém o mesmo aviso obsoleto sobre 429 erros no `npm run lint`, e cobre apenas chips de `PostCard` + CRUD de categorias — não existe override cobrindo a página `/blog` nem `/blog/[slug]` (exatamente onde ocorreu `DS-04`).
  - `design-system/pages/customer.md:15` (criado em `a681cc5`, 19/11): registrou `--border-radius-md` (`6px`) para `.input`/`.select` sem justificar divergência frente ao `MASTER.md` §5 (`8px`).
  - `.opencode/oh-my-opencode-slim/designer_append.md`: até 23/11 orientava `design-system/<projeto>/MASTER.md` e `"HTML + Tailwind"` (conflito direto com `AGENTS.md` §4). Foi corrigido no working tree local em 23/11 (junto com precedência explícita em `AGENTS.md` §2), mas segue **não commitado**.
- **Arquivos/componentes relacionados:** `design-system/pages/login.md`, `design-system/pages/posts.md`, `design-system/pages/customer.md`, `.opencode/oh-my-opencode-slim/designer_append.md`, `AGENTS.md`.
- **Etapa em que ocorre:** análise/planejamento e governança de prompts dos agentes.
- **Causa identificada:** atualizações incrementais nos overrides sem revisão de cabeçalho/notas antigas; anexos de outubro/2026 sem checagem de aderência ao `AGENTS.md`.
- **Impactos:** agentes podem seguir instruções obsoletas (pular `npm run lint`, manter `6px` em controles ou trabalhar sem contrato em `/blog/[slug]`).
- **Situação atual:** **parcialmente corrigido** (`designer_append.md` e `AGENTS.md` ajustados no working tree em 23/11, pendentes de commit; overrides de `design-system/pages/` abertos — Prioridade Média).

#### PR-07 — Observabilidade limitada do fluxo de design entre OpenCode e Antigravity + indisponibilidade de `ai-memory` (MCP) e `models:check` no ambiente de auditoria
- **Classificação:** **Confirmado** (limitação de fontes) / **Hipótese** (impacto operacional no OpenCode).
- **Descrição:** Pelo segundo ciclo consecutivo, a auditoria semanal não teve acesso ao MCP `ai-memory` nem ao histórico local do OpenCode; o catálogo vivo de modelos do OpenCode (`@designer` em `big-pickle`, `@oracle` migrado no working tree de 23/11 para `beam-free`) não pôde ser verificado neste host (`ENOENT`), o `_lint/report.md` do `ai-memory` acumula 20 warnings, e há 20 arquivos alterados no working tree em 23/11 ainda sem commit.
- **Evidências:** recusa de permissão em todas as chamadas `ai-memory/*` em 23/11; aviso do `SessionStart` (`20 warnings` em `_lint/report.md`); `npm run models:check` retornando `NÃO VERIFICADO (spawnSync opencode ENOENT)`; ausência de evidência de execução do MCP remoto `frontend-checklist` na janela; `git status --short` listando 20 arquivos modificados em 23/11.
- **Arquivos/componentes relacionados:** `.opencode/oh-my-opencode-slim.json`, `.ai-memory.toml`, `scripts/diagnostics/check-model-catalog.js`.
- **Etapa em que ocorre:** governança e monitoramento contínuo.
- **Causa identificada:** isolamento de permissões/ambiente do Antigravity em relação ao host do OpenCode e ao MCP `ai-memory`.
- **Impactos:** reduz visibilidade sobre quais etapas de design foram feitas por `@designer`/`@oracle` no OpenCode e mantém risco de id morto no catálogo caso `models:check` não seja rodado no host OpenCode após a troca do `@oracle` em 23/11.
- **Situação atual:** **aberto** (Prioridade Baixa — acompanhamento operacional pelo dono no host).

## 6.5 Pontos positivos

- **Fechamento disciplinado e completo do Ciclo 1 (`a681cc5`, 20/11):** todas as 9 ações (`A-01`..`B-03`) foram executadas na ordem planejada, zerando 24 tokens inexistentes (`DS-01`), regularizando contrastes de marketplace (`14,15:1`, `5,21:1`, `8,37:1`), eliminando 13 `style={{` em `AdminSales`/`checkout`, protegendo `/design-system` com `noindex, nofollow` e criando o guard permanente `css-tokens.test.js`. **Processo validado.**
- **Sincronização real entre código e `design-system/pages/` na semana:** em 4 entregas distintas após o Ciclo 1 (`c1dd831` → `home.md`; `25081d9` e `c676098` → `admin.md`; `e934811` → `login.md`), o override foi atualizado no **mesmo commit** do código — evoluindo claramente sobre o Ciclo 1. **Processo validado.**
- **Qualidade das peças novas criadas em 21/11:** `.sessionNotice` em `Login.module.css` (contraste `6,84:1`, `role="status"`, tokens canônicos), as duas novas barras de `AdminDashboard` (`6,42:1` e `6,79:1`), o alinhamento do cabeçalho de `AdminSales` reaproveitando `crudStyles.sectionHeader` + `<Button>` com `.buttonLabel` (estável em estado `loading`) e o uso correto de `AppIcon` (`package`, `shoppingBag`, `refresh`, `download`, sem emojis nas telas de produção). **Processo validado.**
- **Zero duplicação de componentes na janela:** nenhum componente UI novo redundante foi introduzido; `AdminCrudBase` recebeu `queryParams` (`00758a7`) em vez de bifurcar `AdminProducts`, e `Blog.module.css` foi reutilizado em `54ed1f3`.
- **Regras de proteção preservadas 100%:** navegação horizontal pública (5 abas na ordem, "Em Desenvolvimento" desabilitada, "Dicas do Dia" global), barra lateral recolhível exclusiva do `/admin` (11 abas + RBAC) e separação Modalidade A × Modalidade B mantidas intactas.
- **Gates estáticos e canário do bench 100% verdes em 23/11/2026:** `css-tokens.test.js` (7/7), `bench-ground-truth.test.js` (14/14, todos os 5 papéis calibrados), `npm run knip` (0 issues), `npm run lint` (0 erros), `npm run lint:workflows` (`actionlint 1.7.12`, 0 erros), `npm run lint:chars` (0 erros em 785 arquivos) e suíte Jest com `241 suítes / 2.090 testes` aprovados em 22/11.
- **Fortalecimento preventivo de `AGENTS.md` e `designer_append.md` (working tree 23/11):** correção do conflito de stack/caminho do `@designer`, explicitação da precedência de `AGENTS.md` §2 e inclusão de `css-tokens.test.js`, arquivos irmãos e alvos de design do canário do bench em `AGENTS.md` §7.1–§7.2.

## 6.6 Oportunidades de melhoria

| # | Oportunidade | Justificativa concreta (regra / evidência) |
|---|---|---|
| 1 | Saneamento completo de `pages/blog/[slug].js` em `Blog.module.css` | Elimina 12 `style={{` (`MASTER.md` §9), corrige 2 falhas severas WCAG AA (WhatsApp `1,98:1` e data `2,31:1`), habilita teclado no zoom e adiciona `skip-link`/`<main>` como no irmão `pages/blog/index.js` (`DS-04`). |
| 2 | Ampliar `css-tokens.test.js` com política de baseline global | Impede reincidência de `style={{` estático, falta de par de foco duplo e contraste < 4,5:1 em qualquer arquivo além dos 2/4 originais (`PR-05`). |
| 3 | Padronizar busca/foco/raios em `AdminSales` e harmonizar raios em `CustomerPages` / `Login` | Alinha `Pedidos` a `AdminCrudBase`/`AdminAudit` (`ARQUITETURA_SITE_PRIVADO.md` §1.1 item 7) e unifica raios de controles interativos em `--border-radius-lg` (`8px`, `MASTER.md` §5) (`DS-05`). |
| 4 | Corrigir contraste da barra `Dicas` (`--color-secondary-800`) e validar `.statColumns` em 375px | Cumpre WCAG AA (`5,69:1` vs `4,09:1` atual) prometido por `ARQUITETURA_SITE_PRIVADO.md` §4.1 e garante legibilidade do cartão largo no mobile (`DS-06`). |
| 5 | Sincronizar overrides (`login.md`, `posts.md`, `customer.md`, `/blog`) e consolidar saneamento do OpenCode | Remove notas obsoletas (429 erros de lint), cria contrato para `/blog/[slug]` e fecha o ciclo das alterações de `designer_append.md`/`AGENTS.md` de 23/11 (`PR-06`). |
| 6 | Executar inspeção visual nos 4 viewports e reavaliar Opção 2B (`axe-core` + `cypress-axe`) | Fecha `PR-03` nos 6 commits visuais de 21/11 e na pendência aberta desde 20/11. |
| 7 | Alinhar paginação das galerias irmãs (`MusicGallery`/`VideoGallery`), `.totalInfo` de `Pagination` e `pages/404.js` | Unifica UX de troca de página nas 3 galerias públicas, corrige contraste `2,31:1` de `.totalInfo` e elimina os últimos estilos inline estáticos relevantes (`DS-07`). |

Nenhuma recomendação é por preferência estética ou tendência: todas se apoiam em WCAG 2.2 AA, `design-system/MASTER.md`, `AGENTS.md` ou nos dois documentos de arquitetura.

## 6.7 Plano de Ação por prioridade

> **Nenhuma ação abaixo foi executada.** Aguardar autorização específica do dono antes de iniciar qualquer edição.
> **Ordem recomendada de execução:** **`C2-A01` → `C2-M01` → `C2-M02` → `C2-A02` → `C2-M03` → `C2-M04` → `C2-B01` → `C2-B02`** *(executar `C2-A02` após `C2-A01`/`C2-M01`/`C2-M02` garante que o guard ampliado já nasça verde com baseline mínimo, ou incluir baseline explícita transitória se o dono optar por rodar `C2-A02` imediatamente após `C2-A01`)*.

### Prioridade alta (2 ações)

#### C2-A01 — Saneamento completo de `pages/blog/[slug].js` e `pages/blog/Blog.module.css`
- **Objetivo:** adequar a página pública de leitura de artigos ao `MASTER.md`, à acessibilidade WCAG 2.2 AA e ao padrão do irmão `pages/blog/index.js`.
- **Problema que pretende resolver:** `DS-04` (recorrência de classe de `DS-02` e `DS-03`).
- **Arquivos e componentes envolvidos:** `pages/blog/[slug].js`, `pages/blog/Blog.module.css`, `tests/unit/pages/blog.slug.test.js` (e `design-system/pages/posts.md` em `C2-M03`).
- **Alterações recomendadas:**
  1. Migrar todos os 12 `style={{` de `pages/blog/[slug].js` para classes semânticas em `pages/blog/Blog.module.css` usando exclusivamente tokens de `pages/styles/variables.css`.
  2. Trocar a cor da data de publicação de `--color-text-tertiary` (`2,31:1`) para `--color-text-secondary` (`7,17:1` sobre `--color-bg-secondary`).
  3. Padronizar os 3 botões de compartilhamento em `Blog.module.css` (`min-height: 44px`, `border-radius: var(--border-radius-lg)`, `:focus-visible` com anel duplo azul, `aria-hidden="true"` e `focusable="false"` nos `<svg>`, `type="button"` no botão Instagram/Copiar Link) e corrigir o contraste do botão WhatsApp para `≥ 4,5:1` (**decisão do dono:** texto escuro `--color-text-primary` sobre `#25D366` = **`9,04:1`** — mesmo padrão de Mercado Livre/Amazon/Spotify — ou fundo `--color-success-700` `#047857` com `--color-text-inverse` = **`5,25:1`**), registrando a exceção de cor de marca no override de design.
  4. Substituir o `<div data-testid="image-zoom-container" onClick={...}>` por `<button type="button" data-testid="image-zoom-container" ...>` (com `aria-label` descritivo e `:focus-visible` de anel duplo), preservando o `data-testid` e o funcionamento do `ImageLightbox`.
  5. Corrigir o salto de heading `<h3>` → `<h2>` em `"Compartilhe esta reflexão:"` e adicionar `<a href="#main-content" className="skip-link">Pular para o conteúdo principal</a>` + `<main id="main-content">` envolvendo `<article>`, espelhando `pages/blog/index.js`.
- **Dependências e impactos:** requer decisão do dono sobre o par de cores do botão WhatsApp; melhora acessibilidade de teclado, leitores de tela e contraste sem alterar SSR, SEO/OpenGraph nem rotas.
- **Riscos:** testes existentes que consultam `getByRole('heading', { level: 3 })` ou seletor específico no DOM de `blog.slug.test.js` precisarem de ajuste; quebra visual do zoom se o `<button>` herdar padding/borda padrão do navegador.
- **Cuidados para evitar duplicidades e regressões:** resetar `border: none; padding: 0; width: 100%; background` na classe do botão de zoom em `Blog.module.css`; manter `data-testid="image-zoom-container"` e `data-testid="image-zoom-thumb"`; não mexer em `getServerSideProps` nem no cache `settings:site_title`; conferir `pages/blog/index.js` para preservar estilos compartilhados de `Blog.module.css` (`.container`, `.backLink`).
- **Critérios de validação:** zero `style={{` e zero hex literal em `pages/blog/[slug].js`; contraste calculado `≥ 4,5:1` na data e nos 3 botões; navegação por `Tab` + `Enter`/`Space` abre o `ImageLightbox`; `npx jest tests/unit/pages/blog.slug.test.js tests/unit/tests-hygiene/css-tokens.test.js`, `npm run lint` e `npm run knip` verdes.
- **Ordem recomendada de execução:** **1º**.

#### C2-A02 — Expandir `tests/unit/tests-hygiene/css-tokens.test.js` com política de baseline global
- **Objetivo:** fechar a brecha que permitiu `DS-04`, `DS-05` e `DS-06` passarem sem alerta, transformando o guard em proteção contínua do repositório inteiro.
- **Problema que pretende resolver:** `PR-05` (evolução de `PR-01`).
- **Arquivos e componentes envolvidos:** `tests/unit/tests-hygiene/css-tokens.test.js`.
- **Alterações recomendadas:**
  1. Ampliar o teste de par de foco duplo (`outline` + `box-shadow: var(--color-focus-ring)`) dos 4 CSS Modules atuais para **todos os 43 `.css`**, permitindo explicitamente exceções válidas e documentadas (`--color-error-500` em campos inválidos, modificadores secundários como `.filled:focus`/`.flushed:focus` e combinadores decorativos como `.select:focus + .arrow`).
  2. Adicionar detector de `outline: none` / `outline: 0` em regra base que verifique se existe bloco `:focus` ou `:focus-visible` correspondente no mesmo arquivo repondo `outline`.
  3. Expandir a verificação de `style={{` para varrer `pages/` (exceto `api/`) e `components/`, distinguindo via allowlist explícita os usos estritamente dinâmicos (`--cols-*`, `--min-width`, `--main-margin`, `width: %` de gráfico/skeleton, `left/top` de ripple, `gridColumn`, `animationDuration`, `opacity` de carga) e mantendo baseline fechada (zero novos arquivos com `style={{` estático; `pages/blog/[slug].js` zerado após `C2-A01`).
  4. Adicionar checagem matemática WCAG AA (`≥ 4,5:1`) para as cores das barras de `AdminDashboard.js` (após `C2-M02`) e para os botões de compartilhamento em `Blog.module.css` (após `C2-A01`).
- **Dependências e impactos:** executar após `C2-A01` e `C2-M02` (ou com allowlist temporária documentada se rodado antes); zero dependências npm novas; mantém execução rápida (< 300 ms no Jest).
- **Riscos:** falsos positivos em seletores CSS compostos (ex.: `:focus-within`, combinadores `+`/`>`) ou estilos inline dinâmicos legítimos em `LazyIframe`/`ImageOptimized`.
- **Cuidados para evitar duplicidades e regressões:** incluir testes de sanidade (caso válido e caso inválido) para cada novo detector; não duplicar testes em arquivos de página; não alterar `components/UI/{Button,Input,BaseCard}.module.css` nem `variables.css` (vigiados por `bench-ground-truth.test.js`).
- **Critérios de validação:** cada detector reprova regressão plantada e passa no código limpo; `npx jest tests/unit/tests-hygiene/css-tokens.test.js` e `npm test` 100% verdes.
- **Ordem recomendada de execução:** **4º** (logo após `C2-A01`, `C2-M01` e `C2-M02`).

---

### Prioridade média (4 ações)

#### C2-M01 — Padronizar busca, foco e raios em `AdminSales` e harmonizar raios em `CustomerPages` (e `Login`)
- **Objetivo:** eliminar divergências de arredondamento e comportamento de busca/foco entre telas administrativas e entre páginas do visitante e o `MASTER.md`.
- **Problema que pretende resolver:** `DS-05`.
- **Arquivos e componentes envolvidos:** `components/Admin/AdminSales.js`, `components/Admin/styles/AdminSales.module.css`, `pages/styles/CustomerPages.module.css`, `pages/styles/Login.module.css`, `design-system/pages/customer.md`, `design-system/pages/admin.md`, `design-system/pages/login.md`, `tests/unit/components/Admin/AdminSales.test.js`.
- **Alterações recomendadas:**
  1. Em `AdminSales.js` (subaba `Pedidos`), envolver `.searchInput` num wrapper com `AppIcon name="search"` à esquerda e botão circular interno `×` (`aria-label="Limpar busca"`, `AppIcon name="close"`) quando `search` estiver preenchido, alinhado a `AdminCrudBase.js:278–308` e `ARQUITETURA_SITE_PRIVADO.md` §1.1 item 7.
  2. Em `AdminSales.module.css`, trocar `.subTabButton` de `--border-radius-md` para `--border-radius-lg` (`8px`), e ajustar `.searchInput:focus, .filterSelect:focus` adicionando `border-color: var(--color-primary-500)` junto ao anel duplo.
  3. Em `CustomerPages.module.css`, unificar `.backLink`, `.modeTabButton`, `.input`, `.select` e `.paymentMethodOption` de `--border-radius-md` (`6px`) para `--border-radius-lg` (`8px`), alinhando com `.googleButton`, `<Button>` e `MASTER.md` §5 (e atualizar `design-system/pages/customer.md` §0).
  4. *(Opcional sob aprovação do dono)* Em `Login.module.css`, alinhar `.input` de `--border-radius-xl` (`12px`) para `--border-radius-lg` (`8px`) e trocar `rgba(239, 68, 68, 0.1)` por `var(--color-error-halo)` (mantendo `design-system/pages/login.md` sincronizado).
- **Dependências e impactos:** muda ligeiramente o raio visual de 6px → 8px em controles de `/entrar`, `/minha-conta`, `/checkout/[id]` e subabas de `AdminSales`, aproximando-os do padrão global.
- **Riscos:** testes de `AdminSales` que consultam o input de busca diretamente pelo pai ou classe; espaçamento da barra `.filtersRow` com o ícone de lupa e botão limpar.
- **Cuidados para evitar duplicidades e regressões:** reaproveitar `AppIcon` (sem novo componente de busca); preservar `aria-label="Buscar pedidos"` e reset de página para `1` ao limpar busca; não alterar `components/UI/Input.module.css` nem `Button.module.css` (vigiados pelo `bench-ground-truth.test.js`).
- **Critérios de validação:** busca de `Pedidos` exibe lupa e botão limpar funcional; zero mistura `6px`/`8px` nos controles auditados; `npx jest tests/unit/components/Admin/AdminSales.test.js tests/unit/pages/entrar.test.js tests/unit/pages/minha-conta.test.js tests/unit/pages/login.test.js tests/unit/tests-hygiene/css-tokens.test.js` verdes.
- **Ordem recomendada de execução:** **2º**.

#### C2-M02 — Corrigir contraste AA da barra `Dicas` em `AdminDashboard` e validar/ajustar `.statCardWide` em 375px
- **Objetivo:** restaurar conformidade WCAG AA (`≥ 4,5:1`) nas 8 barras de Distribuição de Conteúdo e garantir leitura confortável do cartão `Gestão de Vendas` em mobile estreito.
- **Problema que pretende resolver:** `DS-06`.
- **Arquivos e componentes envolvidos:** `components/Admin/AdminDashboard.js`, `components/Admin/styles/dashboard.module.css`, `docs/ARQUITETURA_SITE_PRIVADO.md` (§4.1 L169), `design-system/pages/admin.md` (§4), `tests/unit/components/Admin/AdminDashboard.test.js`.
- **Alterações recomendadas:**
  1. Em `components/Admin/AdminDashboard.js:185`, alterar a cor da barra `Dicas` de `var(--color-secondary-700)` (`4,09:1`) para `var(--color-secondary-800)` (`#7d5f26`, contraste **`5,69:1`** sobre `--color-text-inverse` `#fafafa`).
  2. Atualizar a referência de token da barra `Dicas` em `docs/ARQUITETURA_SITE_PRIVADO.md` §4.1 (L169) de `--color-secondary-700` para `--color-secondary-800` (apenas após aprovação do dono).
  3. Inspecionar `.statCardWide`/`.statColumns` em viewport `375px`: caso haja aperto ou quebra excessiva dos rótulos (`"Aguardando pagamento (N)"`), adicionar `@media (max-width: 480px)` em `dashboard.module.css` passando `.statColumns` para `grid-template-columns: 1fr` e trocando a divisória vertical (`border-left`) por divisória horizontal (`border-top` + `padding-top`).
- **Dependências e impactos:** troca de 1 token já existente em `variables.css` (sem criar token novo); impacto visual discreto (dourado escuro ligeiramente mais profundo na barra `Dicas`).
- **Riscos:** mínimo; conferir se `AdminDashboard.test.js` faz asserção literal na string `--color-secondary-700`.
- **Cuidados para evitar duplicidades e regressões:** não alterar `pages/styles/variables.css`; manter as demais 7 cores de barra (todas já `≥ 4,63:1`).
- **Critérios de validação:** todas as 8 barras de `AdminDashboard` com contraste calculado `≥ 4,5:1` sobre `#fafafa`; leitura limpa em `375px`, `768px`, `1024px`, `1440px`; `npx jest tests/unit/components/Admin/AdminDashboard.test.js` verde.
- **Ordem recomendada de execução:** **3º**.

#### C2-M03 — Sincronizar overrides de `design-system/pages/` e consolidar o saneamento de agentes do OpenCode
- **Objetivo:** eliminar notas obsoletas, completar metadados de atualização, documentar o contrato visual de `/blog` e `/blog/[slug]`, e consolidar no Git o saneamento de `designer_append.md` e `AGENTS.md`.
- **Problema que pretende resolver:** `PR-06`.
- **Arquivos e componentes envolvidos:** `design-system/pages/login.md`, `design-system/pages/posts.md` (ou novo `design-system/pages/blog.md`, sob decisão do dono), `design-system/pages/customer.md`, além do commit + validação no host OpenCode de `.opencode/oh-my-opencode-slim/designer_append.md` e `AGENTS.md` (já alterados no working tree em 23/11).
- **Alterações recomendadas:**
  1. Em `design-system/pages/login.md`, adicionar cabeçalho `> Última atualização: YYYY-MM-DD`, remover a nota obsoleta sobre 429 erros de `npm run lint` (L212) e alinhar a referência de `rgba(...)` para `--color-error-halo` (se `C2-M01` aprovado).
  2. Em `design-system/pages/posts.md`, remover a nota obsoleta sobre 429 erros de `npm run lint` (L208) e acrescentar seção cobrindo o layout de `/blog` e `/blog/[slug]` (ou criar `design-system/pages/blog.md`, conforme decisão do dono) após a execução de `C2-A01`, registrando inclusive a exceção de cor de marca dos botões de compartilhamento.
  3. Commitar as correções locais de 23/11 em `designer_append.md`, `orchestrator_append.md`, `AGENTS.md` e `oh-my-opencode-slim.json`, e executar `npm run models:check` no host do OpenCode para confirmar o catálogo vivo (`@designer` `big-pickle` e `@oracle` `beam-free`).
- **Dependências e impactos:** executar a parte de `/blog` após `C2-A01` para documentar o estado corrigido; não tocar `design-system/MASTER.md` sem revalidar `bench-ground-truth.test.js` (que vigia linhas de `MASTER.md`).
- **Riscos:** desalinhar linhas vigiadas se `MASTER.md` for alterado desnecessariamente.
- **Cuidados para evitar duplicidades e regressões:** manter cada tela com uma única fonte de verdade em `design-system/pages/`; rodar `npx jest tests/unit/scripts/bench-ground-truth.test.js` se qualquer arquivo vigiado for tocado.
- **Critérios de validação:** todos os overrides com `Última atualização:` consistente e zero referências obsoletas; `npm run lint:chars` e `bench-ground-truth.test.js` verdes; `npm run models:check` aprovado no host OpenCode.
- **Ordem recomendada de execução:** **5º**.

#### C2-M04 — Fechar a validação visual em 4 viewports e decidir cronograma da Opção 2B (`axe-core` + `cypress-axe`)
- **Objetivo:** encerrar a reincidência de `PR-03` garantindo evidência visual e de acessibilidade em navegador real para as telas alteradas em 19–21/11.
- **Problema que pretende resolver:** `PR-03` (reincidência no Ciclo 2).
- **Arquivos e componentes envolvidos:** nenhum arquivo de código inicialmente (checagem manual guiada em `http://localhost:3000` com `npm run dev` + registro curto na entrega / `CHANGELOG.md` ou §6.8); se o dono autorizar a Opção 2B, `package.json` (`axe-core`, `cypress-axe`) e spec dedicada em `cypress/e2e/`.
- **Alterações recomendadas:**
  1. Inspecionar ao vivo em `375×812`, `768×1024`, `1024×768` e `1440×900` (mais teclado `Tab`/`Shift+Tab` e `prefers-reduced-motion`): cabeçalho `.accountLink`, aba Produtos (`ProductList` barra de filtros em linha única em 1024/1440 e empilhada em 375 + `ProductCard`), `/blog/[slug]` (pós-`C2-A01`), `/entrar`, `/login?reason=inactivity`, `AdminDashboard` (8 cartões + `.statCardWide` em 375px) e `AdminSales` (`Pedidos` + `Produtos Internos`).
  2. Registrar um bloco curto de verificação (data, viewports, foco e anomalias = 0) no fechamento de entregas de UI.
  3. Reapresentar ao dono a autorização futura da **Opção 2B** (`axe-core` + `cypress-axe` apenas no fluxo E2E, excluindo iframes de terceiros Spotify/YouTube/Google GSI/Mercado Pago).
- **Dependências e impactos:** depende de `npm run dev` local (ou navegador com permissão liberada) e de autorização prévia do dono caso opte por instalar pacotes da Opção 2B (`AGENTS.md` §4 e §6).
- **Riscos:** falsos positivos em widgets externos se a exclusão de iframes não for aplicada na Opção 2B.
- **Cuidados para evitar duplicidades e regressões:** não rodar `axe` dentro do `npm test` rápido do Jest; manter separado no fluxo E2E existente.
- **Critérios de validação:** registro verificável dos 4 viewports sem corte horizontal, foco visível em todos os controles e zero violações `critical`/`serious` nas rotas próprias (quando Opção 2B ativada).
- **Ordem recomendada de execução:** **6º** (preferencialmente logo após `C2-A01`, `C2-M01` e `C2-M02` para validar o conjunto de uma só vez).

---

### Prioridade baixa (2 ações)

#### C2-B01 — Alinhar paginação nas galerias irmãs (`MusicGallery`/`VideoGallery`) e contraste de `.totalInfo` em `Pagination`
- **Objetivo:** unificar a experiência de troca de página entre as três galerias públicas e eliminar contraste `2,31:1` no contador de itens da paginação.
- **Problema que pretende resolver:** `DS-07` (parcial).
- **Arquivos e componentes envolvidos:** `components/Features/Music/MusicGallery.js`, `components/Features/Video/VideoGallery.js`, `components/UI/Pagination.module.css`, `design-system/pages/home.md` (L126), testes das galerias.
- **Alterações recomendadas:**
  1. Avaliar e aplicar em `MusicGallery.js` e `VideoGallery.js` o mesmo padrão `shouldScrollOnPageChange` + `scrollIntoView({ behavior: 'smooth', block: 'start' })` (apenas na troca explícita de página, sem rolar em busca/ordenação) já validado em `ProductList.js` (`c64424a`).
  2. Em `components/UI/Pagination.module.css:58`, trocar `.totalInfo` de `--color-text-tertiary` (`2,31:1`) para `--color-text-secondary` (`7,17:1` sobre `--color-bg-secondary`), atualizando a referência em `design-system/pages/home.md:126`.
- **Dependências e impactos:** baixo impacto visual; melhora coerência entre abas públicas e legibilidade do total de itens na paginação.
- **Riscos:** testes existentes de `MusicGallery`/`VideoGallery` precisarem mockar `HTMLElement.prototype.scrollIntoView` (como feito em `ProductList.test.js`).
- **Cuidados para evitar duplicidades e regressões:** respeitar `prefers-reduced-motion` (já coberto pelo guard global `scroll-behavior: auto !important` em `globals.css`); não alterar `Button`/`Input`/`BaseCard.module.css`.
- **Critérios de validação:** troca de página rola suavemente nas 3 abas (e busca/ordenação não rola); `.totalInfo` com contraste `≥ 4,5:1`; testes unitários das 3 galerias e `css-tokens.test.js` verdes.
- **Ordem recomendada de execução:** **7º**.

#### C2-B02 — Migrar `pages/404.js` para CSS Module, limpar emojis em `pages/design-system.js` e tratar alertas operacionais (`PR-07`)
- **Objetivo:** eliminar os estilos inline e hex literal da página 404, remover os últimos emojis decorativos da rota interna de catálogo e restabelecer plena saúde operacional da memória e do catálogo de modelos.
- **Problema que pretende resolver:** `DS-07` (parcial) e `PR-07`.
- **Arquivos e componentes envolvidos:** `pages/404.js`, novo `pages/styles/NotFound.module.css` (ou reutilização de módulo existente), `pages/design-system.js`; operação externa no host para `_lint/report.md` (`ai-memory`) e `npm run models:check`.
- **Alterações recomendadas:**
  1. Migrar os 6 `style={{` e `#ffffff` de `pages/404.js` para CSS Module usando tokens canônicos e `<Button>` / `.backLink` com foco duplo azul.
  2. *(Opcional)* Substituir os 10 emojis de subtítulos/demo de `pages/design-system.js` por `AppIcon`, preservando `noindex, nofollow` e os imports dos componentes de `components/UI` e `components/Layout` (consumidos pelo `knip`).
  3. No host do operador, revisar os **20 warnings de `_lint/report.md`** do `ai-memory` e confirmar `npm run models:check` no host OpenCode.
- **Dependências e impactos:** nenhum impacto em regras de negócio; reduz o ruído de `style={{` no repositório facilitando `C2-A02`.
- **Riscos:** quebrar o `knip` se algum componente deixar de ser referenciado em `pages/design-system.js`.
- **Cuidados para evitar duplicidades e regressões:** manter rota `pages/404.js` com comportamento SSR/estático intacto e `pages/design-system.js` fora do sitemap (`next-sitemap.config.js`).
- **Critérios de validação:** zero `style={{` em `pages/404.js`; `npm test`, `npm run knip` e `npm run lint` verdes; zero erros em `npm run models:check` no host OpenCode.
- **Ordem recomendada de execução:** **8º**.

## 6.8 Pendências e acompanhamento

Para reavaliar no **Ciclo 3** (a partir de **30/11/2026**):

1. **Ações do Ciclo 2 abertas aguardando autorização do dono:** `C2-A01`, `C2-A02` (Alta), `C2-M01`..`C2-M04` (Média) e `C2-B01`..`C2-B02` (Baixa).
2. **Inspeção visual ao vivo nos 4 viewports (`375×812`, `768×1024`, `1024×768`, `1440×900` — `PR-03`):** segue aberta desde 20/11, agora incluindo também as entregas de 21/11 (`ProductList` linha única em desktop, `/blog/[slug]`, `/login?reason=inactivity`, `AdminDashboard` `.statCardWide`/`.statColumns` em 375px e `AdminSales` cabeçalho/botões).
3. **Validação futura — Opção 2B (`axe-core` + `cypress-axe` no Cypress E2E — `PR-03`):** especificação preservada do Ciclo 1 (pacotes sob autorização prévia, rotas `/`, `/blog`, `/blog/[slug]`, `/entrar`, `/minha-conta`, `/checkout/[id]`, exclusão obrigatória de iframes de terceiros Spotify/YouTube/Google GSI/Mercado Pago, zero violações `critical`/`serious`).
4. **Decisões pendentes do dono:**
   - Par de cores WCAG AA do botão WhatsApp em `pages/blog/[slug].js` (`#171717` sobre `#25D366` `9,04:1` vs `--color-text-inverse` sobre `--color-success-700` `5,25:1`);
   - Se a especificação de `/blog` e `/blog/[slug]` entra em `design-system/pages/posts.md` ou em novo `design-system/pages/blog.md`;
   - Se `.input` de `Login.module.css` converge para `--border-radius-lg` (`8px`) + `var(--color-error-halo)`.
5. **Pendências operacionais do host (fora do código):**
   - Commitar (quando o dono concluir a rodada de 23/11) os 20 arquivos do working tree pré-existente (incluindo `designer_append.md`, `AGENTS.md` e `oh-my-opencode-slim.json`);
   - Rodar `npm run models:check` no host do OpenCode para confirmar no catálogo vivo `@designer` (`opencode/big-pickle`) e `@oracle` (`opencode/beam-free`);
   - Inspecionar os **20 warnings em `_lint/report.md`** do `ai-memory` (sinalizados no `SessionStart`) e verificar se o MCP `ai-memory` estará acessível na próxima auditoria.

## 6.9 Conclusão

Na janela de **16/11 a 23/11/2026**, o fluxo de design do Caminhar evoluiu de forma expressiva: o Plano de Ação do Ciclo 1 foi integralmente entregue e protegido por testes (`a681cc5`), os overrides em `design-system/pages/` passaram a acompanhar as mudanças de UI na maioria dos commits de 21/11, todos os gates estáticos e o canário `bench-ground-truth.test.js` estão verdes, e o conflito histórico em `designer_append.md` foi sanado no working tree em 23/11.

As fragilidades restantes estão claramente delimitadas em **dois pontos prioritários**: (1) a correção incompleta em `pages/blog/[slug].js` (`DS-04`), que deixou 12 estilos inline, duas falhas WCAG AA (`1,98:1` e `2,31:1`) e imagem clicável sem teclado; e (2) o escopo ainda restrito de dois testes em `css-tokens.test.js` (`PR-05`) somado à ausência recorrente de validação visual em viewports (`PR-03`).

**Próximos passos recomendados após autorização expressa do dono:** executar `C2-A01` (saneamento de `/blog/[slug]`), `C2-M01` (padronização de `AdminSales`/`CustomerPages`) e `C2-M02` (barra `Dicas` AA `5,69:1` + conferência 375px), travar a proteção global em `C2-A02`, sincronizar overrides/commit do OpenCode em `C2-M03` e realizar a validação visual nos 4 viewports em `C2-M04`. Nenhuma implementação foi realizada nesta etapa.

---

# Histórico de ciclos

| Ciclo | Data | Período | Problemas novos | Atualizados | Observação |
|---|---|---|---|---|---|
| 1 | 19/11/2026 23:29 | 12/11 23:29 → 19/11 23:29 | 7 (DS-01 a DS-03, PR-01 a PR-04) | 7 (pós-implementação em 19–20/11) | Auditoria + ações A-01..B-03 + decisões 1A/2A (7 testes no guard CSS) e Opção 2B documentada para validação futura |
| 2 | 23/11/2026 12:00 | 16/11 12:00 → 23/11 12:00 | 7 (DS-04 a DS-07, PR-05 a PR-07) | 6 (status Ciclo 1 revalidados; reincidência em PR-03) | Auditoria pós-implementação do Ciclo 1 e 8 commits de UI (20–22/11); Plano de Ação C2-A01..C2-B02 (8 ações); nenhuma implementação executada |
