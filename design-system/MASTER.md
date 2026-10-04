# Caminhar — Design System (MASTER)

> Fonte de verdade global de UI/UX do projeto. Gerado com a skill `ui-ux-pro-max`
> (`--design-system`: estilo **Minimalism & Swiss**, par editorial **Newsreader + Roboto**,
> buscas de `ux` para autenticação acessível e validação com resumo de erros) e
> **reconciliado com os tokens reais do repositório** (`pages/styles/variables.css`,
> `components/UI/*.module.css`). Em caso de conflito, **os tokens do repositório vencem**
> — a skill indica direção, o CSS existente é o contrato.
> Overrides por página vivem em `design-system/pages/<pagina>.md` e vencem este arquivo.
> Stack: Next.js 16 (Pages Router) + React 19, **CSS Modules + variáveis CSS**. O projeto
> **não usa Tailwind** — não especificar classes utilitárias.

## 1. Direção visual

Conteúdo católico, tom acolhedor e confiável, estética editorial limpa: muito espaço em
branco, hierarquia tipográfica clara, geometria simples, micro-interações sutis
(150–300 ms). Superfícies claras (`--color-bg-primary` sobre `--color-bg-secondary`),
texto quase-preto, um azul como ação principal e dourado como detalhe secundário.
Efeitos especiais (grain, cursor customizado, parallax) são **não-autorizados** por padrão.

## 2. Cores (tokens canônicos — usar sempre a variável, nunca o hex)

| Papel | Token | Hex |
|---|---|---|
| Ação principal | `--color-primary-500` | `#2563eb` |
| Ação hover / ativa | `--color-hover-primary` / `--color-active-primary` | `#1d4ed8` / `#1e40af` |
| Secundária (dourado, detalhes) | `--color-secondary-500` | `#d4af37` |
| Fundo página / superfície / terciário | `--color-bg-secondary` / `--color-bg-primary` / `--color-bg-tertiary` | `#f5f5f5` / `#fafafa` / `#e5e5e5` |
| Texto primário / secundário / terciário / inverso | `--color-text-primary` / `-secondary` / `-tertiary` / `-inverse` | `#171717` / `#525252` / `#a3a3a3` / `#fafafa` |
| Link / link hover | `--color-text-link` / `--color-text-link-hover` | `#2563eb` / `#1d4ed8` |
| Borda clara / padrão | `--color-border-light` / `--color-border-default` | `#e5e5e5` / `#d4d4d4` |
| Erro fundo / borda / texto | `--color-error-50` / `--color-error-200` / `--color-error-500` (–600 hover) | `#fef2f2` / `#fecaca` / `#ef4444` |
| Sucesso | `--color-success-500` (texto escuro `--color-success-800`) | `#10b981` (`#065f46`) |
| Aviso / info | `--color-warning-500` / `--color-info-500` | `#f59e0b` / `#3b82f6` |
| Foco (anel duplo, norma §7) | `outline: 2px solid var(--color-focus-primary)` + `box-shadow: var(--color-focus-ring)` | `#2563eb` / `#bfdbfe` |
| Desabilitado | `--color-disabled-background` / `--color-disabled-text` | `#e5e5e5` / `#a3a3a3` |

Nota normativa de foco: `--color-focus-ring` sozinho tem contraste de 1,36:1 sobre
`#fafafa` e **não** serve como único indicador (WCAG 2.2 SC 1.4.11 exige ≥ 3:1 para
indicador de foco). Todo foco visível combina `outline: 2px solid
var(--color-focus-primary)` (`#2563eb`, 4,95:1 sobre `#fafafa`) com o `box-shadow`
como halo complementar — nunca um sem o outro, nunca `outline: none` seco. Exceção
única: campo com erro de validação usa `outline: 2px solid var(--color-error-500)`
(anel na cor do estado — ≈ 3,6:1 sobre claro, passa em 3:1 — em vez de azul sobre
vermelho); ver §7 Campo.

Pares com contraste AA verificado (texto normal ≥ 4.5:1): `#171717` sobre `#fafafa`
(15.9:1); `#525252` sobre `#fafafa` (7.5:1); `#fafafa` sobre `#2563eb` (5.2:1);
`#991b1b` (`--color-error-800`) sobre `#fee2e2`. `#a3a3a3` sobre claro **não passa** —
usar só para placeholder e texto decorativo, nunca para informação. Ícones com função
precisam de ≥ 3:1 contra o fundo adjacente.

## 3. Tipografia

- Display/títulos: `--font-family-display` (`"Playfair Display"`, Georgia, serif).
  Corpo/UI: `--font-family-body` (`"Inter"`, sistema, Roboto, sans-serif).
  Mono: `--font-family-mono`. (O par Newsreader + Roboto da skill fica como alternativa
  aprovada só para texto editorial longo, mediante override de página — não instalar
  novas fontes sem decisão registrada.)
- Escala: `--font-size-xs` 12 · `sm` 14 · `base` 16 · `lg` 18 · `xl` 20 · `2xl` 24 ·
  `3xl` 30 · `4xl` 36 (títulos de página/autenticação usam `2xl`–`3xl` no mobile).
- Pesos: `normal` 400 (corpo), `medium` 500 (labels, botões), `semibold` 600 e `bold` 700
  (títulos). Linha: corpo `--line-height-relaxed` 1.625, títulos `tight` 1.25.
- Regras: um nível de título por seção (`h1` único por página); labels sempre visíveis
  acima do campo (placeholder nunca é label); medida confortável de leitura; sem caixa
  alta integral em frases.

## 4. Espaçamento

Escala base `--spacing-*` (0 · 1=4px · 1.5=6px · 2=8px · 2.5=10px · 3=12px · 4=16px ·
5=20px · 6=24px · 8=32px · 10=40px · 12=48px · 16=64px · 20+=80px…). Priorizar múltiplos
de 4px. Atalhos semânticos: `--space-xs` 8 · `sm` 12 · `md` 16 · `lg` 24 · `xl` 32 ·
`2xl` 48; seções `--section-sm` 48 · `md` 64 · `lg` 96; gaps `--gap-md` 16/`lg` 24;
botão `--padding-button-md/lg`; input `--padding-input-md/lg`; card
`--padding-card-md` 24/`lg` 32; container `--padding-container-md` 24/`lg` 32.

## 5. Forma, profundidade e movimento

- Raios: campos e botões `--border-radius-lg` 8px (cartões de autenticação
  `--border-radius-xl` 12px); pill só em badges `--border-radius-full`.
- Bordas: `--border-width-1` 1px em `--color-border-light`; erro em
  `--color-error-500`. Sombras: card `--shadow-md`, hover de botão
  `--shadow-buttonHover`, foco de input `--shadow-inputFocus`; nunca sombra colorida
  fora de `--shadow-glow*`.
- Durações `--duration-normal` 150ms / `moderate` 200ms / `slow` 300ms, easing
  `--easing-standard`; usar `--transition-background`, `--transition-border`,
  `--transition-all` (botões/inputs). Entradas de erro com fade+deslize de 300ms.
- `prefers-reduced-motion: reduce` **obrigatório**: desligar transições, animações
  (spinner vira indicador estático com texto) e qualquer deslocamento.

## 6. Breakpoints e responsividade (mobile-first)

`--breakpoint-sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 · `2xl` 1536;
containers `--container-*` equivalentes. Regra: desenhar em 375px primeiro; mira de
toque ≥ 44×44px; gutter de 16px no mobile, 24–32px no desktop; verificar
375 / 768 / 1024 / 1440 e orientação paisagem.

## 7. Componentes-base (reutilizar `components/UI/*.module.css`, não reinventar)

- **Botão** (`Button.module.css`): variantes `primary` (fundo `--color-primary-500`,
  texto `--color-text-inverse`, hover `--color-hover-primary` + `--shadow-buttonHover`,
  active `--color-active-primary` + desloca 1px), `secondary`, `ghost`, `danger`,
  `success`; tamanhos `sm` 32 · `md` 40 · `lg` 48 · `xl` 56; `fullWidth`; foco visível
  via `:focus-visible` com a declaração exata `outline: 2px solid var(--color-focus-primary); outline-offset: 2px; box-shadow: var(--color-focus-ring);` (o `outline` é o indicador que passa em 3:1; o `box-shadow` é halo complementar — nunca um sem o outro, nunca `outline: none` seco); desabilitado com
  `opacity: var(--opacity-50)` + `cursor: not-allowed`; loading com spinner absoluto
  e conteúdo oculto por opacidade (layout não muda).
- **Campo** (`Input.module.css`): `wrapper` em coluna com `gap: var(--spacing-1_5)`;
  `label` 14px `medium` em `--color-text-primary` + `*` obrigatório em
  `--color-error-500`; `input` altura 40 (`md`) / 48 (`lg`), borda 1px
  `--color-border-light`, raio 12px; foco válido com borda `--color-primary-500` mais
  a declaração exata de foco do Botão (`outline: 2px solid var(--color-focus-primary);
  outline-offset: 2px; box-shadow: var(--color-focus-ring);` — substitui o anel
  `rgba(37,99,235,.1)` pelo halo tokenizado); campo inválido com borda
  `--color-error-500` + halo vermelho existente, e **foco inválido com `outline: 2px
  solid var(--color-error-500); outline-offset: 2px;`** (anel na cor do estado, nunca
  azul sobre vermelho); a regra combinada desmembra-se — sem foco, o inválido segue
  só com borda + halo, sem `outline`. O `outline: none` da base do input é permitido
  porque cada `:focus` repõe o indicador. Erro com `.errorMessage` 12px em `--color-error-500` ligada por `aria-describedby`;
  desabilitado em `--color-bg-secondary`.
- **Cartão**: fundo `--color-bg-primary`, raio `--border-radius-xl`, sombra
  `--shadow-md`, padding 24 mobile / 32–40 desktop.
- **Feedback**: erro de formulário em bloco com fundo `--color-error-50`, borda
  `--color-error-200`, texto `--color-error-800/--color-error-500`, `role="alert"`;
  foco programático com a declaração exata de foco do Botão em `:focus` (não
  `:focus-visible`, pois o foco é movido via código; o `outline` azul tem 4,72:1
  sobre o fundo `--color-error-50`, então passa em 3:1 também aqui); sucesso pontual via
  `react-hot-toast` (já configurado em `_app.js`).
- **Ícones**: SVG vetorial de família única e consistente (traço uniforme), nunca emoji
  como ícone; decorativo com `aria-hidden="true"`, controle só-ícone com `aria-label`
  e estado (`aria-pressed`) anunciado.

## 8. Formulários e autenticação (regras duras)

Labels associados (`htmlFor`/`id`); `autocomplete="username"` /
`autocomplete="current-password"`; **permitir colar** (nada de `onpaste.preventDefault`,
para gestores de senha); validar no `blur` + no submit, nunca só no submit; cada campo
inválido com erro inline específico; formulário com 2+ erros usa **resumo de erros no
topo** (`role="alert"`, `tabindex="-1"`, foco movido para ele após submit falho, itens
linkados aos campos); cor nunca é o único indicador (ícone + texto); foco do teclado
nunca fica escondido atrás de sticky/overlay; alvos ≥ 44px.

## 9. Anti-padrões (não fazer)

Hex fora dos tokens; novas fontes ou pesos sem override; Tailwind ou estilo inline no
lugar de CSS Modules; bordas/arredondamentos/sombras arbitrários; emoji como ícone ou
indicador de estado; bloquear colar no login; validar só no submit; toast como único
relato de erro; foco invisível ou removido (`outline: none` sem o par `outline` +
halo do §7 — o `outline: none` da base do input é permitido porque cada `:focus`
repõe o indicador); usar só `box-shadow: var(--color-focus-ring)` como único indicador de
foco (1,36:1 sobre claro, não passa em WCAG 2.2 SC 1.4.11);
animação sem `reduced-motion`; texto informativo em contraste < 4.5:1; dois `h1`;
CTA genérico ("Clique aqui"); lógica de negócio dentro de arquivos de estilo.

## 10. Checklist de pré-entrega

Contraste AA (texto 4.5:1, não-texto 3:1); foco visível em todo interativo com o
par do §7 (`outline: 2px solid var(--color-focus-primary)` + halo — o indicador
passa em 3:1; no campo com erro, `outline` em `--color-error-500`);
`prefers-reduced-motion` testado; 375/768/1024/1440 + paisagem; ordem de foco =
ordem visual; erros com `aria-describedby` e resumo focável; toque ≥ 44px; sem emoji
como ícone; sem token novo fora de `variables.css`; testes existentes continuam
passando. Como ler: este MASTER + `design-system/pages/<pagina>.md` quando existir
(o override vence).
