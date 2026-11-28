# Painel Administrativo (`/admin`) — spec de implementação (override do MASTER)

> Última atualização: 2026-11-28 (barra `Dicas` em `--color-secondary-800` com contraste `5,69:1` e empilhamento de `.statColumns` em `≤ 480px`; busca com lupa e botão limpar, `.subTabButton`/`.modalWarningBox` com `--border-radius-lg` e foco com `border-color: var(--color-primary-500)` em `AdminSales`. Anteriores: 2026-11-26 — ADR-0045; 2026-11-21 — `Gestão de Vendas`/`AdminDashboard`; 2026-11-19 — `Gestão de Vendas`; 2026-11-08 — ADR-0037).
> Override de `design-system/MASTER.md`. Tudo aqui vence o MASTER; o que não for mencionado segue o MASTER. Stack: Next.js Pages Router + React + CSS Modules + variáveis CSS (`pages/styles/variables.css`, sem Tailwind). Idioma da interface: pt-BR. Tokens: sempre a variável, nunca hex avulso.

> Escopo: o ambiente administrativo em `/admin` (`pages/admin.js`, `components/Layout/Sidebar.js`, `components/Admin/**`). Compartilha a mesma identidade visual clean, suave, minimalista e moderna do Site Público, preservando suas particularidades funcionais (navegação vertical recolhível na lateral esquerda, listagens em tabelas densas com reordenação e formulários de gestão).

## 1. Estrutura de layout e navegação lateral exclusiva (`Sidebar`)

Diferentemente do Site Público (que utiliza navegação horizontal abaixo do banner), o Painel Administrativo adota **exclusivamente** uma barra de navegação vertical posicionada na lateral esquerda (`components/Layout/Sidebar.js`, `position="left"`, `width="md"`, `persistCollapsed={true}`).

### 1.1 Modo recolhido (`72px`)
- Exibe **somente os ícones SVG** (`AppIcon`, `20px`) correspondentes às abas permitidas ao cargo do operador.
- Oculta completamente os nomes das abas e eventuais títulos auxiliares de seção (`.navLabel { display: none }`).
- Ícones alinhados em coluna única centralizada, com espaçamento vertical uniforme (`--spacing-1`) e alvo clicável mínimo de `44×44px` por item.
- Identificação imediata e acessível: cada item possui `aria-label` com o nome completo da aba e `title` nativo para tooltip discreto.
- Estado selecionado inequívoco: fundo `--color-primary-50`, ícone `--color-primary-500`, barra vertical esquerda de `3px` em `--color-primary-500` e `aria-current="page"`.

### 1.2 Modo expandido (`260px`)
- Exibe o ícone SVG (`20px`) à esquerda e o nome completo da aba à direita (`gap: var(--spacing-3)`), com `white-space: nowrap` e `text-overflow: ellipsis`.
- Tipografia `--font-size-sm` (`14px`), estado inativo em `--color-text-secondary` (`font-weight: var(--font-weight-medium)`), hover em `--color-bg-secondary` + `--color-text-primary`.
- Estado ativo em `--color-primary-50` + texto/ícone `--color-primary-500` (`font-weight: var(--font-weight-semibold)`) + marcador lateral esquerdo em `--color-primary-500`.

### 1.3 Controle de alternância e responsividade
- Botão dedicado no topo da barra lateral permite **expandir**, **recolher** e **alternar** a qualquer momento, com `aria-expanded={!collapsed}`, `aria-label` descritivo (`"Recolher menu lateral"` / `"Expandir menu lateral"`), foco visível duplo azul e persistência em `localStorage`.
- Transição suave de largura (`200ms`, `--easing-standard`), respeitando `@media (prefers-reduced-motion: reduce)`.
- **Desktop (`> 1024px`):** área principal de conteúdo fluida à direita (`flex: 1; min-width: 0`) sobre `--color-bg-secondary`, adaptando sua largura útil sem sobreposições ou cortes laterais.
- **Telas menores (`≤ 1024px`):** a barra lateral sai do fluxo fixo e opera como gaveta retrátil (`drawer`) em modo expandido legível, acionada por botão de menu superior (`44×44px`), com `overlay` semitransparente, isolamento do `<main>` via atributo `inert` quando aberta, e fechamento automático ao selecionar uma aba, clicar no `overlay` ou pressionar `Escape`.

### 1.4 Cabeçalho administrativo e subabas internas
- **Cabeçalho enxuto** no topo da área principal: `h1` único `"Painel Administrativo"` à esquerda; saudação `"Olá, {username}"` e botão destrutivo `"Sair / Logout"` à direita.
- **Subabas de 2º nível** permanecem horizontais dentro da área principal da respectiva seção:
  - **Posts/Artigos:** controle segmentado `"Posts | Categorias"`.
  - **Gestão de Vendas:** 2 subabas horizontais com `AppIcon` (`Pedidos`, `Produtos Internos`).
  - **Segurança:** 4 subabas horizontais com `AppIcon` (`Verificação de Integridade`, `Backup do Sistema`, `Rate Limiting`, `Cache do Sistema`).
  - **Usuários:** 2 subabas horizontais com `AppIcon` (`Gestão de Usuários e Admins`, `Gestão de Cargos`), sem cartão `max-width: 1000px` duplicado.

## 2. Ícones vetoriais (`AppIcon`)

Proibido emoji como ícone em abas, subabas, cartões de métrica, tabelas, selos de status ou botões de ação. Todos usam `AppIcon` (`components/UI/icons.js`, `viewBox="0 0 24 24"`, `stroke="currentColor"`, `strokeWidth="2"`, `aria-hidden="true"`, `focusable="false"`):
- **11 abas principais:** `chart` (Visão Geral), `fileText` (Posts/Artigos), `music` (Gestão de Músicas), `video` (Gestão de Vídeos), `package` (Gestão de Produtos), `shoppingBag` (Gestão de Vendas), `lightbulb` (Gestão de Dicas), `palette` (Configuração de Cabeçalho), `lock` (Segurança), `users` (Usuários), `history` (Auditoria).
- **Ações e estados:** `zap` (Puxar Dados / Cache), `refresh` (Atualizar), `download` (Realizar Backup Agora / Exportar), `search` (Busca), `close` (Limpar busca), `checkCircle` (Publicado / Saudável / Sucesso), `fileText` / `clock` (Rascunho / Histórico), `alertTriangle` / `xCircle` (Avisos / Erros), `externalLink` (Abrir no Spotify / Abrir no YouTube).

## 3. Hierarquia semântica de botões e arredondamentos

- **Raios:** `--border-radius-lg` (`8px`) em todos os botões, inputs, selects, textareas, campos de busca e itens de navegação; `--border-radius-xl` (`12px`) em cartões de métricas, painéis principais, containers de formulário/preview e modais; `--border-radius-md` (`6px`) em miniaturas `60×60px`; `--border-radius-full` em selos/badges e botão circular de limpar busca.
- **Hierarquia unificada de botões:**
  - **Primário (`--color-primary-500`, hover `--color-hover-primary`, texto `--color-text-inverse`):** ação principal da seção (`+ Novo ...`, `Salvar`, `Cadastrar ...`, `Salvar Configurações`, `Recortar & Confirmar`, `Realizar Backup Agora`).
  - **Secundário (`--color-bg-primary` / `--color-bg-secondary`, borda `1px solid var(--color-border-light)`, texto `--color-text-primary`, hover `--color-bg-tertiary` + `--color-border-default`):** ações auxiliares e neutras (`Cancelar`, `Exportar CSV`, `Atualizar`, `Escolher arquivo`, `Atualizar Imagem`, `Upload`, `Adicionar imagem`, `Puxar Dados`, `Editar` em linha e paginação `Anterior` / `Próxima`).
  - **Perigo (`--color-error-500`, hover `--color-error-600`, texto `--color-text-inverse`):** ações destrutivas ou de encerramento (`Excluir`, `Limpar Cache Redis`, `Sair / Logout`).
- **Foco visível obrigatório:** `outline: 2px solid var(--color-focus-primary); outline-offset: 2px; box-shadow: var(--color-focus-ring);` em todo botão, aba, link, input e select.

## 4. Barras de pesquisa, tabelas e cartões administrativos

- **Busca administrativa (`AdminCrudBase`, `AdminAudit`):** wrapper relativo em CSS Module com ícone `AppIcon name="search"` à esquerda, altura `40px–44px`, fundo `--color-bg-primary`, borda `1px solid var(--color-border-light)`, raio `--border-radius-lg` (`8px`), botão interno `×` (`aria-label="Limpar busca"`) quando preenchido e anel de foco duplo azul. Zero estilos inline em inputs de busca.
- **Tabelas (`CrudTable`, `AdminAudit`):** superfície `--color-bg-primary`, cabeçalho `--color-bg-secondary` (`--color-text-secondary`, `semibold`), borda `--color-border-light`, hover suave por linha, rolagem horizontal segura (`overflow-x: auto`) e cabeçalho `sticky` na Auditoria.
- **Cartões de métricas e ferramentas (`AdminDashboard`, `IntegrityCheck`, `BackupManager`, `CacheManager`, `RateLimitViewer`):** superfície `--color-bg-primary`, borda `1px solid var(--color-border-light)`, raio `--border-radius-xl` (`12px`), elevação discreta `translateY(-3px)` quando interativos e cores de feedback exclusivamente pelos tokens `--color-success-*`, `--color-warning-*`, `--color-error-*` e `--color-info-*` de `pages/styles/variables.css`. Em `AdminDashboard` (`components/Admin/styles/dashboard.module.css`), são exibidos até 8 cartões interativos e 8 barras horizontais na Distribuição de Conteúdo (Artigos, Músicas, Vídeos, Produtos, Gestão de Vendas, Produtos Internos, Dicas, Usuários), respeitando as permissões do cargo e usando tokens AA (`--color-info-700` para Gestão de Vendas, `--color-warning-800` para Produtos Internos e `--color-secondary-800` para Dicas, contraste `5,69:1` sobre `--color-text-inverse`). O cartão **Gestão de Vendas** usa `.statCardWide` (`grid-column: span 2` acima de `640px`, passando a 1 coluna com `flex-direction: column` em `≤ 640px`) e `.statColumns` para exibir **Pagamento** e **Andamento** lado a lado separados por traço vertical (`--color-border-default`); em `≤ 480px`, `.statColumns` empilha em `1fr` com divisória horizontal (`border-top`).

## 5. Gestão de Vendas (`AdminSales` — `components/Admin/styles/AdminSales.module.css`)

- **Subabas horizontais (`.subTabsBar`):** 2 abas (`Pedidos` com ícone `shoppingBag` e `Produtos Internos` com ícone `package`) usando `.subTabButton` / `.subTabButtonActive` (`min-height: 44px`, raio `--border-radius-lg`, borda `--border-width-1`, transição por `--transition-background`, `--transition-color`, `--transition-border` e foco duplo azul).
- **Cabeçalho de `Pedidos Internos`:** usa `crudStyles.sectionHeader` com `crudStyles.headerMeta` + `salesStyles.ordersHeaderMeta` + `salesStyles.ordersSubtitle` à esquerda e `salesStyles.ordersHeaderActions` à direita com `<Button variant="secondary" size="md" className={salesStyles.headerActionButton}>` para `Sincronizar MP` (`AppIcon name="refresh"`), `Expirar vencidos` (`AppIcon name="clock"`) e `Exportar CSV` (`AppIcon name="download"`), envolvendo ícone e texto em `salesStyles.buttonLabel` (`gap: var(--spacing-2)`, mantendo a largura exata no estado `loading`), com empilhamento fluido em 100% de largura e alvo `min-height: 44px` em `≤ 640px`.
- **Barra de filtros (`.filtersRow`):** superfície `--color-bg-primary`, borda `--border-width-1` `--color-border-light`, raio `--border-radius-lg`, `.searchWrapper` com `AppIcon name="search"` à esquerda e botão limpar `×` (`aria-label="Limpar busca"`, `AppIcon name="close"`) quando preenchido, `.searchInput` (`min-width: 240px`) e `.filterSelect` com `min-height: 44px`, raio `--border-radius-lg` (`8px`), borda `--color-primary-500` e foco duplo azul.
- **Selos de status de pagamento e andamento (`.badge`):** pill `--border-radius-full`, `--font-size-xs`, `semibold`, usando exclusivamente tokens canônicos: `.badgeApproved` (`--color-success-50`/`-800`/`-200`), `.badgePending` (`--color-warning-50`/`-800`/`-200`), `.badgeRejected` (`--color-error-50`/`-800`/`-200`) e `.badgeInfo` (`--color-info-50`/`-800`/`-200`).
- **Campos, tabela e modal sem estilo inline:** `ShippingTypeSelect` usa `.fieldWrapper`, `.fieldLabel` e `.fieldHint` (com `--color-text-secondary` para contraste AA); a tabela e suas mensagens de estado usam `.ordersTableContainer` e `.ordersStatusMessage`; os controles do modal de atualização logística aplicam `.fullWidthControl`, `.modalWarningBox` (`--border-radius-lg`, `needs_manual_refund`) e, quando elegível ao estorno pela Orders API, `.refundOptionBox` (`--color-warning-50`/`-200`/`-900`, `--border-radius-lg`) com `.refundCheckboxLabel`, `.refundCheckbox` (foco duplo azul em `:focus-visible`) e `.refundOptionHint`.
