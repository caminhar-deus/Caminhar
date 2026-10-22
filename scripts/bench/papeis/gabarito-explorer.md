# Gabarito — papel do `explorer` (conferido em 22/10/2026)

Ground truth conferido no código e na doc instalada **em 22/10/2026, fora dos modelos**.
A passa de segurança de 21/10 mudou a superfície de `pages/api/`; a lista do gabarito de
19/10 está obsoleta e não reuso nenhum item dela.

## Parte A — `withAuth`: 6 pontos (1 definição + 5 aplicações)

| # | Ponto | Evidência |
|---|---|---|
| 1 | Definição: `lib/auth/auth.js:324` | `export function withAuth(handler) {` |
| 2 | `lib/api/adminCrudHandler.js:305` | `const authenticatedHandler = withAuth(handler);` — ponto único de entrada das rotas admin que usam o helper (comentário `:307-309`) |
| 3 | `pages/api/upload-image.js:170` | `export default withAuth(handler);` |
| 4 | `pages/api/settings.js:129` | `const handlePost = withAuth(async ...)` — usado pelo `POST` do handler default (`pages/api/settings.js:26`) |
| 5 | `pages/api/settings.js:163` | `const handlePut = withAuth(async ...)` — usado pelo `PUT` |
| 6 | `pages/api/cleanup-test-data.js:26` | `export default withAuth(handler);` |

**Não contam (armadilhas do gabarito):**

- Imports da função: `lib/api/adminCrudHandler.js:31`, `pages/api/settings.js:2`,
  `pages/api/upload-image.js:7`, `pages/api/cleanup-test-data.js:1`.
- Comentários: `lib/api/adminCrudHandler.js:6`, `:301`, `:311`, `:322`;
  `pages/api/cleanup-test-data.js:11`; `pages/api/status.js:32`.
- `pages/api/status.js` inteiro **não é ponto de aplicação**: usa `verifyToken`
  (o comentário na `:32` registra que é "não withAuth"). Marca quem lê sem ler o resto.

## Parte B — `Cache-Control` / Route Handler do App Router (Next 16.4.2 instalado)

- `revalidate` é a opção de configuração de segment (`route segment config`): doc
  instalada `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md:270-284`
  (a frase-chave na `:270`: "You can revalidate cached data using the `revalidate` route
  segment config option.").
- `Cache-Control`: **zero** ocorrências no doc do Route Handler do App Router — conferido
  em 22/10/2026 com `grep -c -i "cache-control" route.md` → `0`. O doc NÃO documenta setar
  `Cache-Control` manualmente num Route Handler do App Router; a resposta do modelo tem de
  declarar essa ausência, não inventar receita.
- Única receita manual de `Cache-Control` nos docs instalados: `headers.md` (Pages Router),
  `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/headers.md`
  — `:395-399` (assets imutáveis não podem ter o `Cache-Control` sobrescrito) e exemplos
  `res.setHeader('Cache-Control', ...)` em `:424` e `:431`.

## Critério de decisão (ADR-0008)

- **Menos erros verificáveis** na tarefa que o agente executa, com citação conferida
  `arquivo:linha` pelo orquestrador, fora do modelo.
- Desempate: cobertura da Parte A (os 6 pontos; omission conta como erro de cobertura) e
  honestidade documental na Parte B (declarar o que a doc não diz, em vez de chutar).
