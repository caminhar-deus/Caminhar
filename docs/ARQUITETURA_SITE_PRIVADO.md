# ARQUITETURA DO SITE — ÁREA PRIVADA (PAINEL ADMINISTRATIVO)

> Escopo: painel administrativo em `/admin` (acesso só com login). A área pública está em `docs/ARQUITETURA_SITE_PUBLICO.md`. Ambos os ambientes compartilham a mesma identidade visual (`design-system/MASTER.md` e `pages/styles/variables.css`), mantendo estruturas de navegação e responsabilidades próprias.
> Fonte: 23 capturas de tela do painel (`localhost:3000/admin`) + código-fonte atual + diretrizes do dono do projeto.
> Última atualização: 2026-11-07
> Legenda: [PLANEJADO] = alvo ainda não implementado, informado pelo dono | [OBSERVADO] = visto nas imagens/estado legado | [HIPÓTESE] = inferido, confirmar antes de assumir.

---

## 1. Visão geral

- **Nome:** Painel Administrativo do "O Caminhar com Deus".
- **URL e tecnologia:** `/admin` (`pages/admin.js`, Next.js Pages Router). Todas as telas e abas mantêm a mesma URL, com navegação interna controlada no cliente; sessões não autenticadas são redirecionadas para `/login?next=/admin`.
- **Autenticação:** sessão logada via JWT em cookie `httpOnly`. O cabeçalho administrativo exibe saudação ao operador ("Olá, **admin**") e ação destrutiva "Sair / Logout".
- **Autorização:** por cargos (roles) com permissões por aba (seção 6). Cada uma das 10 abas principais corresponde a uma permissão; abas sem permissão não são exibidas nem acessíveis na API.
- **Infraestrutura vista na aba Segurança:** armazenamento de arquivos para uploads, backups criptografados (`.sql.gz.enc`), rate limiting por IP e log de auditoria. Banco de dados e cache: ver `docs/ARQUITETURA_SITE_PUBLICO.md` §1.
- **Layout:** [PLANEJADO] interface administrativa estruturada com **barra de navegação vertical recolhível na lateral esquerda** (§2.2) + cabeçalho enxuto e área principal fluida à direita sobre fundo neutro claro (`--color-bg-secondary`), aproveitando adequadamente o espaço horizontal para tabelas e formulários. ([OBSERVADO] Estado atual no código: cartão branco central de `max-width: 1000px` com abas horizontais quebrando em 3 linhas — ver §8, item 17.)

### 1.1 Identidade visual e padrões de interface (alinhamento com o Site Público)

O Site Privado compartilha integralmente a identidade visual definida com o Site Público (`docs/ARQUITETURA_SITE_PUBLICO.md` §1.1): proposta **clean, suave, minimalista, moderna, organizada e intuitiva**, ancorada nos tokens de `pages/styles/variables.css` e nas regras de `design-system/MASTER.md`. Diferenças em relação ao ambiente público existem apenas onde justificadas pela natureza operacional do painel (navegação lateral recolhível, listagens em tabelas densas com reordenação e formulários de gestão).

1. **Cores e semântica:**
   - **Superfícies e bordas:** fundo da aplicação em `--color-bg-secondary` (`#f5f5f5`); barra lateral, cabeçalho, cartões de métrica, tabelas e campos em `--color-bg-primary` (`#fafafa`); cabeçalhos de tabela, áreas de formulário em destaque sutil e hover neutro em `--color-bg-secondary` / `--color-bg-tertiary` (`#e5e5e5`); bordas em `--color-border-light` (`#e5e5e5`) e `--color-border-default` (`#d4d4d4`).
   - **Identidade e estados:** azul primário `--color-primary-500` (`#2563eb`, realce `--color-primary-50`) para aba selecionada, ações principais, links e foco; sucesso/Publicado em `--color-success-500` (badge em `--color-success-50` + texto `--color-success-800`); alerta/Rascunho em `--color-warning-500` (badge em `--color-warning-50` + texto `--color-warning-800`); erro/exclusão/logout em `--color-error-500` (`#ef4444`).
   - **Contraste e foco:** texto principal `--color-text-primary` (`#171717`) e secundário `--color-text-secondary` (`#525252`) com contraste AA (`≥ 4,5:1`); `--color-text-tertiary` restrito a placeholders. Todo controle interativo aplica o indicador de foco duplo do sistema (`outline: 2px solid var(--color-focus-primary); outline-offset: 2px; box-shadow: var(--color-focus-ring);`), exceto campos em erro focados (`--color-error-500` + `--color-error-halo`). Evita-se excesso de cores competitivas na mesma barra de ações (ver item 6 e §8, item 19).

2. **Tipografia e textos:**
   - **Famílias:** `--font-family-body` (`"Inter"`, sistema, sans-serif) em toda a interface operacional do painel (abas, tabelas, formulários, métricas e modais); `--font-family-mono` para identificadores técnicos, slugs ou nomes de arquivo de backup quando aplicável.
   - **Hierarquia:** título principal do painel `h1` único (`--font-size-2xl` a `3xl`, `bold`); títulos de seção `h2` (`--font-size-xl` a `2xl`, `semibold`/`bold`); subtítulos `h3` (`--font-size-lg`, `semibold`); textos de tabela, campos, botões e itens da navegação lateral (`--font-size-sm` `14px` a `--font-size-base` `16px`, pesos `normal` `400` para dados e `medium` `500` / `semibold` `600` para rótulos e cabeçalhos); contadores auxiliares, dicas de campo e mensagens de validação (`--font-size-xs` `12px` a `sm` `14px`). Labels sempre visíveis acima dos inputs, sem caixa alta em frases.

3. **Abas e navegação:**
   - **Disposição exclusiva do painel:** navegação principal vertical na lateral esquerda com modos recolhido e expandido (§2.2), complementada por subabas horizontais enxutas no topo das seções que possuem subdivisão interna (§2.3) — distinta da navegação horizontal pública (`docs/ARQUITETURA_SITE_PUBLICO.md` §2).
   - **Aparência e estados compartilhados:** ícones SVG vetoriais de traço uniforme, tipografia `--font-size-sm`, estado inativo em `--color-text-secondary` (`medium`), hover sutil em `--color-bg-secondary` + `--color-text-primary`, estado selecionado com destaque em `--color-primary-50` + texto/ícone `--color-primary-500` (`semibold`) + indicador ativo em `--color-primary-500`, e foco visível com anel duplo azul.

4. **Cards, painéis e tabelas:**
   - **Cards administrativos:** usados na Visão Geral (6 cartões interativos de métricas e painel de distribuição) e em Segurança (cartões de status de Integridade, Backup e Cache), com fundo `--color-bg-primary`, borda `1px solid var(--color-border-light)`, sombra suave (`--shadow-xs` / `--shadow-card`), raio `--border-radius-xl` (`12px`), espaçamento interno `--spacing-6` (`24px`) e hover discreto (`translateY(-2px)` a `-3px`) quando clicáveis.
   - **Tabelas operacionais (particularidade funcional do painel):** enquanto o Site Público exibe catálogos em grades de cartões, as listagens administrativas (CRUDs e Auditoria) utilizam tabelas limpas em `--color-bg-primary`, cabeçalho `--color-bg-secondary`, linhas com hover suave, células alinhadas e paginação inferior padronizada.

5. **Arredondamentos:**
   - **Botões, inputs, campos de busca, seletores, células de ação e itens de navegação (lateral e subabas):** `--border-radius-lg` (`0.5rem` / `8px`). ([PLANEJADO] unificar valores avulsos de `4px`, `6px` e `12px` hoje espalhados nos estilos do painel e nos primitivos `components/UI/` — ver §8, item 20.)
   - **Cards de métricas, seções de formulário inline, containers de preview e modais:** `--border-radius-xl` (`0.75rem` / `12px`).
   - **Miniaturas de imagem em tabela (`60×60px`):** `--border-radius-md` (`0.375rem` / `6px`).
   - **Selos/badges compactos (status, permissões vinculadas) e botões circulares de ícone:** `--border-radius-full` (`9999px`) ou `--border-radius-md` consistente por família. Sem arredondamentos exagerados em campos ou botões.

6. **Botões:**
   - **Dimensões e consistência:** altura padrão `40px–44px` em barras de ação e formulários (alvo de toque `≥ 44×44px`; variante compacta `sm` `32px` restrita a ações em linha de tabela com espaçamento seguro `gap: var(--spacing-2)`), fonte `--font-size-sm`, peso `medium`/`semibold`, raio `--border-radius-lg` (`8px`).
   - **Hierarquia unificada com o Site Público:** [PLANEJADO] convergir as cores hoje fragmentadas no painel ([OBSERVADO] verde para criar/editar/exportar-auditoria, azul-info para exportar-CRUD, cinza sólido para cancelar/paginar — ver §8, item 19) para o padrão semântico do Design System:
     - **Primário (`--color-primary-500`):** ação principal da tela (`+ Novo ...`, `Salvar`, `Cadastrar ...`, `Realizar Backup Agora`).
     - **Secundário (`--color-bg-primary` / `--color-bg-secondary` com borda `--color-border-light` e texto `--color-text-primary`):** ações auxiliares e neutras (`Cancelar`, `Exportar CSV`, `Atualizar`, `Escolher arquivo`, `Editar` em linha e botões de paginação `Anterior`/`Próxima`).
     - **Perigo (`--color-error-500`):** ações destrutivas ou críticas (`Excluir`, `Limpar Cache Redis`, `Sair / Logout`).
   - **Estados:** hover suave, active discreto, `:focus-visible` com anel duplo azul, `loading` (spinner sem alterar largura + texto/estado acessível) e `disabled` (`opacity: var(--opacity-50)`, `cursor: not-allowed`).

7. **Barras de pesquisa, filtros e opções:**
   - **Padronização:** campos de busca com ícone de lupa SVG à esquerda, altura `40px–44px`, fundo `--color-bg-primary`, borda `1px solid var(--color-border-light)`, raio `--border-radius-lg` (`8px`), botão interno `×` para limpar busca quando preenchido e foco com anel duplo azul ([PLANEJADO] substituir estilos inline sem anel de foco em `AdminCrudBase.js` e `AdminAudit.js` — ver §8, item 20).
   - **Organização:** nas telas de CRUD, busca alinhada na barra de cabeçalho à esquerda dos botões `Exportar CSV` e `+ Novo`; na Auditoria, busca acompanhada dos filtros de data/hora (`dd/mm/aaaa hh:mm`) e botões `Atualizar` / `Exportar CSV`, com quebra responsiva (`flex-wrap: wrap`) e retorno automático à página 1 ao filtrar.

8. **Espaçamentos:**
   - **Ritmo espacial (`--spacing-*`, múltiplos de `4px`):** padding da área principal de conteúdo em `--spacing-6` a `--spacing-8` (`24px–32px`; `16px` no mobile); separação entre cabeçalho da seção, formulário/filtros e tabela em `--spacing-5` a `--spacing-6` (`20px–24px`); `gap` entre cartões da Visão Geral e campos de formulário em `--spacing-5` (`20px`); células de tabela com padding `--spacing-3` a `--spacing-4` (`12px–16px`); `gap` entre botões de ação em `--spacing-2` a `--spacing-3` (`8px–12px`).

9. **Transições e fluidez:**
   - **Movimento suave e contido:** transições de cor, fundo e borda em `150ms–200ms` (`--easing-standard`); expansão/recolhimento da barra lateral esquerda, troca entre abas/subabas e abertura de formulários/modais em `200ms–300ms`, sem saltos bruscos de layout; skeletons discretos durante carregamento inicial de tabelas e métricas; continuidade tipográfica e cromática na transição entre `/login`, `/admin` e o Site Público; conformidade obrigatória com `@media (prefers-reduced-motion: reduce)` em `pages/styles/globals.css`.

## 2. Navegação principal (10 abas)

As 10 abas principais seguem a ordem funcional abaixo (exibidas conforme as permissões do cargo do usuário logado):

| # | Aba | Ícone atual [OBSERVADO] | Função |
|---|---|---|---|
| 1 | Visão Geral | 📊 | Painel de contagens (aba padrão ao entrar) |
| 2 | Posts/Artigos | 📝 | CRUD de reflexões e estudos + CRUD de categorias (toggle "Posts \| Categorias") |
| 3 | Gestão de Músicas | 🎵 | CRUD de músicas (Spotify) |
| 4 | Gestão de Vídeos | 🎬 | CRUD de vídeos (YouTube) |
| 5 | Gestão de Produtos | 📦 | CRUD de produtos religiosos |
| 6 | Gestão de Dicas | 💡 | CRUD de dicas |
| 7 | Configuração de Cabeçalho | 🎨 | Título, subtítulo e banner do site público |
| 8 | Segurança | 🔒 | Integridade, backup, rate limiting, cache |
| 9 | Usuários | 👥 | Usuários/admins e cargos |
| 10 | Auditoria | 📜 | Histórico global de ações |

> **Ícones das abas:** [PLANEJADO] substituir os emojis atuais [OBSERVADO] por **ícones SVG vetoriais** de família única e traço uniforme (`MASTER.md` §7), garantindo nitidez, alinhamento óptico preciso e identificação imediata especialmente quando a barra lateral estiver recolhida (ver §2.2 e §8, item 18).

### 2.1 Mapeamento entre abas (site privado × site público)

A correspondência entre as abas administrativas e suas abas públicas de exibição é a seguinte:

| Site privado — aba administrativa | Site público — aba de exibição |
|---|---|
| Posts/Artigos | Reflexões & Estudos |
| Gestão de Músicas | Músicas |
| Gestão de Vídeos | Vídeos |
| Gestão de Produtos | Produtos Religiosos |
| Gestão de Dicas | Dicas do Dia |

Esse mapeamento deve ser mantido de forma consistente em toda a documentação.

### 2.2 Particularidade exclusiva do Site Privado — Navegação lateral esquerda [PLANEJADO]

Diferentemente do Site Público (que utiliza navegação horizontal abaixo do banner), o Site Privado adota **exclusivamente** uma **barra de navegação vertical posicionada na lateral esquerda da interface**, projetada para acomodar as 10 seções operacionais sem quebrar linhas no topo e liberar altura útil para tabelas e formulários.

> **Estado atual vs. alvo:** no código atual (`pages/admin.js` + `components/Admin/styles/tabs.module.css`), as 10 abas ainda renderizam em barra horizontal superior que quebra em 3 linhas [OBSERVADO]. O repositório já dispõe do componente estrutural `components/Layout/Sidebar.js` (atualmente referenciado apenas em `pages/design-system.js`), que serve de base para implementar esta especificação (ver §8, item 17).

1. **Modo recolhido:**
   - Exibe **somente os ícones** correspondentes a cada aba liberada ao usuário (`width` compacta de ~`64px–72px`).
   - Oculta completamente os nomes/textos das abas e eventuais rótulos auxiliares de seção.
   - Mantém os ícones organizados verticalmente em coluna única centralizada, preservando alinhamento óptico e espaçamento vertical uniforme (`--spacing-1` a `--spacing-2`, alvo clicável `≥ 44×44px` por item).
   - Garante identificação imediata de cada aba por meio de ícones SVG distintos e semânticos, `aria-label` com o nome completo da aba e dica visual discreta (`title`/tooltip acessível em hover e foco por teclado).
   - Mantém indicação visual inequívoca da aba atualmente selecionada: fundo em realce suave (`--color-primary-50`), ícone na cor primária (`--color-primary-500`), marcador vertical ativo à esquerda em `--color-primary-500` e `aria-selected="true"` (ou `aria-current="page"`).

2. **Modo expandido:**
   - Exibe os **ícones posicionados à esquerda** acompanhados dos **respectivos nomes completos das abas** à direita (`width` confortável de ~`240px–260px`, `gap: var(--spacing-3)`).
   - Garante alinhamento vertical rigoroso entre todos os ícones e rótulos da lista, sem quebra desordenada em múltiplas linhas (`white-space: nowrap`, `text-overflow: ellipsis`).
   - Preserva a hierarquia visual com tipografia `--font-size-sm` (`14px`), peso `medium` (`500`) e cor `--color-text-secondary` nas abas inativas, hover sutil (`--color-bg-secondary` + `--color-text-primary`) e espaçamento interno confortável (`padding` vertical e horizontal adequados à leitura).
   - Mantém a identificação clara da aba selecionada (fundo `--color-primary-50`, ícone e texto em `--color-primary-500` com peso `semibold` `600` e marcador lateral ativo).

3. **Controle de expansão e recolhimento:**
   - Controle dedicado e sempre visível na estrutura da barra lateral que permite **expandir**, **recolher** e **alternar** a qualquer momento entre os dois modos de visualização (com persistência opcional da preferência do operador em `localStorage`).
   - Acompanha `aria-expanded` refletindo o estado atual, `aria-label` descritivo ("Recolher menu lateral" / "Expandir menu lateral") e indicador de foco duplo azul.
   - Executa a transição de largura e exibição dos rótulos de forma suave e fluida (`200ms–300ms`, `--easing-standard`), sem tremulação de texto e respeitando `prefers-reduced-motion: reduce`.

4. **Comportamento, adaptação do conteúdo e usabilidade:**
   - **Adaptação em desktop (`> 1024px`):** a área principal de conteúdo à direita adapta dinamicamente sua largura útil conforme a barra lateral alterna entre expandida e recolhida, preservando o espaço disponível para tabelas e formulários sem sobreposições, cortes laterais ou deslocamentos bruscos dos componentes internos.
   - **Responsividade em telas menores (`≤ 1024px`):** para preservar todo o espaço horizontal do conteúdo principal, a barra lateral sai do fluxo fixo e opera como gaveta lateral retrátil (drawer) acionada por botão de menu no topo (`≥ 44×44px`), com `overlay` de fundo, modo expandido legível ao abrir e fechamento automático ao selecionar uma aba ou pressionar `Escape`. Em todos os tamanhos de tela e modos, os ícones mantêm proporção (`20px`), contraste e identificação visual consistente.
   - **Escopo exclusivo:** esta estrutura de navegação vertical recolhível na lateral esquerda é **exclusiva do Site Privado** e não deve ser aplicada ao Site Público.

### 2.3 Subabas internas de seção

Subdivisões internas de segundo nível permanecem como controles horizontais enxutos no topo da área de conteúdo da respectiva aba principal (nunca aninhadas como árvore complexa na barra lateral):
- **Posts/Artigos:** controle segmentado **"Posts | Categorias"** (§4.2).
- **Segurança:** 4 subabas horizontais — Verificação de Integridade, Backup do Sistema, Rate Limiting e Cache do Sistema (§5.1).
- **Usuários:** 2 subabas horizontais — Gestão de Usuários e Admins e Gestão de Cargos (§5.2).

## 3. Padrão comum das telas de conteúdo (Posts, Músicas, Vídeos, Produtos, Dicas)

Todas são construídas sobre `AdminCrudBase` (`components/Admin/AdminCrudBase.js`) e seguem o mesmo fluxo operacional e visual:

1. **Cabeçalho da seção:** título `h2` à esquerda ("Gerenciar Posts", "Gestão de Músicas", etc.) + contador "Total: N itens cadastrados" logo abaixo (`--color-text-secondary`).
2. **Barra de ações (à direita, responsiva com `flex-wrap`):** campo de busca "Buscar item..." (com ícone de lupa SVG à esquerda) → botão secundário "Exportar CSV" → botão primário "+ Novo ..." ([OBSERVADO] hoje azul-info no CSV e verde no "+ Novo"; [PLANEJADO] padronizar conforme §1.1 item 6).
3. **Tabela de listagem:** superfície `--color-bg-primary`, raio `--border-radius-lg`, rolagem horizontal segura em telas pequenas (`overflow-x: auto`). Nas 4 abas com curadoria manual (Posts, Músicas, Vídeos e Produtos), a primeira coluna exibe a alça de reordenação por arrastar (`☰`, posições 1-based via `utils/reorder.js`); em Categorias, Dicas, Usuários e Cargos não há coluna `☰`. Seguem-se as colunas específicas e a coluna "Ações" ("Editar" / "Excluir"). Estado vazio centralizado em `--color-text-secondary`.
4. **Formulário de criação/edição:** abre suavemente acima da tabela ao clicar em "+ Novo" ou "Editar", dentro de container `--color-bg-secondary` com borda `--color-border-light` e raio `--border-radius-xl` (`12px`). O botão de abertura alterna para "Cancelar" e o "Exportar CSV" permanece disponível.
5. **Publicação:** checkbox no formulário + selo clicável de alternância rápida na tabela ("Rascunho" em tom âmbar / "Publicado" em tom verde, com atualização otimista e reversão em erro). **Apenas registros com status Publicado são exibidos no site público. Registros com status Rascunho permanecem disponíveis no painel administrativo, mas não são exibidos nas abas públicas correspondentes.**
6. **Botão "Puxar Dados"** nos campos de link externo (Spotify em Músicas, YouTube em Vídeos, lojas em Produtos): importa metadados automaticamente a partir da URL informada ([OBSERVADO] com emoji `⚡` e cor por tipo; [PLANEJADO] ícone SVG vetorial e alinhamento ao sistema de botões do §1.1 item 6).

### 3.1 Regras de cadastro e exibição

- **Quantidade ilimitada:** Nas abas **Posts/Artigos**, **Gestão de Músicas**, **Gestão de Vídeos**, **Gestão de Produtos** e **Gestão de Dicas**, **não há limite de registros cadastrados**. É permitido cadastrar quantos registros forem necessários, independentemente de estarem com status **Rascunho** ou **Publicado**.
- **Exibição exclusiva por publicação:** Somente registros com status **Publicado** são exibidos na aba pública correspondente, conforme o mapeamento da seção 2.1. Registros em **Rascunho** não devem ser exibidos no site público.
- **Sem mistura de conteúdos:** Cada aba pública exibe exclusivamente os registros publicados de sua respectiva aba administrativa, sem misturar conteúdos entre diferentes categorias.
- **Reflexo da publicação:** Ao alterar um registro de **Rascunho** para **Publicado** (ou vice-versa), essa mudança deve refletir na aba pública correspondente, respeitando as regras acima.

## 4. Detalhe das abas de conteúdo

### 4.1 Visão Geral
- **Título:** "Visão Geral do Sistema".
- **6 cartões interativos** (grade responsiva, clicáveis para navegar à respectiva aba quando o usuário possui a permissão correspondente) com ícone, número grande e rótulo:
  | Cartão | Detalhe exibido |
  |---|---|
  | Artigos | "✅ N Pub \| 📝 N Rasc" (publicados / rascunhos) |
  | Músicas | idem |
  | Vídeos | idem |
  | Produtos | idem |
  | Dicas | idem |
  | Usuários | "Ativos: Hoje (N) • Mês (N) • Ano (N)" |
- **Distribuição de Conteúdo:** barras horizontais por categoria, com cor própria: Artigos (azul), Músicas (verde), Vídeos (vermelho), Produtos (laranja), Dicas (roxo), Usuários (ciano). Mostra o valor dentro da barra quando maior que zero.
- **Nota histórica:** nas capturas iniciais os contadores apareciam zerados (exceto Usuários = 1), situação esclarecida e validada em §8, item 1.

### 4.2 Posts/Artigos
- **Título:** "Gerenciar Posts". Botão: "+ Novo Post".
- **Toggle de visualização (desde 2026-10-27, ADR-0024):** no topo da aba, controle segmentado **"Posts | Categorias"** alterna entre o CRUD de posts e o CRUD de categorias (§4.2.1). Padrão: "Posts".
- **Tabela:** ☰ | ID | Título | Status | Data | Ações. Vazio: "Nenhum post encontrado."
- **Listagem e busca (2026-10-31):** a lista é paginada em **10 itens por página** (`Anterior`/`Próxima`/`Página X de Y`, mesmo padrão de Vídeos) e a busca do cabeçalho é **server-side** em título (`GET /api/admin/posts?search=...`, filtro `ILIKE` antes da contagem e da paginação). O contador do topo mostra o **total do conjunto filtrado** (todas as páginas), não apenas os itens da página; alterar a busca volta para a página 1. Antes, o painel não pedia paginação e a API admin devolvia só a primeira página (10 itens). O "Exportar CSV" continua exportando apenas os itens da página visível (comportamento documentado em §8, item 6).
- **Formulário:**
  | Campo | Obrigatório | Regra/dica |
  |---|---|---|
  | Título | Sim | "Título do post" |
  | Slug (URL amigável) | Sim | "Usado na URL do post. Ex: meusite.com/blog/exemplo-de-slug" |
  | Resumo | Não | até 500 caracteres, contador "0 / 500"; "Aparece na listagem do blog" |
  | Conteúdo | Não | área grande de texto livre ("Conteúdo completo do post...") |
  | Imagem de Capa | Não | URL (`https://...`) ou botão verde "Upload" |
  | Categorias | Não | grupo de checkboxes com as categorias cadastradas; "Opcional. Selecione uma ou mais categorias." Sem categorias cadastradas, exibe "Nenhuma categoria cadastrada. Crie na aba \"Categorias\"." |
  | Publicar post imediatamente | — | desmarcado por padrão → "Rascunho"; "Se desmarcado, o post será salvo como rascunho." |
  Botão final: "Salvar".
- **Ligação com o site público:** o Resumo alimenta o cartão de Reflexões & Estudos; a Imagem de Capa é a capa do cartão; o Slug forma a URL da leitura; as Categorias aparecem como chips no cartão público. O campo de Conteúdo opera em área de texto simples (`TextAreaField`, sem editor rico).

### 4.2.1 Categorias (dentro da aba Posts/Artigos)
- **API:** `/api/admin/categories` (CRUD completo; permissão **Posts/Artigos**; mutações invalidam o cache `posts:*`). `GET /api/admin/categories?all=1` devolve a lista completa sem paginação (usado pelo campo de seleção do formulário de post).
- **Listagem e busca (2026-10-31):** a listagem do CRUD é paginada em **10 por página** (`Anterior`/`Próxima`/`Página X de Y`, mesmo padrão de Vídeos) e a busca do cabeçalho é **server-side** em nome/slug (`GET /api/admin/categories?search=...`, filtro `ILIKE` antes da contagem e da paginação). O contador do topo mostra o **total do conjunto filtrado** (todas as páginas); alterar a busca volta para a página 1. Antes, o painel não pedia paginação e a API admin devolvia só a primeira página (10 itens); o `?all=1` (lista completa) continua sendo usado apenas pelo select do formulário de post.
- **Tabela:** ID (60px) | Nome | Slug. Vazio: "Nenhuma categoria cadastrada."
- **Formulário:**
  | Campo | Obrigatório | Regra/dica |
  |---|---|---|
  | Nome | Sim | "Nome da categoria"; ao sair do campo, gera o slug automaticamente (uma vez) se o slug estiver vazio |
  | Slug (URL amigável) | Sim | "Gerado automaticamente a partir do nome; pode ser editado."; apenas minúsculas, números e hífens |
- **Slug duplicado:** a API devolve **409** "Já existe uma categoria com esse slug"; o toast exibe a mensagem e o formulário permanece aberto.
- **Validações que devolvem 400:** `category_ids` com id de categoria inexistente é recusado antes do INSERT (o post não é criado/atualizado); nome sem nenhum caractere alfanumérico é recusado por não gerar slug.
- **Exclusão:** modal padrão de confirmação do painel; os vínculos post↔categoria são removidos em cascata (sem aviso adicional de posts afetados).
- **Decisão:** [ADR-0024](adr/0024-crud-categorias-posts-chips-display-only.md) — CRUD completo escolhido pelo dono; permissão reutilizada (sem permissão nova no RBAC); chips display-only na frente pública (links para arquivo por categoria ficam para evolução futura).

### 4.3 Gestão de Músicas
- **Botão:** "+ Nova Música".
- **Listagem e busca (2026-10-31 / curadoria alinhada em 2026-11-02):** a lista é paginada em **10 itens por página** (`Anterior`/`Próxima`/`Página X de Y`), ordenada pela curadoria manual (`position ASC, id ASC`, espelhando a opção `"Posicionados"` do site público — [ADR-0014](adr/0014-padrao-significa-mais-recentes-e-curadoria-como-posicionados.md)), e a busca do cabeçalho é **server-side** com paginação. O contador do topo mostra o **total do conjunto filtrado** (todas as páginas), não apenas os itens da página; alterar a busca volta para a página 1. Antes de 31/10/2026, o painel não pedia paginação e a API admin devolvia só a primeira página (10 itens): com **16 músicas** no banco, **6 ficavam invisíveis** e o contador mostrava "Total: 10". O "Exportar CSV" exporta apenas os itens da página visível.
- **Tabela:** ☰ | ID | Título | Artista | Spotify | Status | Ações. Vazio: "Nenhuma música cadastrada ainda."
- **Formulário:**
  - Título da Música * ("Nome da música")
  - Nome do Artista * ("Nome do artista")
  - Descrição (até 500 caracteres) — opcional, `TextAreaField` com contador (mesmo padrão de Vídeos)
  - Link do Spotify * (formato `https://open.spotify.com/track/...`) + botão "⚡ Puxar Dados"
  - Publicar música imediatamente (desmarcado → Rascunho)
  - Botão "Cadastrar Música"
- **Relação com o público:** o link Spotify gera o player incorporado e o botão "Ouvir no Spotify". Apenas **tracks** são suportados: o formulário, a API e o "⚡ Puxar Dados" recusam link não-track (playlist, álbum, episódio) com a mensagem "Apenas links de faixa (track) são suportados para embed." (decisão em [ADR-0023](adr/0023-spotify-embed-limitado-a-tracks-com-fallback.md)). No site público, URL não-track deixada de versões antigas exibe "Prévia indisponível" em vez de iframe quebrado (ver `docs/ARQUITETURA_SITE_PUBLICO.md` §3.3).

### 4.4 Gestão de Vídeos
- **Botão:** "+ Novo Vídeo".
- **Listagem e busca:** a lista é paginada em **10 itens por página** (`Anterior`/`Próxima`/`Página X de Y`), ordenada pela curadoria manual (`position ASC, id ASC`, espelhando `"Posicionados"` no site público — [ADR-0014](adr/0014-padrao-significa-mais-recentes-e-curadoria-como-posicionados.md) e [ADR-0033](adr/0033-videos-posicionados-indice-e-ordenacao-alfabetica.md)), com busca **server-side** em título/descrição (`GET /api/admin/videos?search=...`).
- **Tabela:** ☰ | ID | Título | YouTube | Status | Ações. Vazio: "Nenhum vídeo cadastrado ainda."
- **Formulário:**
  - Título do Vídeo * ("Nome do vídeo")
  - Descrição (até 500 caracteres)
  - Link do YouTube * (`https://www.youtube.com/watch?v=...`) + botão "⚡ Puxar Dados"
  - Capa Personalizada (URL ou "Upload"): "Opcional. Se vazio, usará a miniatura padrão do YouTube."
  - Publicar vídeo imediatamente (desmarcado → Rascunho)
  - Botão "Cadastrar Vídeo"
- **Relação com o público:** a descrição aparece sob o título no cartão. O erro "Video unavailable" vem do vídeo em si (removido, privado, bloqueado por direitos autorais ou sem permissão de incorporação), não do formulário.

### 4.5 Gestão de Produtos
- **Botão:** "+ Novo Produto".
- **Tabela:** ☰ | ID | Status | Imagem | Produto | Valor | Link | Ações. Vazio: "Nenhum produto cadastrado. Comece adicionando um!"
- **Listagem e busca (2026-10-31):** a lista é paginada em **10 itens por página** (`Anterior`/`Próxima`/`Página X de Y`, mesmo padrão de Vídeos), ordenada pela curadoria manual (`position ASC, id ASC`, espelhando `"Posicionados"` na vitrine pública), e a busca do cabeçalho é **server-side** em nome/descrição (`GET /api/products?search=...`, filtro `ILIKE` antes da contagem e da paginação). O contador do topo mostra o **total do conjunto filtrado** (todas as páginas), não apenas os itens da página; alterar a busca volta para a página 1. Antes, a API admin devolvia só a primeira página (10 itens) e ignorava `search`: o 11º produto ficava invisível e a busca parecia não filtrar.
- **Formulário:**
  - Nome do Produto * (ex.: "Bíblia de Estudo")
  - Valor * (ex.: "R$ 89,90") — aceita "R$ 89,90", "89,90" ou "89.90"; a API normaliza e grava como número (`NUMERIC(10,2)` desde a migration 019 — ADR-0027). **Preço zero é recusado** ("Valor deve ser maior que zero"): preço ausente não pode virar R$ 0,00 na vitrine. O filtro Mín/Máx do site público compara **número**, não texto. Na edição, o campo exibe o valor no formato pt-BR.
  - Imagens do Produto * — upload pelo botão "Adicionar imagem" (preview com remoção) **ou** colar URLs, uma por linha; a primeira imagem é a capa e as demais formam o carrossel.
  - Descrição ("Detalhes sobre o produto...")
  - Categoria (ex.: "livros", "terços"; vazio vira "geral") — alimenta o filtro de categoria da vitrine.
  - Link do Produto + botão amarelo "⚡ Puxar Dados" — aceita links da **Amazon, Mercado Livre e Shopee** e preenche nome, imagem e descrição lendo as meta tags da página. **O preço não é importado do Mercado Livre**: o botão deixa o campo vazio e avisa para digitar o valor. Motivo (confirmado em 29/10/2026): desde abr/2025 a API do ML exige token OAuth — sem credencial, `/items` responde 403 e `/products` 401, e o preview servido ao robô de link-preview não traz preço. Com `ML_ACCESS_TOKEN` configurado no ambiente, a rota consulta `/items/{wid}` e passa a trazer preço e carrossel. Amazon e Shopee também podem falhar por anti-bot (preenchimento manual nesse caso).
  - Produto Publicado — **desmarcado por padrão** desde 29/10/2026 (ADR-0029: todo conteúdo nasce rascunho); marcar publica o produto na vitrine (selo "Publicado"). "Desmarque para transformar o produto em um Rascunho (ocultar da vitrine pública)."
  - Botão "Salvar Produto"
- **Regra única de nascimento (ADR-0029, 29/10/2026):** todos os tipos de conteúdo — Posts, Músicas, Vídeos, Produtos e Dicas — nascem como **rascunho** (`DEFAULT false` no banco; toggle dos formulários desmarcado). Nada é publicado sem ação consciente do operador.
- **Fluxo definido em 2026-10-28/29** (após análise aprovada pelo dono): cadastro → validação Zod no cliente e na API (paridade: nome, imagem e preço > 0 obrigatórios; link opcional válido) → gravação normalizada → invalidação do cache `products:*` → auditoria. A vitrine pública filtra por busca, faixa de preço e categoria, ordena no servidor, exibe o preço formatado (`R$ 149,90`) e o aviso de afiliados no rodapé.

### 4.6 Gestão de Dicas
- **Título:** "Gestão de Dicas". Botões: "Exportar CSV" e "+ Novo" (padrão §3, igual às demais telas de conteúdo). O CSV traz o **conteúdo integral** da dica (a coluna "Conteúdo" da tabela trunca a 80 caracteres apenas para exibição).
- **Listagem e busca (2026-10-31):** a lista é paginada em **10 itens por página** (`Anterior`/`Próxima`/`Página X de Y`) e a busca do cabeçalho é **server-side** em nome/conteúdo (`GET /api/admin/dicas?search=...`). Antes, o GET admin ignorava `search`, `page` e `limit` (listagem completa), de modo que a busca digitada não filtrava os resultados. O contador do topo mostra o **total do conjunto filtrado** (todas as páginas); alterar a busca volta para a página 1. O "Exportar CSV" exporta apenas os itens da página visível.
- **Tabela:** ID | Nome | Conteúdo | Status | Ações (sem coluna ☰). Vazio: "Nenhum item cadastrado ainda."
- **Formulário (2 colunas):**
  - Nome da Dica * (ex.: "Mensagem de fé")
  - Conteúdo da Mensagem * ("Digite a mensagem inspiradora...")
  - Status de Publicação — desmarcado por padrão desde 29/10/2026 (ADR-0029); "Ative para exibir esta dica no site público."
  - Botão "Salvar"
- **Relação com o público:** "Nome da Dica" é o autor/fonte em negrito e "Conteúdo" é o texto entre aspas no bloco "Dicas do Dia" (ex.: a dica de teste "Teste 10").

### 4.7 Configuração de Cabeçalho
- **Campos:**
  - Título da Página (valor canônico em `docs/ARQUITETURA_SITE_PUBLICO.md` §1 e §2)
  - Subtítulo (valor canônico em `docs/ARQUITETURA_SITE_PUBLICO.md` §1 e §2)
  - Imagem Principal (`1100×320`) — botão em pt-BR "Escolher arquivo" (`aria-live="polite"` anunciando o arquivo selecionado ou "Nenhum arquivo escolhido", ver §8, item 9; limite de 10 MB no cliente). Ao selecionar um arquivo, abre ferramenta de recorte interativo (`Cropper` na proporção `1100/320` com controle de Zoom + "Recortar & Confirmar"), seguida de redimensionamento/otimização automática em WebP e resumo de tamanho original, otimizado e economia percentual.
- **Botões:** "Atualizar Imagem" (envia a imagem recortada para `/api/upload-image`), "Cancelar" (descarta seleção/recorte em andamento) e "Salvar Configurações" (salva `site_title` e `site_subtitle` em `/api/settings`).
- **Visualização:** bloco de prévia ao vivo exibindo título, subtítulo e a imagem principal (nova seleção ou banner atual salvo em `home_image_url`).
- **Relação com o público:** controla o cabeçalho e o banner que aparecem em todas as abas do site (e `site_title` no SEO do blog — ADR-0032). O cabeçalho da home pública aplica caixa alta ao título via CSS (`text-transform: uppercase` em `Home.module.css`).

## 5. Segurança, Usuários e Auditoria

### 5.1 Segurança — subabas
Barra interna horizontal com 4 subabas ([OBSERVADO] com emojis; [PLANEJADO] ícones SVG vetoriais, ver §8, item 18): 🛡️ Verificação de Integridade | 💾 Backup do Sistema | 🔒 Rate Limiting | ⚡ Cache do Sistema.

**Verificação de Integridade** (botão "🔄 Atualizar"; faixa verde "✅ Sistema Saudável"):
| Componente | Dados mostrados (valores observados) |
|---|---|
| Banco de Dados | Status Conectado; Latência 0 ms; Tamanho 9.3 MB; Conexões 5 |
| Cache/Redis | Status Conectado; Tipo Upstash Redis |
| Armazenamento | Arquivos 0; Tamanho 0 B |

**Backup do Sistema:**
- Texto: backups automáticos diários; backup manual possível.
- "Último Backup Realizado": nome do arquivo `.sql.gz.enc`, data extraída do próprio nome de criação do backup (`getAvailableBackups` — divergência histórica de `mtime` corrigida em 2026-10-27, ver §8, item 3) e tamanho em KB no formato pt-BR.
- Botão "📥 Realizar Backup Agora".

**Rate Limiting:** botão "🔄 Atualizar"; filtros "🔒 Bloqueados (0)", "✅ Whitelist (0)", "📋 Auditoria". Vazio: "Nenhum IP bloqueado no momento. Todas as requisições estão dentro dos limites configurados." Rodapé: "Atualização automática a cada 15s".

**Cache do Sistema:** explica que limpar o cache força buscar dados novos do banco ("use se as alterações não estiverem aparecendo no site"). Botão destrutivo vermelho "Limpar Cache Redis". Status: "✅ Redis Conectado", Erros 0, Fallbacks 0, Tamanho Local 0 entradas, Última Falha Nenhuma.

### 5.2 Usuários — subabas
**Gestão de Usuários e Admins:**
- **Finalidade:** é onde se controlam os usuários e as senhas com acesso ao Painel Administrativo. Cada usuário é vinculado a um cargo, e é o cargo que define o que ele pode usar.
- Botão "+ Novo Usuário"; "Total: N usuário(s) cadastrado(s)".
- Tabela: ID | Usuário | Cargo (selo) | Último Login (tempo relativo, ex. "há 7 minutos") | Ações ("Editar", "Excluir").
- Registro raiz: ID 1, `admin`, cargo `admin`.
- **Usuário `admin` (implementado — ver §8, item 8 e §9):** é o administrador raiz. Nasce e permanece vinculado ao cargo `admin`, e não pode ser excluído nem ter seu cargo alterado (trava na API e ocultação do botão "Excluir" na tabela).
- Formulário: Nome de Usuário / E-mail * (ex.: "novo.admin"); Senha (política unificada em `lib/auth/password-policy.js`, [ADR-0031](adr/0031-password-policy-12-complexity-shared-module.md), ver §8, item 7: **mínimo de 12 caracteres**, com letra maiúscula, minúscula e número; armazenada com hash seguro; em branco na edição mantém a senha atual); Cargo / Permissão (lista "Selecione um cargo", obrigatória — "O cargo define os níveis de acesso deste usuário no sistema"); botão "Salvar".

**Gestão de Cargos:**
- **Finalidade:** cada cargo reúne as permissões que liberam o acesso às ferramentas do Painel Administrativo. As permissões são as próprias abas do painel (seção 6): o que o cargo não listar, o usuário não vê.
- Título "Gestão de Cargos e Permissões"; botão "+ Novo Cargo"; "Total: N cargo(s) cadastrado(s)".
- Tabela: ID | Nome do Cargo | Permissões Vinculadas (etiquetas azuis) | Ações (Editar/Excluir).
- Registro raiz: ID 3, `admin`, com as 10 permissões.
- **Cargo `admin` (implementado — ver §8, item 8 e §9):** é o único cargo que vem habilitado por padrão com todas as permissões existentes (as 10 da seção 6) e não pode ser excluído.
- Formulário: Nome do Cargo * (ex.: "Editor de Conteúdo") + 10 caixas de permissão (pelo menos uma é obrigatória): Visão Geral, Posts/Artigos, Gestão de Músicas, Gestão de Vídeos, Gestão de Produtos, Gestão de Dicas, Configuração de Cabeçalho, Segurança, Usuários, Auditoria. Botão "Salvar".
- A permissão "Gestão de Dicas" corresponde à aba administrativa "Gestão de Dicas", cujos registros publicados alimentam o bloco "Dicas do Dia" no site público ([ADR-0034](adr/0034-standardize-admin-gestao-de-dicas-and-public-dicas-do-dia.md)).
- O ID 3 indica que os cargos 1 e 2 já existiram e foram removidos (a auditoria mostra a exclusão do cargo `user`).

### 5.3 Auditoria
- **Título:** "Histórico Global de Auditoria".
- **Filtros:** campo de busca textual "Buscar ações, usuários ou detalhes...", campos de período inicial e final em formato pt-BR com máscara `dd/mm/aaaa hh:mm` (`DateTimeBRField`, ver §8, item 9), botão "Exportar CSV" e botão "Atualizar".
- **Tabela rolável com cabeçalho fixo (`sticky`) e paginação:** colunas Data/Hora | Usuário | Ação Executada | Detalhes; paginada em **50 registros por página** (`Anterior | Página X de Y | Próxima` quando há mais de uma página).
- **Registros históricos observados nas capturas iniciais (20/10/2026):**
  | Hora | Usuário | Ação | Detalhes |
  |---|---|---|---|
  | 17:16:44 | admin | EXCLUIR CARGO | Removeu o cargo: user |
  | 17:13:10 | admin | EXCLUIR DICA | Removeu a dica: Teste 10 |
  | 17:13:05 até 17:12:56 | admin | EXCLUIR VÍDEO (6 registros) | Removeu o vídeo: undefined *(bug corrigido em 2026-10-21 — ver §8, item 2)* |
- **Padrão de ação:** `VERBO + OBJETO` em caixa alta (ex.: `CRIAR POST`, `ATUALIZAR PRODUTO`, `REORDENAR VÍDEOS`, `EXCLUIR CARGO`), sempre acompanhado de título/identificador real nos detalhes.

## 6. Mapa permissão → aba
| Permissão | Aba do painel (ícone atual [OBSERVADO]) |
|---|---|
| Visão Geral | 📊 Visão Geral |
| Posts/Artigos | 📝 Posts/Artigos |
| Gestão de Músicas | 🎵 Gestão de Músicas |
| Gestão de Vídeos | 🎬 Gestão de Vídeos |
| Gestão de Produtos | 📦 Gestão de Produtos |
| Gestão de Dicas | 💡 Gestão de Dicas |
| Configuração de Cabeçalho | 🎨 Configuração de Cabeçalho |
| Segurança | 🔒 Segurança |
| Usuários | 👥 Usuários |
| Auditoria | 📜 Auditoria |

## 7. Ligação entre painel e site público

| Site privado — aba administrativa | Site público — aba de exibição | Efeito no site público |
|---|---|---|
| Posts/Artigos | Reflexões & Estudos | Somente registros **publicados** aparecem em cartões/páginas da aba Reflexões & Estudos. Registros em **Rascunho** não são exibidos. |
| Gestão de Músicas | Músicas | Somente registros **publicados** aparecem na grade da aba Músicas. Registros em **Rascunho** não são exibidos. |
| Gestão de Vídeos | Vídeos | Somente registros **publicados** aparecem na grade da aba Vídeos. Registros em **Rascunho** não são exibidos. |
| Gestão de Produtos | Produtos Religiosos | Somente registros **publicados** aparecem na vitrine da aba Produtos Religiosos. Registros em **Rascunho** não são exibidos. |
| Gestão de Dicas | Dicas do Dia | Somente registros **publicados** aparecem no bloco "Dicas do Dia" no fim de todas as abas. Registros em **Rascunho** não são exibidos. |
| Configuração de Cabeçalho | Todas as abas públicas | Título, subtítulo e banner 1100×320 de todas as abas |
| Cache do Sistema | Todas as abas públicas | Se uma alteração não aparecer no site, limpar o cache Redis |

**Regras gerais de exibição:**
- Não há limite de quantidade de registros cadastrados nas cinco abas administrativas acima, seja o status **Rascunho** ou **Publicado**.
- A quantidade de registros **publicados** exibidos no site público não está sujeita a um limite definido por essas regras — são exibidos todos os registros com status **Publicado** de cada respectiva aba.
- Cada aba pública apresenta exclusivamente os registros publicados de sua aba administrativa correspondente, sem mistura de conteúdos entre categorias diferentes.

A aba pública "Em Desenvolvimento" não tem gestão no painel.

## 8. Estado atual e inconsistências

**Bugs — corrigir no código**

| # | Item | Status |
|---|---|---|
| 2 | **Log de vídeos:** campo "undefined" nos registros de EXCLUIR VÍDEO. | **corrigido em 2026-10-21** — o log grava o título do vídeo excluído (`deletedVideo.titulo`, `pages/api/admin/videos.js:109`). |
| 3 | **Data do backup:** nome do arquivo (2026-05-22) divergia da data exibida (02/10/2026). | **corrigido em 2026-10-27** — a API `/api/admin/backups` passou a reutilizar a listagem do `scripts/backup.js` (`getAvailableBackups`), ordenada pela data de criação gravada no próprio nome do arquivo; o mtime (que cópias do diretório reescrevem) deixou de ser usado |
| 8 | **Exclusão do admin:** o botão "Excluir" existia no usuário `admin` e no cargo `admin`, e a API não tinha trava — a de usuário só impedia excluir a própria conta logada (`pages/api/admin/users.js`), e a de cargo não verificava nada (`pages/api/admin/roles.js`). | **corrigido em 2026-10-21** — a API recusa com 400 nomeado: excluir o usuário administrador (`process.env.ADMIN_USERNAME`, default `admin`), trocar o cargo dele para não-`admin` e excluir o cargo `admin`; o painel não renderiza mais o botão "Excluir" nas linhas protegidas (`canDelete` em `CrudTable`, repassado por `AdminUsersTab`/`AdminRolesTab`). Detalhes em `docs/PENDENCIAS_seguranca-rotas-api.md` (S10). |
| 9 | **Formatos regionais:** campos de data em mm/dd/yyyy e botão de arquivo em inglês, diferentes do pt-BR do restante. | **corrigido em 2026-10-27** — o upload do banner usa botão "Escolher arquivo" em pt-BR (input nativo oculto); os filtros de período da Auditoria usam campo com máscara dd/mm/aaaa hh:mm (`components/Admin/fields/DateTimeBRField.js`) no lugar do `datetime-local` nativo; valores exibidos (KB, economia, `R$`) usam separador decimal pt-BR. O campo de edição de preço mantém o formato de dado original. A revisão do checklist (27/10) acrescentou nomes acessíveis aos novos controles (`htmlFor`/`aria-label`), `aria-live` no nome do arquivo selecionado, mensagem de erro inline com `aria-invalid` no campo de data e foco `:focus-visible` tokenizado no botão e no campo |
| 11 | **Reordenação de posts sempre falhava:** o helper enviava `position = 0` (0-based) e o schema exige posição positiva → HTTP 400 e a curadoria nunca persistia. | **corrigido em 2026-10-21** — `utils/reorder.js` passou a enviar posições 1-based. |
| 12 | **Reordenação de produtos inexistente:** o painel chamava `PUT /api/products` com `action: "reorder"`, mas a rota pública não tratava essa ação → HTTP 400. | **corrigido em 2026-10-21** — branch de reordenação adicionado em `pages/api/products.js`, com invalidação de cache e registro de Auditoria. |
| 13 | **Reordenação sem registro de Auditoria:** reordenar posts, músicas ou vídeos não gerava registro na Auditoria, contra a regra de §9 ("toda ação de … configurar deve gerar um registro"); o reorder de vídeos ainda não validava `id`/`position`. | **corrigido em 2026-10-21** — os três endpoints registram a ação com identificador real; vídeos passaram a validar o payload. |
| 14 | **"Puxar Dados" do Mercado Livre falhava com HTTP 500 e mensagem falsa ("anúncio inativo ou link inválido").** A API do ML deixou de ser pública em abr/2025 (403 `PA_UNAUTHORIZED_RESULT_FROM_POLICIES` sem token) e o fallback de scraping era desviado para o muro anti-bot `/gz/account-verification`, que não tem meta tags. | **corrigido em 2026-10-29 (ADR-0028)** — a rota só consulta a API quando existe `ML_ACCESS_TOKEN`; sem token lê o preview da página (nome, imagem, descrição) com UA de link-preview; bloqueio anti-bot devolve **422** e "não consegui ler" devolve **502**, ambos com orientação de preenchimento manual; o `wid` do fragmento `#` é reconhecido e links com `MLBU` (user product) não são mais recusados. O preço não vem no preview e é digitado pelo operador; preço zero passou a ser recusado. Corrigido também o preço cru na vitrine (`formatted_price`), o `published` ignorado na criação e o **log de criação que usava a variável livre `name`** (em produção lançava `ReferenceError` depois do INSERT e o operador recebia 500 com o produto já gravado). |
| 15 | **Salvar produto com o campo Categoria vazio dava "Bad Request"** — o formulário sempre envia `category: ''` (valor inicial do campo), e o schema da API exigia `min(1)` quando a chave existia (`.optional()` só tolera chave ausente). Só apareceu depois do conserto do "Puxar Dados", porque antes o fluxo não chegava ao Salvar; os testes não pegaram porque o POST de teste não enviava `category`. O toast, além disso, mostrava só "Bad Request" (o hook preferia `data.error` a `data.message`) e não indicava o campo culpado. | **corrigido em 2026-10-29** — categoria vazia vira `undefined` no schema (create aplica o default `geral` prometido no §4.5; update pula o campo em vez de gravar string vazia); o hook compartilhado (`useAdminCrud`) passou a preferir a mensagem humana da API no toast e a propagar os erros de campo para o formulário (campo em vermelho + "Verifique os campos em vermelho no formulário"). Paridade: `category` entrou no schema Zod do cliente. |

**A confirmar**

| # | Item | Status |
|---|---|---|
| 1 | **Painel vazio, site público com conteúdo:** nas capturas do site público havia 3 posts, 18 músicas, 18 vídeos e 1 dica; neste painel Artigos, Músicas, Vídeos, Produtos e Dicas aparecem com 0. A auditoria mostra exclusão de dica e de vídeos, então o painel provavelmente foi limpo depois. Se o site público ainda mostrar conteúdo antigo, usar "Limpar Cache Redis". Confirmar também se posts e músicas foram apagados. | **confirmado em 2026-10-27 — divergência transiente, já resolvida.** A auditoria do banco comprova a limpeza do painel entre 20 e 25/10 (9 EXCLUIR POST, 43 EXCLUIR MÚSICA, 19 EXCLUIR VÍDEO, 1 EXCLUIR DICA) — as capturas do site público retratavam o período anterior. Posts e músicas foram apagados e recriados: o conteúdo voltou entre 25 e 27/10 (41 músicas importadas via Spotify, posts, dicas e categorias), com "Limpar Cache" executado em 25/10. Estado atual do banco: 2 posts (2 publicados), 16 músicas (14 publicadas), 2 dicas (1 publicada), 0 vídeos e 0 produtos (vídeos e produtos vazios por exclusão deliberada — as abas públicas exibem mensagem de estado vazio adequada). **Validação em 27/10/2026 com o servidor no ar:** as APIs públicas retornam exatamente os registros publicados do banco (`/api/posts` 2, `/api/musicas` 14, `/api/videos` 0, `/api/dicas` 1, `/api/products` 0) — painel e site público estão consistentes. Painel e site público leem o mesmo banco (`DATABASE_URL` único) e a invalidação de cache Redis é automática nas mutações do painel (`cacheKeys` no handler admin); o cache CDN expira em até 5 min. Não há defeito de implementação. **Atualização em 31/10/2026:** o banco voltou a ter **11 produtos de teste** (10 publicados e 1 rascunho), criados pelo dono para validar o fluxo; painel e vitrine refletem esse estado (a vitrine mostra os 10 publicados). |
| 5 | **Padrões de publicação divergentes:** Posts, Músicas e Vídeos nascem como rascunho; Produtos e Dicas nascem publicados. | **confirmado em 2026-10-27 — executado e encerrado em 2026-10-29 (ADR-0029).** A divergência foi unificada: coluna `published` nas 5 tabelas de conteúdo (a migration `020-unify-published-column` renomeou `musicas.publicado`/`videos.publicado`, preservando dados) e `DEFAULT false` em todas — Posts, Músicas, Vídeos, Produtos e Dicas nascem rascunho, e os formulários abrem com o toggle desmarcado. Paridade das 4 fontes de schema travada por `tests/unit/scripts/schema-sources.test.js` |
| 6 | **Dicas sem "Exportar CSV"**, diferente das outras seções de conteúdo. | **confirmado e corrigido em 2026-10-27** — a causa era o `AdminDicas` não passar `exportable={true}` ao `AdminCrudBase` (prop default `false`; as outras 4 telas de conteúdo passavam). Habilitado, com `exportColumns` própria no CSV para o conteúdo integral (o `format` da tabela trunca a 80 caracteres só para exibição). Mecanismo de export inalterado (`utils/csvExport.js`, client-side, dados da página atual) |
| 10 | **Confirmação de exclusão:** não observada nas imagens. Verificar se existe diálogo de confirmação. | **confirmado em 2026-10-27** — existe e é padronizado: todos os 8 CRUDs (Posts, Músicas, Vídeos, Produtos, Dicas, Categorias, Usuários, Cargos) usam o `AdminCrudBase`, cujo `useAdminCrud` chama `onConfirmDelete` antes de qualquer DELETE — um único modal com Cancelar/Excluir (`components/Admin/AdminCrudBase.js`). Não há `window.confirm` nativo em uso (só fallback no hook para usos futuros sem modal) |

**Decisões do dono**

| # | Item | Status |
|---|---|---|
| 4 | **Nomenclatura:** a permissão é "Gestão de Dicas" e a aba era "Dicas do Dia". | **decidido e padronizado em 2026-11-02 (ADR-0034)** — o painel administrativo adota uniformemente "Gestão de Dicas" (aba, título e permissão), enquanto o site público mantém "Dicas do Dia" (bloco e títulos públicos), estabelecendo paridade 1:1 estrita no painel e preservando o vínculo funcional |
| 7 | **Senha mínima de 6 caracteres:** fraca. Considerar elevar para pelo menos 10 a 12 e exigir senha forte para admin. | **decidido e executado em 2026-10-30 (ADR-0031)** — política única em `lib/auth/password-policy.js`: mínimo de **12 caracteres** com letra maiúscula, minúscula e número, aplicada à criação e à troca de senha no painel de Usuários (server + client). A senha atual do admin continua válida até a próxima troca; o login não valida comprimento |
| 16 | **Unificação da nomenclatura de publicação:** coluna `published` em todas as tabelas de conteúdo e default `false` (nada nasce publicado; formulários abrem com o toggle desmarcado) — executa a "evolução futura" registrada no ADR-0025 (item 3). | **decidido e executado em 2026-10-29 (ADR-0029)** — migration `020-unify-published-column` (rename `publicado`→`published` em musicas/videos, preservando dados; `SET DEFAULT false` em musicas, videos, dicas e products); sweep em lockstep no código, testes e schemas (guarda `schema-sources.test.js`); índices da migration 012 atualizados para replay pós `db:reset`. **Deploy: rodar `npm run migrate` no banco de produção** |

**Alinhamento visual e navegação lateral ([PLANEJADO] — dependem de implementação no código)**

| # | Item | Status |
|---|---|---|
| 17 | **Navegação lateral esquerda recolhível/expansível:** substituir a barra horizontal de abas em 3 linhas e o cartão fixo de `1000px` (`pages/admin.js`, `components/Admin/styles/tabs.module.css`) pela barra vertical esquerda com modo recolhido (somente ícones), modo expandido (ícones à esquerda + nomes à direita), controle de alternância suave e adaptação fluida da área de conteúdo + gaveta responsiva em telas `≤ 1024px` (reaproveitando e alinhando `components/Layout/Sidebar.js`). | **[PLANEJADO] pendente de implementação** — especificado em §1 e §2.2 |
| 18 | **Ícones vetoriais uniformes:** substituir emojis nas 10 abas principais, nas 4 subabas de Segurança, nos cartões da Visão Geral e nos botões de ação ("⚡ Puxar Dados", "🔄 Atualizar", "📥 Realizar Backup Agora") por ícones SVG de família única e traço consistente (`MASTER.md` §7). | **[PLANEJADO] pendente de implementação** — especificado em §2, §2.2 e §5.1 |
| 19 | **Semântica unificada de botões:** convergir cores divergentes de botões no painel (`components/Admin/styles/crud.module.css`, `AdminAudit.js`, `pages/admin.js` — verde em criar/editar/exportar-auditoria, azul-info em exportar-CRUD, cinza sólido em cancelar/paginar) para o padrão compartilhado com o Site Público (primário `--color-primary-500`, secundário neutro com borda `--color-border-light`, perigo `--color-error-500`). | **[PLANEJADO] pendente de implementação** — especificado em §1.1 item 6 |
| 20 | **Arredondamentos, barras de busca e estilos inline:** padronizar raios em `--border-radius-lg` (`8px`) para controles/botões/inputs (incluindo `components/UI/Button.module.css` e `Input.module.css`, hoje em `12px`) e `--border-radius-xl` (`12px`) para cards/painéis, migrando campos de busca e tabelas com estilos inline (`AdminCrudBase.js`, `AdminAudit.js`, `pages/admin.js`) para CSS Modules com lupa SVG, botão limpar e anel de foco duplo azul. | **[PLANEJADO] pendente de implementação** — especificado em §1.1 itens 5 e 7 |

## 9. Regras de proteção do painel administrativo
- Não renomear abas, permissões nem a ordem das abas sem pedido; renomear uma permissão exige migração dos cargos já salvos.
- A navegação principal do painel segue o modelo exclusivo de **barra vertical na lateral esquerda** com modos recolhido (somente ícones) e expandido (ícones + nomes das abas) e controle suave de alternância (§2.2); não aplicar essa barra lateral automaticamente ao Site Público.
- Toda nova aba do painel deve ter uma permissão correspondente em Gestão de Cargos e aparecer na tabela da seção 6.
- **Proteção do `admin` (implementadas — ver §8, item 8):**
  - O usuário `admin` e o cargo `admin` não podem ser excluídos: a API deve recusar a exclusão e o painel não deve oferecer a ação.
  - O usuário `admin` vem e permanece vinculado ao cargo `admin`; esse vínculo não pode ser alterado.
  - O cargo `admin` é o único que vem habilitado por padrão com todas as permissões existentes; os demais cargos nascem com as permissões marcadas no formulário.
- Toda ação de criar, editar, excluir ou configurar deve gerar um registro de Auditoria com título/identificador real (nunca `undefined`).
- A reordenação por arrastar grava posições **1-based** (`utils/reorder.js`): a primeira posição da página 1 é `1`. Os schemas dos endpoints exigem `position` positiva — não voltar a 0-based.
- Manter a identidade visual compartilhada com o Site Público (§1.1 e `design-system/MASTER.md`), utilizando exclusivamente os tokens de `pages/styles/variables.css`, e o padrão estrutural e de fluxo da seção 3 em novas telas de conteúdo.
- Nunca expor senhas; manter o hash seguro. Não registrar senhas nos logs.

> As regras de processo do agente estão em `AGENTS.md` §0.2.
