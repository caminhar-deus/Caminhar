# Gabarito — papel do `designer` (conformidade de foco e contraste)

Conferido no código em 19/10/2026. **Nenhum modelo sob teste pode ler este arquivo.**

A fonte da verdade normativa é `design-system/MASTER.md`. O contrato concreto são os
tokens de `pages/styles/variables.css` e os componentes em `components/UI/`.

## P1 — o foco do `Button` NÃO está conforme

| | |
|---|---|
| **Onde** | `components/UI/Button.module.css:21-24` — a regra `.button:focus-visible` |
| **O que está errado** | A regra faz `outline: none` (`:22`) e deixa **só** `box-shadow: var(--color-focus-ring)` (`:23`) como indicador. O `MASTER.md` proíbe exatamente isso: usar só o `box-shadow` do anel como único indicador de foco, porque o anel tem 1,36:1 sobre claro e não passa em WCAG 2.2 SC 1.4.11 (`MASTER.md:149-150`). |
| **A regra que a proíbe** | `MASTER.md:149-150` — "usar só `box-shadow: var(--color-focus-ring)` como único indicador de foco (1,36:1 sobre claro, não passa em WCAG 2.2 SC 1.4.11)". E `MASTER.md:147-148`: "foco invisível ou removido (`outline: none` sem o par `outline` + halo do §7)". |
| **A declaração correta** | O par do §7: `outline: 2px solid var(--color-focus-primary)` + `box-shadow` do halo (`MASTER.md:35`, e a declaração exata em `MASTER.md:104` e `MASTER.md:111-112`). O `outline` é o indicador que passa em 3:1; o `box-shadow` é halo complementar — nunca um sem o outro, nunca `outline: none` seco. |
| **Tokens envolvidos** | `--color-focus-primary` = `#2563eb` (4,95:1 sobre `#fafafa`) e `--color-focus-ring` = `#bfdbfe` (`MASTER.md:35`) |

Resposta que acerta: identifica `Button.module.css:21-24`, diz que **não** está
conforme, nomeia a proibição de `MASTER.md:149-150` (ou `:147-148`), e dá o par
`outline` + `box-shadow` como correção.

**Erro típico:** dizer que `outline: none` está permitido (o `MASTER.md:148` só
permite o `outline: none` da **base do input**, que é reposto pelo `:focus` de cada
campo — não é o caso do botão, cujo `:focus-visible` é o único indicador). Ou
aceitar o `box-shadow` sozinho.

## P2 — a proibição do `--color-text-tertiary`

| | |
|---|---|
| **Onde** | `design-system/MASTER.md:49-51` |
| **A proibição** | `#a3a3a3` (que é `--color-text-tertiary`, `pages/styles/variables.css:95`) sobre fundo claro **não passa** no contraste AA de 4,5:1 exigido para texto normal. O `MASTER.md:50` diz: "usar só para placeholder e texto decorativo, nunca para informação". |
| **Onde pode** | Placeholder e texto decorativo (`MASTER.md:50`). Ícones com função precisam de ≥ 3:1 contra o fundo adjacente (`MASTER.md:51`). |
| **Referência de contraste** | `--color-text-primary` `#171717` sobre `#fafafa` = 15,9:1; `--color-text-secondary` `#525252` sobre `#fafafa` = 7,5:1 (`MASTER.md:48-49`) |

Resposta que acerta: diz que é proibido para **texto informativo**, e que vale para
placeholder e texto decorativo, citando `MASTER.md:49-51`.

**Erro típico:** dizer que o token pode ser usado em texto de apoio/legenda. Ou
inverter: dizer que ele "passa" porque 3:1 basta.

## P3 — os usos de `--color-text-tertiary` no `Input`

`components/UI/Input.module.css` usa o token em **quatro** lugares, e eles **não** são
todos a mesma coisa. Cada uso precisa de um veredito separado:

| Linha | Regra | O que o texto representa | Aceitável? |
|---|---|---|---|
| `Input.module.css:39` | `.input::placeholder` | **placeholder** | **Sim** — é o uso permitido (`MASTER.md:50`) |
| `Input.module.css:49` | `.input:disabled` | **texto desabilitado** | **Sim** — texto desabilitado não é informação; o contraste de texto desabilitado está fora da exigência de 4,5:1 do WCAG 2.2 SC 1.4.3. O projeto tem token próprio para isso: `--color-disabled-text` (`variables.css:113`), também `#a3a3a3` |
| `Input.module.css:102` | `.leftAddon` / `.rightAddon` (ícone dentro do campo) | **ícone decorativo** (o `pointer-events: none` em `:103` mostra que não é interativo) | **Sim** — o `MASTER.md:51` exige ≥ 3:1 só para "ícones com função"; aqui não há função |
| `Input.module.css:167` | `.helperText` | **texto de ajuda/erro** — é informação | **Não** — `.helperText` carrega a mensagem de erro do campo, e `MASTER.md:50` proíbe `--color-text-tertiary` para informação |

Resposta que acerta: separa os três usos permitidos (placeholder, desabilitado,
ícone decorativo) do **quarto**, o `.helperText`, que é o que viola
`MASTER.md:50` — porque a mensagem de erro é informação.

**Erro típico:** dizer que todo uso de `--color-text-tertiary` é proibido (o
`MASTER.md:50` permite placeholder e decorativo), dizer que o placeholder está
proibido, ou não notar o `.helperText` de `Input.module.css:167` — que é a linha
que reprova o uso.

> Nota de conferência: o mesmo token aparece em `components/UI/BaseCard.module.css:129`
> (`.headerSubtitle` — também texto informativo, também reprovado pelo mesmo
> `MASTER.md:50`). A tarefa pergunta sobre o `Input`; mentionar o `BaseCard` é sinal
> de leitura atenta, não de erro.

## O que um modelo costuma errar aqui

1. Aceitar o `box-shadow` sozinho como indicador de foco, porque o `MASTER.md`
   menciona `--color-focus-ring` mais de uma vez sem repetir que ele é **halo**.
2. Chamar `--color-text-tertiary` de "proibido" sem a ressalva do placeholder — o
   `MASTER.md:50` é o texto exato, e a ressalva é o que a tarefa pergunta.
3. Citar `MASTER.md` sem linha, ou com linha do parágrafo errado (o §2 é
   `MASTER.md:21-51`; as proibições do §9 são `MASTER.md:142-152`).
4. Não ver que `Button.module.css:23` usa **só** o anel — é a linha que faz a
   regra estar errada.
5. Contar só três usos de `--color-text-tertiary` no `Input` e deixar o
   `.helperText` (`Input.module.css:167`) de fora.
