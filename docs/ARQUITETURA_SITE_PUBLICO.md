# ARQUITETURA DO SITE — LINK PÚBLICO

> Escopo: apenas a área pública (qualquer visitante). O painel administrativo está documentado em `docs/ARQUITETURA_SITE_PRIVADO.md`.
> Fonte: 12 capturas de tela do site em desenvolvimento + descrição do dono do projeto.
> Última atualização: 2026-10-27
> Legenda: [PLANEJADO] = alvo ainda não implementado, informado pelo dono | [OBSERVADO] = visto nas imagens | [HIPÓTESE] = inferido, confirmar antes de assumir.

---

## 1. Visão geral

- **Nome:** O CAMINHAR COM DEUS
- **Slogan:** "Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã"
- **Público:** Católico Cristão.
- **Idioma:** Português (pt-BR). Moeda: R$. Data no formato dd/mm/aaaa.
- **Tecnologia:** Next.js com **Pages Router** (não existe App Router — decisão registrada em `docs/adr/0002-nextjs-pages-router.md`) e React. Estilização com **CSS Modules** e variáveis CSS, sem Tailwind.
- **Dados:** PostgreSQL acessado pelo pool `pg`, com SQL parametrizado e **sem ORM** (`docs/adr/0003-postgres-without-orm.md`); cache em dois níveis, Redis com fallback em memória (`docs/adr/0004-two-level-cache-with-memory-fallback.md`).
- **Validação e autenticação:** Zod na validação de entrada; JWT em cookie http-only com RBAC (`docs/adr/0005-jwt-http-only-rbac.md`).
- **Ferramentas de runtime e build:** Node.js e npm; next-sitemap na geração do sitemap e web-vitals nas métricas; `sharp` no processamento de imagens e `formidable` nos uploads.
- **Qualidade e testes:** Jest e Testing Library nos testes unitários e de integração, Testcontainers para o PostgreSQL, Cypress no E2E e k6 em carga, performance e segurança; ESLint, dependency-cruiser e knip na qualidade do código.
- **Layout:** página única com abas; fundo cinza muito claro; fonte sem serifa (aparência Inter); cartões brancos com borda/sombra suave; cor de destaque azul (aba ativa, "Ler mais", contador dos vídeos); verde para Spotify/contador de músicas.

## 2. Estrutura da página (de cima para baixo)

Todas as abas compartilham o mesmo esqueleto:

1. **Cabeçalho** — título "O CAMINHAR COM DEUS" (caixa alta, negrito, centralizado) + subtítulo.
2. **Banner principal (hero)** — área 1100x320 px. Hoje mostra o placeholder "Imagem Principal (1100x320) — Faça upload de uma imagem no painel administrativo". A imagem vem do painel admin — o link com o painel **já funciona** (a home lê a configuração `home_image_url`, alimentada pelo upload de imagem `hero-image-*` mais recente); o que falta é o **dado**, não a integração (ver §7, item 5). É comum a todas as abas.
3. **Barra de abas (navegação)** — 5 abas com emoji:
   | Ordem | Aba | Emoji | Estado |
   |---|---|---|---|
   | 1 | Reflexões & Estudos | 📖 | Ativa; aba padrão ao abrir o site |
   | 2 | Em Desenvolvimento | 🏗️ | Visível mas desabilitada (texto acinzentado) |
   | 3 | Músicas | 🎵 | Ativa |
   | 4 | Vídeos | 🎬 | Ativa |
   | 5 | Produtos Religiosos | 📦 | Ativa |
   A aba selecionada fica em negrito, texto escuro, com sublinhado azul. As demais ficam cinza.
4. **Conteúdo da aba** (seção 3).
5. **Dicas do Dia** — bloco fixo, igual em todas as abas (seção 4).

### 2.1 Mapeamento entre abas (site privado × site público)

A correspondência entre as abas administrativas e suas abas públicas de exibição é a seguinte:

| Site privado — aba administrativa | Site público — aba de exibição |
|---|---|
| Posts/Artigos | Reflexões & Estudos |
| Gestão de Músicas | Músicas |
| Gestão de Vídeos | Vídeos |
| Gestão de Produtos | Produtos Religiosos |
| Dicas do Dia | Dicas do Dia |

Esse mapeamento deve ser mantido de forma consistente em toda a documentação.

## 3. Abas

### 3.1 Reflexões & Estudos (padrão)
- **Fonte de dados:** corresponde à aba administrativa **Posts/Artigos** (§2.1). **Somente registros com status Publicado** são exibidos. Registros em **Rascunho** não são exibidos no site público.
- **Cadastro ilimitado:** Não há limite de registros cadastrados na aba **Posts/Artigos** do painel, seja qual for o status. Todos os registros **publicados** dessa aba são elegíveis para exibição nesta aba pública, sem limite definido por essas regras.
- **Propósito:** [PLANEJADO] publicar reflexões e estudos próprios e de outras pessoas do meio católico cristão; conteúdo com imagens e textos.
- **Título da seção:** "Reflexões & Estudos". **Subtítulo:** "Edifique sua fé com nossos artigos mais recentes".
- **Layout:** grade de 3 colunas x 2 linhas = 6 cartões por página (2 colunas em tablet, 1 coluna no mobile), com os artigos mais recentes. O limite de 6 é pedido **à API** (`/api/posts?response=v1&limit=6`), não cortado no cliente.
- **Ordenação:** a aba não tem seletor. A listagem usa `ORDER BY position ASC, created_at DESC`; como os posts nascem com `position = 0`, o resultado é "mais recentes" **até haver curadoria**. A curadoria pelo painel passou a funcionar em 2026-10-21 (a reordenação grava posições 1-based): depois que o dono ordenar os artigos no painel, a listagem pública segue a ordem curada (ver §7, item 10).
- **Cartão de post:** imagem de capa no topo (proporção ~ 370x200) → título (negrito) → resumo curto (cinza) → linha divisória → data (dd/mm/aaaa) à esquerda e link azul "Ler mais →" à direita.
- **Link abaixo da grade:** "Ver todas as postagens" (texto centralizado, escuro) → lista completa de posts, em rota própria; a página de leitura individual vem de "Ler mais". Aparece somente quando há mais posts publicados do que os exibidos na grade.
- **Rodapé do cartão:** os cartões de uma mesma linha têm a mesma altura e o rodapé (data + "Ler mais →") fica **alinhado ao fundo** em todos eles. Resolvido pela correção global do `.content` do `BaseCard` (`display: flex; flex-direction: column`), que também alinha o rodapé dos cartões de música, vídeo e produto (ver §7, item 6).

### 3.2 Em Desenvolvimento
- **Estado:** desabilitada na interface. Nenhuma tela foi mostrada.
- **Ideias [PLANEJADO]:** Palavra Diária (leituras da Missa), breves informações de outros sites católicos, outros itens a definir.
- **Regra:** desabilitada e sem clique; não implementar nem habilitar sem pedido explícito do dono (ver §8).

### 3.3 Músicas
- **Fonte de dados:** corresponde à aba administrativa **Gestão de Músicas** (§2.1). **Somente registros com status Publicado** são exibidos. Registros em **Rascunho** não são exibidos no site público.
- **Cadastro ilimitado:** Não há limite de registros cadastrados na aba **Gestão de Músicas** do painel, seja qual for o status. Todos os registros **publicados** dessa aba são elegíveis para exibição nesta aba pública, sem limite definido por essas regras.
- **Propósito:** [PLANEJADO] catálogo com links e informações que levam ao Spotify.
- **Controles:** campo de busca "Pesquisar por música ou artista..."; seletor "Ordenar:"; contador verde "Mostrando X de Y músicas".
- **Ordenação:** o seletor abre com a opção **Padrão** selecionada, que equivale a ordenar por "Mais recentes" (`created_at DESC`); as demais opções são **"Posicionados"** (curadoria manual do painel, `position ASC`), "Mais antigos", "A-Z" e "Z-A". Decisão registrada em [ADR-0014](adr/0014-padrao-significa-mais-recentes-e-curadoria-como-posicionados.md).
- **Embed e fallback:** apenas **tracks** do Spotify são embeddáveis — a URL cadastrada no painel é convertida para `open.spotify.com/embed/track/<id>`. Quando a URL não é um track válido, o cartão **não renderiza iframe**: exibe "Prévia indisponível" e mantém o botão "🎵 Ouvir no Spotify" (link externo para a URL original). O painel recusa cadastro/edição de URL não-track desde a origem. Decisão registrada em [ADR-0023](adr/0023-spotify-embed-limitado-a-tracks-com-fallback.md); §7, itens 1 e 9.
- **Grade:** 3 colunas x 4 linhas = 12 itens por página.
- **Cartão de música:** player incorporado do Spotify (embed) → título → artista (cinza) → botão verde "🎵 Ouvir no Spotify" (link externo).
- **Paginação:** "❮ Anterior | Página X de Y (Z músicas) | Próxima ❯". "Anterior" fica desabilitado na página 1.

### 3.4 Vídeos
- **Fonte de dados:** corresponde à aba administrativa **Gestão de Vídeos** (§2.1). **Somente registros com status Publicado** são exibidos. Registros em **Rascunho** não são exibidos no site público.
- **Cadastro ilimitado:** Não há limite de registros cadastrados na aba **Gestão de Vídeos** do painel, seja qual for o status. Todos os registros **publicados** dessa aba são elegíveis para exibição nesta aba pública, sem limite definido por essas regras.
- **Propósito:** [PLANEJADO] links de vídeos do YouTube.
- **Controles:** campo de busca "Pesquisar por título ou descrição..."; seletor "Ordenar:"; contador azul "Mostrando X de Y vídeos".
- **Ordenação:** o seletor abre com a opção **Padrão** selecionada, que equivale a ordenar por "Mais recentes"; as demais opções são "Mais antigos", "A-Z" e "Z-A".
- **Grade:** 3 x 4 = 12 por página.
- **Cartão de vídeo:** player incorporado do YouTube (16:9) → título → descrição curta → **link externo "Assistir no YouTube"** no rodapé do cartão: abre o vídeo canônico no YouTube em nova aba (`rel="noopener noreferrer"`), montado a partir do ID do vídeo, com a URL bruta como fallback. Decisão registrada em [ADR-0015](adr/0015-link-externo-assistir-no-youtube-no-cartao-de-video.md).
- **Paginação:** "❮ Anterior | Página X de Y (Z vídeos) | Próxima ❯". "Anterior" fica desabilitado na página 1.

### 3.5 Produtos Religiosos
- **Propósito:** [PLANEJADO] vitrine de produtos com links de afiliado/compra para Amazon, Mercado Livre e Shopee.
- **Controles:** campo de busca "Buscar produtos por nome..." (com ícone de lupa); filtros de preço "Mín (R$)" e "Máx (R$)"; seletor "Ordenar por:" (depois do preço e antes do botão "Limpar filtros").
- **Ordenação:** o seletor abre com a opção **Padrão** selecionada, que equivale a ordenar por "Mais recentes" (`created_at DESC`); as demais opções são **"Posicionados"** (curadoria manual do painel, `position ASC, id ASC`), "Mais antigos", "Menor preço" e "Maior preço". A ordenação é feita no **servidor** (parâmetro `sort` na API), não no cliente. A opção "Posicionados" passou a ser exposta em 2026-10-21, depois de corrigido o reordenamento no painel (ver §7, item 11). Decisão registrada em [ADR-0016](adr/0016-seletor-de-ordenacao-de-produtos-no-servidor.md).
- **Grade:** 3 colunas x 4 linhas = 12 itens por página (2 colunas em tablet, 1 coluna no mobile).
- **Contador:** "Mostrando X de Y produtos" ou "X resultados para \"termo\"" (quando há busca).
- **Paginação:** "❮ Anterior | Página X de Y (Z produtos) | Próxima ❯". "Anterior" fica desabilitado na página 1 e a "Próxima" na última; a paginação só aparece quando há mais de uma página.
- **Cuidado:** links de afiliados exigem aviso de divulgação. [HIPÓTESE] definir texto antes de publicar produtos.

## 4. Dicas do Dia (global)
- **Posição:** sempre no fim da página, em qualquer aba.
- **Título:** "Dicas do Dia". **Subtítulo:** "Pequenas porções de sabedoria, fé e oração para inspirar e fortalecer a sua jornada diária."
- **Conteúdo:** uma ou mais dicas. Cada dica é um cartão com o texto entre aspas e, abaixo, o autor/fonte em negrito.
- **Comportamento com várias dicas:** até 3 dicas aparecem em grade (cartões de ~300 px); com 4 ou mais, o bloco vira um carrossel horizontal (320 px por item) com setas de navegação. O bloco tem paginação própria, de 6 dicas por página ("← Anterior | Página X de Y | Próximo →").
- **Regras:** o componente é compartilhado (um único componente reutilizado em todas as abas); nenhuma aba pode removê-lo (ver §8).

## 5. Fluxos do visitante
1. Abre o site → vê Reflexões & Estudos.
2. Clica numa aba → conteúdo da aba troca sem mudar cabeçalho, banner e Dicas do Dia. A troca é no cliente; a URL não muda.
3. Em Reflexões: "Ler mais →" abre o post; "Ver todas as postagens" abre a lista.
4. Em Músicas: busca, ordena, pagina; "Ouvir no Spotify" abre link externo.
5. Em Vídeos: busca, ordena, pagina; "Assistir no YouTube" abre o vídeo no YouTube.
6. Em Produtos: busca por nome e faixa de preço, ordena e pagina; clique abre a loja externa.

## 6. Origem dos dados
- Banner, posts, músicas, vídeos, produtos e dicas são **todos** gerenciados pelo painel administrativo — cada um tem sua aba de CRUD lá (posts, músicas, vídeos, produtos, dicas, usuários e cargos). A hipótese foi confirmada no código.
- **Fluxo de publicação:** Um registro é cadastrado em sua aba administrativa correspondente (Posts/Artigos, Gestão de Músicas, Gestão de Vídeos, Gestão de Produtos ou Dicas do Dia). Pode permanecer como **Rascunho** ou ser alterado para **Publicado**. Enquanto em **Rascunho**, permanece disponível no painel, mas **não é exibido** na aba pública correspondente. Quando em **Publicado**, é **exibido** na aba pública correspondente (§2.1). Não há limite de cadastros nessas cinco abas, independentemente do status. A quantidade exibida no público corresponde a **todos os registros publicados** de cada respectiva aba, sem limite definido por essas regras.
- Persistência: PostgreSQL, acessado pelo pool `pg` (ver §1).

## 7. Pendências e bugs conhecidos (prioridade)
| # | Item | Prioridade | Status |
|---|---|---|---|
| 1 | 5 embeds do Spotify com "Page not found" e 1 com faixa errada (Caminho no Deserto) | Alta | **resolvido em 2026-10-27** — embed do Spotify passou a aceitar apenas tracks, com fallback "Prévia indisponível" + botão externo (ADR-0023); a base atual de teste só tem tracks válidos, e a faixa "Caminho no Deserto" não consta mais |
| 2 | 6/6 vídeos do YouTube indisponíveis; "Ousado Amor" bloqueado por direitos autorais | Alta | aberto — mitigado pelo link externo "Assistir no YouTube" no cartão (§3.4) |
| 3 | Capa quebrada no post "Fé em Tempos Difíceis" | Média | aberto |
| 4 | Dados de teste em "Dicas do Dia" ("Teste 10") | Média | aberto |
| 5 | Banner principal sem imagem (placeholder) | Média | aberto — **falta de dado**, não de integração: a home já lê `home_image_url` do painel (§2.2) |
| 6 | Cartões de post com rodapé desalinhado | Baixa | **resolvido em 2026-10-21** — o `.content` do `BaseCard` passou a ser flex column (§3.1) |
| 7 | Aba "Em Desenvolvimento" sem definição | Planejamento | aberto |
| 8 | Produtos sem cadastro | Planejamento | aberto |
| 9 | Considerar fallback quando embed falhar (mostrar só o botão/link) | Sugestão | **resolvido em 2026-10-27** — vídeos têm o link externo (§3.4, ADR-0015) e o embed do Spotify agora tem fallback (§3.3, ADR-0023) |
| 10 | Reordenar posts no painel está quebrado: a reordenação envia `position = 0` e o schema exige posição positiva → erro 400 | Alta | **resolvido em 2026-10-21** — o helper passou a enviar posições 1-based (`utils/reorder.js`); a curadoria por `position` passou a valer (§3.1) |
| 11 | Reordenar produtos no painel está quebrado: `PUT /api/products` não trata `action: "reorder"` | Alta | **resolvido em 2026-10-21** — `PUT /api/products` agora trata `action: "reorder"` (com invalidação de cache e registro de Auditoria); a opção "Posicionados" foi exposta no seletor (§3.5) |
| 12 | A rota `/blog` (lista completa) ignora a curadoria por `position`, mostra 9 por página e o CTA diz "Ler artigo completo →" (aqui o rótulo é "Ler mais →") | Média | aberto |
| 13 | Chips de categoria do cartão de post nunca aparecem: a listagem pública de posts não devolve `categories` | Baixa | aberto — o bloco foi removido do cartão público até existir CRUD de categorias |

## 8. Regras de proteção do site público
- A ordem das abas, o nome do site e os textos fixos (título, subtítulos e rótulos) só mudam com pedido explícito do dono.
- O bloco "Dicas do Dia" continua no fim de todas as abas.
- A aba "Em Desenvolvimento" não é habilitada nem implementada sem pedido explícito do dono.
- Músicas levam ao Spotify, vídeos ao YouTube, produtos a Amazon/Mercado Livre/Shopee — não hospedar mídia própria.

> As regras de processo do agente estão em `AGENTS.md` §0.2.
