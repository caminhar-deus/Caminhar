# Gabarito — papel do `designer` (conformidade de foco e contraste)

Conferido no código em 19/10/2026, recalibrado em 22/10/2026 e **recalibrado de novo
em 06/11/2026** (o foco do `Button` passou a ter o par completo e o `.helperText` migrou
para `--color-text-secondary`). **Recalibrado em 07/11/2026** apenas nas linhas: o HEAD
`7955585` ("ATT - New Design") deslocou `Input.module.css` (bloco novo do `clearButton`)
e duas faixas do `MASTER.md`. As citações desta versão conferem no código de
**07/11/2026**. **Nenhum modelo sob teste pode ler este arquivo.**

A fonte da verdade normativa é `design-system/MASTER.md` (`MASTER.md:36` tokens de
foco, `:39-46` nota normativa, `:130` declaração do botão, `:50-52` proibição do
texto terciário, `:202-205` anti-padrões de foco, `:213-215` checklist). O contrato
concreto são os tokens de `pages/styles/variables.css` (`:95-97` bg/text,
`:112-113` foco) e os componentes em `components/UI/`.

## P1 — o foco do `Button` ESTÁ conforme

| | |
|---|---|
| **Onde** | `components/UI/Button.module.css:21-25` — a regra `.button:focus-visible` |
| **O que a regra faz** | `outline: 2px solid var(--color-focus-primary)` (`Button.module.css:22`), `outline-offset: 2px` (`:23`) e `box-shadow: var(--color-focus-ring)` (`:24`). O `outline` é o indicador que passa em 3:1; o `box-shadow` é o halo complementar. |
| **A regra que a exige** | `MASTER.md:36` (anel duplo), `MASTER.md:41-43` (nunca um sem o outro, nunca `outline: none` seco) e a declaração exata do botão em `MASTER.md:130`. |
| **Tokens envolvidos** | `--color-focus-primary` = `#2563eb` (4,95:1 sobre `#fafafa`) e `--color-focus-ring` = `#bfdbfe` (`MASTER.md:36`; `pages/styles/variables.css:112-113`) |

Resposta que acerta: diz que **sim**, o foco do `Button` está conforme, cita
`Button.module.css:21-25` e mostra o par `outline` + `box-shadow` (com o
`outline-offset` entre eles), citando `MASTER.md:36` e `:130`.

**Erro típico:** dizer que está errado porque o `box-shadow` aparece sozinho — ele
não aparece: o `outline` está na `:22` e o offset na `:23`. Também erra quem cita
só a `:24` e conclui que o anel é o único indicador, ou quem aplica o diagnóstico
antigo de `outline: none` (esse era o código de 22/10).

## P2 — a proibição do `--color-text-tertiary`

| | |
|---|---|
| **Onde** | `design-system/MASTER.md:50-52` |
| **A proibição** | `#a3a3a3` (que é `--color-text-tertiary`, `pages/styles/variables.css:97`) sobre fundo claro **não passa** no contraste AA de 4,5:1 exigido para texto normal (`MASTER.md:48`). O `MASTER.md:50-51` diz: "usar só para placeholder e texto decorativo, nunca para informação". |
| **Onde pode** | Placeholder e texto decorativo (`MASTER.md:51`). Ícones com função precisam de ≥ 3:1 contra o fundo adjacente (`MASTER.md:51-52`). |
| **Referência de contraste** | `--color-text-primary` `#171717` sobre `#fafafa` = 15,9:1; `--color-text-secondary` `#525252` sobre `#fafafa` = 7,5:1 (`MASTER.md:48-49`) |

Resposta que acerta: diz que é proibido para **texto informativo**, e que vale para
placeholder e texto decorativo, citando `MASTER.md:50-52`.

**Erro típico:** dizer que o token pode ser usado em texto de apoio/legenda. Ou
inverter: dizer que ele "passa" porque 3:1 basta.

## P3 — os usos de `--color-text-tertiary` no `Input`

`components/UI/Input.module.css` usa o token em **três** lugares; os três são
aceitáveis. O `.helperText` **não** usa esse token — migrou para
`--color-text-secondary` (`Input.module.css:208`).

| Linha | Regra | O que o texto representa | Aceitável? |
|---|---|---|---|
| `Input.module.css:39` | `.input::placeholder` | **placeholder** | **Sim** — é o uso permitido (`MASTER.md:50-51`) |
| `Input.module.css:51` | `.input:disabled` | **texto desabilitado** | **Sim** — texto desabilitado não é informação; o contraste de texto desabilitado está fora da exigência de 4,5:1 do WCAG 2.2 SC 1.4.3. O projeto tem token próprio para isso: `--color-disabled-text` (`variables.css:115`), também `#a3a3a3` |
| `Input.module.css:104` | `.leftAddon` / `.rightAddon` (ícone dentro do campo) | **ícone decorativo** (o `pointer-events: none` em `Input.module.css:105` mostra que não é interativo) | **Sim** — o `MASTER.md:51-52` exige ≥ 3:1 só para "ícones com função"; aqui não há função |
| `Input.module.css:208` | `.helperText` | **texto de ajuda/erro** — é informação | **Sim** — usa `--color-text-secondary` (`Input.module.css:208`), 7,5:1 sobre `#fafafa` (`MASTER.md:49`); não é `--color-text-tertiary` |

Resposta que acerta: conta **três** usos de `--color-text-tertiary` no `Input`
(`Input.module.css:39`, `:51`, `:104`), aceita os três e diz que o `.helperText`
(`Input.module.css:206-209`) usa `--color-text-secondary` (`:208`), portanto não é
um quarto uso do token terciário.

**Erro típico:** dizer que o `.helperText` usa `--color-text-tertiary` e reprová-lo
(o estado de 22/10), contar quatro usos, dizer que o placeholder está proibido, ou
tratar os três usos como proibidos.

> Nota de conferência: o mesmo token aparece em `components/UI/BaseCard.module.css:130`
> (`.headerSubtitle` — também texto informativo, também reprovado pelo mesmo
> `MASTER.md:50`). A tarefa pergunta sobre o `Input`; mencionar o `BaseCard` é sinal
> de leitura atenta, não de erro — desde que não se confunda o `Input` com ele.

## O que um modelo costuma errar aqui

1. Dizer que o foco do `Button` está errado porque o `box-shadow` seria o único
   indicador, sem ver o `outline` em `Button.module.css:22`.
2. Chamar `--color-text-tertiary` de "proibido" sem a ressalva do placeholder — o
   `MASTER.md:50-51` é o texto exato, e a ressalva é o que a tarefa pergunta.
3. Citar `MASTER.md` sem linha, ou com linha do parágrafo errado (o §2 é
   o bloco normativo `MASTER.md:48-52`; as proibições do §9 são `MASTER.md:197-209`,
   com o contraste em `:207-208`).
4. Não ver que `Button.module.css:22-24` tem o par completo — o erro agora é o
   falso positivo, não a omissão do `outline`.
5. Contar quatro usos de `--color-text-tertiary` no `Input` e incluir o
   `.helperText` (`Input.module.css:208`), que usa `--color-text-secondary`.
