# ARQUITETURA DO SITE — LINK PÚBLICO

> Escopo: apenas a área pública (qualquer visitante). O painel administrativo está documentado em `docs/ARQUITETURA_SITE_PRIVADO.md`.
> Fonte: 12 capturas de tela do site em desenvolvimento + descrição do dono do projeto.
> Última atualização: 2026-10-21
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
2. **Banner principal (hero)** — área 1100x320 px. Hoje mostra o placeholder "Imagem Principal (1100x320) — Faça upload de uma imagem no painel administrativo". A imagem vem do painel admin. É comum a todas as abas.
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

## 3. Abas

### 3.1 Reflexões & Estudos (padrão)
- **Propósito:** [PLANEJADO] publicar reflexões e estudos próprios e de outras pessoas do meio católico cristão; conteúdo com imagens e textos.
- **Título da seção:** "Reflexões & Estudos". **Subtítulo:** "Edifique sua fé com nossos artigos mais recentes".
- **Layout:** [PLANEJADO] grade de 3 colunas x 2 linhas = 6 cartões por página, com os artigos mais recentes.
- **Cartão de post:** imagem de capa no topo (proporção ~ 370x200) → título (negrito) → resumo curto (cinza) → linha divisória → data (dd/mm/aaaa) à esquerda e link azul "Ler mais →" à direita.
- **Link abaixo da grade:** "Ver todas as postagens" (texto centralizado, escuro) → lista completa de posts, em rota própria; a página de leitura individual vem de "Ler mais".
- **Observação de layout:** quando o título do cartão ocupa duas linhas, o rodapé dele fica mais alto que o dos demais. A área de rodapé deve ter altura igual em todos os cartões e ficar alinhada ao fundo.

### 3.2 Em Desenvolvimento
- **Estado:** desabilitada na interface. Nenhuma tela foi mostrada.
- **Ideias [PLANEJADO]:** Palavra Diária (leituras da Missa), breves informações de outros sites católicos, outros itens a definir.
- **Regra:** desabilitada e sem clique; não implementar nem habilitar sem pedido explícito do dono (ver §8).

### 3.3 Músicas
- **Propósito:** [PLANEJADO] catálogo com links e informações que levam ao Spotify.
- **Controles:** campo de busca "Pesquisar por música ou artista..."; seletor "Ordenar:"; contador verde "Mostrando X de Y músicas".
- **Ordenação:** [PLANEJADO] o seletor abre com a opção **Padrão** selecionada, que equivale a ordenar por "Mais recentes"; as demais opções são "Mais antigos", "A-Z" e "Z-A".
- **Grade:** 3 colunas x 4 linhas = 12 itens por página.
- **Cartão de música:** player incorporado do Spotify (embed) → título → artista (cinza) → botão verde "🎵 Ouvir no Spotify" (link externo).
- **Paginação:** "❮ Anterior | Página X de Y (Z músicas) | Próxima ❯". "Anterior" fica desabilitado na página 1.

### 3.4 Vídeos
- **Propósito:** [PLANEJADO] links de vídeos do YouTube.
- **Controles:** campo de busca "Pesquisar por título ou descrição..."; seletor "Ordenar:"; contador azul "Mostrando X de Y vídeos".
- **Ordenação:** o seletor abre com a opção **Padrão** selecionada, que equivale a ordenar por "Mais recentes"; as demais opções são "Mais antigos", "A-Z" e "Z-A".
- **Grade:** 3 x 4 = 12 por página.
- **Cartão de vídeo:** player incorporado do YouTube (16:9) → título → descrição curta → link externo "Assistir no YouTube".
- **Paginação:** "❮ Anterior | Página X de Y (Z vídeos) | Próxima ❯". "Anterior" fica desabilitado na página 1.

### 3.5 Produtos Religiosos
- **Propósito:** [PLANEJADO] vitrine de produtos com links de afiliado/compra para Amazon, Mercado Livre e Shopee.
- **Controles:** campo de busca "Buscar produtos por nome..." (com ícone de lupa); filtros de preço "Mín (R$)" e "Máx (R$)".
- **Ordenação:** [PLANEJADO] o seletor abre com a opção **Padrão** selecionada, que equivale a ordenar por "Mais recentes"; as demais opções são "Mais antigos", "Menor preço" e "Maior preço".
- **Grade:** 3 colunas x 4 linhas = 12 itens por página.
- **Paginação:** "❮ Anterior | Página X de Y (Z produtos) | Próxima ❯". "Anterior" fica desabilitado na página 1.
- **Cuidado:** links de afiliados exigem aviso de divulgação. [HIPÓTESE] definir texto antes de publicar produtos.

## 4. Dicas do Dia (global)
- **Posição:** sempre no fim da página, em qualquer aba.
- **Título:** "Dicas do Dia". **Subtítulo:** "Pequenas porções de sabedoria, fé e oração para inspirar e fortalecer a sua jornada diária."
- **Conteúdo:** [PLANEJADO] uma ou mais dicas. Cada dica é um cartão largo com texto entre aspas e, abaixo, o autor/fonte em negrito.
- **Regras:** o componente é compartilhado (um único componente reutilizado em todas as abas); nenhuma aba pode removê-lo (ver §8). Com várias dicas, o comportamento (lista, carrossel ou aleatória) ainda não foi definido.

## 5. Fluxos do visitante
1. Abre o site → vê Reflexões & Estudos.
2. Clica numa aba → conteúdo da aba troca sem mudar cabeçalho, banner e Dicas do Dia. A troca é no cliente; a URL não muda.
3. Em Reflexões: "Ler mais →" abre o post; "Ver todas as postagens" abre a lista.
4. Em Músicas: busca, ordena, pagina; "Ouvir no Spotify" abre link externo.
5. Em Vídeos: busca, ordena, pagina; "Assistir no YouTube" abre o vídeo no YouTube.
6. Em Produtos: busca por nome e faixa de preço; clique abre a loja externa.

## 6. Origem dos dados
- Banner, posts, músicas, vídeos, produtos e dicas são gerenciados pelo painel administrativo (confirmado só para o banner: "upload no painel administrativo"). [HIPÓTESE] os demais também.
- Persistência: PostgreSQL, acessado pelo pool `pg` (ver §1).

## 7. Pendências e bugs conhecidos (prioridade)
| # | Item | Prioridade | Status |
|---|---|---|---|
| 1 | 5 embeds do Spotify com "Page not found" e 1 com faixa errada (Caminho no Deserto) | Alta | aberto |
| 2 | 6/6 vídeos do YouTube indisponíveis; "Ousado Amor" bloqueado por direitos autorais | Alta | aberto |
| 3 | Capa quebrada no post "Fé em Tempos Difíceis" | Média | aberto |
| 4 | Dados de teste em "Dicas do Dia" ("Teste 10") | Média | aberto |
| 5 | Banner principal sem imagem (placeholder) | Média | aberto |
| 6 | Cartões de post com rodapé desalinhado | Baixa | aberto |
| 7 | Aba "Em Desenvolvimento" sem definição | Planejamento | aberto |
| 8 | Produtos sem cadastro | Planejamento | aberto |
| 9 | Considerar fallback quando embed falhar (mostrar só o botão/link) | Sugestão | aberto |

## 8. Regras de proteção do site público
- A ordem das abas, o nome do site e os textos fixos (título, subtítulos e rótulos) só mudam com pedido explícito do dono.
- O bloco "Dicas do Dia" continua no fim de todas as abas.
- A aba "Em Desenvolvimento" não é habilitada nem implementada sem pedido explícito do dono.
- Músicas levam ao Spotify, vídeos ao YouTube, produtos a Amazon/Mercado Livre/Shopee — não hospedar mídia própria.

> As regras de processo do agente estão em `AGENTS.md` §0.2.
