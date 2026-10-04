# Login — spec de implementação (override do MASTER)

> Página de login geral do site. Override de `design-system/MASTER.md`: tudo aqui vence
> o MASTER; o que não for mencionado segue o MASTER. Stack: Pages Router + CSS Modules
> (sem Tailwind). Somente criar arquivos novos — **não alterar** `pages/api/auth/login.js`,
> `lib/auth/*`, `components/Admin/**` nem `pages/admin.js`.

## 1. Arquivos

- **Criar** `pages/login.js` — página (rota `/login`), componente funcional com
  `useState` + `useRouter`. Sem `getServerSideProps` (página estática com interatividade
  no cliente). Incluir `<Head>` com título `Entrar | Caminhar` e
  `<meta name="robots" content="noindex,follow">`.
- **Criar** `pages/styles/Login.module.css` — estilos da página (CSS Module, mobile-first,
  com `@media (prefers-reduced-motion: reduce)`).
- **Não criar** rota de API nem mexer no admin. O estilo legado
  `components/Admin/styles/login.module.css` pertence ao `/admin` e não deve ser
  importado nem copiado — apenas espelha suas medidas (cartão ~400px).

## 2. Contrato real da API (verificado em `pages/api/auth/login.js` + `lib/auth/auth.js`)

> Correção importante: o enunciado da tarefa sugeria `{ email, password }`, mas o
> endpoint real lê **`{ username, password }`** de `req.body`. O campo do formulário é
> **Usuário**, não E-mail.

- `POST /api/auth/login`, `Content-Type: application/json`,
  corpo `JSON.stringify({ username, password })` (sem `?response=body` — modo padrão com
  cookie `httpOnly`; o token fica no cookie, o cliente usa o `user` do JSON).
- `200` → `{ success: true, user: { id, username, role, ... } }`: redirecionar (item 5).
- `400` (`MISSING_FIELDS`, "Usuário e senha são obrigatórios"): nunca deve chegar do
  servidor se a validação local funcionar; tratar como erro genérico.
- `401` (`INVALID_CREDENTIALS`, "Credenciais inválidas") → mensagem da UI (item 6).
- `429` (muitas tentativas, janela de 60s) → mensagem "Muitas tentativas…".
- `403` (IP spoofing) e `500` → mensagem genérica de erro interno.
- Qualquer resposta não-2xx tem forma `{ error, message }` — por UX e segurança, a
  UI exibe a **copy deste arquivo (item 6), que tem precedência**; `data.message`
  entra só como fallback quando não houver copy para o caso (na prática,
  inalcançável enquanto a copy existir — intencional, para nunca vazar texto cru
  do servidor ao usuário). Erro de rede (fetch rejeita) → mensagem de conexão.

## 3. Layout (mobile-first, ordem de foco = ordem visual)

Página (`min-height: 100vh`, fundo `--color-bg-secondary`, `display: flex`,
`align-items: center`, `justify-content: center`, padding `var(--spacing-4)` 16px):

1. Cartão `main`: `width: 100%`, `max-width: 440px`, fundo `--color-bg-primary`,
   `border-radius: var(--border-radius-xl)` 12px, `box-shadow: var(--shadow-md)`,
   padding `var(--spacing-6)` 24px no mobile e `var(--spacing-10)` 40px a partir de 640px.
2. Cabeçalho: `p` eyebrow 12px (`--font-size-xs`, `semibold`, `letter-spacing-wider`,
   `--color-text-secondary`, "ACESSO À CONTA" — ver item 6), `h1` "Entrar" em
   `var(--font-family-display)`, `var(--font-size-3xl)` 30px, `tight`, margem
   `var(--spacing-2)` 8px abaixo do eyebrow; subtítulo `p` 14px
   `--color-text-secondary` ("Acesse sua conta para continuar.").
3. Resumo de erros (só quando há erro de submit): bloco no topo do `form`,
   `role="alert"`, `tabindex="-1"`, `id="login-erro-resumo"`, fundo
   `--color-error-50`, borda 1px `--color-error-200`, raio `--border-radius-md` 6px,
   padding `var(--spacing-2_5)` 10px, texto 14px `medium` em `--color-error-800`
   (`#991b1b`), com lista de itens linkados (`<a href="#login-usuario">…</a>`) nos
   erros de validação. Links da lista com altura clicável ≥ 44px pela declaração
   exata `.summaryList a { display: inline-flex; align-items: center; min-height:
   44px; padding: var(--spacing-1) 0; }` — o `min-height` garante o alvo sem
   depender do `line-height`; `gap` da lista (`var(--spacing-1)`), `margin-top`,
   `padding-left` e o marcador do `li` ficam inalterados (o `li` continua
   `list-item`).
4. Campo Usuário: `label htmlFor="login-usuario"` "Usuário" + `*`; `input`
   `id="login-usuario"`, `name="username"`, `type="text"`, `autoComplete="username"`,
   `required`, `aria-invalid` + `aria-describedby="login-usuario-erro"` quando inválido,
   placeholder "Seu nome de usuário", altura `--spacing-12` 48px.
   Erro inline `p#login-usuario-erro` 12px `--color-error-700`.
5. Campo Senha: mesma estrutura (`id/name="login-senha"`, `type="password"`,
   `autoComplete="current-password"`, placeholder "Sua senha"); botão "mostrar senha"
   só-ícone **dentro** do campo à direita (`type="button"`, 44×44px,
   `aria-label="Mostrar senha"` fixo + `aria-pressed` para o estado, ícone SVG que
   troca; ao alternar, manter o foco no input e não limpar o valor). **Não bloquear colar.**
6. Linha auxiliar: link "Esqueci minha senha" (`href="/esqueci-senha"`, 14px,
   `--color-text-link`, hover `--color-text-link-hover` + sublinhado) alinhado à
   direita, acima do botão. Pendência assumida: a rota ainda não existe — é link
   simples, não quebra nada; registrar como pendência em vez de improvisar destino.
7. Botão submit: `type="submit"`, variante `primary`, tamanho `lg` (48px), `fullWidth`,
   texto "Entrar". Loading: desabilita botão + inputs, mostra spinner (padrão
   `Button.module.css`) e troca o texto do `span` persistente com
   `aria-live="polite"` ("Entrando…"). **Anunciador único**: só esse `span` anuncia
   o loading. O texto visível "Entrando…" abaixo do botão é um `p` comum com
   `aria-hidden="true"` e `className={styles.loadingStatus}` (montado só durante o
   loading) — **sem** `role="status"` e sem nenhuma outra live region. Motivo: o
   `Button` oculta o rótulo por opacidade durante o loading (só o spinner fica
   visível, parado com `reduced-motion`), então o `p` preserva o estado visível
   para quem enxerga sem gerar duplo anúncio; o `span` persistente (só o texto
   muda) é o anunciador confiável, pois live region montada junto com o conteúdo
   não é anunciada de forma confiável.
8. Rodapé do cartão: `p` 14px `--color-text-secondary` "Ainda não tem conta? " + link
   "Voltar ao início" (`href="/"`) — sem cadastro público nesta entrega.

Espaçamento vertical do `form`: `display: flex`, `flex-direction: column`,
`gap: var(--spacing-5)` 20px; grupo label+campo com `gap: var(--spacing-1_5)` 6px.

## 4. Estados (valores exatos)

- **Default**: input borda 1px `--color-border-light`, fundo `--color-bg-primary`.
- **Hover (botão)**: `--color-hover-primary` + `var(--shadow-buttonHover)`, transição
  `var(--transition-background)` 150ms. Links: sublinhado.
- **Focus**: input válido com borda `--color-primary-500` + declaração exata
  `.input:focus { border-color: var(--color-primary-500); outline: 2px solid
  var(--color-focus-primary); outline-offset: 2px; box-shadow:
  var(--color-focus-ring); }` (o `outline` `#2563eb` tem 4,95:1 sobre `#fafafa`;
  o halo sozinho tem 1,36:1 e não basta, ver MASTER §2). Input inválido com
  declaração exata `.inputInvalid:focus { border-color: var(--color-error-500);
  outline: 2px solid var(--color-error-500); outline-offset: 2px; box-shadow:
  0 0 0 3px rgba(239,68,68,.1); }` — anel na cor do estado (≈ 3,6:1 sobre claro),
  nunca azul sobre vermelho; desmembrar a regra combinada atual (sem foco, o
  inválido segue só com borda + halo, sem `outline`). O `outline: none` da base
  `.input` é permitido porque cada `:focus` repõe o indicador. Botão, toggle
  "mostrar senha", links e resumo de erros usam a declaração do input válido
  (`:focus-visible`; resumo usa `:focus`, pois o foco é programático). Resumo de
  erros recebe foco programático após submit falho.
- **Loading**: `disabled` em botão + inputs; botão com `opacity: var(--opacity-50)` e
  `cursor: not-allowed`; `aria-busy="true"` no `form`; spinner gira (`spin 1s linear
  infinite`, `aria-hidden`, sem anúncio próprio); com `reduced-motion`, spinner
  parado + texto visível "Entrando…" no `p` com `aria-hidden` (item 3.7); o anúncio
  para leitor de tela vem só do `span` com `aria-live` dentro do botão.
- **Erro de validação**: borda `--color-error-500` + anel `0 0 0 3px
  rgba(239,68,68,.1)` no campo, `.errorMessage` abaixo (12px `--color-error-700`),
  resumo no topo com foco.
- **Erro de credenciais/servidor**: resumo genérico (sem apontar qual campo falhou),
  campos mantidos preenchidos excetoSenha? Não — **manter ambos preenchidos** e focar
  o resumo; nunca exibir a senha em texto por causa do erro.
- **Sucesso**: sem tela de sucesso — redirecionamento imediato após 200 (cookie já
  gravado pelo servidor). Opcional: `toast.success("Login realizado com sucesso")`
  antes do `push` (o `_app.js` já configura o Toaster).

## 5. Comportamento (pseudocódigo executável)

```text
state: username, password, showPassword=false, fieldErrors={}, summary=null, loading=false
next = resolveNext(query), onde resolveNext (extraída em `utils/resolve-next.js`, ver
item 9): pega o primeiro elemento quando `query.next` é array (`?next=a&next=b` usa
`a`), senão `query.returnUrl` (mesma regra de array); `next` tem precedência sobre
`returnUrl`; se o valor escolhido não for string, retorna `/admin`. Rejeita
(→ `/admin`) quando o candidato: não começa com `/`; contém `//`, `://` ou `\`;
contém controle ou DEL (`/[\x00-\x1F\x7F\\]/` — deliberado, bloqueia CRLF header
injection); ou quando `new URL(candidato, "https://x.local")` lançar exceção ou
resolver para origem diferente de `https://x.local`.

onBlur(campo): valida só esse campo (vazio → "Informe seu nome de usuário." / "Informe sua senha.")
onSubmit(e):
  preventDefault; se loading, retorna
  valida ambos; se inválido → set fieldErrors + summary de validação, focus("#login-erro-resumo"), retorna
  loading=true, summary=null
  try: res = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ username: username.trim(), password }) })
       data = await res.json().catch(() => ({}))
       se res.ok && data.success → router.push(next)
       se 401 → summary = "Usuário ou senha incorretos. Tente de novo."
       se 429 → summary = "Muitas tentativas. Aguarde um minuto e tente de novo."
       senão → summary = copy genérica deste arquivo ("Não foi possível entrar. Tente de novo em instantes."); `data.message` só como fallback quando não houver copy (item 2)
       focus("#login-erro-resumo")
  catch: summary = "Sem conexão. Verifique sua internet e tente de novo." + focus no resumo
  finally: loading=false
```

Form com `noValidate` (mensagens customizadas em PT-BR, não as nativas do navegador).
`Enter` envia nativamente. Não armazenar senha em `localStorage`. Não redirecionar em
caso de erro.

## 6. Copy (PT-BR, direta, sem emoji)

Eyebrow "Acesso à conta" · `h1` "Entrar" · subtítulo "Acesse sua conta para continuar."
Labels "Usuário" / "Senha" (com `*`, nota "campos obrigatórios" via `aria` — usar
`required` + legenda visual pequena "Todos os campos são obrigatórios" 12px
`--color-text-secondary`). Placeholders acima. Botão "Entrar" / loading "Entrando…".
"Esqueci minha senha" · "Voltar ao início". Validação: "Informe seu nome de usuário.",
"Informe sua senha.", resumo "Não foi possível entrar:" + itens linkados. Servidor:
"Usuário ou senha incorretos. Tente de novo." (401), "Muitas tentativas. Aguarde um
minuto e tente de novo." (429), "Não foi possível entrar. Tente de novo em instantes."
(500/400/403), "Sem conexão. Verifique sua internet e tente de novo." (rede).

## 7. Acessibilidade

`h1` único; labels associados; `aria-describedby` campo↔erro; `aria-invalid`;
resumo `role="alert"` + `tabindex="-1"` focado após falha; toggle de senha com
`aria-label` + `aria-pressed`; `autocomplete` correto; colar permitido; foco visível
em tudo (par do MASTER §7: `outline: 2px solid var(--color-focus-primary)` +
halo — indicador ≥ 3:1; no campo inválido, `outline` em `--color-error-500`); ordem de foco = ordem visual; contraste:
texto `#171717`/`#525252` sobre `#fafafa`, botão `#fafafa` sobre `#2563eb`,
erros `#991b1b` sobre `#fee2e2` (todos ≥ 4.5:1); `prefers-reduced-motion` desliga
transição, fade do erro e giro do spinner; toque ≥ 44px (botão 48px, toggle 44×44px,
links do resumo com `min-height: 44px` — item 3.3); erro nunca só por cor
(texto + borda); `aria-busy` no loading; anunciador único do loading:
`aria-live="polite"` no `span` persistente do botão, texto visível em `p` com
`aria-hidden` (sem `role="status"`, sem segunda live region — item 3.7).

## 8. Responsividade

Mobile-first: 375px cartão ocupa `100%` com gutter 16px; ≥ 480px centraliza com
`max-width: 440px`; ≥ 640px padding do cartão 40px e `h1` pode ir a `2xl` se 30px
pesar; 768/1024/1440 sem mudança estrutural (cartão continua centrado, largura máxima
fixa); paisagem com `padding` vertical que evita corte (`main` com `margin: auto 0`).
Testar 375 / 768 / 1024 / 1440.

## 9. O que o @fixer deve verificar antes de entregar

Página abre em `/login` sem erro; submit vazio mostra 2 erros inline + resumo focado;
`blur` valida por campo; 401 mostra a copy sem limpar campos (sem vazar `data.message`);
loading desabilita tudo e impede duplo submit, com anunciador único (só o `span` do
botão; `p` visível com `aria-hidden`, sem `role="status"`); anel de foco duplo
(`outline` 2px + halo) visível em botão, inputs (válido azul, inválido em
`--color-error-500` com a regra desmembrada), toggle, links e resumo; links do
resumo com altura clicável ≥ 44px; sucesso redireciona para `?next=` válido ou
`/admin`; navegação só-teclado completa o fluxo; `reduced-motion` e zoom 200% sem
quebra. Verificação de código: `npx eslint pages/login.js` (mais cada arquivo tocado)
e `npx jest` — `npm run lint` quebra no repo com 429 erros pré-existentes de markdown
em `.opencode/skills/**`, fora do escopo, então não usar como porta. Pendências
conhecidas: rota `/esqueci-senha` ainda não existe (link sem destino funcional); sem
cadastro público (rodapé volta ao início).

### 9.1. Extração e teste de `resolveNext` (R5)

Confirmado nome e localização: extrair `resolveNext` de `pages/login.js` para
`utils/resolve-next.js` como export nomeado ESM (`export function resolveNext(query)`,
mesmo padrão de `utils/reorder.js`), **sem mudar o algoritmo** (spec no item 5);
`pages/login.js` passa a importar de `@/utils/resolve-next` (ou caminho relativo
equivalente). Teste em `tests/unit/utils/resolve-next.test.js` (espelha a convenção
`tests/unit/**` do repo). PoCs mínimos obrigatórios:

- Válidos (retornam o candidato): `/admin`, `/admin/usuarios`, `/login?x=1`
  (query preservada), `/a?b=c`.
- Absolutos e protocol-relative (→ `/admin`): `https://evil.com`,
  `http://evil.com/x`, `//evil.com`, `/foo//bar`, `/foo://bar`, `javascript:alert(1)`.
- Barra invertida e controles (→ `/admin`): `/foo\bar`, `\evil`, `/foo` + `\n`,
  `\r`, `\t`, `\x00`, DEL (`\x7f`), e candidato com CRLF (`%0d%0a` já decodificado).
- Array: `?next=/a&next=https://evil.com` → usa o primeiro (`/a`);
  `?next=https://evil.com&next=/a` → `/admin` (primeiro manda); `query.next = []`
  (vazio) comporta-se como ausente (cai em `returnUrl` ou `/admin`); `next` ausente
  com `?returnUrl=/b` → `/b`; `next` presente tem precedência sobre `returnUrl`.
- Tipos e borda: `next` ausente/`undefined`/`null`/número/objeto → `/admin`;
  string vazia → `/admin` (não começa com `/`); `/%2e%2e/` e similares seguem a regra
  geral de resolução (só passa se a origem resolver para a mesma).
