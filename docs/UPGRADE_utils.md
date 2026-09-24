# 🔧 Levantamento de Melhorias — Pasta `/utils`

> **Atenção:** Este documento contém apenas o **levantamento analítico** de melhorias possíveis. Nenhuma alteração foi aplicada ao projeto.

---

## 1. Nome do documento

**Levantamento de Melhorias — Pasta `/utils`**

Documento de análise técnica da pasta `utils/` do projeto Caminhar, abordando todos os seus arquivos, relações, possíveis melhorias, duplicidades e código morto.

---

## 2. Descrição geral

Este documento tem como finalidade apresentar uma análise profunda e sequencial de todos os arquivos presentes na pasta `/home/gus/Projetos/Caminhar/utils`. O objetivo é documentar a finalidade, responsabilidade, relações e possíveis melhorias de cada arquivo, servindo como referência técnica para futuras refatorações e manutenções. O escopo da análise abrange exclusivamente os arquivos contidos na pasta `utils/`.

---

## 3. Estrutura de arquivos e pastas

A pasta `utils/` está localizada em `/home/gus/Projetos/Caminhar/utils` e contém os seguintes arquivos:

| Caminho do arquivo | Arquivos relacionados (consumidores) | Relação |
|---|---|---|
| `utils/csvExport.js` | `components/Admin/AdminAudit.js`, `components/Admin/AdminCrudBase.js` | Importa a função `exportToCSV` para exportação de dados em CSV |
| `utils/reorder.js` | `components/Admin/AdminMusicas.js`, `components/Admin/AdminPosts.js`, `components/Admin/AdminVideos.js`, `components/Admin/AdminProducts.js` | Importa a função `handleReorder` para reordenação de itens via API |

Não há subpastas, barrel (`index.js`) ou outros arquivos na pasta `utils/`.

---

## 4. Análise individual de cada arquivo

### 4.1 `utils/csvExport.js`

**Caminho completo:** `/home/gus/Projetos/Caminhar/utils/csvExport.js`

#### Arquivos acionados ou relacionados

- **`components/Admin/AdminAudit.js`** — importa `exportToCSV` (linha 4) para exportação de logs de auditoria.
- **`components/Admin/AdminCrudBase.js`** — importa `exportToCSV` (linha 4) para exportação genérica de dados CRUD.
- **APIs do navegador:** `Blob`, `URL.createObjectURL`, `URL.revokeObjectURL`, `document.createElement`, `process.env.NODE_ENV`.

#### Resumo do arquivo

Módulo utilitário que centraliza a lógica de exportação de dados para CSV no navegador. Contém duas funções:

- **`escapeCSV(val)`** — escapa um valor para o formato CSV, substituindo aspas duplas por `""` e envolvendo o valor entre aspas se contiver vírgulas, aspas ou quebras de linha.
- **`exportToCSV({ data, columns, filename, onEmpty })`** — recebe um array de objetos (`data`), configuração de colunas (`columns` com `key`, `header` e `format` opcional), nome do arquivo e callback para dados vazios. Gera o conteúdo CSV, cria um Blob com BOM (`\uFEFF`) para compatibilidade com Excel, cria um link temporário e inicia o download. A revogação do Blob via `URL.revokeObjectURL` é protegida por verificação de ambiente (não usa `setTimeout` em ambiente de teste para evitar timers abertos no event loop).

A formatação automática de valores booleanos para `'Publicado'`/`'Rascunho'` está acoplada a um domínio de negócio específico (status de publicação).

---

### 4.2 `utils/reorder.js`

**Caminho completo:** `/home/gus/Projetos/Caminhar/utils/reorder.js`

#### Arquivos acionados ou relacionados

- **`components/Admin/AdminMusicas.js`** — importa `handleReorder` (linha 8) para reordenação de músicas (endpoint `/api/admin/musicas`).
- **`components/Admin/AdminPosts.js`** — importa `handleReorder` (linha 7) para reordenação de posts (endpoint `/api/admin/posts`).
- **`components/Admin/AdminVideos.js`** — importa `handleReorder` (linha 8) para reordenação de vídeos (endpoint `/api/admin/videos`).
- **`components/Admin/AdminProducts.js`** — importa `handleReorder` (linha 7) para reordenação de produtos (endpoint `/api/products`).
- **`components/Admin/AdminCrudBase.js`** — possui função local `handleReorderWithFeedback` (linha 162) que encapsula lógica similar, mas não importa `handleReorder` diretamente.

#### Resumo do arquivo

Módulo utilitário que centraliza a lógica de reordenação de itens via API (Drag & Drop). Contém uma única função:

- **`handleReorder(endpoint, reorderedItems, currentPage, itemsPerPage)`** — calcula o offset baseado na página atual e itens por página, constrói um payload com a nova ordem (`{ action: 'reorder', items: [{ id, position }] }`) e envia via `fetch` com método `PUT` para o endpoint informado. Lança erro genérico (`'Falha ao reordenar'`) caso a resposta não seja OK.

Este utilitário substitui a lógica duplicada de `handleReorder` que existia em `AdminMusicas.js`, `AdminPosts.js`, `AdminVideos.js` e `AdminProducts.js`.

---

## 5. Ajustes e correções

### 5.1 `utils/csvExport.js`

| # | O que foi encontrado | Onde | Problema | Correção necessária |
|---|---|---|---|---|
| 1 | Validação de parâmetros ausente | Função `exportToCSV` (linha 34) | A função não valida se `columns` está presente ou é um array válido. Se `columns` for `undefined` ou vazio, `columns.map` lançará `TypeError` sem mensagem clara. | Adicionar validação: `if (!Array.isArray(columns) || columns.length === 0) throw new Error(...)` |
| 2 | Tratamento de `document` inexistente (SSR/Node) | Linha 72 | O módulo depende do objeto global `document`. Em ambientes SSR/Next.js ou testes JSDOM sem API completa, `document.createElement('a')` pode falhar. O tratamento especial existe apenas para `URL.revokeObjectURL`, não para o `document`. | Considerar guard: `if (typeof document === 'undefined') throw new Error(...)` |

### 5.2 `utils/reorder.js`

| # | O que foi encontrado | Onde | Problema | Correção necessária |
|---|---|---|---|---|
| 3 | Ausência de validação do endpoint | Função `handleReorder` (linha 17) | Não valida se `endpoint` foi informado. Se `undefined`, `fetch(undefined, ...)` produz erro pouco claro. | Adicionar: `if (!endpoint) throw new Error(...)` |
| 4 | Mensagem de erro genérica | Linha 26 | A mensagem `'Falha ao reordenar'` não inclui o endpoint nem o status HTTP, dificultando diagnóstico em produção. | Incluir endpoint e status: `` `Falha ao reordenar em ${endpoint}: HTTP ${response.status}` `` |

---

## 6. Melhorias

### 6.1 `utils/csvExport.js`

| # | Melhoria | Justificativa técnica |
|---|---|---|
| 5 | Extrair constante nomeada para `1000` ms do `setTimeout` | Constante mágica sem nome reduz manutenção. Sugestão: `const BLOB_REVOKE_DELAY_MS = 1000;` |
| 6 | Desacoplar formatação de booleanos do domínio | A conversão automática para `'Publicado'`/`'Rascunho'` (linhas 56-58) é regra de negócio embutida em utilitário genérico. Componentes que exportarem booleanos com outros significados receberão rótulos incorretos. Sugestão: remover comportamento automático e delegar ao `col.format`, ou tornar configurável via option. |
| 7 | Criar testes unitários dedicados | Não existem testes diretos para `csvExport.js`. Cobertura é indireta via `AdminCrudBase.test.js` e `AdminAudit.test.js`. Edge cases (valores com `\r\n`, objetos `Date`, arrays) não são validados isoladamente. Sugestão: `tests/unit/utils/csvExport.test.js`. |

### 6.2 `utils/reorder.js`

| # | Melhoria | Justificativa técnica |
|---|---|---|
| 8 | Criar testes unitários dedicados | Não existem testes diretos para `reorder.js`. Testes de componentes e de API cobrem o fluxo ponta-a-ponta, mas `handleReorder` não é testada isoladamente (cálculo de offset, construção de payload, erro). Sugestão: `tests/unit/utils/reorder.test.js`. |

### 6.3 Estruturais (pasta `/utils`)

| # | Melhoria | Justificativa técnica |
|---|---|---|
| 9 | Avaliar criação de barrel `index.js` | A pasta não possui barrel. Consumidores importam diretamente (`@/utils/csvExport`, `@/utils/reorder`). Se a pasta crescer, barrel simplificaria imports. Sugestão: avaliar quando houver 3+ arquivos. |
| 10 | Avaliar alinhamento de nomenclatura do diretório | O projeto já possui `/scripts/utils/` e `/lib/api/utils.js`. Avaliar se `utils/` seria melhor alocada em `/lib/utils/` ou se deve permanecer. Nenhuma ação necessária no momento. |

---

## 7. Duplicidades

| # | Duplicidade encontrada | Evidência | Observação |
|---|---|---|---|
| 11 | Lógica duplicada de `handleReorder` no projeto | O próprio cabeçalho de `reorder.js` (linhas 4-9) documenta que substitui lógica duplicada em `AdminMusicas.js`, `AdminPosts.js`, `AdminVideos.js` e `AdminProducts.js`. | **Resolvida** pela criação do utilitário. |
| 12 | Lógica de `fetch` com `response.ok` e erro | `reorder.js` (linha 21-26) usa `fetch` com verificação `response.ok` e erro genérico. O projeto possui `hooks/useApiFetch.js` que centraliza chamadas de API com `loading`/`error`. | **Não é duplicidade direta** — `useApiFetch` é hook React declarativo para leituras (GET) automáticas na montagem; `handleReorder` é função imperativa de mutação (PUT) sob demanda. Reuso direto não é trivial. Ponto de atenção para futuras evoluções: se novos utilitários de mutação surgirem, avaliar helper comum de `fetch`. |

---

## 8. Código morto

| # | Item | Análise | Status |
|---|---|---|---|
| 13 | Função `escapeCSV` | Utilizada internamente por `exportToCSV` (linha 61). | **Não é código morto** — está em uso. |
| 14 | Função `exportToCSV` | Importada por `AdminAudit.js` e `AdminCrudBase.js`. | **Não é código morto** — está em uso. |
| 15 | Função `handleReorder` | Importada por 4 componentes Admin (Musicas, Posts, Videos, Products). | **Não é código morto** — está em uso. |
| 16 | Parâmetro `onEmpty` em `exportToCSV` | Definido na assinatura (linha 34) e chamado condicionalmente (linhas 36-38). | **Não é código morto** — parâmetro opcional funcional. |
| 17 | `AdminCrudBase.js` — função `handleReorderWithFeedback` | Possui lógica similar a `handleReorder`, mas não importa o utilitário. | **Possível candidato a refatoração** — poderia ser simplificado para delegar ao utilitário compartilhado, removendo lógica duplicada residual. |

---

## 9. Resumo Prioritário

| # | Item | Arquivo | Severidade | Esforço |
|---|---|---|---|---|
| 1 | Validação de `columns` ausente | `csvExport.js` | Média | Baixo |
| 2 | Testes unitários dedicados | `csvExport.js` / `reorder.js` | Média | Médio |
| 3 | Mensagem de erro com endpoint/status | `reorder.js` | Baixa | Baixo |
| 4 | Booleanos acoplados ao domínio | `csvExport.js` | Baixa | Baixo |
| 5 | Validação do `endpoint` | `reorder.js` | Baixa | Baixo |
| 6 | Guard para ambiente sem `document` | `csvExport.js` | Baixa | Baixo |
| 7 | Reuso da infraestrutura `useApiFetch` | `reorder.js` | Média | Médio |
| 8 | Avaliar futuro barrel `index.js` | `/utils` | Muito baixa | Muito baixo |
