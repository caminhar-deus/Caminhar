# ADR-0023: Embed do Spotify limitado a tracks, com fallback gracioso no card

- **Status:** Aceito
- **Data:** 2026-10-25 *(registrado e commitado em 2026-10-27, commit `80d16f1`)*
- **Decisores:** dono do projeto (aprovou o Plano de Ação do P-01)
- **Relacionados:** P-01 e P-08 de `docs/ARQUITETURA_SITE_PUBLICO.md` §7; `docs/ARQUITETURA_SITE_PUBLICO.md` §3.3/§8; `docs/ARQUITETURA_SITE_PRIVADO.md` §4.3/§9; `lib/media/spotify.js`, `components/Features/Music/MusicCard.js`, `pages/api/admin/musicas.js`, `pages/api/admin/fetch-spotify.js`; `CHANGELOG.md` ([Não publicado]/Corrigido, 2026-10-27)

## Contexto

O site público exibiu, em acompanhamento relatado pelo dono, embeds do Spotify com "Page not found" (5 casos) e 1 faixa trocada ("Caminho no Deserto") — o item P-01 de `ARQUITETURA_SITE_PUBLICO.md` §7, desde então listado como pendência alta. O card de música (`MusicCard.js`) sempre renderiza `<iframe>` quando existe `url_spotify`, e o embed do Spotify quebra quando a URL cadastrada não é uma faixa (`track`) — por exemplo playlist ou álbum — ou quando o ID está errado.

O fluxo do dado é: o painel aceita a URL → armazenada em `musicas.url_spotify` → a API pública `/api/musicas` devolve só publicados → `MusicCard` converte com `getSpotifyEmbedUrl()` e monta o `<iframe>` via `LazyIframe`. A conversão era o elo que mascarava o problema:

- `lib/media/spotify.js` extrai apenas ID de **track**, mas quando **nada casava** o `getSpotifyEmbedUrl()` devolvia a **URL original** silenciosamente.
- A validação do painel (`pages/api/admin/musicas.js`) era uma simples verificação de substring: `url.includes('spotify.com') || url.includes('spotify:')` — aceitava qualquer formato (playlist, álbum, episódio ou URL inválida).
- Não existia fallback no componente: se o embed falhava, o erro do Spotify ficava visível dentro do iframe.

O comportamento dos vídeos já cobria um problema parecido com link externo — ADR-0015 no cartão de vídeo — mas não havia equivalente para música.

**Limitação conhecida:** os 6 casos que levaram ao P-01 não foram recuperados individualmente (o painel foi limpo depois das capturas; a base atual de teste traz 13 registros que são todos tracks válidos). O diagnóstico parte da mecânica confirmada no código — conversão silenciosa + validação substring — não dos dados antigos.

## Decisão

1. **Apenas tracks são suportados para embed de Spotify.** Regra conferida em três camadas, todas falando o mesmo idioma:
   - `lib/media/spotify.js`: `getSpotifyEmbedUrl()` retorna **`null`** quando não extrai ID de `track` (não mais a URL original); `isSpotifyTrackUrl()` é o helper único de validação.
   - `pages/api/admin/musicas.js` (POST/PUT) e `pages/api/admin/fetch-spotify.js` ("⚡ Puxar Dados"): a URL que não é track é recusada com **400/mensagem de negócio** clara: "Apenas links de faixa (track) são suportados para embed."
   - `components/Features/Music/MusicCard.js`: renderiza o `<iframe>` **só** quando a conversão produz URL de `/embed/track/`; caso contrário exibe "Prévia indisponível" **no lugar do iframe quebrado**, mantendo ativo o botão "🎵 Ouvir no Spotify" apontando para a URL original (fecha a metade faltante do P-08 — a metade de vídeo já era o ADR-0015).
2. **Não há alteração de esquema nem de dado legado:** registros existentes seguem no banco; se algum for não-track no futuro, o fallback **impede** o iframe quebrado — melhor que a página "Page not found" visível. Os dados atuais conferidos: todos os 13 registros de teste são tracks válidos (27/10/2026).

## Alternativas consideradas

- **Opção A — suportar também playlists/álbuns/episódios com embed próprio do Spotify.** Descartada: as especificações do site (`ARQUITETURA_SITE_PUBLICO.md` §3.3/§8) descrevem catálogo de **faixas**; `getSpotifyEmbedUrl` só tratava track desde a origem — esta decisão apenas coloca a validação em dia com o suporte real. Ampliar formato depois exigiria mapear formatos à URL do embed de playlist `[url país]/embed/playlist/<id>` — na revisão desta ADR se necessário (§Revisão).
- **Opção B — validar/consumir apenas o painel, mantendo o card como está.** Descartada: não impediria os registros já cadastrados (base legada) de renderizar iframe quebrado; o fallback do card protege o público mesmo sem ação posterior do dono.
- **Opção C — detectar erro do embed pelo `onLoad`.** Descartada: o `<iframe>` cross-origin não reporta nenhum componente armazenado em cache, fazendo com que a página do Spotify devolva **200** mesmo em estado "Page not found", impossibilitando fechamento automático. O fallback por **prévia** (só renderizar quando é track) é determinístico — decisão em tempo de cadastro, não a rosto.

## Consequências

### Positivas

- "Page not found" deixa de estar no site público: o card mostra fallback com texto claro e o botão "Ouvir no Spotify" mantém a regra arq. ("músicas levam ao Spotify", §8 público).
- O painel recusa URL não-track desde o cadastro, com mensagem orientando o formato aceito — o fluxo pelo "⚡ Puxar Dados" também valida.
- A conversão falha explicitamente (`null`) em vez de passar a URL original silenciosamente — o diagnóstico fica no momento certo.

### Negativas e riscos

- Playlists/álbuns/episódios deixam de ser visíveis no card — comportamento desejado, dado que o embed deles nunca foi suportado.
- A classe de teste "deve usar a URL original (fallback) caso o formato seja desconhecido" (`tests/unit/components/Features/Music/MusicCard.test.js`) travava o comportamento antigo do utilitário; com o contrato novo, ela foi ajustada para travar o fallback do card.
- Se o Spotify mudar regex, a `isSpotifyTrackUrl` pode recusar formato novo válido — a regex é simples e facilmente evoluível.

## Revisão

Reavaliar se o site vier a precisar de outros tipos de média Spotify (playlist, álbum, episódio): o formato continua o padrão da API pública do Spotify, mas essa ampliação merece ADR próprio (esta ADR cobre apenas faixas). Também reavaliar se existe meio de validar via oEmbed se uma faixa é embeddável (restrição geográfica ou de direitos autorais), pois hoje a validação é só sintática — formato track — e não cobre o conteúdo.
