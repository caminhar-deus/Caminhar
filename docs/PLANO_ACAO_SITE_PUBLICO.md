# PLANO DE AÇÃO — Alinhamento doc × código do site público

> Escopo: `docs/ARQUITETURA_SITE_PUBLICO.md` (área pública) e o código que a implementa.
> Base: leitura integral do documento + varredura do código público (páginas, componentes de aba, APIs públicas, camada de domínio e CSS das grades).
> Data: 2026-10-21 · Status: **em execução — Fases 0–3 concluídas; Fases 4–5 em andamento** (nada commitado).
> Legenda: [PLANEJADO] = alvo ainda não implementado, informado pelo dono | [OBSERVADO] = visto nas capturas | [HIPÓTESE] = inferido, confirmar no código.

---

## 0. Status das fases (2026-10-21)

| Fase | Situação |
|---|---|
| **Fase 0 — Decisões do dono** | ✅ Concluída — F0.1 = **C (híbrido)**: mantém no documento o que é escolha legítima e corrige no código o que é inconsistência real. F0.2 = **A**: "Padrão" = Mais recentes (`created_at DESC`) e a curadoria por `position` vira a opção "Posicionados". F0.3 = **A**: 6 / 12 / 12 / 12. F0.4 = **A**: link externo "Assistir no YouTube" no cartão de vídeo. |
| **Fase 1 — Semântica e correções de impacto** | ✅ Concluída e conferida no diff (não só no relatório). |
| **Fase 2 — Contagem por página e eficiência** | ✅ Concluída e conferida no diff. |
| **Fase 3 — Documento (reconciliação)** | ✅ Concluída — `docs/ARQUITETURA_SITE_PUBLICO.md` reconciliado (§2.2, §3.1, §3.3–§3.5, §4, §5, §6, §7) com a data "Última atualização" atualizada; ADRs 0014, 0015 e 0016 criados em `docs/adr/`. |
| **Fase 4 — Bugs de curadoria no painel** | ✅ Concluída e conferida no diff — `utils/reorder.js` grava posições **1-based**; `pages/api/products.js` ganhou o branch `action: "reorder"` (validação Zod, invalidação de cache, registro de Auditoria); "Posicionados" exposto no seletor de Produtos (`position ASC, id ASC`); o reorder de posts/músicas/vídeos passou a gerar registro de Auditoria e o de vídeos passou a validar o payload. Reconciliação documental: `ARQUITETURA_SITE_PUBLICO.md` §3.1/§3.5/§7 (itens 10 e 11 → resolvidos) e `ARQUITETURA_SITE_PRIVADO.md` §8 (itens 11/12/13) + §9 (regra 1-based); ADR-0014 e ADR-0016 revisados. |
| **Fase 5 — Validação** | ✅ Concluída — `npm test` (193 suítes / 1379 testes, 0 falhas; 6 suítes / 73 testes skipped) e `npx eslint` (exit 0) verdes; revisão pelo Front-End-Checklist feita pelo @oracle com **todas** as correções aplicadas (foco dos seletores de ordenação, `aria-live` na paginação das 3 abas, alvo de toque 44px, remoção de `console.*`, guard global de `prefers-reduced-motion`). Follow-up documentado no ADR-0016: divergência de vocabulário do enum `sort` entre abas ("Padrão" = `default` em Músicas/Produtos × `recent` em Vídeos). |

Artefatos de apoio: `design-system/pages/home.md` (spec da página) e `design-system/MASTER.md` (regras globais) — decididos e atualizados pelo @designer.

---

## 1. Como este plano deve ser lido

Cada divergência tem um identificador (`D-xx`), a frase exata do documento, o comportamento real do código com a evidência `arquivo:linha`, e o impacto. Onde a correção exige escolha do dono, há **opções A/B/C**.

Regra do projeto aplicável (`AGENTS.md` §0.2, regra 4): *divergência entre documento e código → apontar ao usuário e aguardar a decisão antes de alterar algo*. O dono escutou as opções na Fase 0 e **aprovou as decisões** (ver §0 abaixo); a execução das fases é o que está em andamento.

---

## 2. Conformidades (o que está de acordo — não mexer)

| Item do documento | Código | Situação |
|---|---|---|
| §2.1 cabeçalho: título caixa alta, negrito, centralizado + subtítulo | `pages/styles/Home.module.css:17-24` (`text-transform: uppercase`, `font-weight: bold`), `pages/index.js:74-84` | Conforme |
| §2.2 hero 1100×320 | `pages/styles/Home.module.css:42-48` (`max-width:1100px; height:320px`) | Conforme |
| §2.2 placeholder "Imagem Principal (1100x320)…" | `pages/api/placeholder-image.js:116-126` (texto idêntico no SVG) | Conforme |
| §2.2 "a imagem vem do painel admin" | `pages/api/placeholder-image.js:29` (setting `home_image_url`) → `:50-57` (upload `hero-image-*` mais recente) | Conforme — o item 5 de §7 é falta de dado, não de código |
| §2.3 ordem das 5 abas e emojis | `components/Features/ContentTabs/index.js:11-17` | Conforme |
| §2.3 "Em Desenvolvimento" desabilitada, sem clique | `ContentTabs/index.js:49-56` (`disabled`, guarda no `onClick`) | Conforme |
| §2.4/§3 ordem dos blocos, Dicas do Dia no fim | `pages/index.js:95-97` | Conforme |
| §3.3 contador **verde** / §3.4 contador **azul** | `MusicGallery.module.css:211-213` (`#1DB954`), `VideoGallery.module.css:151-153` (`--color-primary-500`) | Conforme |
| §3.3/§3.4 paginação "❮ Anterior | Página X de Y (Z itens) | Próxima ❯" | `MusicGallery.js:165-188`, `VideoGallery.js:145-170` | Conforme |
| §5.2 troca de aba no cliente, URL não muda | `ContentTabs/index.js:9` (`useState`) | Conforme |
| §5.3 "Ver todas as postagens" → rota própria | `BlogSection.js:61` → `pages/blog/index.js` | Conforme (ver D-19) |

---

## 3. Divergências encontradas

### 3.1 Reflexões & Estudos (§3.1)

| ID | Documento diz | Código faz | Evidência | Impacto |
|---|---|---|---|---|
| **D-01** | "grade de 3 colunas x 2 linhas = **6 cartões por página**" | **3 cartões** (1 linha). A grade é fluida `repeat(auto-fill, minmax(300px,1fr))`; com container de 1280px (`--container-xl`) cabem 3 colunas, nunca 4 (4×300 + 3×32 = 1296 > 1280) | `ContentTabs/index.js:22` e `:32` (`limit={3}`) · `BlogSection.js:33-35` (`posts.slice(0, limit)`) · `Blog/styles/Blog.module.css:29-33` · `pages/styles/variables.css:303` | A home mostra **metade** do conteúdo previsto; 3 colunas × 1 linha deixa a seção visualmente rala |
| **D-02** | (implícito: página com os 6 artigos mais recentes) | A busca **não pede limite**: `/api/posts?response=v1` → default `limit=10` → corta para 3 no cliente. 7 posts são trafegados e descartados | `BlogSection.js:8` · `pages/api/posts.js:35-36` | Payload e tempo de wasted; a lista de retorno também limita a prévia |
| **D-03** | "com os artigos **mais recentes**" | SQL `ORDER BY position ASC, created_at DESC`. Posts nascem com `position = 0`, então hoje o resultado é "mais recentes" **por acaso** (empate em `position` → `created_at DESC`) | `lib/domain/shared-pagination.js:91` · `lib/domain/posts.js:69` | Fragilidade: se a curadoria por `position` passar a valer (ver B-01), a home deixa de ser "mais recentes" sem que o doc perceba |
| **D-04** | §3.1: "a área de rodapé deve ter altura igual em todos os cartões e ficar alinhada ao fundo"; §7 item 6 (Baixa, **aberto**) | O **mecanismo não funciona**: `.excerpt { flex: 1 }` e `.footer { margin-top: auto }` estão dentro de `.content`, que **não é** container flex (`flex: 1` + padding, sem `display:flex`) | `Blog/styles/Blog.module.css:56-62` e `:64-71` · `components/UI/BaseCard.module.css:139-142` · `components/UI/BaseCard.js:95-99` | Bug **ainda aberto**: cartões com título em 2 linhas Raising o rodapé (é o item 6 de §7) |

### 3.2 Músicas (§3.3)

| ID | Documento diz | Código faz | Evidência | Impacto |
|---|---|---|---|---|
| **D-05** | "3 colunas x 4 linhas = **12 itens por página**" | **6 itens** (3 colunas × 2 linhas) | `MusicGallery.js:21` (`limit=6`) · `Music/styles/MusicGallery.module.css:7-12` | Metade do previsto |
| **D-06** | Seletor abre com "**Padrão**"; opções: "Mais antigos", "A-Z", "Z-A" | Rótulo "**Ordem padrão**"; opções: "Ordem padrão", "Mais recentes", "A-Z" — **faltam "Mais antigos" e "Z-A"** | `MusicGallery.js:7-11` · `pages/api/musicas.js:19` (`z.enum(['default','recent','alpha'])`) · `lib/domain/musicas.js:96-100` | Opções prometidas não existem (backend também não as aceita) |
| **D-07** | "**Padrão** … equivale a ordenar por **Mais recentes**" | `default` = `position ASC, created_at DESC`. Como `position` é `MAX(position)+1` a cada criação, `position ASC` = **ordem de criação ⇒ os mais antigos primeiro** | `lib/domain/musicas.js:96-100` e `:33-34` | **Inverte a expectativa do visitante**: a aba abre com o item mais antigo no topo |

### 3.3 Vídeos (§3.4)

| ID | Documento diz | Código faz | Evidência | Impacto |
|---|---|---|---|---|
| **D-08** | "3 x 4 = **12 por página**" | **6 por página** (3 colunas × 2 linhas) | `VideoGallery.js:23` (`limit: '6'`) · `Video/styles/VideoGallery.module.css:129-134` | Metade do previsto |
| **D-09** | Seletor abre com "**Padrão**" (= Mais recentes); demais: "Mais antigos", "A-Z", "Z-A" | Não existe "Padrão": o default do seletor **é** "Mais recentes" (`sort=recent` → `created_at DESC`) e as outras 3 opções batem | `VideoGallery.js:7-12` e `:17` · `pages/api/videos.js:9-14` e `:33,40` | Divergência **de nomenclatura**; o comportamento é o esperado |
| **D-10** | Cartão termina com "link externo '**Assistir no YouTube**'" | O cartão **não tem** link externo: só o player incorporado (`LazyIframe`) | `components/Features/Video/VideoCard.js:14-53` · `components/Performance/LazyIframe.js:227-248` | Agrava a pendência §7 item 2 (6/6 vídeos indisponíveis): sem player, o visitante **não tem caminho** para o vídeo |

### 3.4 Produtos Religiosos (§3.5)

| ID | Documento diz | Código faz | Evidência | Impacto |
|---|---|---|---|---|
| **D-11** | Seletor "Ordenar:" com "Padrão", "Mais antigos", "Menor preço", "Maior preço" | **Não existe seletor de ordenação** — só busca e faixa de preço | `components/Features/Products/ProductList.js:88-178` · `pages/api/products.js:12-44` (não lê `sort`) · `lib/domain/products.js:51` | Falta funcional prometida pelo doc |
| **D-12** | "Padrão … equivale a **Mais recentes**" | Ordem fixa `position ASC, id ASC`; `position` = `MAX+1` na criação ⇒ **mais antigos primeiro**. Não há como o visitante corrigir | `lib/domain/products.js:51` e `:109-119` | **Inverte a expectativa**, igual a D-07 |
| **D-13** | "3 colunas x 4 linhas = 12 por página" | 12 por página, porém **4 colunas × 3 linhas** (grade fluida `minmax(280px,1fr)` em container de 1280px) | `ProductList.js:16` (`itemsPerPage = 12`) · `ProductList.js:194` | Mesmo total, **formato diferente** das demais abas (que são 3 colunas) |
| **D-14** | Paginação "❮ Anterior \| Página X de Y (Z produtos) \| Próxima ❯" | Botões **numerados** (até 5) + Anterior/Próxima, **sem o contador "(Z produtos)"** | `ProductList.js:213-291` | Único padrão de paginação fora do padrão das outras três abas |

### 3.5 Dicas do Dia (§4)

| ID | Documento diz | Código faz | Evidência | Impacto |
|---|---|---|---|---|
| **D-15** | "[PLANEJADO] uma ou mais dicas… **Com várias dicas, o comportamento (lista, carrossel ou aleatória) ainda não foi definido**" | Comportamento **já definido e implementado**: ≤3 dicas = grade; >3 = carrossel horizontal com setas; paginação de 6 por página | `Testimonials/index.js:8`, `:66`, `:94-131`, `:133-155` | Documento **atrasado**: descreve como indefinido algo já implementado |
| **D-16** | "Cada dica é um **cartão largo**" | Cartão de ~300px na grade (`auto-fit minmax(300px,1fr)`) e **320px** no carrossel — não é largo | `Testimonials/Testimonials.module.css:31-34` e `:61-64` | Divergência visual (o doc pede "largo") |
| **D-17** | (não menciona paginação) | As dicas têm paginação própria ("← Anterior \| Página X de Y \| Próximo →") | `Testimonials/index.js:133-155` | Doc incompleto |

### 3.6 Achados laterais (não são divergência de texto, mas entram no plano)

| ID | Achado | Evidência | Impacto |
|---|---|---|---|
| **D-18** | **Reordenar posts no admin está quebrado**: `handleReorder` manda `position = offset + index` (começa em **0**) e o schema do admin exige `position` **positiva** → 400 em toda reordenação da página 1 | `utils/reorder.js:19` · `pages/api/admin/posts.js:32-40` e `:71-86` | A curadoria por `position` (de onde vem o "Padrão") não é confiável |
| **D-19** | **Reordenar produtos no admin está quebrado**: o painel manda `PUT /api/products` com `action:'reorder'`, mas esse handler só sabe atualizar por `id` → 400 "ID inválido" | `components/Admin/AdminProducts.js:160-161` · `pages/api/products.js:115-146` | Idem |
| **D-20** | O cartão de post renderiza **categorias**, mas a API pública de posts não retorna `categories` (SELECT público não faz join) → os chips **nunca aparecem** | `PostCard.js:20-28` · `lib/domain/shared-pagination.js:26` | Código morto na frente pública |
| **D-21** | A rota `/blog` (lista completa) ordena por `created_at DESC`, **ignorando** a curadoria por `position`, e mostra 9 por página; o CTA diz "Ler artigo completo →" (o doc §3.1 descreve "Ler mais →") | `pages/blog/index.js:10`, `:15`, `:62` | Inconsistência entre home e lista; rótulo divergente do doc |

---

## 4. Consolidação: o que o documento erra sobre ordenação

O doc repete, em §3.3, §3.4 e §3.5, que "**Padrão** equivale a **Mais recentes**". No código, "Padrão" é a ordem de **curadoria manual** (`position ASC`), e `position` cresce a cada criação — logo, na prática, `position ASC` = **mais antigos primeiro**. A única aba em que "Padrão ≡ Mais recentes" é verdade é **Vídeos** (porque ali o default do seletor já é `recent` = `created_at DESC`, sem `position`).

| Aba | Opção default no seletor | SQL efetivo | "Padrão" = "Mais recentes"? |
|---|---|---|---|
| Reflexões | (não há seletor) | `position ASC, created_at DESC` | Hoje sim (por empate em `position`), frágil |
| Músicas | "Ordem padrão" (`default`) | `position ASC, created_at DESC` | **Não** — mais antigos primeiro |
| Vídeos | "Mais recentes" (`recent`) | `created_at DESC` | Sim |
| Produtos | (não há seletor) | `position ASC, id ASC` | **Não** — mais antigos primeiro, sem correção possível |

> **Decisão (F0.2 = A):** em Músicas e Produtos, o "Padrão" passa a ser `created_at DESC` (Mais recentes) e a curadoria por `position` vira a opção **"Posicionados"**. Em Vídeos, "Padrão" e "Mais recentes" passam a ser a mesma opção (hoje o default já é `recent`) — o doc §3.4 só precisa do ajuste de nomenclatura (D-09).

---

## 5. Plano de Ação

### Fase 0 — Decisões do dono

> **Decidido em 2026-10-21:**
> **F0.1 = C (Híbrido)** — mantém-se no doc o que é escolha legítima de produto (grade fluida, curadoria por `position`) e corrige-se no código o que é inconsistência real: D-07, D-12, D-11, D-14, D-10, D-04 e D-01/D-05/D-08.
> **F0.2 = A ("Padrão" = Mais recentes, `created_at DESC`)** — a curadoria manual por `position` deixa de ser o "Padrão" e passa a ser uma **opção extra** no seletor ("Posicionados"), o que também dá sentido ao drag & drop do painel (e exige D-18/D-19 para funcionar).
> **F0.3 = A (6 / 12 / 12 / 12)** — Reflexões 6, Músicas 12, Vídeos 12, Produtos 12, como o doc §3.1/3.3/3.4/3.5 promete.
> **F0.4 = A (implementar o link "Assistir no YouTube")** — mudança estrutural: doc §3.4 + ADR.

| # | Decisão | Opções |
|---|---|---|
| ~~F0.1~~ | ~~Fonte da verdade~~ | **DECIDIDO: C (Híbrido)** |
| ~~F0.2~~ | ~~Semântica de "Padrão"~~ | **DECIDIDO: A — "Padrão" = `created_at DESC`; curadoria vira opção "Posicionados"** |
| ~~F0.3~~ | ~~Contagem por página~~ | **DECIDIDO: A — 6 / 12 / 12 / 12** |
| ~~F0.4~~ | ~~Link "Assistir no YouTube"~~ | **DECIDIDO: A — implementar o link no cartão de vídeo** |
### Fase 1 — Semântica e correções de impacto (sem mudança visual) · P0

| # | Ação | Arquivos | Depende de |
|---|---|---|---|
| **F1.1** | **Músicas — "Padrão" = Mais recentes** (D-07): `default` passa a ser `created_at DESC`; a curadoria manual vira a opção **"Posicionados"** (`position ASC`), que passa a ser a 1ª opção do seletor (posição do dono) | `lib/domain/musicas.js:96-100` · `pages/api/musicas.js:19` (enum + `z.enum`) · `MusicGallery.js:7-11` | F0.2 (OK) |
| **F1.2** | **Produtos — dar ordenação** (D-11/D-12): `sort` no endpoint público + `sort` na chave de cache + `ORDER BY` por `price`/`created_at`/`position` + seletor na UI com "Padrão" (= `created_at DESC`), "Mais antigos", "Posicionados", "Menor preço", "Maior preço" | `pages/api/products.js:12-44` · `lib/domain/products.js:14-60` · `ProductList.js` | F0.2 (OK) |
| **F1.3** | **Padronizar a paginação de Produtos no padrão das demais abas** (D-14): substituir os botões numerados por `❮ Anterior \| Página X de Y (Z produtos) \| Próxima ❯`, com "Anterior" desabilitado na página 1 | `ProductList.js:213-291` | F0.1 (OK) + @designer |
| **F1.4** | Corrigir o rodapé dos cartões de post (D-04): `.content` do BaseCard precisa ser `display:flex; flex-direction:column` (afeta todos os cartões) **ou** solução restrita ao PostCard | `components/UI/BaseCard.module.css:139-142` **ou** `Blog/styles/Blog.module.css` | — (bug §7 item 6) |
| **F1.5** | Devolver `categories` na listagem pública de posts (D-20) ou remover o bloco de categorias do PostCard | `lib/domain/shared-pagination.js:26` **ou** `PostCard.js:20-28` | — |
| **F1.6** | **Link externo "Assistir no YouTube" no cartão de vídeo** (D-10): link real (`<a href target="_blank" rel="noopener noreferrer">`) apontando para a URL do YouTube, abaixo da descrição. Precisa do ID/URL canônico do vídeo (o `LazyIframe` só recebe a URL de embed) | `components/Features/Video/VideoCard.js:14-53` · `lib/media/youtube.js` | F0.4 (OK) + @designer |

> **Dependência a observar (F0.2 = A):** a opção **"Posicionados"** só tem sentido se o reordenamento por `position` funcionar no painel. Hoje ele está quebrado para **posts** (D-18) e **produtos** (D-19). Ou a opção "Posicionados" entra junto com a Fase 4, ou entra depois — em qualquer caso, **não** deve ser exposta antes de D-18/D-19, para não prometer uma curadoria que o painel não consegue gravar.

### Fase 2 — Contagem por página e eficiência · P1

| # | Ação | Arquivos | Depende de |
|---|---|---|---|
| **F2.1** | **Reflexões: 6 por página, pedidos à API** (D-01/D-02): `BlogSection` passa a pedir `limit` na query (`/api/posts?response=v1&limit=6`) em vez de baixar 10 e cortar para 3 no cliente; o `limit` do componente passa a ser o valor pedido à API | `BlogSection.js:8`, `:33-35` · `ContentTabs/index.js:22` | F0.3 (OK) |
| **F2.2** | **Músicas/Vídeos: 6 → 12 por página** (D-05/D-08): `limit` no request das duas galerias (12 = 3 colunas × 4 linhas, como o doc §3.3/§3.4 descreve) | `MusicGallery.js:21` · `VideoGallery.js:23` | F0.3 (OK) |
| **F2.3** | **Grades: 12 itens em Produtos** (D-13) — o total já bate; falta decidir o formato. O doc §3.5 diz "3 colunas x 4 linhas", o código faz 4 colunas x 3 linhas (grade fluida `minmax(280px,1fr)`). Sob F0.1 (Híbrido), a grade fluida é legítima: o doc passa a descrever o comportamento real (até 4 colunas) — alternativa: fixar 3 colunas para equalar as outras abas | CSS das grades das 4 abas · `ProductList.js:194` | F0.3 (OK) + @designer |

### Fase 3 — Documento (reconciliação) · P1

| # | Ação | Detalhe |
|---|---|---|
| **F3.1** | Reescrever §3.1, §3.3, §3.4, §3.5 e §4 conforme o estado real | Contagem por página (6/12/12/12), semântica do "Padrão" (= `created_at DESC`), nova opção **"Posicionados"** nos seletores de Músicas e Produtos, seletor de ordenação de Produtos, link **"Assistir no YouTube"** no cartão de vídeo, padrão de paginação único (❮ Anterior \| Página X de Y (Z itens) \| Próxima ❯), formato real da grade de Produtos, comportamento das dicas (grade ≤3 / carrossel >3 + paginação) e largura real do cartão de dica |
| **F3.2** | Atualizar §7 (pendências) | Itens 5 e 6: 5 é falta de dado (banner) e 6 depende de F1.4; acrescentar os achados D-10, D-11, D-18, D-19, D-20, D-21 |
| **F3.3** | Atualizar "Última atualização" e descrever a estrutura nova | Mudanças estruturais: nova opção "Posicionados", novo seletor de ordenação em Produtos, novo link no cartão de vídeo → doc da área + data (`AGENTS.md` §0.2 regra 5) |
| **F3.4** | Registrar ADR para cada decisão estrutural | (1) "Padrão" = `created_at DESC` + curadoria como opção "Posicionados"; (2) link externo "Assistir no YouTube" no cartão; (3) seletor de ordenação de Produtos. Convenções em `docs/adr/README.md` + `docs/adr/template.md` |

### Fase 4 — Bugs de curadoria no painel (dependem da doc. do site privado) · P2

| # | Ação | Arquivos |
|---|---|---|
| **F4.1** | Corrigir o `position` 0 no reordenamento de posts (D-18): `offset + index + 1` ou aceitar 0 no schema | `utils/reorder.js:19` · `pages/api/admin/posts.js:32-40` |
| **F4.2** | Implementar `action:'reorder'` em `PUT /api/products` (D-19) | `pages/api/products.js:115-146` |
| **F4.3** | Tornar o drag & drop coerente entre as 4 abas (posts, músicas, vídeos, produtos) | `components/Admin/Admin*.js` |

> **Atenção:** F4 toca o **painel administrativo**. Exige ler `docs/ARQUITETURA_SITE_PRIVADO.md` (§9, regras de proteção) antes de mexer.

### Fase 5 — Validação (obrigatória antes de fechar)

| # | Ação |
|---|---|
| **F5.1** | Rodar a suíte existente (`npm test`) e os E2E afetados |
| **F5.2** | Revisão pelo Front-End-Checklist (skill local) do que mudou — foco em a11y (nome acessível dos seletores, `aria-current`), i18n e SEO dos novos controles |
| **F5.3** | Conferir o comportamento em 320px, 768px e desktop (as grades mudam de coluna em cada faixa) |
| **F5.4** | Validar o fluxo completo do visitante (§5 do doc) em cada aba |

---

## 6. Sequenciamento sugerido

1. **F0** — dono decide (bloqueia o resto).
2. **F1** — correções de semântica e bugs reais (F1.1–F1.6; F1.3 e F1.6 dependem do @designer).
3. **F2** — contagem por página e formato das grades (F2.1–F2.3; F2.3 depende do @designer).
4. **F3** — reconciliação do documento + ADR (fecha a divergência formalmente).
5. **F4** — curadoria do painel (área privada, doc separada).
6. **F5** — validação.

> **Bloqueio de F4 → F1:** a opção "Posicionados" (F1.1/F1.2) só pode ser exposta ao visitante depois que o reordenamento por `position` funcionar no painel (D-18 em posts, D-19 em produtos — Fase 4).

**Estimativa de esforço**: F1 ≈ 1 dia de trabalho effective (6 itens pequenos e localizados); F2 ≈ 0,5–1 dia (com design); F3 ≈ 0,5 dia; F4 ≈ 0,5 dia.

---

## 7. O que **não** foi feito (e por quê)

- Nenhuma linha de código, CSS, documento de arquitetura ou ADR foi alterada — o pedido foi de análise + plano.
- Nada em `docs/ARQUITETURA_SITE_PUBLICO.md` foi "corrigido" unilateralmente: a regra do projeto exige que a divergência seja apontada e a decisão aguardada (`AGENTS.md` §0.2, regra 4).
- A aba "Em Desenvolvimento" não foi tocada (§8 do doc: só muda com pedido explícito).
- O item 5 de §7 (banner sem imagem) não foi tratado como bug de código: a leitura do `pages/api/placeholder-image.js` mostra que o banner **está** ligado ao painel; o que falta é o dado (upload ou setting `home_image_url`).
