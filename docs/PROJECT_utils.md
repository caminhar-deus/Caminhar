# 📦 Análise da Pasta `/utils`

## Visão Geral

A pasta `/utils` contém **2 arquivos** responsáveis por funcionalidades utilitárias compartilhadas entre os componentes administrativos (`components/Admin/`). Ambos foram criados para **eliminar duplicidade de código** que existia anteriormente espalhada em múltiplos componentes, centralizando lógica comum em módulos reutilizáveis.

| Arquivo | Localização | Responsabilidade |
|---|---|---|
| `csvExport.js` | `/utils/csvExport.js` | Exportação de dados para CSV no navegador |
| `reorder.js` | `/utils/reorder.js` | Reordenação (Drag & Drop) de itens no Admin |

---

## 1. `utils/csvExport.js`

### Localização
`/utils/csvExport.js`

### Propósito
Helper compartilhado para exportação de dados para **CSV** no lado do cliente. Centraliza a lógica de geração de arquivo com BOM UTF-8, criação de Blob, link temporário e download automático — eliminando a duplicação dessa rotina entre componentes administrativos.

### Funcionalidades

| Função | Descrição |
|---|---|
| `escapeCSV(val)` | Função interna que escapa valores para o formato CSV, tratando aspas duplas (`"` → `""`), vírgulas e quebras de linha. Valores com caracteres especiais são envolvidos em aspas. |
| `exportToCSV({ data, columns, filename, onEmpty })` | Função principal de exportação. Recebe os dados, a configuração de colunas, o nome base do arquivo e um callback opcional para lista vazia. |

### Comportamento detalhado de `exportToCSV`

1. **Validação de dados vazios** — Se `data` estiver vazio ou ausente, chama o callback `onEmpty` (se fornecido) e encerra sem criar o arquivo.
2. **Geração de cabeçalhos** — Mapeia `columns[].header` para a primeira linha do CSV.
3. **Processamento das linhas** — Para cada item, extrai o valor pela chave `col.key` e aplica:
   - **Formatador customizado** (`col.format`) — função opcional para formatar o valor (ex.: `Date` → `'dd/mm/aaaa'`).
   - **Formatação de booleanos** — `true` → `'Publicado'`, `false` → `'Rascunho'`.
   - **Tratamento de `null`/`undefined`** — convertidos para string vazia.
   - **Escape CSV** — via `escapeCSV()`.
4. **Geração do arquivo** — Concatena cabeçalhos e linhas com `\n`, cria Blob com prefixo `\uFEFF` (BOM UTF-8) e `type: 'text/csv;charset=utf-8;'` para garantir compatibilidade com Excel.
5. **Download** — Cria elemento `<a>` temporário com atributo `download`, anexa ao DOM, dispara o clique e remove do DOM.
6. **Liberação de memória** — Chama `URL.revokeObjectURL()` de forma assíncrona (com `setTimeout` de 1000ms), exceto em ambiente de teste onde é síncrono para evitar que timers mantenham o event loop aberto.

### Dependências
- Nenhuma dependência externa. Utiliza apenas APIs nativas do navegador (`Blob`, `URL.createObjectURL`, `URL.revokeObjectURL`, `document`).

### Consumidores

| Consumidor | Localização | Uso |
|---|---|---|
| `AdminCrudBase.js` | `/components/Admin/AdminCrudBase.js` | Exportação genérica de qualquer CRUD com `exportable={true}`, mapeando `columns` recebidas via props e gerando nome de arquivo a partir do `title`. |
| `AdminAudit.js` | `/components/Admin/AdminAudit.js` | Exportação de logs de auditoria com colunas específicas e nome de arquivo com data (`auditoria_export_YYYY-MM-DD`). |

### Cobertura de testes

Não existem testes unitários diretos para `utils/csvExport.js`. A cobertura é **indireta** através de:
- `tests/unit/components/Admin/AdminCrudBase.test.js` — valida escape de aspas/quebras de linha, exportação sem caracteres especiais, e toast de erro quando não há dados.
- `tests/unit/components/Admin/AdminAudit.test.js` — valida escape de caracteres especiais, geração de Blob, e erro ao exportar sem dados.

---

## 2. `utils/reorder.js`

### Localização
`/utils/reorder.js`

### Propósito
Helper compartilhado para **reordenação (Drag & Drop)** de itens no painel administrativo. Substitui a lógica de `handleReorder` que anteriormente existia duplicada em `AdminMusicas.js`, `AdminPosts.js`, `AdminVideos.js` e `AdminProducts.js`.

### Funcionalidades

| Função | Descrição |
|---|---|
| `handleReorder(endpoint, reorderedItems, currentPage = 1, itemsPerPage = 10)` | Envia a nova ordem dos itens para a API via `PUT`, calculando o offset correto com base na paginação atual. |

### Comportamento detalhado de `handleReorder`

1. **Cálculo de offset** — `(currentPage - 1) * itemsPerPage` para que as posições sejam absolutas no banco, mesmo com paginação ativa.
2. **Construção do payload** — Mapeia cada item para `{ id: item.id, position: offset + index }`, preservando a ordem visual do Drag & Drop.
3. **Requisição** — Envia `PUT` para o endpoint informado com header `Content-Type: application/json` e body `{ action: 'reorder', items: [...] }`.
4. **Tratamento de erro** — Lança `Error('Falha ao reordenar')` se a resposta não for `ok`.

### Dependências
- Nenhuma dependência externa. Utiliza apenas `fetch` nativo.

### Consumidores

| Consumidor | Localização | Uso |
|---|---|---|
| `AdminMusicas.js` | `/components/Admin/AdminMusicas.js` | `handleReorder('/api/admin/musicas', items, page, perPage)` |
| `AdminPosts.js` | `/components/Admin/AdminPosts.js` | `handleReorder('/api/admin/posts', items, page, perPage)` |
| `AdminVideos.js` | `/components/Admin/AdminVideos.js` | `handleReorder('/api/admin/videos', items, page, perPage)` |
| `AdminProducts.js` | `/components/Admin/AdminProducts.js` | `handleReorder('/api/products', items, page, perPage)` |

> **Nota:** Todos os consumidores passam o `handleReorder` como callback `onReorder` do `AdminCrudBase`, que por sua vez o envolve em `handleReorderWithFeedback` — responsável por reverter a ordem local em caso de falha e exibir toast de erro.

### Cobertura de testes

Não existem testes unitários diretos para `utils/reorder.js`. A cobertura é **indireta** através de:
- `tests/unit/components/Admin/AdminCrudBase.test.js` — valida comportamento de reversão em caso de falha na reordenação.
- `tests/unit/components/Admin/AdminMusicas.test.js`, `AdminPosts.test.js`, `AdminVideos.test.js` — valida integração do Drag & Drop com a API.
- Testes de API (`tests/integration/api/admin/musicas.test.js`, `posts.test.js`, `videos.test.js`) — validam o contrato `{ action: 'reorder', items: [...] }` no backend.

---

## Resumo das Relações

```
┌─────────────────────────────────────────────────────────────┐
│                         /utils                              │
│  ┌──────────────────────┐       ┌─────────────────────────┐ │
│  │   csvExport.js       │       │      reorder.js         │ │
│  │   exportToCSV()      │       │   handleReorder()       │ │
│  └──────────┬───────────┘       └────────────┬────────────┘ │
└─────────────┼────────────────────────────────┼──────────────┘
              │                                │
              ▼                                ▼
┌──────────────────────────┐    ┌──────────────────────────────────────┐
│     AdminCrudBase.js     │    │  AdminCrudBase.js (onReorder)        │
│  handleExportCSV()       │    │  handleReorderWithFeedback()         │
│  (exportable=true)       │    │  (reorderable=true)                  │
└──────────────────────────┘    └──────────────┬───────────────────────┘
              │                                │
              ▼                                ▼
┌──────────────────────────┐    ┌──────────────────────────────────────┐
│      AdminAudit.js       │    │  AdminMusicas / AdminPosts /          │
│  (exportação de logs)    │    │  AdminVideos / AdminProducts          │
└──────────────────────────┘    └──────────────────────────────────────┘
```

## Observações Finais

- **Nenhum arquivo irrelevante** foi encontrado na pasta. Ambos os módulos são utilizados ativamente pelos componentes administrativos.
- Os arquivos seguem o padrão **ES Modules** (`import`/`export`) do projeto.
- Não há subpastas dentro de `/utils`.
- Não há testes unitários dedicados especificamente para estes arquivos — a cobertura ocorre indiretamente por meio dos testes dos componentes consumidores.