# ⚡ JEST + ESM — Guia de Configuração para Testes com `import.meta` e Top-Level `await`

> **Data:** 21/05/2026  
> **Projeto:** Caminhar  
> **Objetivo:** Documentar o passo a passo para que os 3 suítes de teste de scripts com falha (`connection.test.js`, `migrate.test.js`, `init-table.test.js`) passem sem erros.

---

## 1. Contexto do Problema

### 1.1. Situação atual

O Jest está configurado para transformar ES Modules via Babel (`babel-jest`). Isso funciona para `import`/`export`, **mas não** para duas features exclusivas de ESM nativo:

| Feature | Ocorre em | Erro |
|---------|-----------|------|
| `import.meta.url` | `scripts/init-table.js:44` | `SyntaxError: Cannot use 'import.meta' outside a module` |
| Top-level `await` | `scripts/validate-schema.js:61` | `SyntaxError: await is only valid in async functions` |

### 1.2. Scripts afetados

| Script | Feature ESM | Impacto |
|--------|:-----------:|:-------:|
| `scripts/init-table.js` | `import.meta.url` | Não pode ser importado via `require()` |
| `scripts/validate-schema.js` | `await` no top-level | Não pode ser importado via `require()` |
| `scripts/migrate.js` | `await` no top-level (IIFE) | Não pode ser importado via `require()` |

### 1.3. Testes que falham por causa disso

- `tests/unit/scripts/init-table.test.js` — **parse error** (não executa nada)
- `tests/unit/scripts/validate-schema.test.js` — **parse error** (já corrigido com `unstable_mockModule`, mas ainda frágil)
- `tests/unit/scripts/migrate.test.js` — erro secundário: `jest.unstable_mockModule('fs')` retorna módulo real, não mockado (ver seção 3)
- `tests/unit/scripts/db/connection.test.js` — erro secundário: `unstable_mockModule('pg')` cria referência isolada que o `connection.js` não enxerga (ver seção 3)

---

## 2. Diagnóstico Detalhado

### 2.1. `import.meta.url` — `init-table.js`

```javascript
// scripts/init-table.js:44
const schemaPath = new URL(`./schemas/${tableName}.json`, import.meta.url).pathname;
```

- `import.meta.url` só existe em **módulos ESM nativos**
- Babel transforma `import`/`export` para CommonJS, mas **não transforma** `import.meta`
- Solução (sem tocar no script): fazer Jest rodar este arquivo como ESM nativo

### 2.2. Top-level `await` — `validate-schema.js` e `migrate.js`

```javascript
// scripts/validate-schema.js:89
const success = await validateSchema();
process.exit(success ? 0 : 1);

// scripts/migrate.js:188 (IIFE)
(async () => {
  // ...
  await applyMigration(pool, file);
  // ...
})();
```

- Top-level `await` é feature **exclusiva de ESM nativo**
- Babel pode transformar `async` IIFE, mas `await` no escopo global do módulo requer ESM
- Solução (sem tocar no script): fazer Jest rodar estes arquivos como ESM nativo

### 2.3. `jest.unstable_mockModule` vs `jest.mock`

| Característica | `jest.mock` | `jest.unstable_mockModule` |
|:--------------|:-----------:|:--------------------------:|
| Auto-mock de funções | ✅ Sim | ❌ Não |
| Funciona com ESM nativo | ❌ | ✅ |
| Funciona com Babel transform | ✅ | ❌ (parcial) |

**Problemas identificados:**

1. **`unstable_mockModule('fs')`**: Como não auto-mocka, `existsSync` não é `jest.fn()`. Resulta em `TypeError: fsMock.existsSync.mockReturnValue is not a function`.

2. **`unstable_mockModule('pg')`**: Cria o mock no escopo do teste, mas `connection.js` importa `pg` diretamente. Se o pool singleton já foi criado antes do mock ser aplicado, o mock não é usado.

3. **Singleton `let pool = null`**: Uma vez que `getPool()` é chamado, o singleton persiste. Deletar `DATABASE_URL` depois não faz o pool ser recriado.

---

## 3. Solução: Ativar ESM Nativo no Jest

### 3.1. Pré-requisitos

- Node.js ≥ 24.15.0 (já instalado) — suporta ESM nativo
- Projeto com `"type": "module"` no `package.json` (já configurado)

### 3.2. Passo a passo

#### Passo 1 — Adicionar flag `--experimental-vm-modules`

Editar scripts no `package.json`:

```json
{
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/.bin/jest",
    "test:watch": "node --experimental-vm-modules node_modules/.bin/jest --watch",
    "test:coverage": "node --experimental-vm-modules node_modules/.bin/jest --coverage",
    "test:ci": "node --experimental-vm-modules node_modules/.bin/jest --ci --coverage --maxWorkers=1"
  }
}
```

> **⚠️ Impacto:** Afeta todos os comandos `npm test`. Deve ser testado em ambiente de desenvolvimento antes de subir para CI.

#### Passo 2 — Ajustar `jest.config.js`

Adicionar/alterar as seguintes configurações:

```javascript
export default {
  // ... mantém configurações existentes ...

  // Desabilita transform para módulos que precisam ser ESM nativo
  // Mantém transform para componentes React e JSX
  transform: {
    '^.+\\.(jsx|mjs|cjs)$': ['babel-jest', { configFile: './babel.jest.config.js' }],
    // Arquivos .js que contêm import.meta ou top-level await NÃO passam por Babel
    // Eles serão processados como ESM nativo pelo Node.js
  },

  // Diz ao Jest quais extensões tratar como ESM
  extensionsToTreatAsEsm: ['.js', '.jsx', '.mjs'],

  // ModuleNameMapper precisa funcionar com ESM
  // Pode exigir adaptações nos mocks
};
```

#### Passo 3 — Substituir `jest.mock` por `jest.unstable_mockModule` nos testes afetados

Para módulos que agora rodarão como ESM nativo, `jest.mock` não funciona. É necessário usar `jest.unstable_mockModule` com `await import()`.

**Arquivos que precisam de adaptação:**

| Arquivo de teste | Mudança necessária |
|-----------------|:------------------:|
| `tests/unit/scripts/init-table.test.js` | Usar `unstable_mockModule` para `pg`, `fs`, `dotenv` |
| `tests/unit/scripts/validate-schema.test.js` | Já usa `unstable_mockModule` — verificar se import.resolve funciona |
| `tests/unit/scripts/migrate.test.js` | Corrigir mock de `fs` para mockar `existsSync` e `readdirSync` manualmente |
| `tests/unit/scripts/db/connection.test.js` | Corrigir mock de `pg` para que `connection.js` enxergue o mock |
| `tests/unit/scripts/backup.test.js` | Pode precisar de ajustes se rodar como ESM |

#### Passo 4 — Corrigir `connection.test.js`

Problema: o singleton `pool` é criado na primeira `getPool()` e nunca recriado.

**Solução:** Recarregar o módulo a cada teste com `jest.isolateModules` + `import()`:

```javascript
// Em vez de import estático no topo:
// import connection from '../../../scripts/db/connection.js';

// Usar isolateModules dentro de cada teste:
let connection;
jest.isolateModules(async () => {
  connection = await import('../../../scripts/db/connection.js');
});
```

**Para o teste de `DATABASE_URL` ausente:**
Carregar o módulo **antes** de definir `DATABASE_URL`, ou usar `jest.resetModules()`.

#### Passo 5 — Corrigir `migrate.test.js`

Trocar `unstable_mockModule('fs', ...)` por uma versão que mocka explicitamente as funções:

```javascript
jest.unstable_mockModule('fs', () => ({
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  // ... outras funções do fs que o migrate.js usa ...
}));
```

### 3.3. Riscos

| Risco | Probabilidade | Mitigação |
|-------|:------------:|-----------|
| Testes existentes quebram com ESM nativo | Média | Rodar `npm test` completo e verificar cada suite |
| `moduleNameMapper` não funciona com ESM | Baixa | Usar caminhos relativos com `import()` |
| `babel-jest` não transforma `node_modules` | Média | Verificar `transformIgnorePatterns` |
| Performance mais lenta com `--experimental-vm-modules` | Média | Comparar tempo de execução antes/depois |

---

## 4. Alternativa (Menos Invasiva): Extrair Lógica em Módulos Testáveis

Em vez de ativar ESM nativo no Jest, pode-se extrair as funções puras dos scripts problemáticos para módulos separados que não dependam de `import.meta` ou top-level `await`.

### 4.1. Extrair de `init-table.js`

Criar `scripts/utils/table-builder.js`:

```javascript
// scripts/utils/table-builder.js
// Funções puras — sem import.meta, sem top-level await

export function buildCreateTableSQL(schema) {
  const columnDefs = schema.columns.map(col => {
    const parts = [col.name, col.type];
    if (col.constraints) parts.push(col.constraints);
    return parts.join(' ');
  });
  return `CREATE TABLE IF NOT EXISTS ${schema.table} (\n  ${columnDefs.join(',\n  ')}\n);`;
}

export function getSeedValues(schema) {
  if (!schema.seedData || schema.seedData.length === 0) return [];
  const columns = Object.keys(schema.seedData[0]);
  return schema.seedData.map(item => {
    return columns.map(col => {
      const value = item[col];
      if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
      if (value === null || value === undefined) return 'NULL';
      return value;
    });
  });
}

export function buildSeedSQL(schema) {
  const values = getSeedValues(schema);
  if (values.length === 0) return null;
  const columns = Object.keys(schema.seedData[0]);
  const valueStrings = values.map(row => `(${row.join(', ')})`);
  return `INSERT INTO ${schema.table} (${columns.join(', ')}) VALUES\n  ${valueStrings.join(',\n  ')};`;
}
```

**Vantagem:** Testes rodam sem ESM nativo. 
**Desvantagem:** Requer refatoração do `init-table.js`.

### 4.2. Extrair de `validate-schema.js`

A função `validateSchema()` já é exportada e não usa `import.meta`. O problema é o **top-level `await`** na linha 89. Isolando a execução:

```javascript
// scripts/validate-schema.js — mover linha 89 para dentro de uma função
export async function run() {
  const success = await validateSchema();
  process.exit(success ? 0 : 1);
}

// Ou manter o top-level await e documentar que run() é para testes
```

**Vantagem:** `validateSchema()` já é testável sem ESM nativo (e os testes atuais com `unstable_mockModule` funcionam).

### 4.3. Extrair de `migrate.js`

Todas as funções internas (`listMigrationFiles`, `migrationNameFromFile`, `getAppliedMigrations`, `ensureMigrationTable`, `applyMigration`, `revertLastMigration`, `listStatus`) são testáveis se exportadas.

Criar `scripts/utils/migration-helpers.js` com essas funções exportadas.

**Vantagem:** Testes rodam sem ESM nativo.
**Desvantagem:** Requer refatoração do `migrate.js`.

---

## 5. Recomendação

| Abordagem | Esforço | Risco | Benefício |
|-----------|:-------:|:-----:|:---------:|
| **A — ESM Nativo** | Médio (2-3h) | Alto (100+ testes existentes) | Correção definitiva |
| **B — Extrair funções** | Baixo (1-2h) | Baixo | Não requer ESM nativo |
| **C — Híbrido (recomendado)** | Médio (2h) | Baixo | Extrair funções + ajustar mocks |

### Caminho Recomendado (C — Híbrido)

1. **Extrair** `buildCreateTableSQL`, `getSeedValues`, `buildSeedSQL` de `init-table.js` para `scripts/utils/table-builder.js`
   - Criar teste → `tests/unit/scripts/utils/table-builder.test.js`

2. **Manter** `validate-schema.test.js` como está (já funciona com `unstable_mockModule`)

3. **Corrigir** `migrate.test.js`: substituir `unstable_mockModule('fs')` por mock explícito com `jest.fn()` em cada função

4. **Corrigir** `connection.test.js`: usar `jest.isolateModules` para recarregar módulo a cada teste

5. **Manter** `backup.test.js` e `init-table.test.js` como testes conceituais (documentado no `UPGRADE_scripts.md`)

6. **Ignorar** `--experimental-vm-modules` por enquanto — aplicar apenas se futuramente mais scripts usarem ESM nativo

### Markdown para checklist de implementação:

```markdown
## Checklist de Implementação

- [ ] Extrair `table-builder.js` de `init-table.js`
- [ ] Criar `tests/unit/scripts/utils/table-builder.test.js`
- [ ] Corrigir `migrate.test.js` (mock explícito de fs)
- [ ] Corrigir `connection.test.js` (isolateModules)
- [ ] Rodar `npm test` completo (100+ testes)
- [ ] Verificar se `backup.test.js` roda sem erros
```

---

## 6. Referências

- [Jest ESM Documentation](https://jestjs.io/docs/ecmascript-modules)
- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
- [jest.isolateModules](https://jestjs.io/docs/jest-object#jestisolatemodulesfn)
- [jest.unstable_mockModule](https://jestjs.io/docs/jest-object#jestunstable_mockmodulemodulename-factory-options)