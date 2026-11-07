# ARQUITETURA DO SITE — LINK PÚBLICO

> Escopo: apenas a área pública (qualquer visitante). O painel administrativo está documentado em `docs/ARQUITETURA_SITE_PRIVADO.md`. Ambos os ambientes compartilham a mesma identidade visual (ancorada em `design-system/MASTER.md` e `pages/styles/variables.css`), preservando estruturas de navegação e responsabilidades próprias.
> Fonte: 12 capturas de tela do site em desenvolvimento + código-fonte atual + diretrizes do dono do projeto.
> Última atualização: 2026-11-07
> Legenda: [PLANEJADO] = alvo ainda não implementado, informado pelo dono | [OBSERVADO] = visto nas imagens/estado legado | [HIPÓTESE] = inferido, confirmar antes de assumir.

---

## 1. Visão geral

- **Nome:** O CAMINHAR COM DEUS
- **Slogan:** "Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã"
- **Público:** Católico Cristão.
- **Idioma:** Português (pt-BR). Moeda: R$. Data no formato dd/mm/aaaa.
- **Tecnologia:** Next.js com **Pages Router** (não existe App Router — decisão registrada em `docs/adr/0002-nextjs-pages-router.md`) e React. Estilização com **CSS Modules** e variáveis CSS (`pages/styles/variables.css`), sem Tailwind. A rota canônica de erro 404 (`pages/404.js`) trata requisições a rotas inexistentes e respostas SSR com `notFound: true`.
- **Dados:** PostgreSQL acessado pelo pool `pg`, com SQL parametrizado e **sem ORM** (`docs/adr/0003-postgres-without-orm.md`); cache em dois níveis, Redis com fallback em memória (`docs/adr/0004-two-level-cache-with-memory-fallback.md`).
- **Validação e autenticação:** Zod na validação de entrada; JWT em cookie http-only com RBAC (`docs/adr/0005-jwt-http-only-rbac.md`).
- **Ferramentas de runtime e build:** Node.js e npm; next-sitemap na geração do sitemap e web-vitals nas métricas; `sharp` no processamento de imagens e `formidable` nos uploads.
- **Qualidade e testes:** Jest e Testing Library nos testes unitários e de integração, Testcontainers para o PostgreSQL, Cypress no E2E e k6 em carga, performance e segurança; ESLint, dependency-cruiser e knip na qualidade do código.
- **Rotas e layout geral:** página inicial única em `/` com navegação horizontal por abas trocadas no cliente, complementada pelas rotas públicas de leitura `/blog` (listagem paginada completa de reflexões) e `/blog/[slug]` (leitura individual do artigo) e pela rota de autenticação `/login` (ponte para o painel `/admin`). Superfície clara sobre fundo cinza muito suave, tipografia editorial limpa e cartões brancos alinhados em grade responsiva.

### 1.1 Identidade visual e padrões de interface (alinhamento com o Site Privado)

O Site Público e o Site Privado (`docs/ARQUITETURA_SITE_PRIVADO.md` §1.1) seguem uma **identidade visual única**: clean, suave, minimalista, moderna, organizada e intuitiva. Todos os valores visuais vêm dos tokens de `pages/styles/variables.css` e das especificações de `design-system/MASTER.md` (com overrides da home em `design-system/pages/home.md`). Devem ser evitados: excesso de cores, componentes carregados, arredondamentos exagerados, animações desnecessárias, espaçamentos inconsistentes e diferenças visuais sem justificativa funcional.

1. **Cores e contraste:**
   - **Superfícies:** fundo geral da página em `--color-bg-secondary` (`#f5f5f5`); cartões, campos, seletores e botões secundários em `--color-bg-primary` (`#fafafa`); divisores e áreas neutras de apoio em `--color-bg-tertiary` (`#e5e5e5`).
   - **Ação principal e destaque:** azul `--color-primary-500` (`#2563eb`), hover `--color-hover-primary` (`#1d4ed8`), ativo `--color-active-primary` (`#1e40af`) e realce sutil `--color-primary-50` (`#eff6ff`). Usado na aba ativa, links (`--color-text-link`), contadores de resultado, estado de foco e ações primárias.
   - **Cor secundária:** dourado `--color-secondary-500` (`#d4af37`), restrito a detalhes institucionais pontuais, sem competir com ações primárias.
   - **Estados semânticos:** sucesso `--color-success-500` (`#10b981`), alerta `--color-warning-500` (`#f59e0b`), erro `--color-error-500` (`#ef4444`; fundo `--color-error-50`, borda `--color-error-200`, texto `--color-error-800`) e desabilitado (`--color-disabled-background` / `--color-disabled-text`).
   - **Contraste e disciplina cromática:** texto principal `--color-text-primary` (`#171717`, 15,9:1) e texto secundário `--color-text-secondary` (`#525252`, 7,5:1) garantem conformidade WCAG AA (`≥ 4,5:1`); `--color-text-tertiary` (`#a3a3a3`) é exclusivo para placeholders e elementos decorativos. Na aba Músicas, os controles de busca, ordenação, paginação e contadores seguem o padrão primário azul `--color-primary-500`, reservando o verde da marca externa apenas ao botão direto de ação no cartão ("Ouvir no Spotify") ([ADR-0036](adr/0036-shared-visual-standard-and-admin-collapsible-sidebar.md)).

2. **Tipografia e hierarquia de textos:**
   - **Famílias:** `--font-family-display` (`"Playfair Display"`, Georgia, serif) para títulos de destaque editorial e `--font-family-body` (`"Inter"`, sistema, sans-serif) para corpo, abas, controles, cartões e metadados.
   - **Escala e pesos:** `h1` único por página (`--font-size-3xl` a `5xl` conforme viewport, `bold` `700`, `--line-height-tight` `1.25`); títulos de seção `h2` (`--font-size-2xl` a `4xl`, `semibold`/`bold`); títulos de cartão `h3` (`--font-size-lg`, `semibold` `600`); corpo e resumos (`--font-size-base` ou `sm`, `normal` `400`, `--line-height-relaxed` `1.625`); rótulos de abas, labels e botões (`--font-size-sm` a `base`, `medium` `500` / `semibold` `600`); metadados, contadores auxiliares e avisos (`--font-size-xs` a `sm`).
   - **Clareza:** labels sempre visíveis e associados aos controles (`htmlFor`/`id`); sem frases inteiras em caixa alta (exceto o título institucional no cabeçalho e chips curtos de categoria).

3. **Abas e navegação:**
   - **Particularidade estrutural do Site Público:** navegação principal **horizontal** centralizada abaixo do banner hero (5 abas), adequada à leitura fluida e descoberta de catálogo pelo visitante — distinta da navegação vertical na lateral esquerda, que é exclusiva do Site Privado (`docs/ARQUITETURA_SITE_PRIVADO.md` §2.2).
   - **Aparência e estados:** cada aba combina ícone vetorial SVG à esquerda (`AppIcon` em `components/UI/icons.js`, `aria-hidden="true"`, traço `strokeWidth="2"`) e rótulo textual claro. Estados: inativa em `--color-text-secondary` (`medium`); hover com fundo sutil e texto `--color-text-primary`; selecionada (`aria-selected="true"`) em `--color-text-primary` (`semibold`) com barra inferior em `--color-primary-500`; desabilitada em `--color-text-tertiary`, opacidade reduzida e `cursor: not-allowed`; foco visível com o anel duplo azul do sistema (`outline: 2px solid var(--color-focus-primary); outline-offset: 2px; box-shadow: var(--color-focus-ring);`).

4. **Cards:**
   - **Estrutura e visual:** baseados no componente compartilhado `BaseCard` (`components/UI/BaseCard.js`), com superfície `--color-bg-primary`, borda `1px solid var(--color-border-light)`, sombra discreta (`--shadow-xs` / `--shadow-card`) e raio padronizado `--border-radius-xl` (`12px`).
   - **Organização interna:** coluna flexível (`display: flex; flex-direction: column`) onde o corpo descritivo absorve o espaço livre (`flex: 1`) e o rodapé cola sempre na base (`margin-top: auto`), mantendo cartões da mesma linha com altura idêntica e rodapés perfeitamente alinhados.
   - **Interação:** transição suave de sombra (`--shadow-cardHover`) e elevação sutil (`translateY(-3px)`) em hover entre `BaseCard` e `Testimonials`, respeitando `prefers-reduced-motion: reduce`.

5. **Arredondamentos:**
   - **Controles interativos (botões, campos de pesquisa, inputs de preço, seletores `<select>`, paginação e abas):** `--border-radius-lg` (`0.5rem` / `8px`).
   - **Cartões, banner hero, blocos de destaque e modais/lightbox:** `--border-radius-xl` (`0.75rem` / `12px`).
   - **Chips de categoria e controles circulares de ícone (setas do carrossel, botão interno `×` de limpar busca):** `--border-radius-full` (`9999px`).

6. **Botões:**
   - **Padrão compartilhado:** alturas alinhadas à escala do Design System (`md` `40px–44px`, `lg` `48px`), garantindo área mínima de toque `≥ 44×44px`, fonte `--font-size-sm` (`14px`) a `base` (`16px`), peso `medium`/`semibold`, raio `--border-radius-lg` (`8px`), sem `uppercase`.
   - **Hierarquia:** primário (`--color-primary-500`, texto `--color-text-inverse`) para ações de destaque; secundário (`--color-bg-primary`, borda `--color-border-light`, texto `--color-text-primary`) para controles de paginação (`Anterior` / `Próxima`); fantasma/link (`--color-text-link`) para `Limpar filtros`, `Ler mais →` e `Assistir no YouTube`; ações externas dedicadas (Spotify, lojas parceiras) claramente identificadas.
   - **Estados:** hover suave, active (`translateY(1px)`), `:focus-visible` com anel duplo azul, `loading` com spinner centralizado sem alterar largura e `disabled` (`opacity: var(--opacity-50)`, `cursor: not-allowed`).

7. **Barras de pesquisa, filtros e opções:**
   - **Padrão estrutural:** barra horizontal flexível (`display: flex; align-items: center; gap: var(--spacing-3)` a `var(--spacing-4); flex-wrap: wrap`), com campo de busca à esquerda (ícone de lupa SVG, placeholder objetivo, botão interno circular de limpeza quando há texto), filtros/seletores de `44px` de altura com `<label>` visível (`Ordenar por:`, `Categoria:`) à direita e ação `Limpar filtros` quando aplicável. Em telas `≤ 640px`, os controles empilham em `100%` da largura.
   - **Feedback e foco:** contador de resultados alinhado à esquerda logo abaixo da barra (`Mostrando X de Y ...` ou `X resultado(s) para "termo"`) e anel de foco duplo azul padronizado em todos os inputs e selects de Músicas, Vídeos e Produtos.

8. **Espaçamentos:**
   - **Escala de `4px` (`--spacing-*`):** container central `--container-xl` (`1280px`; banner `1100px`) com respiro lateral de `16px` no mobile e `20px–32px` no desktop; separação entre seções principais de `--spacing-8` a `--spacing-12` (`32px–48px`); distância entre barra de filtros e grade de `--spacing-6` a `--spacing-8` (`24px–32px`); `gap` das grades de cartões em `32px` (`2rem`, 3 colunas no desktop ≥ 1025px), `24px` (`1.5rem`, 2 colunas em tablet 769–1024px e 1 coluna ≤ 768px) e `20px` (`1.25rem` ≤ 360px); preenchimento interno de cartões em `--spacing-4` a `--spacing-6` (`16px–24px`).

9. **Transições e fluidez:**
   - **Movimento discreto:** micro-interações em `150ms–200ms` (`--easing-standard`); redução suave de opacidade (`0.4`) na grade durante troca de página, sem recolher a altura da área de conteúdo (`min-height` preservada para evitar saltos de layout).
   - **Transição entre abas e ambientes:** troca instantânea e suave no cliente entre as abas da home, mantendo cabeçalho, banner e "Dicas do Dia" estáveis; continuidade tipográfica e cromática ao navegar para `/blog`, `/blog/[slug]` ou `/login` → `/admin`.
   - **Movimento reduzido:** guard global `@media (prefers-reduced-motion: reduce)` em `pages/styles/globals.css` desativa animações, transições e rolagem suave.

## 2. Estrutura da página (de cima para baixo)

Todas as abas da página inicial (`/`) compartilham o mesmo esqueleto:

1. **Cabeçalho** — link de acessibilidade "Pular para o conteúdo principal" (`skip-link`), título "O CAMINHAR COM DEUS" (`h1` único, caixa alta via CSS, negrito, centralizado) + subtítulo centralizado (`--color-text-secondary`).
2. **Banner principal (hero)** — área `1100×320 px` (`--border-radius-xl`, sombra `--shadow-md`). A imagem vem do painel admin: a home lê a configuração `home_image_url` (gravada pelo upload no painel) e a usa diretamente como `src` do `<img>`. Cada upload gera filename único (`hero-image-<uuid>.<ext>`), então a URL muda a cada troca e o cache do navegador por URL é seguro — a imagem nova aparece na próxima visita à home, sem janela de cache. Quando a setting não existe, o `<img>` usa o fallback `/api/placeholder-image`, que resolve o hero mais recente no servidor (cache HTTP curto, 5 min, sem `immutable`). É comum a todas as abas.
3. **Barra de abas (navegação horizontal pública)** — posicionada horizontalmente e centralizada abaixo do banner (rolagem horizontal discreta sem barra aparente em telas estreitas), com 5 abas identificadas por ícone vetorial SVG à esquerda (`AppIcon`, `aria-hidden="true"`) e rótulo:
   | Ordem | Aba | Ícone SVG (`AppIcon`) | Estado |
   |---|---|---|---|
   | 1 | Reflexões & Estudos | `book` | Ativa; aba padrão ao abrir o site |
   | 2 | Em Desenvolvimento | `construction` | Visível mas desabilitada (texto `--color-text-tertiary`, sem clique) |
   | 3 | Músicas | `music` | Ativa |
   | 4 | Vídeos | `video` | Ativa |
   | 5 | Produtos Religiosos | `package` | Ativa |
   A aba selecionada recebe `aria-selected="true"`, peso `semibold`, texto `--color-text-primary`, realce sutil de fundo e indicador inferior em `--color-primary-500`. As demais ativas ficam em `--color-text-secondary` com hover suave.
4. **Conteúdo da aba** (seção 3), renderizado em container `role="tabpanel"` vinculado por `aria-labelledby` à aba ativa, com altura mínima reservada para evitar deslocamento brusco do rodapé.
5. **Dicas do Dia** — bloco fixo global, igual no encerramento de todas as abas (seção 4).

> **Rotas públicas complementares:** `/blog` exibe a listagem paginada completa de Reflexões & Estudos e `/blog/[slug]` exibe a leitura integral de um artigo publicado, mantendo a mesma identidade tipográfica, cromática e de cartões da página inicial.

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

## 3. Abas

### 3.1 Reflexões & Estudos (padrão)
- **Fonte de dados:** corresponde à aba administrativa **Posts/Artigos** (§2.1). **Somente registros com status Publicado** são exibidos. Registros em **Rascunho** não são exibidos no site público.
- **Cadastro ilimitado:** Não há limite de registros cadastrados na aba **Posts/Artigos** do painel, seja qual for o status. Todos os registros **publicados** dessa aba são elegíveis para exibição nesta aba pública, sem limite definido por essas regras.
- **Propósito:** publicar reflexões e estudos próprios e de outras pessoas do meio católico cristão; conteúdo com imagens e textos.
- **Título da seção:** "Reflexões & Estudos". **Subtítulo:** "Edifique sua fé com nossos artigos mais recentes".
- **Layout:** grade de 3 colunas x 2 linhas = 6 cartões por página (2 colunas em tablet, 1 coluna no mobile), com os artigos mais recentes. O limite de 6 é pedido **à API** (`/api/posts?response=v1&limit=6`), não cortado no cliente.
- **Ordenação:** a aba não tem seletor. A listagem usa `ORDER BY position ASC, created_at DESC`; como os posts nascem com `position = 0`, o resultado é "mais recentes" **até haver curadoria**. A curadoria pelo painel passou a funcionar em 2026-10-21 (a reordenação grava posições 1-based): depois que o dono ordenar os artigos no painel, a listagem pública segue a ordem curada (ver §7, item 10).
- **Cartão de post:** chips de categoria (quando o post tem categorias vinculadas; pill azul-claro, maiúsculas, display-only — sem link) → imagem de capa no topo (proporção ~ 370x200) → título (negrito) → resumo curto (cinza) → linha divisória → data (dd/mm/aaaa) à esquerda e link azul "Ler mais →" à direita. A listagem (`/api/posts` e o SSR de `/blog`) devolve `categories` (id, name, slug) por post; sem categorias vinculadas, nenhum chip aparece.
- **Link abaixo da grade:** "Ver todas as postagens" (texto centralizado, escuro) → lista completa de posts, em rota própria (`/blog`); a página de leitura individual (`/blog/[slug]`) vem de "Ler mais". Aparece somente quando há mais posts publicados do que os exibidos na grade.
- **Rodapé do cartão:** os cartões de uma mesma linha têm a mesma altura e o rodapé (data + "Ler mais →") fica **alinhado ao fundo** em todos eles. Resolvido pela correção global do `.content` do `BaseCard` (`display: flex; flex-direction: column`), que também alinha o rodapé dos cartões de música, vídeo e produto (ver §7, item 6).

### 3.2 Em Desenvolvimento
- **Estado:** desabilitada na interface. Nenhuma tela foi mostrada.
- **Ideias [PLANEJADO]:** Palavra Diária (leituras da Missa), breves informações de outros sites católicos, outros itens a definir.
- **Regra:** desabilitada e sem clique; não implementar nem habilitar sem pedido explícito do dono (ver §8).

### 3.3 Músicas
- **Fonte de dados:** corresponde à aba administrativa **Gestão de Músicas** (§2.1). **Somente registros com status Publicado** são exibidos. Registros em **Rascunho** não são exibidos no site público.
- **Cadastro ilimitado:** Não há limite de registros cadastrados na aba **Gestão de Músicas** do painel, seja qual for o status. Todos os registros **publicados** dessa aba são elegíveis para exibição nesta aba pública, sem limite definido por essas regras.
- **Propósito:** catálogo com links e informações que levam ao Spotify.
- **Controles:** campo de busca "Pesquisar por música ou artista..." (com ícone de lupa SVG à esquerda e botão interno circular de limpeza quando preenchido); seletor "Ordenar por:"; contador azul "Mostrando X de Y músicas" (`--color-primary-500`).
- **Ordenação:** o seletor abre com a opção **Padrão** selecionada, que equivale a ordenar por "Mais recentes" (`created_at DESC, id DESC`); as demais opções são **"Posicionados"** (curadoria manual do painel, `position ASC, id ASC`), "Mais antigos" (`created_at ASC, id ASC`), "A-Z" e "Z-A". A-Z e Z-A ignoram acentos e caixa (`lower(unaccent(titulo))`), independentemente da colação do banco, compartilhando a mesma expressão de Vídeos ([ADR-0033](adr/0033-videos-posicionados-indice-e-ordenacao-alfabetica.md)). Decisão de "Padrão" e "Posicionados" registrada em [ADR-0014](adr/0014-padrao-significa-mais-recentes-e-curadoria-como-posicionados.md).
- **Embed e fallback:** apenas **tracks** do Spotify são embeddáveis — a URL cadastrada no painel é convertida para `open.spotify.com/embed/track/<id>`. Quando a URL não é um track válido, o cartão **não renderiza iframe**: exibe "Prévia indisponível" e mantém o botão "Ouvir no Spotify" (com ícone SVG vetorial `music` e link externo para a URL original). O painel recusa cadastro/edição de URL não-track desde a origem. Decisão registrada em [ADR-0023](adr/0023-spotify-embed-limitado-a-tracks-com-fallback.md); §7, itens 1 e 9.
- **Grade:** 3 colunas x 4 linhas = 12 itens por página (2 colunas em tablet, 1 coluna no mobile).
- **Cartão de música:** player incorporado do Spotify (embed) → título → artista (`--color-text-secondary`) → botão externo "Ouvir no Spotify" alinhado ao fundo do cartão.
- **Paginação:** "❮ Anterior | Página X de Y (Z músicas) | Próxima ❯". "Anterior" fica desabilitado na página 1 e "Próxima" na última; oculta quando há ≤ 1 página.

### 3.4 Vídeos
- **Fonte de dados:** corresponde à aba administrativa **Gestão de Vídeos** (§2.1). **Somente registros com status Publicado** são exibidos. Registros em **Rascunho** não são exibidos no site público.
- **Cadastro ilimitado:** Não há limite de registros cadastrados na aba **Gestão de Vídeos** do painel, seja qual for o status. Todos os registros **publicados** dessa aba são elegíveis para exibição nesta aba pública, sem limite definido por essas regras.
- **Propósito:** catálogo de vídeos com links e incorporação do YouTube.
- **Controles:** campo de busca "Pesquisar por título ou descrição..." (com ícone de lupa SVG à esquerda e botão interno circular de limpeza); seletor "Ordenar por:"; contador azul "Mostrando X de Y vídeos".
- **Ordenação:** o seletor abre com a opção **Padrão** selecionada, que equivale a ordenar por "Mais recentes" (`created_at DESC`); as demais opções são **"Posicionados"** (curadoria manual do painel, `position ASC, id ASC`), "Mais antigos", "A-Z" e "Z-A". "Posicionados" foi exposta em 2026-11-01 (item AE, [ADR-0033](adr/0033-videos-posicionados-indice-e-ordenacao-alfabetica.md)), depois de Músicas e Produtos. A-Z e Z-A ignoram acentos e caixa (`lower(unaccent(titulo))`), independentemente da colação do banco.
- **Grade:** 3 colunas x 4 linhas = 12 itens por página (2 colunas em tablet, 1 coluna no mobile).
- **Cartão de vídeo:** player incorporado do YouTube (16:9) → título → descrição curta → **link externo "Assistir no YouTube"** (com ícone SVG vetorial) no rodapé do cartão: abre o vídeo canônico no YouTube em nova aba (`rel="noopener noreferrer"`), montado a partir do ID do vídeo, com a URL bruta como fallback. Decisão registrada em [ADR-0015](adr/0015-link-externo-assistir-no-youtube-no-cartao-de-video.md).
- **Paginação:** "❮ Anterior | Página X de Y (Z vídeos) | Próxima ❯". "Anterior" fica desabilitado na página 1 e "Próxima" na última; oculta quando há ≤ 1 página.

### 3.5 Produtos Religiosos
- **Fonte de dados:** corresponde à aba administrativa **Gestão de Produtos** (§2.1). **Somente registros com status Publicado** são exibidos. Registros em **Rascunho** não são exibidos no site público.
- **Cadastro ilimitado:** Não há limite de registros cadastrados na aba **Gestão de Produtos** do painel, seja qual for o status. Todos os registros **publicados** dessa aba são elegíveis para exibição nesta aba pública, sem limite definido por essas regras.
- **Propósito:** vitrine de produtos com links de afiliado/compra para Amazon, Mercado Livre e Shopee.
- **Controles:** campo de busca "Buscar produtos por nome..." (com ícone de lupa); filtros de preço "Mín (R$)" e "Máx (R$)"; seletor "Categoria:" (aparece quando há categorias publicadas, com "Todas" como padrão); seletor "Ordenar por:" (depois do preço e antes do botão "Limpar filtros"). O filtro de categoria consulta o facet `categories` da API (categorias distintas dos produtos publicados).
- **Ordenação:** o seletor abre com a opção **Padrão** selecionada, que equivale a ordenar por "Mais recentes" (`created_at DESC, id DESC`); as demais opções são **"Posicionados"** (curadoria manual do painel, `position ASC, id ASC`), "Mais antigos" (`created_at ASC, id ASC`), "Menor preço" (`price ASC, id ASC`) e "Maior preço" (`price DESC, id DESC`). A ordenação é feita no **servidor** (parâmetro `sort` na API), não no cliente, com desempate determinístico por `id` em todas as opções. A opção "Posicionados" passou a ser exposta em 2026-10-21, depois de corrigido o reordenamento no painel (ver §7, item 11). Decisão registrada em [ADR-0016](adr/0016-seletor-de-ordenacao-de-produtos-no-servidor.md).
- **Grade:** 3 colunas x 4 linhas = 12 itens por página (2 colunas em tablet, 1 coluna no mobile).
- **Cartão de produto:** imagem de capa/carrossel com abertura em lightbox → título → descrição curta (`flex: 1`, até 3 linhas) → preço formatado (`R$ X,XX`) e botão/link externo para a loja parceira alinhados ao fundo do cartão (`BaseCard`).
- **Contador:** "Mostrando X de Y produtos" ou "X resultados para \"termo\"" (quando há busca), em `--color-primary-500`.
- **Paginação:** "❮ Anterior | Página X de Y (Z produtos) | Próxima ❯". "Anterior" fica desabilitado na página 1 e a "Próxima" na última; a paginação só aparece quando há mais de uma página.
- **Cuidado:** links de afiliados exigem aviso de divulgação. Implementado em 2026-10-28 (decisão do dono): o rodapé da vitrine exibe "Alguns links são de afiliados: podemos receber uma comissão pelas compras realizadas, sem custo adicional para você."

## 4. Dicas do Dia (global)
- **Posição:** sempre no fim da página, em qualquer aba.
- **Título:** "Dicas do Dia". **Subtítulo:** "Pequenas porções de sabedoria, fé e oração para inspirar e fortalecer a sua jornada diária."
- **Conteúdo:** uma ou mais dicas. Cada dica é um cartão (`--color-bg-primary`, `--border-radius-xl`, sombra suave) com o texto entre aspas (`--color-text-secondary`) e, abaixo, o autor/fonte em destaque (`semibold`, `--color-text-primary`) alinhado ao fundo.
- **Comportamento com várias dicas:** até 3 dicas aparecem em grade (cartões de ~300 px); com 4 ou mais, o bloco vira um carrossel horizontal (320 px por item) com setas circulares de navegação (`44×44px`). O bloco tem paginação própria, de 6 dicas por página ("← Anterior | Página X de Y | Próximo →").
- **Regras:** o componente é compartilhado (um único componente reutilizado em todas as abas); nenhuma aba pode removê-lo (ver §8).

## 5. Fluxos do visitante
1. Abre o site (`/`) → vê a aba padrão Reflexões & Estudos com cabeçalho, banner e "Dicas do Dia".
2. Clica numa aba ativa → o conteúdo da aba troca suavemente no cliente sem recarregar nem deslocar cabeçalho, banner e "Dicas do Dia"; a URL permanece `/`.
3. Em Reflexões: "Ler mais →" navega para `/blog/[slug]` (leitura completa); "Ver todas as postagens" navega para `/blog` (listagem paginada), preservando a mesma identidade visual.
4. Em Músicas: busca, ordena, pagina; "Ouvir no Spotify" abre link externo em nova aba.
5. Em Vídeos: busca, ordena, pagina; "Assistir no YouTube" abre o vídeo canônico em nova aba.
6. Em Produtos: busca por nome, filtra por faixa de preço e categoria, ordena e pagina; clique abre a loja externa em nova aba.
7. Transição para área autenticada (`/login` → `/admin`): operadores que acessam o painel encontram a mesma família tipográfica, paleta clara e tokens de foco/componentes do site público, adaptados à estrutura lateral exclusiva do painel.

## 6. Origem dos dados
- Banner, posts, músicas, vídeos, produtos e dicas são **todos** gerenciados pelo painel administrativo — cada um tem sua aba de CRUD lá (posts, músicas, vídeos, produtos, dicas, usuários e cargos). A hipótese foi confirmada no código.
- **Fluxo de publicação:** Um registro é cadastrado em sua aba administrativa correspondente (Posts/Artigos, Gestão de Músicas, Gestão de Vídeos, Gestão de Produtos ou Gestão de Dicas). Pode permanecer como **Rascunho** ou ser alterado para **Publicado**. Enquanto em **Rascunho**, permanece disponível no painel, mas **não é exibido** na aba pública correspondente. Quando em **Publicado**, é **exibido** na aba pública correspondente (§2.1). Não há limite de cadastros nessas cinco abas, independentemente do status. A quantidade exibida no público corresponde a **todos os registros publicados** de cada respectiva aba, sem limite definido por essas regras.
- Persistência: PostgreSQL, acessado pelo pool `pg` (ver §1).

## 7. Pendências e bugs conhecidos (prioridade)
| # | Item | Prioridade | Status |
|---|---|---|---|
| 1 | 5 embeds do Spotify com "Page not found" e 1 com faixa errada (Caminho no Deserto) | Alta | **resolvido em 2026-10-27** — embed do Spotify passou a aceitar apenas tracks, com fallback "Prévia indisponível" + botão externo (ADR-0023); a base atual de teste só tem tracks válidos, e a faixa "Caminho no Deserto" não consta mais |
| 2 | 6/6 vídeos do YouTube indisponíveis; "Ousado Amor" bloqueado por direitos autorais | Alta | **obsoleto em 2026-10-27** — a tabela `videos` foi limpa pelo dono (0 registros): o dado que gerava o problema não existe mais. Se vídeos com link indisponível voltarem a ser cadastrados, o link externo "Assistir no YouTube" (§3.4) segue como mitigação |
| 3 | Capa quebrada no post "Fé em Tempos Difíceis" | Média | **obsoleto em 2026-10-27** — a tabela `posts` foi limpa pelo dono (0 registros): o post não existe mais |
| 4 | Dados de teste em "Dicas do Dia" ("Teste 10") | Média | **obsoleto em 2026-10-27** — a tabela `dicas` foi limpa pelo dono (0 registros): a dica de teste foi excluída |
| 5 | Banner principal sem imagem (placeholder) | Média | **resolvido em 2026-10-27** — a home usa `home_image_url` diretamente como `src` (filename único por upload → cache por URL seguro) e o fallback `/api/placeholder-image` perdeu o cache `immutable` de 24h e o cache em memória de 5 min do filename (causa do banner desatualizado após troca no painel) |
| 6 | Cartões de post com rodapé desalinhado | Baixa | **resolvido em 2026-10-21** — o `.content` do `BaseCard` passou a ser flex column (§3.1) |
| 7 | Aba "Em Desenvolvimento" sem definição | Planejamento | aberto |
| 8 | Produtos sem cadastro | Planejamento | **obsoleto/resolvido em 2026-10-31** — a ausência era de **dados de teste**, não do fluxo: com o banco de exercício, cadastro, edição, exclusão, persistência, Rascunho/Publicado e vitrine foram validados ao vivo. A validação encontrou dois defeitos reais **no painel** (não na vitrine): o GET admin de `/api/products` ignorava `search`, e a lista não pedia paginação — a API devolvia 10 itens por padrão e o 11º produto ficava invisível, com o contador "Total: 10". Ambos corrigidos em 2026-10-31 (busca server-side em nome/descrição + 10 itens por página, total do conjunto no contador). Estado do banco na data: 11 produtos de teste, 10 publicados e 1 rascunho (id 3, oculto na vitrine) |
| 9 | Considerar fallback quando embed falhar (mostrar só o botão/link) | Sugestão | **resolvido em 2026-10-27** — vídeos têm o link externo (§3.4, ADR-0015) e o embed do Spotify agora tem fallback (§3.3, ADR-0023) |
| 10 | Reordenar posts no painel está quebrado: a reordenação envia `position = 0` e o schema exige posição positiva → erro 400 | Alta | **resolvido em 2026-10-21** — o helper passou a enviar posições 1-based (`utils/reorder.js`); a curadoria por `position` passou a valer (§3.1) |
| 11 | Reordenar produtos no painel está quebrado: `PUT /api/products` não trata `action: "reorder"` | Alta | **resolvido em 2026-10-21** — `PUT /api/products` agora trata `action: "reorder"` (com invalidação de cache e registro de Auditoria); a opção "Posicionados" foi exposta no seletor (§3.5) |
| 12 | A rota `/blog` (lista completa) ignora a curadoria por `position`, mostra 9 por página e o CTA diz "Ler artigo completo →" (aqui o rótulo é "Ler mais →") | Média | **resolvido em 2026-10-27** — o SSR de `/blog` passou a usar a mesma camada de domínio e a mesma chave de cache da API `/api/posts` (`getRecentPosts`), obedecendo à curadoria por `position` (§3.1); o CTA voltou ao rótulo padrão "Ler mais →". Mantidos os 9 itens por página (tamanho ainda sem definição própria na documentação) |
| 13 | Chips de categoria do cartão de post nunca aparecem: a listagem pública de posts não devolve `categories` | Baixa | **resolvido em 2026-10-27** — CRUD completo de categorias no painel (ADR-0024): a listagem pública devolve `categories` por post e o cartão voltou a exibir os chips (display-only, sem link — não há página de arquivo por categoria) |
| 14 | Nome do site tem fontes divergentes: o painel grava `site_title` (consumido só pela home e pelo título do painel); o blog usa `siteConfig.name` (`lib/seo/config.js`, mesmo valor renderizado desde 2026-10-30); a chave `site_name` do seed/fallback não tem consumidores. Unificação completa (todo o SEO lendo settings do painel) exige config de SEO assíncrona | Planejamento | **resolvido em 2026-10-30 (ADR-0032)** — o blog (`/blog` e `/blog/[slug]`) lê `site_title` do banco no `getServerSideProps`, com a mesma chave de cache da API (`settings:site_title`, invalidada pelo PUT do painel) e fallback em `siteConfig.name`; home e painel já liam o setting. Exceção registrada: `_document.js` (metadados de app/PWA: `application-name`, `apple-mobile-web-app-title`, `canonical`, `lang`) continua estático — `_document` renderiza uma vez, sem dados por request, e são metadados de app, não SEO de página |
| 15 | `components/SEO/` (Head, StructuredData, index) é código morto: nenhum importador em `pages/`/`components/` (confirmado por grep em 2026-10-30); `_document.js` usa o Head nativo do Next. Remover (candidato a ferramenta de dead-code, ex.: knip). `lib/seo/config.js` NÃO é morto — o blog consome `siteConfig.name` | Baixa | **resolvido em 2026-10-30 (ADR-0032)** — `components/SEO/` removido (10 arquivos + 9 arquivos de teste + snapshots) e as 8 funções utilitárias mortas de `lib/seo/config.js` podadas (`getCanonicalUrl`, `getImageUrl`, `formatSchemaDate`, `truncateDescription`, `extractKeywords`, `sanitizeJsonLd`, `shouldIndex`, `generateBreadcrumb`); `siteUrl`/`siteConfig` permanecem (`_document.js` e fallback do blog) |
| 16 | Erros durante `npm run dev`: falta da página 404 personalizada gerando `PageNotFoundError` no Next.js (`Cannot find module for page: /404`) e `SyntaxError` no cache Redis ao ler strings primitivas (`site_title`) no SSR do blog | Alta | **resolvido em 2026-11-02** — criada rota canônica `pages/404.js`; configurada `automaticDeserialization: false` no Upstash Redis (`lib/infra/redis.js`); adicionado parse seguro e tolerante a strings no `lib/cache/cache.js`; isolada obtenção de `site_title` no SSR de `pages/blog/[slug].js` |
| 17 | Abas públicas (`ContentTabs`) e botão de mídia (`MusicCard`) utilizavam emojis como ícones (`📖`, `🏗️`, `🎵`, `🎬`, `📦`), divergindo do padrão de ícones SVG vetoriais de família única (`MASTER.md` §7 e §1.1 item 3) | Planejamento | **resolvido em 2026-11-07 (ADR-0036)** — emojis substituídos por ícones SVG vetoriais `AppIcon` (`components/UI/icons.js`, `24×24`, `strokeWidth="2"`, `aria-hidden="true"`) nas 5 abas públicas (`ContentTabs`), no botão "Ouvir no Spotify" (`MusicCard`) e nas lupas/botões de limpeza das galerias |
| 18 | Arredondamentos e elevações divergentes no CSS público e nos primitivos compartilhados: campos de busca, seletores e botões de paginação em Músicas/Vídeos/Produtos usavam pílula exagerada (`50px`); `Button.module.css` e `Input.module.css` usavam `12px` (`--border-radius-xl`) em vez de `8px` (`--border-radius-lg`); `BaseCard.module.css` usava `8px` em vez de `12px` (`--border-radius-xl`); e `Testimonials.module.css` usava hover `translateY(-8px)` mais brusco que `BaseCard` | Planejamento | **resolvido em 2026-11-07 (ADR-0036)** — unificados controles/botões/inputs/seletores/paginação em `--border-radius-lg` (`8px`), cartões e modais (`BaseCard`, `Testimonials`, `Modal`) em `--border-radius-xl` (`12px`) e elevação suave de hover em `translateY(-3px)` |
| 19 | Barras de pesquisa e filtros assimétricas entre Músicas, Vídeos e Produtos: faltava ícone de lupa em Músicas/Vídeos, faltava o par `outline` + halo tokenizado no `:focus` de `.searchInput`, os rótulos divergiam ("Ordenar:" vs "Ordenar por:") e Músicas coloria busca/select/contador/paginação em `#1DB954` | Planejamento | **resolvido em 2026-11-07 (ADR-0036)** — padronizadas barras de busca com lupa SVG, botão circular interno de limpeza em Músicas/Vídeos/Produtos, anel duplo azul em `:focus-visible`, rótulo visível `"Ordenar por:"` nas três galerias e semântica primária `--color-primary-500` em `MusicGallery` (removido também o arquivo legado sem consumidores `components/Features/Products/styles.js`) |

## 8. Regras de proteção do site público
- A ordem das abas, o nome do site e os textos fixos (título, subtítulos e rótulos) só mudam com pedido explícito do dono.
- A navegação principal do site público permanece **horizontal em abas** abaixo do banner (a barra lateral vertical recolhível é exclusiva do painel administrativo).
- O bloco "Dicas do Dia" continua no fim de todas as abas.
- A aba "Em Desenvolvimento" não é habilitada nem implementada sem pedido explícito do dono.
- Músicas levam ao Spotify, vídeos ao YouTube, produtos a Amazon/Mercado Livre/Shopee — não hospedar mídia própria.
- Manter a identidade visual compartilhada com o painel administrativo (§1.1 e `design-system/MASTER.md`), utilizando exclusivamente os tokens de `pages/styles/variables.css`.

> As regras de processo do agente estão em `AGENTS.md` §0.2.
