# Área do Visitante (`/entrar`, `/minha-conta`, `/checkout/[id]`) — spec de implementação (override do MASTER)

> Última atualização: 2026-11-28 (unificação dos raios de `.backLink`, `.modeTabButton`, `.input`, `.select` e `.paymentMethodOption` em `--border-radius-lg` e foco com `border-color: var(--color-primary-500)`. Anteriores: 2026-11-26 — ADR-0045; 2026-11-19 — ADR-0037 e ADR-0042).
> Override de `design-system/MASTER.md`. Tudo aqui vence o MASTER; o que não for mencionado segue o MASTER. Stack: Next.js Pages Router + React + CSS Modules (`pages/styles/CustomerPages.module.css`) + variáveis CSS (`pages/styles/variables.css`, sem Tailwind). Idioma da interface: pt-BR. Tokens: sempre a variável, nunca hex avulso.

> Escopo: rotas públicas dedicadas à conta do visitante (`pages/entrar.js`, `pages/minha-conta.js`) e ao checkout transparente de venda interna (`pages/checkout/[id].js`), isoladas da rota administrativa `/login`.

## 0. Base compartilhada (`CustomerPages.module.css`)

- **Superfície externa (`.pageWrapper`):** altura mínima `100vh`, fundo `--color-bg-secondary` (`#f5f5f5`), padding `--spacing-8` vertical e `--spacing-4` horizontal.
- **Containers:** `.narrowCard` (`max-width: 480px`) para `/entrar`; `.container` (`max-width: var(--container-xl)`) para `/minha-conta` e `/checkout/[id]`.
- **Barra superior (`.topBar`):** `display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-4); flex-wrap: wrap;` com `.backLink` (`min-height: 44px`, raio `--border-radius-lg`, `AppIcon name="chevronLeft"`, foco duplo azul).
- **Cabeçalhos internos:** `.pageTitle` (`h1` único da página, `--font-size-2xl`, `bold`, `--color-text-primary`) e `.pageSubtitle` (`--font-size-sm`, `--color-text-secondary`, `--line-height-relaxed`).
- **Cartões de seção (`.sectionCard`):** fundo `--color-bg-primary`, borda `--border-width-1` `--color-border-light`, raio `--border-radius-xl` (`12px`), padding `--spacing-6` (`--spacing-5` em `≤ 640px`), sombra `--shadow-sm`.
- **Formulários e foco:** labels visíveis (`.label`, `--font-size-sm`, `semibold`), campos `.input`/`.select` (`min-height: 44px`, raio `--border-radius-lg`, borda `--color-border-default`, `--font-size-base`), `border-color: var(--color-primary-500)` + foco duplo azul obrigatório (`outline: 2px solid var(--color-focus-primary); outline-offset: 2px; box-shadow: var(--color-focus-ring);`).
- **Alertas semânticos:** `.alertError`, `.alertInfo`, `.alertSuccess`, `.alertWarning` usando tokens `-50` (fundo), `-800` (texto) e `-200` (borda). Zero `style={{` inline de layout: utilitários de margem e destaque vivem em `.mt3`, `.mt4`, `.mt6` e `.summaryProductName`.

## 1. Acesso e Cadastro (`/entrar` — `pages/entrar.js`)

- **Alternância de modo (`.modeTabs`):** `role="tablist"` com 2 abas (`Já tenho conta` / `Criar conta`) em `.modeTabButton` / `.modeTabButtonActive` (`min-height: 44px`, ativo em `--color-primary-50`, `--color-primary-700`, borda `--color-primary-600`, foco duplo azul).
- **Ação primária:** `<Button variant="primary" size="lg" fullWidth loading={submitting}>`.
- **Sign in with Google (GIS — `accounts.google.com/gsi/client`):**
  - Separador `.divider` (`"ou"`) exibido quando `googleStatus !== 'unconfigured'`.
  - Contêiner `.googleSection` centralizado; `.googleButtonHost` (`min-height: 44px`, largura `100%`) recebe o botão oficial renderizado por `google.accounts.id.renderButton` com largura calculada por `resolveGoogleButtonWidth` no intervalo `200px–400px` (fallback `200px–360px` conforme `window.innerWidth`, ou `320px`).
  - Estado carregando/submissão: `.googleButtonHostDisabled` (`pointer-events: none; opacity: var(--opacity-50)`) e texto `.googleLoadingText` (`role="status"`).
  - Quando não configurado ou em erro: host oculto via `.googleButtonHostHidden`; em erro de carregamento do script, exibe aviso com botão de retry `.googleButton` (`min-height: 44px`, foco duplo azul).

## 2. Consulta de Compras (`/minha-conta` — `pages/minha-conta.js`)

- **Cabeçalho de seção (`.sectionHeaderRow`):** `h2` `"Minhas Compras Internas"` alinhado à esquerda e botão secundário `"Atualizar status"` (`AppIcon name="refresh"`) à direita; botão `"Sair da conta"` (`AppIcon name="logout"`) no `.topBar`.
- **Cartão de pedido (`.orderCard`):** fundo `--color-bg-secondary`, borda `--color-border-light`, raio `--border-radius-lg`, padding `--spacing-5`.
- **Selos de status (`.badgeGroup` + `.statusBadge`):** dois selos independentes (status do pagamento e andamento do pedido) mapeados para `.badgeSuccess`, `.badgeWarning`, `.badgeError` e `.badgeInfo` (`--border-radius-full`, `--font-size-xs`, `semibold`, tokens `-50`/`-800`/`-200`).
- **Grade de detalhes (`.orderDetailsGrid`):** `repeat(auto-fit, minmax(200px, 1fr))` com gap `--spacing-3`; textos auxiliares em `.helperText` (`--color-text-secondary`, nunca `--color-text-tertiary`).
- **Instruções pendentes:** bloco `.pixBox` com `.qrImage` (`200×200px`), `.codeBox` (`--font-family-mono`, `--font-size-xs`) e link externo normalizado via `normalizeMercadoPagoTicketUrl`.

## 3. Checkout Transparente (`/checkout/[id]` — `pages/checkout/[id].js`)

- **Grade principal (`.checkoutGrid`):** duas colunas em desktop (`1.5fr 1fr`, gap `--spacing-6`, coluna esquerda com endereço + pagamento, `<aside>` direito com resumo sticky/alinhado ao topo).
- **Meios de pagamento (`.paymentMethodGrid`):** `repeat(2, 1fr)`, opções `.paymentMethodOption` / `.paymentMethodOptionActive` (`role="radio"`, `min-height: 48px`, `AppIcon`, foco duplo azul). Quando `NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD` está definida como `'false'`/`'0'`, a opção `Cartão de débito` é omitida e a seleção permanece em `PIX`; quando habilitada e selecionada, exibe aviso discreto `.alertInfo` + `.mt3` sobre habilitação comercial do emissor/recebedor e suporte a pré-pago.
- **Aviso de valor mínimo:** `.alertWarning` + `.mt3` com ação secundária rápida para ajustar quantidade mínima exigida pelo Mercado Pago.
- **Resumo do pedido:** `.summaryProductName`, linhas `.summaryRow`, linha final `.summaryTotal` com borda superior `--color-border-light`, alerta de erro `.alertError` + `.mt4` e CTA primário `"Confirmar e Pagar"` dentro de `.mt6`.
- **Pós-submissão:** exibe feedback semântico por status, `.pixBox` (QR Code PIX / linha digitável de boleto + cópia em `.actionRow`), reconciliação ativa com botão `"Verificar pagamento agora"` e recuperação `"Tentar outro meio de pagamento"` em falha.

## 4. Responsividade

- **`≤ 768px`:** `.checkoutGrid`, `.formGrid` e `.paymentMethodGrid` colapsam para `1fr`; `.formGroupFull` passa a `grid-column: span 1`.
- **`≤ 640px`:** `.narrowCard` reduz padding para `--spacing-6` e `.sectionCard` reduz para `--spacing-5`.
