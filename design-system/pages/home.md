# Página pública inicial (home) — spec de implementação (override do MASTER)

> Última atualização: 2026-10-21 (decisões D1–D5 do checklist front-end: rodapé do cartão de produto, foco dos seletores de ordenação, alvo de toque 44px, `aria-live` na paginação, guard global de `prefers-reduced-motion`; exposição de "Posicionados" no seletor de Produtos — F4.2 concluído, opção exposta, legenda auxiliar não implementada).
> Override de `design-system/MASTER.md`. Tudo aqui vence o MASTER; o que não for mencionado segue o MASTER. Stack: Next.js Pages Router + React + CSS Modules + variáveis CSS (sem Tailwind). Idioma da interface: pt-BR. Tokens: sempre a variável, nunca hex.

> Escopo: a página única com abas (`pages/index.js` + `components/Features/ContentTabs`). Esta spec cobre os 6 itens definidos no `docs/PLANO_ACAO_SITE_PUBLICO.md` (F1.3, F1.4, F1.6, F2.3 + decisões de design) e não toca lógica de negócio nem o painel administrativo.

## 0. Tokens herdados do MASTER (usar, não reinventar)

- Cores: `--color-primary-500` (#2563eb) ação; hover `--color-hover-primary`; texto `--color-text-primary/secondary/tertiary`; fundo `--color-bg-primary/secondary`; borda `--color-border-light`; foco `--color-focus-primary` + `--color-focus-ring`; desabilitado `--color-disabled-background/text`; erro `--color-error-*`.
- Tipografia: títulos `--font-family-display`; UI `--font-family-body`; escala `--font-size-sm/base/lg`; pesos `medium/semibold`.
- Espaçamento: `--spacing-*`, `--gap-*`, `--padding-input-md`, `--padding-button-md`.
- Raios: campos/botões `--border-radius-lg` (8px); cartões `--border-radius-xl` (12px); pill só em badges `--border-radius-full`.
- Foco visível (obrigatório, par): `outline: 2px solid var(--color-focus-primary); outline-offset: 2px; box-shadow: var(--color-focus-ring);` em `:focus-visible` (ou `:focus` quando o foco é programático). No campo com erro: `outline: 2px solid var(--color-error-500)`. Nunca `outline: none` seco.
- Movimento: `--duration-normal/moderate`, `--transition-all`; `prefers-reduced-motion: reduce` desliga tudo.
- Breakpoints: 375 / 768 / 1024 / 1440. Toque ≥ 44×44px.

---

## 1. Seletor de ordenação de Produtos (novo) — F1.2 + design

### 1.1 Posição na tela
- Mesma barra de filtros existente (`ProductList`), em `searchRow` equivalente: **Busca** (max 400px) → **Preço Mín/Máx** (max 300px) → **Ordenar por:** → **Limpar filtros** (quando houver filtro ativo).
- O seletor entra **após** os campos de preço e **antes** do botão "Limpar filtros", na mesma linha, com `flex-wrap: wrap` no container (já existe).
- Não criar uma segunda linha dedicada em desktop.

### 1.2 Rótulo e controle
- Label visível (não só `aria-label`): `<label htmlFor="sort-select-products" className={styles.sortLabel}>Ordenar por:</label>`.
- Controle: `<select id="sort-select-products" aria-label="Ordenar produtos" className={styles.sortSelect}>`.
- Altura 44px (decisão D3 — alvo de toque ≥ 44×44px do MASTER §6), raio `--border-radius-lg` (8px), borda 1px `--color-border-light`, fundo `--color-bg-primary`, texto `--color-text-primary`, `font-size: var(--font-size-sm)`, `font-weight: var(--font-weight-medium)`.
- Chevron (SVG data-URI, cor `--color-text-tertiary`) à direita; `appearance: none`.
- Hover: borda `--color-primary-500`. Focus: declaração exata do par de foco (azul) — não só troca de borda.
- Desabilitado durante troca de página (`pageLoading`): `opacity: var(--opacity-50)`, `cursor: not-allowed`, `pointer-events: none`.

### 1.3 Opções (ordem exata, visíveis hoje)
1. **Padrão** — value `default` — equivale a `created_at DESC` (Mais recentes).
2. **Posicionados** — value `positioned` — curadoria manual por `position ASC, id ASC` (`orderByMap.positioned` em `lib/domain/products.js`). Exposto desde 2026-10-21 (F4.2 concluído): o reordenamento por arrastar no painel grava posições 1-based e `PUT /api/products` aceita `action: "reorder"`. A curadoria vem do painel administrativo; a ordem é definida lá, não pelo usuário final.
3. **Mais antigos** — value `oldest` — `created_at ASC`.
4. **Menor preço** — value `price_asc` — `price ASC`.
5. **Maior preço** — value `price_desc` — `price DESC`.

> Estado atual (2026-10-21): a opção está exposta e o seletor não exibe legenda auxiliar abaixo do select. A legenda "Ordem definida no painel administrativo." (12px, `--color-text-tertiary`) foi **considerada e não aprovada** (decisão D6, abaixo) — o rótulo "Posicionados" já comunica a origem da ordenação, e a legenda seria ruído visual repetido a cada troca de aba. Se no futuro a curadoria precisar ser sinalizada, reabrir esta decisão.

### 1.4 Mobile (≤ 640px)
- A barra de filtros já quebra (`flex-wrap`). O wrapper do seletor passa a ocupar linha própria: `flex: 1 1 100%`, `max-width: 400px` (mesmo teto da busca), select `width: 100%`.
- Label permanece visível acima/à esquerda do select (inline, `white-space: nowrap`), nunca placeholder como label.

### 1.5 Texto do contador (searchInfo)
- Adicionar bloco de resultado abaixo da barra de filtros, no mesmo padrão das outras abas:
  - Busca ativa: `"{N} resultado{N≠1?'s':''} para \"{termo}\""`.
  - Sem busca: `"Mostrando {visíveis} de {total} produto{total≠1?'s':''}"`.
- Cor `--color-primary-500` (azul) para o contador, `--font-size-sm`, `font-weight: medium`, alinhado à esquerda, padding horizontal `var(--spacing-2)`.
- Ocultar quando carregando ou sem resultados.

### 1.6 Foco/hover/desabilitado
- Hover: borda `--color-primary-500`, fundo inalterado.
- Focus: `outline: 2px solid var(--color-focus-primary); outline-offset: 2px; box-shadow: var(--color-focus-ring);` + borda `--color-primary-500`.
- Desabilitado (pageLoading): conforme 1.2.
- Nota (decisão D2.1): o seletor de Vídeos hoje viola a norma (apenas anel cru `0 0 0 3px rgba(52,152,219,0.1)` + `outline: none`). Corrigir aplicando a declaração exata acima + borda `--color-primary-500`, tokenizando o `box-shadow` em `--color-focus-ring`.

---

## 2. Seletor de Músicas — renomear e reposicionar opções — F1.1

### 2.1 Lista final (ordem exata)
1. **Padrão** — value `default` — Mais recentes (`created_at DESC`).
2. **Posicionados** — value `positioned` — curadoria manual (`position ASC`).
3. **Mais antigos** — value `oldest` — `created_at ASC`.
4. **A-Z** — value `alpha` — `titulo ASC`.
5. **Z-A** — value `alpha_desc` — `titulo DESC`.

> "Mais recentes" deixa de existir como opção separada (virou "Padrão"). O default do estado `sortBy` passa a ser `default`.

### 2.2 Posicionados: mesmo select, sem distinção visual
- **Recomendação: entra no mesmo `<select>`**, sem badge, cor ou agrupamento próprio. O rótulo "Posicionados" já comunica.
- Legenda auxiliar "Ordem definida no painel administrativo." (12px, `--color-text-tertiary`) abaixo do select quando `positioned` estiver ativo: **não aprovada** (decisão D6). O rótulo "Posicionados" já comunica a origem da ordenação; a legenda seria ruído visual repetido a cada troca de aba e não é requisito de acessibilidade. Estado atual do código: sem legenda. Se no futuro a curadoria precisar ser sinalizada, reabrir esta decisão.
- "Posicionados" está exposto em Músicas e (desde 2026-10-21) em Produtos; a curadoria funciona no painel para ambas as abas. A ressalva "pode ser exposto hoje" não se aplica mais.

### 2.3 Demais ajustes visuais
- Rótulo do controle permanece "Ordenar:" (label visível, `htmlFor="sort-select"`). `aria-label="Ordenar músicas"`.
- Controle existente (pill, borda verde Spotify `#1DB954`) mantém-se para Músicas (cor de destaque da aba). Altura 44px (decisão D3), mesmo padrão de Produtos. Hover: verde Spotify. Focus: borda verde Spotify `#1DB954` no `:focus` (diferença de marca intencional, registrada) + indicador de foco azul do sistema — `outline: 2px solid var(--color-focus-primary); outline-offset: 2px; box-shadow: var(--color-focus-ring);` — nunca verde no indicador. A diferença de borda entre abas é intencional; o indicador de foco é único (azul).
- Opções faltantes hoje ("Mais antigos", "Z-A") passam a existir (backend também precisa aceitar — fora do escopo da spec, mas o enum do endpoint deve ser atualizado).

---

## 3. Link externo "Assistir no YouTube" no cartão de vídeo — F1.6 + F0.4

### 3.1 Posição no cartão
- **Abaixo da descrição**, no rodapé do cartão (área `.content` do BaseCard, depois do `<p>` de descrição), alinhado à esquerda. **Não** sobrepor o player: evita bloquear controles e problemas de contraste sobre a thumbnail.
- Quando a BaseCard tiver `.footer` próprio (prop `footer`), pode-se usar; caso contrário, renderizar dentro do children como último elemento com `margin-top: auto` (o `.content` vira flex column — item 6) para colar no fundo.

### 3.2 Texto, ícone e estilo
- Texto: **"Assistir no YouTube"** (sem emoji — proibido como ícone).
- Ícone: SVG vetorial (família única, traço uniforme) de "seta saindo de caixa" ou "play externo", `width="16" height="16"`, `aria-hidden="true"`, `focusable="false"`, cor herdada do link, à esquerda do texto com `gap: var(--spacing-2)`.
- Estilo de link: `--color-text-link` (#2563eb), `font-size: var(--font-size-sm)`, `font-weight: var(--font-weight-semibold)`, `text-decoration: none`. Hover: `--color-text-link-hover` + `text-decoration: underline`. Focus: par padrão (outline azul + halo).
- Alvo de toque ≥ 44px: `display: inline-flex; align-items: center; min-height: 44px; padding: var(--spacing-2) 0; gap: var(--spacing-2)`.

### 3.3 Atributos e segurança
- `<a href={canonicalUrl} target="_blank" rel="noopener noreferrer">`.
- `aria-label` não é necessário (o texto já é descritivo); se desejado, `aria-label="Assistir {titulo} no YouTube"`.

### 3.4 Contraste
- Texto azul `--color-text-link` (#2563eb) sobre fundo branco do cartão: 4,95:1 ≥ 4,5:1 (AA). Hover `#1d4ed8`: 5,9:1. OK.
- Como o link fica fora do player, não há contraste sobre imagem.

### 3.5 Responsivo (telas pequenas)
- Em ≤ 480px, o link mantém-se alinhado à esquerda, ocupando a largura disponível do cartão; `min-height: 44px` preserva toque. Não centralizar (manter alinhamento com título/descrição).
- Descrição com `display: -webkit-box; -webkit-line-clamp: 3` (já existe) permanece; o link não é cortado.

### 3.6 URL canônica (qual campo/tipo usar)
- Dado de origem: `video.url_youtube` (string, pode ser watch/embed/youtu.be).
- Conversão: usar `extractYoutubeId` de `@/lib/media/youtube` para obter o ID de 11 caracteres; montar `https://www.youtube.com/watch?v=${id}`.
- Fallback: se `extractYoutubeId` retornar `null`, usar `video.url_youtube` cru como `href` (degradação graciosa, sem quebrar).
- Não usar `video.thumbnail` nem qualquer campo de embed. O link aponta para o **vídeo canônico** (watch), nunca para o embed.

---

## 4. Paginação de Produtos no padrão do documento — F1.3

### 4.1 Padrão (global — ver MASTER §7)
- Substituir os botões numerados por: **`❮ Anterior` | `Página X de Y (Z produtos)` | `Próxima ❯`**, idêntico a Músicas/Vídeos.
- Alinhamento: `display: flex; justify-content: center; align-items: center; gap: 1rem` (16px), `margin-top: 2rem`, `padding: 1rem 0`.
- Acessibilidade: o elemento `.pageInfo` recebe `aria-live="polite"` e `aria-atomic="true"` (decisão D4) — `<span className={styles.pageInfo} aria-live="polite" aria-atomic="true">…</span>` — vale para as três abas.
- "Anterior" desabilitado na página 1; "Próxima" desabilitada na última página.
- Contador: `Página {currentPage} de {totalPages}` + `(Z produto{Z≠1?'s':''})` em `--color-text-tertiary`, `--font-size-xs`.
- Durante troca de página (`pageLoading`): ambos os botões `disabled`, `opacity: var(--opacity-50)`, `cursor: not-allowed`.

### 4.2 Quando existe só 1 página
- **Esconder** a paginação (não renderizar) quando `totalPages <= 1`, coerente com Músicas/Vídeos. (Alternativa de manter no DOM com `visibility: hidden` foi descartada em favor da consistência entre abas.)

### 4.3 Responsivo (320px)
- Em ≤ 480px: `flex-wrap: wrap; gap: 0.75rem`; `pageInfo` ocupa linha própria (`width: 100%; text-align: center; order: -1`) acima dos dois botões, que ficam lado a lado e centralizados.
- Botões com padding reduzido `0.4rem 1rem`, fonte 0.8rem.
- Em 320px a linha "Página 1 de 5 (60 produtos)" quebra em duas linhas se necessário; não truncar. O contador `(Z produtos)` pode quebrar para a linha seguinte sem perda.

### 4.4 Classes
- Reutilizar `.pagination`, `.pageButton`, `.pageButtonDisabled`, `.pageInfo`, `.totalInfo` de `ProductList.module.css` (criar se não existirem, copiando o padrão de `MusicGallery.module.css`), removendo os estilos de botões numerados (`.pageButtonActive` permanece para outros usos, mas não é usado aqui).

---

## 5. Grade de Produtos com 12 itens (F2.3)

### 5.1 Decisão: fixar 3 colunas
- **Escolha (b): fixar 3 colunas** (`grid-template-columns: repeat(3, 1fr)`), igualando Músicas e Vídeos, em vez de manter a grade fluida `repeat(auto-fill, minmax(280px, 1fr))` (4 colunas).
- Justificativa: a home é uma página com abas trocadas no cliente; grades de colunas diferentes entre abas criam "saltos" visuais ao trocar de aba e cartões de larguras inconsistentes. Com 3 colunas, o cartão de produto fica ~380px (em container de 1280px), confortável para imagem + preço + botão. A fluidez de 4 colunas não compensa a perda de coerência.
- Consequência no doc: §3.5 passa a dizer "3 colunas x 4 linhas = 12 por página", como já prometido.

### 5.2 Responsivo (igual às outras abas)
- ≥ 1025px: 3 colunas, gap 2rem.
- 769–1024px: 2 colunas, gap 1.5rem.
- ≤ 768px: 1 coluna, gap 1.5rem.
- ≤ 480px: 1 coluna, gap 1.5rem; ≤ 360px gap 1.25rem.

### 5.3 Coerência com Reflexões
- Recomendação (não obrigatória nesta entrega): aplicar o mesmo `repeat(3, 1fr)` à grade de Reflexões (hoje `repeat(auto-fill, minmax(300px, 1fr))`, que já resulta em 3 colunas em 1280px). Isso unifica as 4 abas em uma única forma de grade. Se mantida a fluidez, documentar que resulta em 3 colunas no desktop.

---

## 6. Rodapé dos cartões alinhado ao fundo (F1.4)

### 6.1 Resultado visual esperado
- Todos os cartões de uma mesma linha têm a **mesma altura** (o grid já estica; o `.card` é `display: flex; flex-direction: column`).
- O rodapé (data + "Ler mais →" no post; botão no música; link do YouTube no vídeo; preço/botão no produto) **cola no fundo** do cartão em todas as linhas.
- A linha divisória superior do rodapé (`border-top`) fica **alinhada horizontalmente** entre cartões adjacentes, mesmo quando títulos ocupam 1 ou 2 linhas.

### 6.2 Decisão: correção global no BaseCard
- **Global**, não restrita ao PostCard. O BaseCard já possui `.footer` com `margin-top: auto`; o bug é que `.content` não é container flex, então o `auto` não tem efeito.
- Alteração única em `components/UI/BaseCard.module.css`:
  ```css
  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: var(--spacing-4); /* mantém */
  }
  ```
- Efeito: ativa o empurrão para o fundo em **todos** os cartões (PostCard, ProductCard, MusicCard, VideoCard) que usam `margin-top: auto` em um filho ou o `.footer` próprio do BaseCard.
- Para que cada cartão realmente alinhe o rodapé, o elemento que deve "absorver" o espaço extra precisa ter `flex: 1`:
  - PostCard: `.excerpt` já tem `flex: 1` ✓.
  - ProductCard: `.productDescription` **mantém** `flex: 1` (decisão D1 — alternativa (a)). O preço (`.productPrice`) e o `.linksContainer` ficam colados no fundo via `flex-grow` da descrição; **não** adicionar `margin-top: auto` em `.productPrice` nem em `.linksContainer`. O vão (se houver) permanece dentro da caixa da descrição, entre o texto clampeado e o preço — consistente com o PostCard (`.excerpt` + `.footer` com `margin-top: auto`). Mudar para `margin-top: auto` no rodapé (alternativa (b)) não melhora visualmente e quebra a simetria de padrão entre PostCard e ProductCard.
  - MusicCard: o botão do Spotify já é o último elemento; adicionar `margin-top: auto` no `.spotifyButton` (ou wrapper) para colar no fundo.
  - VideoCard: o link "Assistir no YouTube" (item 3) recebe `margin-top: auto` para colar no fundo; a descrição pode ter `flex: 1` opcional.

### 6.4 Regra final do rodapé do cartão de produto (decisão D1)
- `.productDescription { flex: 1; display: -webkit-box; -webkit-line-clamp: 3; overflow: hidden; }` (manter `flex: 1`).
- `.productPrice` e `.linksContainer`: **sem** `margin-top: auto`.
- Efeito: em cartão de altura esticada (linha do grid), a caixa da descrição cresce; o texto clampeado fica no topo da caixa; preço + links colam no fundo. O vão fica dentro da caixa da descrição (espaço em branco entre o texto e o preço) — idêntico ao PostCard. Sem corte de texto (line-clamp limita a contagem de linhas).
- Risco baixo: `.content` virar flex column não quebra filhos que não usam flex (comportamento padrão de bloco preservado dentro de flex column). Verificar ProductCard (lightbox fora do card) não é afetado, pois está fora do `.content`.

### 6.3 Reduced motion
- Sem animação nova; apenas layout. Sem impacto.

---

## 7. Textos de interface (PT-BR) — consolidado

- Produtos — label do seletor: "Ordenar por:"; aria-label do select: "Ordenar produtos"; id: `sort-select-products`.
- Produtos — opções: "Padrão", "Posicionados", "Mais antigos", "Menor preço", "Maior preço" (expõe "Posicionados" desde 2026-10-21).
- Produtos — contador: "Mostrando X de Y produto(s)" / "X resultado(s) para \"termo\"".
- Músicas — opções: "Padrão", "Posicionados", "Mais antigos", "A-Z", "Z-A".
- Vídeos — link: "Assistir no YouTube".
- Paginação (todas as abas): "❮ Anterior", "Página X de Y (Z itens)", "Próxima ❯".

## 8. O que o doc (ARQUITETURA_SITE_PUBLICO.md) deverá passar a dizer (para outro agente reconciliar)

- §3.3 Músicas: opções do seletor "Padrão | Posicionados | Mais antigos | A-Z | Z-A"; "Padrão" = Mais recentes; "Posicionados" exposto (curadoria funciona no painel).
- §3.4 Vídeos: "Padrão" = Mais recentes (renomear "Mais recentes" → "Padrão"); cartão termina com link externo "Assistir no YouTube".
- §3.5 Produtos: novo seletor "Ordenar por:" com "Padrão, Posicionados, Mais antigos, Menor preço, Maior preço" (expõe "Posicionados" desde 2026-10-21); grade "3 colunas x 4 linhas = 12"; paginação padrão "❮ Anterior | Página X de Y (Z produtos) | Próxima ❯".
- §3.1 Reflexões: rodapé alinhado ao fundo (bug corrigido globalmente no BaseCard).
- §7 item 6: pode ser marcado como resolvido após F1.4.

## 9. O que NÃO decidi / limites desta spec

- F4.2 concluído em 2026-10-21 — "Posicionados" exposto no seletor de Produtos (decisão do dono, ADR-0014/ADR-0016). A opção está na 2ª posição, com `position ASC, id ASC`, e a curadoria vem do painel administrativo.
- A unificação da grade de Reflexões em `repeat(3,1fr)` é recomendação, não obrigação (item 5.3).
- A legenda auxiliar de "Posicionados" (item 2.2) foi **não aprovada** (decisão D6): o rótulo "Posicionados" já comunica a origem da ordenação; a legenda seria ruído visual e não é requisito de acessibilidade. Estado atual: sem legenda. Reabrir se a curadoria precisar ser sinalizada.
- Não especifico cores novas nem tokens novos — tudo reusa o MASTER.
- Não altero `docs/ARQUITETURA_SITE_PUBLICO.md` (reconciliação é de outro agente).