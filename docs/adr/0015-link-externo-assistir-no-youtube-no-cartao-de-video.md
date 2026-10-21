# ADR-0015: Link externo "Assistir no YouTube" no cartão de vídeo

- **Status:** Aceito
- **Data:** 2026-10-21
- **Decisores:** Mantenedor do projeto
- **Relacionados:** [`../ARQUITETURA_SITE_PUBLICO.md`](../ARQUITETURA_SITE_PUBLICO.md) §3.4 e §7 (itens 2 e 9), [`../PLANO_ACAO_SITE_PUBLICO.md`](../PLANO_ACAO_SITE_PUBLICO.md) (F0.4), `components/Features/Video/VideoCard.js`, `components/Features/Video/styles/VideoCard.module.css`, `lib/media/youtube.js`, `design-system/pages/home.md` §3

> Status possíveis: Proposto | Aceito | Rejeitado | Obsoleto | Substituído por ADR-NNNN

## Contexto

O documento de arquitetura do site público (§3.4) descreve o cartão de vídeo como
"player incorporado do YouTube (16:9) → título → descrição curta → **link
externo 'Assistir no YouTube'**". O link nunca existiu: o cartão tinha apenas
o player incorporado (`LazyIframe`).

Isso somava com a pendência mais grave do site (§7, item 2): **6 de 6 vídeos do
YouTube estavam indisponíveis** (embeddings rejeitados ou com erro "Video
unavailable"), e um deles por direitos autorais. Com apenas o player, o visitante
não tinha nenhum caminho para o vídeo — nem quando o embed falhava.

O dado disponível é a coluna `url_youtube`, preenchida pelo painel com formatos
variados (`watch?v=`, `youtu.be/`, `/embed/`). O projeto já tinha o utilitário
`extractYoutubeId` em `lib/media/youtube.js`, capaz de extrair o ID de todos
esses formatos.

O dono decidiu (Fase 0 do plano de ação, 2026-10-21) implementar o link, e o
designer definiu a forma visual (spec `design-system/pages/home.md` §3).

## Decisão

1. O cartão de vídeo termina com um **link externo "Assistir no YouTube"**, no
   rodapé do cartão — abaixo da descrição, **nunca sobre o player** (sobrepor
   competiria com o botão de play e criaria texto sobre imagem).
2. O link abre o **vídeo canônico** (`https://www.youtube.com/watch?v=<id>`) em
   nova aba, com `rel="noopener noreferrer"`. A URL canônica é montada a partir
   do ID extraído de `url_youtube`; quando o ID não pode ser extraído, a URL
   original é usada como fallback (degradação graciosa — o cartão nunca fica sem
   link).
3. O link é **elemento de rodapé** (`margin-top: auto` dentro do `.content` do
   `BaseCard`), de modo que fique alinhado ao fundo do cartão, como os demais
   cartões. Alvo de toque de 44 px, ícone SVG inline com `aria-hidden="true"`
   (sem emoji), foco visível.
4. O texto visível é "Assistir no YouTube" e o destino é sempre o mesmo que o
   vídeo exibido no player — o link é um caminho **alternativo** ao embed, não
   um segundo conteúdo.

## Alternativas consideradas

- **Opção A — remover o link do documento e deixar o player como único caminho.**
  Descartada pelo dono (F0.4 = A): com os embeds indisponíveis, o link é
  justamente o que garante que o visitante chegue ao vídeo.
- **Opção B — botão sobreposto sobre a imagem do player.** Descartada pelo
  designer: disputa espaço com o controle de play, o texto perde contraste
  sobre a imagem e o alvo fica pequeno no mobile.
- **Opção C — link no cabeçalho do cartão, ao lado do título.** Descartada pelo
  designer: quebra a ordem de leitura do cartão (imagem → título → descrição →
  rodapé) e afasta o link da ação esperada no fim do cartão.
- **Opção D — só o texto, sem ícone.** Descartada pelo designer: o link com
  ícone de saída comunica que abre outro site, o que ajuda quem lê rápido.

## Consequências

### Positivas

- O visitante tem um caminho garantido para o vídeo, mesmo com o embed
  quebrado — mitiga a pendência §7 item 2.
- A pendência §7 item 9 (fallback quando o embed falha) fica parcialmente
  resolvida para vídeos.
- O cartão de vídeo passa a ter a mesma anatomia de rodapé dos demais
  (produto, música, post).

### Negativas e riscos

- O link abre o YouTube em nova aba: em ambientes sem internet, o destino
  externo também não abre — o fallback é o player, que exige a mesma conexão.
- Depende da URL do vídeo estar preenchida no painel; sem `url_youtube`, o
  fallback usa a string original e pode não abrir nada. (O cartão sem player
  também ficaria sem conteúdo.)
- A URL canônica é montada a partir do ID: um vídeo com ID inválido cai no
  fallback da URL bruta, que pode ser a URL de embed (abre o player em vez do
  vídeo).

## Revisão

Reavaliar quando os embeddings voltarem a funcionar (§7, item 2): se o player
passar a ser confiável, o link pode ser rebaixado de rodapé para ação
secundária — mas não deve ser removido, porque é o caminho que funciona sem
embed.
