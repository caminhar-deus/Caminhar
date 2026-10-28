# Posts & Categorias — spec de implementação (override do MASTER)

> Última atualização: 2026-10-27 (ADR-0024 — CRUD completo de categorias de posts; chips display-only restaurados).
> Override de `design-system/MASTER.md`. Tudo aqui vence o MASTER; o que não for mencionado segue o MASTER. Stack: Next.js Pages Router + React + CSS Modules + variáveis CSS (sem Tailwind). Tokens: sempre a variável, nunca hex. Idioma da interface: pt-BR.

> Escopo: (a) chips de categoria no `PostCard` público; (b) campo de atribuição de categorias no formulário de post do painel; (c) CRUD de categorias dentro da aba "Posts/Artigos" do painel. Não altera lógica de negócio nem permissões (reuso de `Posts/Artigos`).

## 0. Tokens herdados do MASTER (usar, não reinventar)

- Cores: `--color-primary-500` (#2563eb) ação/texto do chip; `--color-primary-50` (#eff6ff) fundo do chip; texto `--color-text-primary/secondary/tertiary`; borda `--color-border-light`; foco par `outline: 2px solid var(--color-focus-primary)` + `box-shadow: var(--color-focus-ring)`; erro `--color-error-*`; sucesso `--color-success-500`.
- Tipografia: UI `--font-family-body`; escala `--font-size-xs/sm/base`; pesos `medium/semibold`.
- Espaçamento: `--spacing-*`, `--gap-*`.
- Raios: pill só em badges `--border-radius-full`; campos/botões `--border-radius-lg`/`xl`.
- Foco visível (obrigatório, par) e `prefers-reduced-motion` (guard global).
- Breakpoints: 375 / 768 / 1024 / 1440. Toque ≥ 44×44px (público).

---

## 1. Chips de categoria no `PostCard` (frente pública)

### 1.1 Decisão
**Restaurar o estilo histórico `.category` (ADR-0024 item 4), com ajustes mínimos de container.** Os chips são display-only (sem link — não há página de arquivo por categoria nesta entrega). Motivo: a classe original já usava tokens canônicos (`--color-primary-500` sobre `--color-primary-50`), passa em contraste AA, e manter o visual histórico evita regressão visual.

Ajustes em relação ao histórico:
- Substituir as margens por chip (`margin-right/bottom`) por um **container flex com `gap`**, para espaçamento uniforme e wrap previsível.
- `border-radius: 50px` → `--border-radius-full` (token, pill reservado a badges).
- Adicionar `white-space: nowrap` para que um chip nunca quebre no meio.
- Posição: **acima do título**, como no original (commit b7950f1).

### 1.2 Marcação em `components/Features/Blog/PostCard.js`
Substituir o TODO pelo bloco original, renderizando quando `post.categories?.length > 0`:

```jsx
{post.categories?.length > 0 && (
  <div className={styles.categories} aria-label="Categorias do post">
    {post.categories.map((cat) => (
      <span key={cat.id ?? cat.slug} className={styles.category}>
        {cat.name}
      </span>
    ))}
  </div>
)}
<h3 className={styles.cardTitle}>{post.title}</h3>
```

- Chave: preferir `cat.id`; fallback `cat.slug`.
- Renderizar **todas** as categorias (sem truncamento/"ver mais"). Como a lista cresce devagar e um post raramente tem muitas, o wrap é o comportamento esperado.

### 1.3 CSS em `components/Features/Blog/styles/Blog.module.css`
Adicionar (dentro do bloco "PostCard Styles"):

```css
.categories {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  margin: 0 0 var(--spacing-3) 0;
}

.category {
  font-size: var(--font-size-xs);
  color: var(--color-primary-500);
  background-color: var(--color-primary-50);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--border-radius-full);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1.2;
  display: inline-block;
  white-space: nowrap;
}
```

- 3+ categorias: o container quebra em múltiplas linhas (`flex-wrap: wrap`) com `gap` de 8px; sem `line-clamp` nem limite de contagem. O card cresce em altura e o rodapé continua colado no fundo via `flex: 1` do `.excerpt` (MASTER §7 Cartão / home.md §6).
- Sem `:hover`/cursor (não é link). Não adicionar `cursor: pointer` nem `role="link"`.

### 1.4 Contraste (verificado)
- Texto `--color-primary-500` (#2563eb) sobre fundo `--color-primary-50` (#eff6ff): ≈ 5,9:1 ≥ 4,5:1 (AA). OK.
- Ícones não se aplicam (sem ícone). Sem emoji.

---

## 2. Campo de atribuição no formulário de post (painel)

### 2.1 Decisão
**Grupo de checkboxes com wrap** (não multi-select nativo, não tag-input). Motivo: número de categorias pequeno e cresce devagar; checkboxes expõem todas as opções de uma vez, são acessíveis por teclado e dispensam componentes novos. O padrão existente mais próximo é o `PermissionsSelectField` de `components/Admin/AdminRolesTab.js` (checkboxes em grid, toggle por clique, valor como array de strings/ids). Copiar essa estrutura, trocando permissões por categorias.

### 2.2 Implementação esperada (para o fixer)
- Em `components/Admin/AdminPosts.js`, adicionar estado `categories` (array) carregado via `GET /api/admin/categories` (ou endpoint de listagem completa) no mount.
- Criar um componente inline `CategorySelectField` (mesmo padrão de `PermissionsSelectField`), recebendo `{ name, value, onChange, label, error, gridColumn }`, onde `value` é `number[]` (ids).
- Campo no `fields`:
  ```js
  {
    name: 'category_ids',
    component: CategorySelectField,
    label: 'Categorias',
    gridColumn: 'span 2',
    hint: 'Opcional. Selecione uma ou mais categorias.'
  }
  ```
- `initialFormData` ganha `category_ids: []`.
- Schema Zod: `category_ids: z.array(z.number()).optional()` (campo opcional — post sem categoria é válido).
- `validate` (custom) não precisa validar categorias.
- Mapeamento na edição: ao carregar post para edição, preencher `category_ids` a partir de `post.categories` (ids). O fixer trata no `handleEdit`/hook conforme o payload da API.
- Layout do grupo: `display: flex; flex-wrap: wrap; gap: var(--spacing-2)`; cada checkbox-label `display: inline-flex; align-items: center; gap: var(--spacing-2); min-height: 32px; padding: var(--spacing-1) var(--spacing-2); cursor: pointer;`. Borda/erro: container com borda `--color-error-500` + halo vermelho quando `error` (par do MASTER §7 Campo, sem `outline` fora de foco).
- Estado vazio (0 categorias cadastradas): renderizar texto auxiliar `Nenhuma categoria cadastrada. Crie na aba "Categorias".` em `--color-text-tertiary`, 12px, em vez da lista. Não esconder o campo.
- Labels visíveis acima do grupo (MASTER §3/§8): `<label>` associado ao grupo via `htmlFor` no primeiro checkbox ou `aria-labelledby` no container.

---

## 3. Seção "Categorias" na aba "Posts/Artigos"

### 3.1 Decisão de posicionamento
**Sub-cabeçalho com toggle "Posts | Categorias"** (segmented control), em vez de seção abaixo da lista ou aba nova. Motivo: mantém uma única área de foco por vez, evita duas formulários abertos simultaneamente e não exige permissão nova (reuso de `Posts/Artigos`). A aba externa do painel continua "Posts/Artigos".

### 3.2 Estrutura em `components/Admin/AdminPosts.js`
- Adicionar `const [view, setView] = useState('posts')` (default `'posts'`).
- No topo do retorno, renderizar o toggle:
  ```jsx
  <div role="group" aria-label="Visualização da aba Posts/Artigos"
       style={{ display: 'inline-flex', gap: 0, marginBottom: 'var(--spacing-4)',
                border: '1px solid var(--color-border-light)', borderRadius: 'var(--border-radius-lg)',
                overflow: 'hidden' }}>
    <button type="button" aria-pressed={view === 'posts'}
            onClick={() => setView('posts')}
            style={{ padding: 'var(--spacing-2) var(--spacing-4)', border: 'none',
                     background: view === 'posts' ? 'var(--color-primary-500)' : 'var(--color-bg-primary)',
                     color: view === 'posts' ? 'var(--color-text-inverse)' : 'var(--color-text-primary)',
                     fontWeight: 'var(--font-weight-medium)', cursor: 'pointer', minHeight: 40 }}>
      Posts
    </button>
    <button type="button" aria-pressed={view === 'categories'}
            onClick={() => setView('categories')}
            style={{ ... mesmos estilos, borda esquerda 1px solid var(--color-border-light) }}>
      Categorias
    </button>
  </div>
  ```
  (Pode-se extrair para CSS Module se preferir; inline segue o padrão atual de `AdminPosts.js`.)
- Se `view === 'posts'`: renderizar o `AdminCrudBase` de posts existente, sem alteração.
- Se `view === 'categories'`: renderizar `<AdminCategories />` (novo componente).

### 3.3 Foco visível do toggle
Ambos os botões usam o par do MASTER: `:focus-visible { outline: 2px solid var(--color-focus-primary); outline-offset: 2px; box-shadow: var(--color-focus-ring); }`. Nunca `outline: none` seco.

### 3.4 `AdminCategories` (novo arquivo `components/Admin/AdminCategories.js`)
Seguir o padrão de `components/Admin/AdminDicas.js` (CRUD simples) + geração de slug de `components/Admin/AdminPosts.js`. Permission não é verificada dentro do componente (a aba já é gated por `Posts/Artigos` em `pages/admin.js`).

**Schema Zod:**
```js
const categorySchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens')
});
```

**Campos:**
```js
const fields = [
  { name: 'name', component: TextField, label: 'Nome', required: true, placeholder: 'Nome da categoria', gridColumn: 'span 2' },
  { name: 'slug', component: TextField, label: 'Slug (URL amigável)', required: true, placeholder: 'nome-da-categoria', hint: 'Gerado automaticamente a partir do nome; pode ser editado.', gridColumn: 'span 2' }
];
```

**Colunas da tabela:** `ID` (60px) | `Nome` | `Slug`. (Sem coluna de status — categoria não tem publicado/rascunho.)

**Dados iniciais:** `{ name: '', slug: '' }`.

**Geração de slug:** no `renderCustomFormField`, replicar o padrão de `AdminPosts.js`:
- Campo `name`: `onBlur` gera slug se `slug` vazio (`setFieldValue('slug', generateSlug(name))`), com toast de sucesso uma vez (`slugGeneratedRef`).
- Campo `slug`: renderização normal do `TextField`.

**Confirmação de exclusão:** usar o `AdminCrudBase` padrão, que já exibe o `Modal` de confirmação existente (`"Confirmar exclusão"` / `"Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita."` / `"Cancelar"` / `"Sim, excluir"`). **Não criar diálogo novo** — pendência conhecida de diálogos de confirmação (privado §8 item 10). A exclusão em cascata (`post_categories` CASCADE) remove vínculos sem aviso adicional; o texto do modal padrão já cobre.

**Textos:**
- `title="Gerenciar Categorias"`, `newButtonText="+ Nova Categoria"`, `saveButtonText="Salvar"`, `updateButtonText="Atualizar"`, `emptyMessage="Nenhuma categoria cadastrada."`, `itemNameSingular="categoria cadastrada"`, `itemNamePlural="categorias cadastradas"`.
- `searchable={true}` (busca por nome/slug), `showItemCount={true}`.

**API:** `apiEndpoint="/api/admin/categories"` (a ser criado pelo fixer conforme ADR-0024).

### 3.5 Validação de slug duplicado (UNIQUE)
- A violação de UNIQUE vem do backend (409). O `AdminCrudBase` exibe toast com a mensagem da API e mantém o formulário aberto. O campo `slug` deve mostrar estado de erro inline quando a API retornar erro de campo. Nenhum tratamento especial na UI além do padrão existente.

---

## 4. Anti-padrões e checklist (MASTER §9–§10)

- Sem emoji como ícone (os ícones de aba do painel já existem e não são alterados por esta spec).
- Foco visível tokenizado em todo interativo (chips não são interativos → sem foco).
- Labels visíveis acima dos campos (`category_ids` e `name`/`slug`).
- `prefers-reduced-motion`: sem animação nova; o guard global cobre. Nenhum deslocamento adicional.
- Contraste AA: chip 5,9:1 (§1.4); demais reusam tokens verificados.
- Responsivo: chips com `flex-wrap` (375/768/1024/1440); toggle inline com `flex-wrap` se necessário; checkboxes com wrap.
- Toque ≥ 44px no público (chips não clicáveis, sem requisito); no painel admin, botões do toggle com `min-height: 40px` (padrão admin) — aceitável por ser área administrativa desktop-first, mas preferir 44px quando espaço permitir.
- Sem token novo fora de `variables.css`.

---

## 5. O que o @fixer deve verificar antes de entregar

- Chips aparecem em `/blog` e na aba Reflexões da home quando `post.categories` vier populado; não aparecem quando vazio (sem erro).
- Wrap funciona com 3+ categorias sem quebrar o layout do card nem o rodapé.
- Formulário de post exibe checkboxes quando há categorias e o texto auxiliar quando não há.
- Toggle "Posts | Categorias" alterna entre os dois CRUDs sem perder estado do formulário (reset ao trocar é aceitável).
- CRUD de categorias: criar/editar/excluir com slug auto-gerado e editável; exclusão usa o modal padrão.
- Slug duplicado retorna erro visível (toast + campo).
- `npm run lint` não é porta (429 erros pré-existentes de markdown em `.opencode/skills/**`); usar `npx eslint` nos arquivos tocados. `npx jest` passa.
- Não alterar `docs/` nem lógica de negócio além do escopo; atualizar `docs/ARQUITETURA_SITE_PUBLICO.md` §7 item 13 e `docs/ARQUITETURA_SITE_PRIVADO.md` §8/§4.2 quando a mudança for estrutural (responsabilidade do orquestrador/fixer conforme AGENTS.md §0.2 regra 5).

## 6. Limites desta spec

- Não especifica backend (API/domínio) — já decidido em ADR-0024.
- Chips permanecem display-only; links para arquivo por categoria ficam para evolução futura (ADR-0024 "Revisão" (a)).
- Não cria permissão nova nem aba nova no painel externo.
- Não implementa código de componente — apenas decisões e referências de padrão.