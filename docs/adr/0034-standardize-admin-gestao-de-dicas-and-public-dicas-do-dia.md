# ADR-0034: Padronização da nomenclatura "Gestão de Dicas" no ADMIN e "Dicas do Dia" no Site Público

- **Status:** Aceito
- **Data:** 2026-11-02
- **Decisores:** dono do projeto (escopo explicitamente solicitado)
- **Relacionados:** ADR-0010, ADR-0013, `docs/ARQUITETURA_SITE_PRIVADO.md` §5.2, §6 e §8 (item 4); `docs/ARQUITETURA_SITE_PUBLICO.md` §4, §6 e §8; arquivos: `pages/admin.js`, `components/Admin/AdminDicas.js`, `components/Admin/AdminRolesTab.js`, `tests/unit/components/Admin/AdminDicas.test.js`

## Contexto

No sistema do **O CAMINHAR COM DEUS**, existe uma relação funcional direta entre o Site Privado (ADMIN) e o Site Público: conteúdos cadastrados e publicados no painel administrativo alimentam seções e abas específicas do site aberto.

Para o conteúdo de Dicas:
- No **Site Público**, o recurso é consolidado como **"Dicas do Dia"** (o bloco fixo no rodapé de todas as abas, a tag de título `<h2>Dicas do Dia</h2>` e as mensagens públicas).
- No **Site Privado (ADMIN)**, a permissão oficial sempre foi registrada como **`'Gestão de Dicas'`** (em `lib/domain/permissions.js`, no RBAC do endpoint `/api/admin/dicas` e nas tabelas de permissões), alinhada ao padrão das demais seções de conteúdo do painel: *"Gestão de Músicas"*, *"Gestão de Vídeos"* e *"Gestão de Produtos"*.

No entanto, havia uma inconsistência visual e organizacional no ADMIN: o botão da barra de abas em `pages/admin.js` exibia o texto `"Dicas do Dia"` e o título da tela em `components/Admin/AdminDicas.js` era `"Gerenciar Dicas do Dia"`, enquanto a permissão exigida era `"Gestão de Dicas"`. Isso gerava a única assimetria entre o nome da permissão e o rótulo do botão no painel administrativo (`ARQUITETURA_SITE_PRIVADO.md` §8, item 4).

## Decisão

Padronizar rigorosamente a nomenclatura por ambiente e responsabilidade:

1. **Site Privado (ADMIN):** tudo o que se refere ao gerenciamento administrativo de dicas utiliza uniformemente **"Gestão de Dicas"**:
   - Rótulo do botão da aba em `pages/admin.js`: **`Gestão de Dicas`** (com ícone 💡).
   - Título da tela no `AdminCrudBase` (`components/Admin/AdminDicas.js`): **`"Gestão de Dicas"`**.
   - Permissão oficial de acesso: permanece **`'Gestão de Dicas'`** (em `lib/domain/permissions.js`, no RBAC da API `/api/admin/dicas`, na validação Zod de `pages/api/admin/roles.js` e na tabela `roles`).
2. **Site Público:** tudo o que se refere à exibição pública das dicas utiliza uniformemente **"Dicas do Dia"**:
   - Bloco carrossel/grid fixo (`components/Features/Testimonials/index.js`): permanece com título **`"Dicas do Dia"`**.
   - Mensagens voltadas ao visitante público e regras do site público: permanecem **`"Dicas do Dia"`**.
3. **Preservação Integral da Integração e do Funcionamento:**
   - O ADMIN ("Gestão de Dicas") continua sendo o local de cadastro, edição, exclusão e publicação.
   - O Site Público ("Dicas do Dia") continua consumindo exclusivamente os registros publicados (`published = true`) gerenciados no ADMIN, via `/api/dicas`.
   - Nenhuma alteração de schema ou migração de banco de dados é necessária, mantendo estabilidade total de dados e permissões persistidas.
4. **Higiene de Duplicidade:**
   - Centralizar a normalização de compatibilidade de nomes legados (`'Dicas'` → `'Gestão de Dicas'`) em `components/Admin/AdminRolesTab.js` em um helper reutilizado (`normalizeRolePermissions`), eliminando duplicações inline.

## Alternativas consideradas

- **Renomear a permissão e o botão para "Dicas do Dia":** Descartada pelo dono do projeto, pois o padrão desejado para o ADMIN é o prefixo de gestão (*"Gestão de Músicas"*, *"Gestão de Vídeos"*, *"Gestão de Produtos"*, *"Gestão de Dicas"*), reservando "Dicas do Dia" para a exibição pública.
- **Renomear a seção pública para "Gestão de Dicas":** Descartada, pois o visitante público consome mensagens inspiradoras ("Dicas do Dia"), e não um módulo de gestão.

## Consequências

### Positivas

- **Clareza de papéis:** O ADMIN foca na ação administrativa (*"Gestão de Dicas"*) e o público foca na mensagem (*"Dicas do Dia"*).
- **Paridade 1:1 no ADMIN:** Todas as 10 abas do painel agora possuem correspondência estrita e uniforme com suas respectivas permissões (*"Gestão de Dicas"* ↔ *"Gestão de Dicas"*).
- **Risco zero no banco de dados:** Nenhuma permissão no banco precisou ser alterada ou migrada; cargos e usuários existentes mantêm seus acessos intactos.
- **Testes e linters 100% verdes:** A suíte completa passa sem alterações funcionais e sem impactos nos endpoints.

### Negativas e riscos

- Nenhuma identificada. A alteração é puramente de alinhamento de apresentação no painel administrativo e documentação.

## Revisão

Esta decisão consolida o padrão de nomenclatura entre os ambientes e deve ser respeitada em qualquer futura expansão de funcionalidades de dicas.
