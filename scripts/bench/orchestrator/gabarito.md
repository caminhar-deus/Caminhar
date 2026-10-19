# Gabarito — conferido no código em 19/10/2026

Este é o gabarito da tarefa. **Nenhum modelo sob teste pode ler este arquivo**: ele fica
no repositório porque `/tmp` é volátil demais (foi o que perdeu o bench de 16/10/2026), e a
contaminação é detectada pelo `conferir.js`, que marca a execução se a saída mencionar
`scripts/bench/`.

Toda linha abaixo foi conferida abrindo o arquivo. Se o código mudar, este gabarito
perde: confira de novo antes de comparar duas execuções.

## 1. Quantos arquivos, quantas rotas

- **32 arquivos** em `pages/api/`.
- **31 rotas**. `pages/api/helper/pagination.js` **não é rota**: não tem export default,
  exporta três funções auxiliares (`:20`, `:43`, `:58`) e é importado por
  `pages/api/dicas.js:3`.

## 2. Grupos por mecanismo de autenticação

| Grupo | Rotas | Onde a autenticação é aplicada |
|---|---|---|
| Admin via factory | 16 | `lib/api/adminCrudHandler.js:331` (`withAuth(handler)`), alcançado por `createAdminHandler` em cada rota |
| `withAuth` direto | 3 | `pages/api/posts.js:152`, `pages/api/upload-image.js:170`, `pages/api/cleanup-test-data.js:26` |
| `withAuth` parcial | 1 | `pages/api/settings.js` — GET público (`:22-24`), POST (`:129`) e PUT (`:163`) com `withAuth` |
| Autenticação manual | 3 | `pages/api/auth/check.js`, `pages/api/products.js` (`requireAuth` em `:65`, usado em `:198`, `:203`, `:207`, `:211`), `pages/api/settings.js` |

As 16 admin são as 15 de `pages/api/admin/` mais `pages/api/ip-diagnostico.js:186`.

Cuidado para o conferidor: `pages/api/settings.js` aparece em **dois** grupos. Isso é
correto, não é contradição.

## 3. Rotas que respondem sem token

**Intencionais** — a autenticação é o próprio endpoint:

- `pages/api/auth/login.js:19`
- `pages/api/auth/logout.js:3`
- `pages/api/auth/refresh.js:10`

**Leitura pública, escrita só existe nas rotas admin** — todas respondem `405` fora do
`GET`, o que impede escrita anônima:

- `pages/api/musicas.js:79-83`
- `pages/api/videos.js:21-23`
- `pages/api/dicas.js:8-11`
- `pages/api/posts.js:18` (o `GET`; o `POST` da mesma rota tem `withAuth`)

**Públicas por desenho, sem restrição de método:**

- `pages/api/status.js:10` (status/saúde)
- `pages/api/placeholder-image.js:14` (imagem de espaço reservado)
- `pages/api/products.js` — o GET com `?public=true` é público (`handlePublicGet`); o resto
  exige `requireAuth`

## 4. A rota cuja segurança não vem do próprio arquivo

São **dois** pontos de proteção fora do arquivo da rota. O segundo só apareceu quando os
modelos o citaram em 19/10/2026 — a primeira versão deste gabarito esquecia dele, e isso
está registrado como correção abaixo.

**a) `pages/api/uploads/[...path].js`** — a rota não autentica ninguém e não limita método
além de tratar `HEAD` (`:110`); ela serve o arquivo do disco. A proteção está em outro
lugar, e o próprio arquivo registra isso em `:103-107`:

- `next.config.js:175-180` — `Content-Security-Policy: default-src 'none'; sandbox` para
  `/uploads/:path*`.
- `next.config.js:76` — `X-Content-Type-Options: nosniff`, regra global.

Vale a justificativa no código: a regra precisa estar no `headers()` e não na rota, porque
`headers` roda antes do `afterFiles` rewrite e assim alcança também o arquivo legado em
`public/uploads/`, que é servido estaticamente sem passar por esta rota.

**b) `proxy.js`, na raiz do repositório** — não é autenticação, é **rate limit**, e mesmo
assim é proteção que não vem do arquivo da rota:

- `proxy.js:28` — `/api/auth/login` com 5 req por minuto.
- `proxy.js:96-97` — o `matcher` limita a regra a `/api/auth/login`.
- `proxy.js:62-68` — o próprio código avisa que o backstop real é
  `pages/api/auth/login.js:51,82`, que divide a mesma chave, para o bucket não ser contado
  em dobro quando não há IP confiável.

Resposta que acerta o ponto: a proteção de `/uploads` não está em `pages/api/`, e sim no
`next.config.js`; e o rate limit de login é aplicado no `proxy.js`, fora da rota.

## Correção de 19/10/2026 — este gabarito estava incompleto

Duas correções, ambas vindas de conferir a saída dos modelos contra o código:

1. **Faltava o `proxy.js`** na pergunta 4 (item **b** acima). A pergunta 4 foi escrita como
   se houvesse um único ponto de proteção externa, e há dois.
2. **A contagem é 32, sem ambiguidade.** `find pages/api -type f` = 32, todos `.js`, sem
   nenhum arquivo de outra extensão. Duas execuções responderam "33" — é erro verificável,
   e o gabarito original não deixava isso explícito o bastante. Registrado aqui para que a
   correção não se perca.

O fato de o gabarito ter erro é o motivo de a Camada B ser conferida por pessoa: é o
primeiro caso real em que a conferência fora do modelo pegou um erro **meu**, e não do
modelo sob teste.

## O que um modelo costuma errar aqui

1 **Contar 32 como 33.** Medido em 19/10/2026: duas execuções responderam 33 arquivos. São
32, todos `.js`.

2 **Citar a linha do import em vez da aplicação.** `import { withAuth } from '...'` não é
autenticação; `adminCrudHandler.js:331` é.

3 **Esquecer `settings.js` no grupo manual** e dizer que o GET é protegido.

4 **Não chegar na pergunta 4**, achando que `uploads/[...path].js` é só "rota de imagem".
São **dois** pontos de proteção externa: o CSP do `next.config.js` e o rate limit do
`proxy.js`.

5 **Não entregar resposta nenhuma.** Em 19/10/2026, as 6 execuções da série devolveram só o
aviso de que a delegação foi disparada. Ver o aviso sobre `subagent` ser assíncrono no
`LEIA-ME.md` — isso é falha do desenho da execução, não do modelo.

## Confundidor conhecido: o ai-memory

Dois modelos consultaram o `ai-memory` antes de delegar e acharam lá o registro do RBAC de
`adminCrudHandler.js`. Em produção essa consulta é legítima e útil; **neste bench** ela
encurta o trabalho de quem já tem a resposta documentada em outra fonte. Anote na Camada C
qualquer execução que tenha consultado memória antes de ler o código — comparar um modelo
que consultou com outro que não consultou não isola o modelo.