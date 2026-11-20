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
| DS-01 | Tokens CSS inexistentes em `Home`, `ProductCard` e `AdminSales` (24 declarações) | Alta | Corrigido (19/11/2026) | 1 |
| DS-02 | Botões de marketplace: texto 12px com contraste < 4,5:1 e hex avulso | Média | Corrigido (19/11/2026) | 1 |
| DS-03 | Estilo inline e campo duplicado em `AdminSales`/`checkout`; texto informativo em `--color-text-tertiary` | Baixa | Corrigido (19/11/2026) | 1 |
| PR-01 | Correção e guard de tokens restritos a um único arquivo | Alta | Corrigido (19/11/2026) | 1 |
| PR-02 | Páginas do visitante e Gestão de Vendas sem override em `design-system/pages/` | Média | Corrigido (19/11/2026) | 1 |
| PR-03 | Nenhuma validação visual, responsiva ou de acessibilidade registrada na janela | Média | Corrigido (20/11/2026 — Opção 2A no Jest; Opção 2B documentada para validação futura) | 1 |
| PR-04 | Rastreabilidade: commits `ATT - …` sem escopo e sem histórico por agente | Média | Encerrado por decisão do dono (20/11/2026 — Opção 1A: padrão atual mantido) | 1 |

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

# Histórico de ciclos

| Ciclo | Data | Período | Problemas novos | Atualizados | Observação |
|---|---|---|---|---|---|
| 1 | 19/11/2026 23:29 | 12/11 23:29 → 19/11 23:29 | 7 (DS-01 a DS-03, PR-01 a PR-04) | 7 (pós-implementação em 19–20/11) | Auditoria + ações A-01..B-03 + decisões 1A/2A (7 testes no guard CSS) e Opção 2B documentada para validação futura |
