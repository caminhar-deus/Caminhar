# ADR-0030: Schemas de edição do painel toleram `null` vindo do banco

- **Status:** Aceito
- **Data:** 2026-10-30
- **Decisores:** dono do projeto (escopo aprovado na sessão)
- **Relacionados:** ADR-0027 (mesmo padrão do caso "Salvar produto"), ADR-0029 (published default false), `docs/ARQUITETURA_SITE_PRIVADO.md` §4; arquivos: `pages/api/admin/musicas.js`, `pages/api/admin/posts.js`, `pages/api/admin/dicas.js`, `components/Admin/AdminVideos.js`, `components/Admin/AdminPosts.js`

## Contexto

O hook `useAdminCrud` grava a **row inteira** no formulário ao editar (`handleEdit` → `setFormData(item)`) e o submit envia `JSON.stringify(formData)` cru. Schemas Zod com `.optional()` rejeitam `null` (`.optional()` só tolera chave **ausente**). Colunas nullable no banco alimentam essas chaves com `null`:

- `musicas.artista`/`musicas.descricao` são NULLABLE — **16/16 músicas tinham `descricao: null`** (o form de músicas não tem o campo). Editar qualquer música dava **400 no server** (`expected string, received null`) e, como o campo não existe no form, nada ficava destacado.
- `videos.descricao`/`thumbnail` são NULLABLE (`createVideo` grava `?? null`) e `initialFormData.thumbnail` é `null` — com o schema client sem `.nullable()`, a **criação de vídeo pelo painel era bloqueada no client** (`AdminCrudBase` roda `validationSchema.safeParse(formData)`).
- `posts.excerpt`/`content`/`image_url` são NULLABLE (`createPost` grava `?? null`) — mesmo bloqueio client latente (rows atuais preenchidas).
- `pages/api/admin/dicas.js` tinha fallback `published !== undefined ? published : true` no POST — chamada direta à API sem `published` nascia **publicada**, divergindo do ADR-0029 (default `false` em todas as tabelas).

Abas auditadas e **seguras sem alteração** (PUT full-row passa nos schemas): categorias (`name`/`slug` NOT NULL), usuários (GET nunca devolve o hash; PUT só re-hasheia senha nova não-vazia; trava do `admin` idempotente), cargos (`permissions` normalizado para array no GET), dicas no PUT (merge com o banco), Cabeçalho (`value: z.any()` — sem armadilha 400).

## Decisão

Onde a coluna é nullable no banco, o schema Zod passa a aceitar `null`: `.optional().nullable()` em `descricao` (create + update) e `artista` (update) de músicas; em `excerpt`/`content`/`image_url` de posts (client + server); em `descricao`/`thumbnail` do client de vídeos (espelhando o server, que já tinha). O POST de dicas sem `published` grava `false` (ADR-0029); o PUT mantém o merge com o banco. Constraints de string (`min(1)`, `max(500)`, `refine` de URL) continuam valendo para strings — `''` inválido e URL malformada seguem rejeitados.

O form de músicas **continua sem** campo `descricao` (decisão do dono nesta data; pendência de produto).

## Alternativas consideradas

- **Transform `null` → `undefined` nos handlers:** descartada — espalharia normalização por handler; `.nullable()` é o padrão já adotado no server de vídeos.
- **Sanitizar a row no `useAdminCrud`/`mapItemToFormData` em todas as abas:** descartada nesta passada — altera o contrato do hook compartilhado por 8 abas (risco maior); pode ser revisitada se novos casos surgirem.
- **Adicionar campo `descricao` ao form de músicas:** proposto ao dono, que optou por não incluir agora.

## Consequências

### Positivas

- Edição de músicas desbloqueada (todas as 16 rows tinham `descricao: null`).
- Criação de vídeo sem thumbnail volta a funcionar pelo painel.
- Posts e vídeos ficam imunes a rows com `null` (client e server).
- Dicas alinhadas ao ADR-0029 end-to-end.
- 5 testes de repro adicionados (músicas POST/PUT, vídeos PUT, posts PUT, schema client de posts) e 2 atualizados (fallback de dicas em `dicas.test.js` e `dicas.edge.test.js`).

### Negativas e riscos

- `null` pode ser gravado de volta no UPDATE (idempotente: regrava o que já era `null`).
- O schema client de músicas segue sem declarar `descricao`/`published` (observação pré-existente do oracle; sem efeito pois o server aceita ambos como opcionais).
- Validação client de vídeos/posts agora tolera `null` — mensagens de erro continuam corretas para strings inválidas.

## Revisão

Reavaliar se o form de músicas ganhar o campo `descricao` (paridade do schema client) ou se o `useAdminCrud` passar a sanitizar rows na edição (os `.nullable()` podem ser simplificados).
