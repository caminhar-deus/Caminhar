# 🔧 Levantamento de Melhorias — Pasta `/utils`

> **Atenção:** Este documento contém apenas o **levantamento analítico** de melhorias possíveis. Nenhuma alteração foi aplicada ao projeto.

---

## 1. `utils/csvExport.js`

### 1.1 Validação de parâmetros ausente

**Severidade:** Média  
**Tipo:** Correção de código

A função `exportToCSV` não valida se `columns` está presente ou se é um array válido. Se `columns` for `undefined` ou vazio, `columns.map` lançará `TypeError` de forma silenciosa e sem mensagem clara.

**Sugestão:** Adicionar validação no início da função:

```js
if (!Array.isArray(columns) || columns.length === 0) {
  throw new Error('exportToCSV: parâmetro "columns" é obrigatório e deve ser um array não vazio.');
}
```

---

### 1.2 Tratamento de `document` inexistente (SSR/Node)

**Severidade:** Baixa  
**Tipo:** Ponto de atenção técnico

O módulo depende do objeto global `document` (linha 72). Em ambientes de renderização no servidor (SSR/Next.js) ou testes JSDOM sem a API completa, a chamada `document.createElement('a')` pode falhar. Atualmente, o tratamento especial existe apenas para `URL.revokeObjectURL`, não para o `document`.

**Sugestão:** Considerar um guard:

```js
if (typeof document === 'undefined') {
  throw new Error('exportToCSV: ambiente sem suporte a DOM.');
}
```

---

### 1.3 Formatação de booleanos acoplada ao domínio

**Severidade:** Baixa  
**Tipo:** Ajuste estrutural / Duplicidade conceitual

A conversão automática de booleanos para `'Publicado'`/`'Rascunho'` (linhas 56-58) é uma regra de **domínio de negócio** embutida dentro de um utilitário genérico. Isso cria um acoplamento: qualquer componente que exporte um boolean que **não** represente status de publicação receberá `'Publicado'`/`'Rascunho'` de forma incorreta.

**Sugestão:** Remover esse comportamento automático e delegar a formatação ao formato customizado (`col.format`), que já é suportado. Ou, no mínimo, tornar o comportamento configurável via option (ex.: `booleanLabels: { true: 'Sim', false: 'Não' }`).

---

### 1.4 Constante mágica no `setTimeout`

**Severidade:** Muito baixa  
**Tipo:** Manutenção

O valor `1000` (ms) na linha 81 é uma constante mágica sem nome nem explicação adicional além do comentário existente.

**Sugestão:** Extrair para constante nomeada, ex.:

```js
const BLOB_REVOKE_DELAY_MS = 1000;
```

---

### 1.5 Ausência de testes unitários diretos

**Severidade:** Média  
**Tipo:** Melhoria de manutenção

Não existem testes unitários dedicados para `utils/csvExport.js`. A cobertura é indireta via `AdminCrudBase.test.js` e `AdminAudit.test.js`. Isso significa que:
- Alterações na função `escapeCSV` ou na estrutura do CSV não são detectadas isoladamente.
- Edge cases (valores com `\r\n`, objetos `Date`, arrays como valores) não são validados diretamente.

**Sugestão:** Criar `tests/unit/utils/csvExport.test.js` com casos dedicados para `escapeCSV` e `exportToCSV`, mockando `URL.createObjectURL`, `URL.revokeObjectURL` e `document`.

---

## 2. `utils/reorder.js`

### 2.1 Ausência de validação do endpoint

**Severidade:** Baixa  
**Tipo:** Correção de código

A função `handleReorder` não valida se `endpoint` foi informado. Se `undefined`, a chamada `fetch(undefined, ...)` produzirá erro pouco claro.

**Sugestão:**

```js
if (!endpoint) {
  throw new Error('handleReorder: parâmetro "endpoint" é obrigatório.');
}
```

---

### 2.2 Não utiliza `Headers` explícito

**Severidade:** Muito baixa  
**Tipo:** Boa prática

O header `Content-Type` é passado como objeto literal. Funcional e simples, porém o uso de `new Headers()` permitiria maior consistência se a função evoluir para incluir tokens de autenticação ou outros headers.

**Sugestão:** Manter como está (simplicidade é positiva) — registrar apenas como ponto de atenção para futuras evoluções.

---

### 2.3 Mensagem de erro genérica

**Severidade:** Baixa  
**Tipo:** Correção de código

A mensagem `'Falha ao reordenar'` não inclui o endpoint nem o status HTTP. Em logs de produção, dificulta o diagnóstico de qual endpoint falhou e por quê.

**Sugestão:**

```js
if (!response.ok) {
  throw new Error(`Falha ao reordenar em ${endpoint}: HTTP ${response.status}`);
}
```

---

### 2.4 Duplicidade de contrato entre frontend e backend

**Severidade:** Baixa  
**Tipo:** Ponto de atenção técnico

O payload `{ action: 'reorder', items: [...] }` é um contrato implícito entre o frontend (este utilitário) e os endpoints de API (`/api/admin/musicas`, `/api/admin/posts`, `/api/admin/videos`, `/api/products`). Não há um schema/validação compartilhada que garanta consistência — testes de API cobrem o contrato, mas refatorações futuras podem desalinhá-lo silenciosamente.

**Sugestão:** Considerar documentar o contrato em um local centralizado ou extrair constantes de action (`ACTION_REORDER = 'reorder'`) para uso compartilhado.

---

### 2.5 Ausência de testes unitários diretos

**Severidade:** Média  
**Tipo:** Melhoria de manutenção

Assim como `csvExport.js`, não existem testes dedicados para `utils/reorder.js`. Os testes de componentes (`AdminMusicas.test.js`, `AdminPosts.test.js`, `AdminVideos.test.js`, `AdminCrudBase.test.js`) e de API cobrem o fluxo ponta-a-ponta, mas a função `handleReorder` em si não é testada isoladamente — incluindo o cálculo de offset com paginação e a construção do payload.

**Sugestão:** Criar `tests/unit/utils/reorder.test.js` com casos para:
- Offset correto na página 1, 2 e 3.
- Payload com itens reordenados.
- Erro lançado quando `response.ok` é `false`.
- Endpoint ausente.

---

## 3. Aspectos Estruturais (ambos os arquivos)

### 3.1 Padrão de nomenclatura do diretório

**Severidade:** Muito baixa  
**Tipo:** Organizacional

A pasta `/utils` usa o nome genérico comum em projetos JavaScript. Porém, o projeto já possui outras pastas de utilitários com propósitos específicos:
- `/scripts/utils/` — utilitários para scripts de linha de comando.
- `/lib/api/utils.js` — utilitários da camada de API (`generateUUID`, `parseImages`, `generateMeta`).

**Sugestão:** Avaliar se esses dois arquivos seriam melhor alocados em `/lib/utils/` (para alinhar com a estrutura de `lib/`) ou se a pasta `/utils` deve permanecer como está por simplicidade. Nenhuma ação necessária no momento — registrar apenas para revisão futura.

---

### 3.2 Sem barrel `index.js`

**Severidade:** Muito baixa  
**Tipo:** Organizacional

A pasta `/utils` não possui um `index.js` barrel. Os consumidores importam diretamente de `@/utils/csvExport` e `@/utils/reorder`. Isso é funcional e claro, mas se a pasta crescer, um barrel poderia simplificar imports.

**Sugestão:** Avaliar quando houver 3+ arquivos na pasta.

---

### 3.3 Duplicidade de lógica de `fetch` com callback de erro

**Severidade:** Média  
**Tipo:** Duplicidade de código / Ponto de atenção técnico

O `handleReorder` usa `fetch` com verificação de `response.ok` e lançamento de erro genérico. O projeto possui o hook `useApiFetch` (`/hooks/useApiFetch.js`) que centraliza chamadas de API com estados de `loading`/`error`. Porém, há uma diferença estrutural relevante: `useApiFetch` é um **hook React declarativo** (usa `useState`, `useEffect`, `useCallback`, `useRef`) orientado a operações de leitura (GET) executadas automaticamente na montagem do componente, enquanto `handleReorder` é uma **função utilitária imperativa** de mutação (PUT) chamada sob demanda em um handler de evento. O reuso direto não é trivial, mas vale registrar o ponto: se novos utilitários de mutação surgirem, avaliar a criação de um helper compartilhado de requisição com tratamento uniforme de `response.ok` e mensagens de erro.

**Sugestão:** Registrar como ponto de atenção para futuras evoluções — caso a pasta `/utils` cresça com mais funções de mutação, avaliar a extração de um helper comum de `fetch` com tratamento de erro consistente.

---

## 4. Resumo Prioritário

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
