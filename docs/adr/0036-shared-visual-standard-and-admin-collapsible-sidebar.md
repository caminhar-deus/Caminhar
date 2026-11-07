# ADR-0036: Padrão visual compartilhado (público e privado) e barra lateral esquerda recolhível exclusiva no `/admin`

- **Status:** Aceito
- **Data:** 2026-11-07
- **Decisores:** Dono do projeto
- **Relacionados:** [ADR-0013](0013-agent-process-rules-vs-area-architecture-docs.md), [ADR-0023](0023-spotify-embed-limitado-a-tracks-com-fallback.md), [ADR-0034](0034-standardize-admin-gestao-de-dicas-and-public-dicas-do-dia.md), `docs/ARQUITETURA_SITE_PUBLICO.md` (§1.1, §2, §7 itens 17–19), `docs/ARQUITETURA_SITE_PRIVADO.md` (§1, §1.1, §2, §2.2, §8 itens 17–20), `design-system/MASTER.md`, `design-system/pages/home.md`, `design-system/pages/admin.md`, `pages/admin.js`, `components/Layout/Sidebar.js`, `components/UI/icons.js`

## Contexto

O Site Público (`/`, `/blog`, `/blog/[slug]`) e o Painel Administrativo (`/admin`) acumularam divergências visuais e estruturais ao longo do desenvolvimento:

1. **Navegação administrativa estrangulada:** `pages/admin.js` confinava as 10 seções operacionais em um cartão central de `max-width: 1000px` com uma barra horizontal superior de abas que quebrava em 3 linhas, reduzindo a área vertical e horizontal útil para tabelas de CRUD, filtros de Auditoria e ferramentas de Segurança.
2. **Emojis como ícones:** as 5 abas públicas (`ContentTabs`), o botão de mídia (`MusicCard`), as 10 abas principais do painel, as 4 subabas de Segurança, os 6 cartões da Visão Geral, selos de status, links externos e botões operacionais ("Puxar Dados", "Atualizar", "Realizar Backup Agora") usavam emojis de sistema, com renderização inconsistente entre sistemas operacionais e violando `design-system/MASTER.md` §7.
3. **Raios, elevações e cores fragmentados:** campos de busca, seletores e botões de paginação públicos em Músicas, Vídeos e Produtos usavam raio exagerado em pílula (`50px`), enquanto primitivos em `components/UI/` invertiam os raios de controles (`12px` em `Button`/`Input`) e cartões (`8px` em `BaseCard`), e `Testimonials` aplicava elevação brusca (`translateY(-8px)`). Na aba pública Músicas, controles de busca, seletor e contador usavam verde `#1DB954` em vez do azul primário do sistema, e no painel botões equivalentes divergiam entre verde, azul-info e cinza sólido sem hierarquia unificada.
4. **Barras de busca assimétricas e estilos inline:** faltavam lupa SVG e rótulo padronizado `"Ordenar por:"` entre galerias públicas, botão interno de limpeza na busca de Produtos e Auditoria, e anel de foco duplo acessível em inputs com `style` inline no painel (`AdminCrudBase`, `AdminAudit`, `pages/admin.js`), além de regras CSS mortas duplicadas (`misc.module.css` e `components/Features/Products/styles.js`).

## Decisão

Vamos estabelecer e implementar um padrão visual compartilhado entre o Site Público e o Site Privado — ancorado exclusivamente nos tokens de `pages/styles/variables.css`, em `design-system/MASTER.md` e nos overrides `design-system/pages/home.md` e `design-system/pages/admin.md` — preservando as particularidades funcionais e de navegação de cada ambiente:

1. **Navegação lateral esquerda recolhível/expansível exclusiva no Site Privado (`/admin`):**
   - Adotamos `components/Layout/Sidebar.js` (`position="left"`, `width="md"`, `persistCollapsed`) em `pages/admin.js`, substituindo a barra superior de 3 linhas e o limite fixo de `1000px` por uma área principal fluida (`min-width: 0`) à direita.
   - **Modo recolhido (`72px`):** exibe apenas os ícones SVG centralizados das abas liberadas pelo RBAC, ocultando rótulos de texto e mantendo `aria-label`, `title` e indicador ativo lateral esquerdo em `--color-primary-500` + `aria-current="page"`.
   - **Modo expandido (`260px`):** exibe ícone à esquerda + nome completo da aba à direita sem quebra em múltiplas linhas.
   - **Alternância e responsividade:** botão dedicado de recolher/expandir (`≥ 44×44px`, `aria-expanded`, persistência em `localStorage`) em desktop (`> 1024px`) e gaveta retrátil (`drawer`) com `overlay`, isolamento `inert` no `<main>` e fechamento por clique em aba, clique no `overlay` ou tecla `Escape` em telas `≤ 1024px`. As subdivisões de 2º nível (Posts/Categorias, 4 subabas de Segurança e Usuários/Cargos) permanecem horizontais no topo da respectiva seção.
   - O **Site Público mantém navegação principal horizontal** centralizada abaixo do banner hero.
2. **Família única de ícones vetoriais SVG (`AppIcon` em `components/UI/icons.js`):** substituímos todos os emojis de abas, subabas, cartões de métrica, selos, links externos e botões operacionais nos dois ambientes por ícones SVG `24×24` de traço uniforme (`strokeWidth="2"`, `aria-hidden="true"`).
3. **Padronização de raios, elevações, cores semânticas e barras de busca:**
   - Controles interativos (botões, inputs, campos de busca, seletores, paginação e itens de navegação) usam `--border-radius-lg` (`8px`); cartões (`BaseCard`, métricas, depoimentos, painéis e modais) usam `--border-radius-xl` (`12px`), com elevação suave padronizada (`translateY(-3px)` em cartões públicos; `-2px` em cartões clicáveis do painel).
   - Hierarquia única de botões nos dois ambientes: primário `--color-primary-500`, secundário neutro (`--color-bg-primary` / `--color-bg-secondary` + borda `--color-border-light` + texto `--color-text-primary`) e perigo `--color-error-500`. Na aba pública Músicas, busca, seletor, paginação e contador convergem para `--color-primary-500`.
   - Barras de pesquisa padronizadas com lupa SVG à esquerda, botão circular interno de limpeza quando há texto, anel duplo azul em `:focus-visible` e rótulo visível `"Ordenar por:"` em Músicas, Vídeos e Produtos, migrando estilos inline do painel para CSS Modules e removendo duplicações obsoletas (`Products/styles.js` e seletores mortos em `Admin/styles/misc.module.css`).

## Alternativas consideradas

- **Manter abas horizontais no topo de `/admin` com rolagem horizontal (`overflow-x: auto`):** descartada porque ocultaria parte das 10 seções operacionais fora da área visível em desktop e contraria a diretriz arquitetural definida pelo dono para navegação vertical recolhível na lateral esquerda do painel.
- **Aplicar a barra lateral esquerda também ao Site Público:** descartada porque reduziria a largura editorial da grade de 3 cartões e do banner `1100×320px`, prejudicando a leitura contemplativa; a navegação lateral recolhível é particularidade exclusiva do ambiente operacional privado.
- **Introduzir biblioteca externa de ícones (ex.: `lucide-react`):** descartada para evitar dependência adicional desnecessária no bundle quando o projeto já centraliza ícones SVG leves sob demanda em `components/UI/icons.js`.

## Consequências

### Positivas

- Coerência visual imediata (cores, tipografia, raios `8px`/`12px`, foco duplo acessível, botões e barras de busca) entre Site Público e Painel Administrativo, respeitando integralmente `pages/styles/variables.css`.
- Aproveitamento total da largura e altura úteis em `/admin` para tabelas paginadas, formulários e filtros de Auditoria, com alternância rápida entre modo recolhido (`72px`) e expandido (`260px`) e suporte acessível a teclado e dispositivos móveis (`≤ 1024px`).
- Renderização nítida e previsível de ícones SVG em qualquer sistema operacional, sem emojis decorativos em controles ou selos.
- Eliminação de código morto duplicado (`components/Features/Products/styles.js` e classes sem consumidor em `components/Admin/styles/misc.module.css` e `crud.module.css`), validada pelo gate `knip`.

### Negativas e riscos

- Qualquer nova aba administrativa adicionada no futuro precisa declarar simultaneamente sua permissão em `ADMIN_NAV_ITEMS` (`pages/admin.js`) e um ícone correspondente em `AppIcon` (`components/UI/icons.js`) para manter paridade no modo recolhido.
- Testes unitários que acoplavam seletores de texto a emojis literais precisaram ser atualizados para refletir os rótulos textuais limpos acompanhados de SVG `aria-hidden="true"`.

## Revisão

Reavaliar caso o número de seções principais do painel cresça significativamente além de 10 itens (exigindo agrupamento por categorias na `Sidebar.Section`) ou caso o dono decida futuramente habilitar a aba pública `"Em Desenvolvimento"` com requisitos próprios de layout.
