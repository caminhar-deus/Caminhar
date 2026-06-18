# ⚡ JEST + ESM — Guia de Configuração para Testes com `import.meta` e Top-Level `await`

> **Data:** 21/05/2026  
> **Projeto:** Caminhar  
> **Objetivo:** Documentar o passo a passo para tratar scripts com `import.meta.url` que não podem ser transformados pelo Babel, e manter os testes existentes funcionando.

---

## 1. Contexto do Problema

### 1.1. Situação atual

O Jest está configurado para transformar ES Modules via Babel (`babel-jest`). Isso funciona para `import`/`export`, **mas não** para `import.meta`, que é uma feature exclusiva de ESM nativo:

| Feature | Ocorre em | Erro |
|---------|-----------|------|
| `import.meta.url` | `scripts/init-table.js:24` | `SyntaxError: Cannot use 'import.meta' outside a module` |

### 1.2. Scripts afetados

| Script | Feature ESM | Impacto |
|--------|:-----------:|:-------:|
| `scripts/init-table.js` | `import.meta.url` | Não pode ser importado via `require()` |

Os demais scripts (`validate-schema.js`, `migrate.js`) **não possuem** top-level `await`. Eles foram refatorados para usar CLI guard pattern (verificação de `process.argv[1]`) e funções assíncronas exportadas, sendo perfeitamente compatíveis com a transformação do Babel.

### 1.3. Estado atual dos testes

| Teste | Status | Observação |
|------|:------:|-----------|
| `tests/unit/scripts/init-table.test.js` | ✅ Funciona | Testa funções puras de `init-table-utils.js` — sem `import.meta` |
| `tests/unit/scripts/validate-schema.test.js` | ✅ Funciona | Usa `unstable_mockModule` + `isolateModules` |
| `tests/unit/scripts/migrate.test.js` | ✅ Funciona | Usa `jest.mock('fs')` com mock manual |
| `tests/unit/scripts/db/connection.test.js` | ✅ Funciona | Usa `resetPool()` para recriar o singleton a cada teste |

---

## 2. Diagnóstico Detalhado

### 2.1. `import.meta.url` — `init-table.js`

```javascript
// scripts/init-table.js:24
const schemasDir = new URL('./schemas', import.meta.url).pathname;
```

- `import.meta.url` só existe em **módulos ESM nativos**
- Babel transforma `import`/`export` para CommonJS, mas **não transforma** `import.meta`
- Solução (sem tocar no script): fazer Jest rodar este arquivo como ESM nativo

### 2.2. `jest.unstable_mockModule` vs `jest.mock`

| Característica | `jest.mock` | `jest.unstable_mockModule` |
|:--------------|:-----------:|:--------------------------:|
| Auto-mock de funções | ✅ Sim | ❌ Não |
| Funciona com ESM nativo | ❌ | ✅ |
| Funciona com Babel transform | ✅ | ❌ (parcial) |

**Problemas resolvidos:**

1. ~~**`unstable_mockModule('fs')`**: Como não auto-mocka, `existsSync` não é `jest.fn()`.~~ → **Já corrigido:** `migrate.test.js` usa `jest.mock('fs')` com mock manual.

2. ~~**`unstable_mockModule('pg')`**: Cria o mock no escopo do teste, mas `connection.js` importa `pg` diretamente.~~ → **Já corrigido:** `connection.test.js` usa `resetPool()` (exportado por `connection.js`) para resetar o singleton a cada teste.

3. ~~**Singleton `let pool = null`**: Uma vez que `getPool()` é chamado, o singleton persiste.~~ → **Já corrigido:** `connection.js` exporta `resetPool()` que seta `pool = null`, permitindo recriação.

---

## 3. Solução: Ativar ESM Nativo no Jest

> **⚠️ Aplicável apenas se for necessário testar `init-table.js` diretamente (arquivo que contém `import.meta.url`).**
> Os demais testes já funcionam sem ESM nativo.

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
    // Arquivos .js que contêm import.meta NÃO passam por Babel
    // Eles serão processados como ESM nativo pelo Node.js
  },

  // Diz ao Jest quais extensões tratar como ESM
  extensionsToTreatAsEsm: ['.js', '.jsx', '.mjs'],

  // ModuleNameMapper precisa funcionar com ESM
  // Pode exigir adaptações nos mocks
};
```

#### Passo 3 — Substituir `jest.mock` por `jest.unstable_mockModule` nos testes que testam `init-table.js` diretamente

Caso opte por testar `init-table.js` inteiro (não apenas as funções puras de `init-table-utils.js`), será necessário:

| Arquivo de teste | Mudança necessária |
|-----------------|:------------------:|
| `tests/unit/scripts/init-table.test.js` | Se testar `init-table.js` diretamente: usar `unstable_mockModule` para `pg`, `fs`, `dotenv` |

> **Observação:** O teste atual de `init-table.test.js` testa apenas as funções puras de `init-table-utils.js` — não requer ESM nativo.

### 3.3. Riscos

| Risco | Probabilidade | Mitigação |
|-------|:------------:|-----------|
| Testes existentes quebram com ESM nativo | Média | Rodar `npm test` completo e verificar cada suite |
| `moduleNameMapper` não funciona com ESM | Baixa | Usar caminhos relativos com `import()` |
| `babel-jest` não transforma `node_modules` | Média | Verificar `transformIgnorePatterns` |
| Performance mais lenta com `--experimental-vm-modules` | Média | Comparar tempo de execução antes/depois |

---

## 4. Abordagem Atual: Funções Extraídas em `init-table-utils.js`

A abordagem de extrair funções puras (recomendada na seção 4 do documento original) **já foi implementada** com a criação de `scripts/utils/init-table-utils.js`.

### 4.1. `scripts/utils/init-table-utils.js`

Contém as seguintes funções exportadas, todas puras (sem `import.meta`, sem `import` de banco):

| Função | Descrição |
|--------|-----------|
| `getTableName()` | Extrai nome da tabela dos argumentos CLI |
| `loadSchemaFromDir(tableName, schemasDir)` | Carrega schema JSON do diretório |
| `buildCreateTableSQL(schema)` | Gera SQL `CREATE TABLE` |
| `getSeedValues(schema)` | Extrai valores de seed para INSERT |
| `buildSeedSQL(schema)` | Gera SQL `INSERT` com seed data |

**Teste:** `tests/unit/scripts/init-table.test.js` — testa todas as funções acima sem necessidade de mocks de banco ou ESM nativo. ✅

### 4.2. `scripts/validate-schema.js`

A função `validateSchema()` já é exportada e não usa `import.meta`. O arquivo **não possui top-level `await`** — todo `await` está dentro de `async function validateSchema()`.

**Teste:** `tests/unit/scripts/validate-schema.test.js` — usa `jest.unstable_mockModule` + `jest.isolateModules`. ✅

### 4.3. `scripts/migrate.js`

Todas as funções internas já são exportadas e não usam `import.meta`:

| Função exportada | Descrição |
|-----------------|-----------|
| `ensureMigrationTable(pool)` | Cria tabela `_migrations` |
| `getAppliedMigrations(pool)` | Retorna `Set` de migrações aplicadas |
| `listMigrationFiles()` | Lista arquivos de migração ordenados |
| `migrationNameFromFile(filename)` | Extrai nome do arquivo |
| `applyMigration(pool, filename)` | Aplica uma migração |
| `revertLastMigration(pool)` | Reverte última migração |
| `listStatus(pool)` | Exibe status formatado |
| `showHelp()` | Exibe ajuda |
| `run()` | Orquestrador CLI |

**Teste:** `tests/unit/scripts/migrate.test.js` — usa `jest.mock('fs')` com mock manual. ✅

### 4.4. `scripts/db/connection.js`

Exporta `resetPool()` que seta `pool = null`, permitindo recriação do singleton entre testes.

**Teste:** `tests/unit/scripts/db/connection.test.js` — chama `connection.resetPool()` no `beforeEach`. ✅

---

## 5. Recomendação

| Abordagem | Esforço | Risco | Benefício |
|-----------|:-------:|:-----:|:---------:|
| **A — ESM Nativo** | Médio (1-2h) | Médio | Permite testar `init-table.js` diretamente |
| **B — Manter atual (recomendado)** | Nenhum | Baixo | Já funciona sem ESM nativo |

### Caminho Recomendado (B — Manter atual)

1. ✅ **Já concluído:** `buildCreateTableSQL`, `getSeedValues`, `buildSeedSQL` extraídos para `scripts/utils/init-table-utils.js`
2. ✅ **Já concluído:** `tests/unit/scripts/init-table.test.js` testa funções puras
3. ✅ **Já concluído:** `migrate.test.js` usa `jest.mock('fs')` com mock explícito
4. ✅ **Já concluído:** `connection.test.js` usa `resetPool()` para recriar singleton
5. ✅ **Já concluído:** `validate-schema.test.js` funciona com `unstable_mockModule`
6. ⏸️ **Pendente (se necessário):** Ativar `--experimental-vm-modules` apenas se futuramente mais scripts usarem `import.meta`

---

## 6. Referências

- [Jest ESM Documentation](https://jestjs.io/docs/ecmascript-modules)
- [Node.js ESM Documentation](https://nodejs.org/api/esm.html)
- [jest.isolateModules](https://jestjs.io/docs/jest-object#jestisolatemodulesfn)
- [jest.unstable_mockModule](https://jestjs.io/docs/jest-object#jestunstable_mockmodulemodulename-factory-options)