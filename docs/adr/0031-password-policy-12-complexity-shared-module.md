# ADR-0031: Política de senha única (12 caracteres + complexidade) no painel

- **Status:** Aceito
- **Data:** 2026-10-30
- **Decisores:** dono do projeto (escopo aprovado na sessão)
- **Relacionados:** ADR-0010 (RBAC/cargos), `docs/ARQUITETURA_SITE_PRIVADO.md` §8 item 7; arquivos: `lib/auth/password-policy.js` (novo), `pages/api/admin/users.js`, `components/Admin/AdminUsersTab.js`

## Contexto

O §8 item 7 do doc do painel registrava (decisão do dono, 2026-10-27): "Senha mínima de 6 caracteres: fraca. Considerar elevar para pelo menos 10 a 12 e exigir senha forte para admin". O estado real do código, na análise de 2026-10-30:

- **Server** (`pages/api/admin/users.js`): `password: z.string().min(1, 'Senha é obrigatória')` — aceitava **qualquer senha de 1 caractere** na criação e, no update, qualquer string não-vazia.
- **Client** (`components/Admin/AdminUsersTab.js`): `validateUser` exigia 6 caracteres (novos usuários e troca) — divergente do server e fraco.
- **Login** (`pages/api/auth/login.js`): não valida comprimento (correto: a política governa a *criação/troca*, não a entrada).
- Não existe fluxo de troca de senha própria; a política se aplica só no painel de Usuários (aba com permissão "Usuários").
- Banco: único usuário `admin` (username de 5 chars) — sem risco de invalidar credenciais existentes ao elevar a política.

A política anterior (6 chars, só client) permitia senhas triviais (`123456`, `senha`) para contas que administram todo o conteúdo e os usuários do site.

## Decisão

Vamos adotar uma política de senha única para criação e troca de senha no painel de Usuários: **mínimo de 12 caracteres com pelo menos uma letra maiúscula, uma minúscula e um número**, implementada em **fonte única compartilhada** entre server e client:

- Novo módulo puro `lib/auth/password-policy.js`: `PASSWORD_MIN_LENGTH = 12`, `strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/`, `passwordPolicyMessage` e `isValidPassword(value)`.
- Server (`userCreateSchema`/`userUpdateSchema` em `pages/api/admin/users.js`): `password` com refine da política; no update, string vazia/só espaços continua significando "manter a senha atual" (comportamento existente, preservado).
- Client (`validateUser` em `components/Admin/AdminUsersTab.js`): usa `isValidPassword`/`passwordPolicyMessage` do mesmo módulo; hint do campo atualizado ("Mínimo de 12 caracteres, com letra maiúscula, minúscula e número").
- A senha atual do `admin` continua válida até a próxima troca (a política não é retroativa; o login não valida comprimento).

## Alternativas consideradas

- **10 + complexidade:** descartada — o dono escolheu 12 entre as opções apresentadas (12/10/só comprimento/não elevar); 12 é o piso comum das recomendações atuais (NIST SP 800-63B sugere ≥ 8 com verificação contra senhas vazadas; 12 dá folga sem treze caracteres de atrito).
- **12 só comprimento (sem tipos de caractere):** descartada — menos atrito, mas permite senhas de baixa entropia (`aaaaaaaaaaaa`); a complexidade exige ao menos 3 classes de caractere.
- **Não elevar agora (só alinhar server ao client em 6):** descartada — deixaria o §8 item 7 aberto e manteria política fraca para contas administrativas.
- **Duplicar a regex/mensagem no server e no client:** descartada — já havia divergência real (server 1 × client 6) justamente por não haver fonte única; um módulo compartilhado elimina a classe de defeito.

## Consequências

### Positivas

- Server e client validam a **mesma** regra com a **mesma** mensagem (paridade; erros de campo consistentes no formulário).
- Senhas administrativas novas resistem a ataque de força bruta trivial (12+ chars, 3 classes).
- Regra testável isoladamente (módulo puro, sem dependências de servidor).
- §8 item 7 do doc do painel fechado.

### Negativas e riscos

- Senhas existentes (a do `admin`) ficam **abaixo** da política até a próxima troca — aceito pelo dono; não há migração forçada.
- Operadores podem errar a política na primeira tentativa (mensagem do campo orienta; hint visível).
- Quem automatizar chamadas à API de usuários precisa gerar senhas conforme a política (repros de teste atualizados).
- O login continua sem validação de comprimento (por design — política governa criação/troca); um atacante não ganha nada com isso, mas senhas legadas fracas seguem válidas.

## Revisão

Reavaliar se: (a) o dono pedir troca de senha própria (self-service) — a política deve ser reaplicada no novo fluxo; (b) surgir exigência de verificação contra listas de senhas vazadas (HIBP) ou 2FA, quando esta decisão deve ser estendida ou substituída; (c) o `username min(3)` (aplicado no mesmo passo no server, paridade com o client) conflitar com usernames legados — hoje só existe `admin` (5 chars), sem conflito.
