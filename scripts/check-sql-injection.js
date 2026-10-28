#!/usr/bin/env node

/**
 * Script de verificação de segurança — SQL Injection
 *
 * Escaneia arquivos .js em busca de chamadas query() ou pool.query()
 * que interpõem variáveis diretamente na string SQL sem prepared statements.
 *
 * Regras de detecção:
 * 1. pool.query() com apenas 1 argumento contendo interpolação (${...})
 * 2. query() com template literal contendo interpolação e sem array de parâmetros
 * 3. query() chamado com variável que foi construída via template literal com interpolação
 *    (detecção indireta — rastreia construção de variáveis locais)
 *
 * Regra de isenção por estrutura (ADR-0026): interpolação de variável vinda de
 * `for (const x of LISTA)` quando LISTA é uma `const` array de strings literais
 * puras declarada no próprio arquivo — o padrão do `scripts/reset-db.js`
 * (ADR-0025). O identificador interpolado produz apenas nomes da lista fixa;
 * não há input externo e identificadores em DDL não são parametrizáveis no
 * Postgres (sem plpgsql). Template literal, identificador ou expressão dentro
 * da lista desqualificam a isenção.
 *
 * Falsos positivos conhecidos e ignorados:
 * - Comentários de código
 * - Identificadores SQL (nomes de tabelas/colunas) vindos de whitelists fixas
 * - Identificadores protegidos por _validateIdentifier() (padrão do lib/crud/crud.js)
 * - Constantes string hardcoded definidas localmente (ex: MIGRATION_TABLE = '_migrations')
 * - Variáveis que utilizam validateIdentifier() antes da interpolação
 *
 * Uso:
 *   node scripts/check-sql-injection.js             # Diretórios principais
 *   node scripts/check-sql-injection.js --all       # Projeto completo
 *   node scripts/check-sql-injection.js --path=./x  # Diretório customizado
 *
 * Exit codes:
 *   0 — Nenhuma vulnerabilidade
 *   1 — Vulnerabilidades encontradas
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

// ROOT via process.cwd() — mesma decisão documentada em
// scripts/check-hardcoded-credentials.js e scripts/reset-db.js: as invocações
// reais (`npm run security:check-sql` — cron de carga via test-base.yml e o
// gate de push via test-coverage.yml — e execução manual no console) partem da
// raiz do projeto, e o `import.meta.url` não sobrevive à compilação CommonJS do
// Babel no Jest (o teste unitário importa este módulo).
const ROOT = process.cwd();

const IGNORE_DIRS = [
  'node_modules', '.next', 'out', 'build', 'dist', '.git',
  'coverage', '.nyc_output', 'public/uploads', 'data', 'reports', '__mocks__',
];

/**
 * Allowlist por nome de arquivo (basename), mesmo mecanismo de
 * check-hardcoded-credentials.js. Cada entrada explica por que o arquivo é isento.
 */
export const IGNORE_FILES = [
  'next.config.js', 'babel.jest.config.js', 'jest.config.js',
  'jest.setup.js', 'jest.teardown.js', 'knip.json', 'schema.knip.json',
  'cypress.config.js', 'rate-limit-proxy.js',
  // Script de limpeza de imagens: usa tabelas/colunas de whitelist fixa, não de input do usuário
  'clean-orphaned-images.js',
  // Reset completo do banco (ADR-0025): `TABLES_TO_DROP` é lista de literais
  // fixa declarada no próprio arquivo, sem input externo — mesmo mecanismo de
  // `clean-orphaned-images.js`, e o contrato da lista fica travado por
  // tests/unit/scripts/reset-db.test.js. Identificador em DDL não é
  // parametrizável no Postgres sem plpgsql. Falso positivo capturado pela
  // cron "Load Tests (k6)" #25 (run 40673567814, 28/10/2026); exceção
  // registrada em docs/adr/0026-scanners-estaticos-no-gate-de-push-e-allowlist.md.
  'reset-db.js',
  // Próprio scanner, não precisa ser escaneado
  'check-sql-injection.js',
];

/**
 * Nomes de variáveis conhecidas como seguras (constantes hardcoded) em todo o projeto.
 * Mapeia { nomeVariavel: true } para lookup O(1).
 */
const SAFE_CONSTANTS = new Set([
  'MIGRATION_TABLE',
  'MIGRATIONS_DIR',
  'MIGRATION_NAME',
  'MIGRATION_TABLE_NAME',
  'BACKUP_CONFIG',
  'BACKUP_DIR',
]);

/**
 * Verifica se um diretório deve ser ignorado.
 */
export function shouldIgnoreDir(dirPath) {
  return dirPath.split('/').some((part) => IGNORE_DIRS.includes(part));
}

/**
 * Verifica se um arquivo deve ser ignorado (allowlist por nome + extensão).
 */
export function shouldIgnoreFile(filePath) {
  const fileName = filePath.split('/').pop();
  if (IGNORE_FILES.includes(fileName)) return true;
  const ext = extname(fileName);
  return ext !== '.js' && ext !== '.mjs';
}

/**
 * Escaneia um diretório recursivamente coletando arquivos .js/.mjs.
 */
export function scanDirectory(dirPath, files = []) {
  try {
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      if (shouldIgnoreDir(fullPath)) continue;
      try {
        const stats = statSync(fullPath);
        if (stats.isDirectory()) {
          scanDirectory(fullPath, files);
        } else if (stats.isFile() && (entry.endsWith('.js') || entry.endsWith('.mjs')) && !shouldIgnoreFile(fullPath)) {
          files.push(fullPath);
        }
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
  return files;
}

/**
 * Verifica se uma linha é de comentário.
 */
function isCommentLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

/**
 * Extrai variáveis constantes definidas no escopo local do arquivo.
 * Detecta padrões como: const VAR = 'valor_string_fixa';
 *
 * @param {string[]} lines - Linhas do arquivo
 * @returns {Set<string>} Conjunto de nomes de variáveis constantes string
 */
export function extractLocalConstants(lines) {
  const constants = new Set();
  // Padrão: const NOME = 'valor'  ou  const NOME = "valor"
  const constRegex = /^\s*const\s+([a-zA-Z_]\w*)\s*=\s*['"][^'"]*['"]\s*;?\s*$/;

  for (const line of lines) {
    if (isCommentLine(line)) continue;
    const match = line.match(constRegex);
    if (match) {
      constants.add(match[1]);
    }
  }

  return constants;
}

/**
 * Extrai listas locais do tipo array de strings literais puras, em uma única
 * linha: `const NOME = ['a', 'b'];`. Antecedente da regra de isenção por
 * estrutura (ADR-0026). O conteúdo deve sobrar apenas como vírgulas/espaços
 * depois de remover os literais entre aspas — template literal, identificador
 * ou chamada no meio da lista desqualificam (fluxo dinâmico, nunca isento).
 *
 * @param {string[]} lines - Linhas do arquivo
 * @returns {Map<string, boolean>} Lista -> true, para lookup O(1)
 */
export function extractConstantLists(lines) {
  const lists = new Map();
  // Apenas `const` (não é escaneado: `let`/`var` são variáveis reatribuíveis)
  const listRegex = /^\s*const\s+([a-zA-Z_$][\w$]*)\s*=\s*\[(.*)\]\s*;?\s*$/;

  for (const line of lines) {
    if (isCommentLine(line)) continue;

    const match = line.match(listRegex);
    if (!match) continue;

    // Remove cada literal entre aspas simples/duplas; o que sobrar deve ser
    // só vírgula/espaço. Template literal (backtick) NÃO é removido aqui: sobra
    // com ${...} ou texto e rejeita a lista — fluxo dinâmico não é isento.
    const inner = match[2].replace(/(['"])(?:\\.|(?!\1).)*\1/g, '');
    if (/^[\s,]*$/.test(inner)) {
      lists.set(match[1], true);
    }
  }

  return lists;
}

/**
 * Coleta os vínculos `for (const x of FONTE)` do arquivo (forma sem
 * destructuring, suficiente para o padrão do reset-db.js). A SEGURANÇA do
 * vínculo é decidida em isSafeInterpolation() contra extractConstantLists():
 * `for (const x of listTables())` fica registrado aqui e NUNCA é isento.
 *
 * @param {string[]} lines - Linhas do arquivo
 * @returns {Map<string, string>} varíavel do loop -> nome da fonte
 */
export function findLoopVars(lines) {
  const loopVars = new Map();
  // `\)?` opcional: aceita fonte de chamada (`of listTables()`) — registrada
  // de propósito, pois a checagem de segurança contra extractConstantLists()
  // disserá NUNCA isenção para fonte que não é const array de literais.
  const loopRegex = /\bfor\s*\(\s*(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s+of\s+([a-zA-Z_$][\w$]*)\s*\)?/;

  for (const line of lines) {
    if (isCommentLine(line)) continue;

    const match = line.match(loopRegex);
    if (match) {
      loopVars.set(match[1], match[2]);
    }
  }

  return loopVars;
}

/**
 * Verifica se o código ao redor da linha contém uso de validateIdentifier().
 */
function hasValidateIdentifier(lines, lineIndex) {
  for (let i = Math.max(0, lineIndex - 5); i <= Math.min(lines.length - 1, lineIndex + 1); i++) {
    if (lines[i].includes('validateIdentifier(')) return true;
  }
  return false;
}

/**
 * Verifica se o código ao redor da linha contém interpolação segura
 * (variável que foi validada por validateIdentifier).
 */
function hasSafeVariableInterpolation(lines, lineIndex) {
  const safeVars = new Set();

  // Busca por: const X = validateIdentifier(...)
  const validatedVarRegex = /const\s+([a-zA-Z_]\w*)\s*=\s*validateIdentifier\(/;
  // Busca por: validateIdentifier(...)  e  atribuição em linha próxima
  for (let i = Math.max(0, lineIndex - 10); i <= lineIndex; i++) {
    const match = lines[i].match(validatedVarRegex);
    if (match) {
      safeVars.add(match[1]);
    }
  }

  // Se a linha contém safeVars na interpolação, é seguro
  const line = lines[lineIndex];
  for (const varName of safeVars) {
    if (line.includes(`\${${varName}}`) || line.includes(`\${${varName}.`)) {
      return true;
    }
  }

  return false;
}

/**
 * Coleta variáveis validadas por validateIdentifier em todo o arquivo.
 * Ex: const safeTableName = validateIdentifier(schema.table);
 *
 * @param {string[]} lines - Linhas do arquivo
 * @returns {Set<string>} Conjunto de nomes de variáveis validadas
 */
export function collectValidatedVariables(lines) {
  const validated = new Set();
  const validatedVarRegex = /(?:const|let|var)\s+([a-zA-Z_]\w*)\s*=\s*validateIdentifier\(/;

  for (let i = 0; i < lines.length; i++) {
    if (isCommentLine(lines[i])) continue;
    const match = lines[i].match(validatedVarRegex);
    if (match) {
      validated.add(match[1]);
    }
  }

  return validated;
}

/**
 * Coleta variáveis construídas com template literal com interpolação
 * para detecção indireta (ex: const sql = `SELECT * FROM ${table}`; ... query(sql)).
 *
 * @param {string[]} lines - Linhas do arquivo
 * @returns {Map<string, number>} Mapa de nomeVariável -> linha onde foi definida
 */
export function findInterpolatedVariables(lines) {
  const interpolated = new Map();
  // Padrão: const VAR = `...${...}...`
  // Ou: let VAR = `...${...}...` / VAR = `...${...}...`
  const varRegex = /(?:const|let|var)\s+([a-zA-Z_]\w*)\s*=\s*`[^`]*\$\{[^}]*\}[^`]*`\s*;?$/;
  // Padrão para reatribuição: VAR = `...${...}...`
  const reassignRegex = /^\s*([a-zA-Z_]\w*)\s*=\s*`[^`]*\$\{[^}]*\}[^`]*`\s*;?$/;

  for (let i = 0; i < lines.length; i++) {
    if (isCommentLine(lines[i])) continue;

    const match = lines[i].match(varRegex);
    if (match && !SAFE_CONSTANTS.has(match[1])) {
      interpolated.set(match[1], i);
      continue;
    }

    // Verifica se é uma reatribuição de variável que já foi definida como interpolada
    const reassignMatch = lines[i].match(reassignRegex);
    if (reassignMatch && !SAFE_CONSTANTS.has(reassignMatch[1])) {
      interpolated.set(reassignMatch[1], i);
    }
  }

  return interpolated;
}

/**
 * Obtém o nome da variável sendo interpolada em ${...} dentro de um template literal.
 * Ex: `${schema.table}` -> ['schema.table']
 */
export function extractInterpolatedVars(sqlString) {
  const vars = [];
  const regex = /\$\{([^}]+)\}/g;
  let match;
  while ((match = regex.exec(sqlString)) !== null) {
    vars.push(match[1].trim());
  }
  return vars;
}

/**
 * Verifica se TODAS as variáveis interpoladas em uma expressão SQL são seguras.
 * Uma variável é segura se:
 *   - É uma constante conhecida (SAFE_CONSTANTS)
 *   - É uma constante string local (extractLocalConstants)
 *   - Foi validada por validateIdentifier
 *   - É protegida por _validateIdentifier
 *   - Vem de `for (const x of LISTA)` onde LISTA é array const de literais
 *     puros no mesmo arquivo (extractConstantLists + findLoopVars — ADR-0026)
 *
 * @param {string} line - Linha contendo a expressão SQL
 * @param {Set<string>} localConstants - Constantes string locais do arquivo
 * @param {Set<string>} validatedVars - Variáveis validadas por validateIdentifier
 * @param {string[]} lines - Todas as linhas do arquivo
 * @param {number} lineIdx - Índice da linha atual
 * @param {Map<string, boolean>} constLists - Listas const de literais (extractConstantLists)
 * @param {Map<string, string>} loopVars - vínculos for...of (findLoopVars)
 * @returns {boolean} true se todas as variáveis são seguras
 */
export function isSafeInterpolation(line, localConstants, validatedVars, lines, lineIdx, constLists = new Map(), loopVars = new Map()) {
  const interpolatedVars = extractInterpolatedVars(line);
  if (interpolatedVars.length === 0) return true;

  for (const varExpr of interpolatedVars) {
    // Extrai o nome base da variável (ex: de "schema.table" extrai "schema")
    const baseVarName = varExpr.split('.')[0].split('[')[0];

    // Verifica se é constante hardcoded
    if (SAFE_CONSTANTS.has(baseVarName)) continue;
    // Verifica se é constante string local
    if (localConstants.has(baseVarName)) continue;

    // Verifica se a variável foi validada por validateIdentifier (global no arquivo)
    if (validatedVars.has(baseVarName)) continue;

    // Verifica se tem proteção validateIdentifier/_validateIdentifier nas linhas próximas
    if (hasSafeVariableInterpolation(lines, lineIdx)) continue;
    if (hasValidateIdentifier(lines, lineIdx)) continue;

    // Regra de isenção por estrutura (ADR-0026): variável vinculada por
    // `for (const x of LISTA)` com LISTA sendo const array de strings literais
    // puras declarada no próprio arquivo (ex: TABLES_TO_DROP do reset-db.js).
    const loopSource = loopVars.get(baseVarName);
    if (loopSource && constLists.has(loopSource)) continue;

    // Se alguma variável não passou nos checks, considera perigosa
    return false;
  }

  return true;
}

/**
 * Escaneia o conteúdo de um arquivo (caminho apenas para o relatório).
 * O núcleo da análise linha a linha — scanFile() só lê o arquivo e delega,
 * para o teste unitário exercitar a MESMA lógica de produção em memória
 * (precedente de check-hardcoded-credentials.js).
 */
export function scanContent(content, filePath = '<conteúdo>') {
  const lines = content.split('\n');
  const localConstants = extractLocalConstants(lines);
  const validatedVars = collectValidatedVariables(lines);
  const interpolatedVars = findInterpolatedVariables(lines);
  const constLists = extractConstantLists(lines);
  const loopVars = findLoopVars(lines);

  const findings = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    // Ignora linhas de comentário
    if (isCommentLine(line)) continue;

    // Verifica se o código está próximo de _validateIdentifier (caso seguro)
    const isProtected = hasValidateIdentifier(lines, lineIdx);

    // Se está protegido, pula (safe identifier pattern)
    if (isProtected) continue;

    // ===== REGRA 1: pool.query() com 1 argumento e interpolação =====
    const poolQuerySingle = line.match(/pool\.query\s*\(\s*`[^`]*\$\{[^}]*\}[^`]*`\s*\)/i);
    if (poolQuerySingle) {
      const isSafe = isSafeInterpolation(line, localConstants, validatedVars, lines, lineIdx, constLists, loopVars);
      if (!isSafe) {
        findings.push({
          severity: 'CRÍTICO',
          file: filePath,
          line: lineIdx + 1,
          description: 'pool.query() com interpolação sem prepared statement (1 argumento)',
          code: line.trim().substring(0, 150),
        });
      }
      continue;
    }

    // ===== REGRA 2: query() com template literal + interpolação SEM array =====
    const queryRegex = /(?:^|\s)(?:await\s+)?query\s*\(\s*`/i;
    const queryMatch = line.match(queryRegex);

    if (queryMatch) {
      const openParenIdx = line.indexOf('(', queryMatch.index);
      if (openParenIdx === -1) continue;

      const afterOpenParen = line.substring(openParenIdx + 1).trim();

      if (!afterOpenParen.startsWith('`')) continue;
      if (!afterOpenParen.includes('${')) continue;

      const closesWithParen = afterOpenParen.match(/`\s*\)/);
      const hasCommaThenArray = afterOpenParen.match(/`\s*,\s*\[/);

      if (closesWithParen && !hasCommaThenArray) {
        const isSafe = isSafeInterpolation(line, localConstants, validatedVars, lines, lineIdx, constLists, loopVars);
        if (!isSafe) {
          findings.push({
            severity: 'CRÍTICO',
            file: filePath,
            line: lineIdx + 1,
            description: 'query() com interpolação e sem array de parâmetros',
            code: line.trim().substring(0, 150),
          });
        }
      }
      continue;
    }

    // ===== REGRA 3: Detecção indireta — query(variavel) onde variavel foi construída com interpolação =====
    // Padrões: await query(variavel)  ou  query(variavel)
    const indirectRegex = /(?:await\s+)?query\s*\(\s*([a-zA-Z_]\w*)\s*\)/i;
    const indirectMatch = line.match(indirectRegex);
    if (indirectMatch) {
      const varName = indirectMatch[1];
      if (interpolatedVars.has(varName)) {
        // Verifica se, apesar de ter interpolação, a variável usa identificadores seguros
        const varDefLine = interpolatedVars.get(varName);
        if (varDefLine !== undefined) {
          const isSafe = isSafeInterpolation(lines[varDefLine], localConstants, validatedVars, lines, varDefLine, constLists, loopVars);
          if (!isSafe) {
            findings.push({
              severity: 'CRÍTICO',
              file: filePath,
              line: lineIdx + 1,
              description: 'query() com variável contendo interpolação indireta (via template literal)',
              code: line.trim().substring(0, 150),
            });
          }
        }
      }
      continue;
    }

    // ===== REGRA 4: pool.query(variavel) onde variavel foi construída com interpolação =====
    const poolIndirectRegex = /pool\.query\s*\(\s*([a-zA-Z_]\w*)\s*\)/i;
    const poolIndirectMatch = line.match(poolIndirectRegex);
    if (poolIndirectMatch) {
      const varName = poolIndirectMatch[1];
      if (interpolatedVars.has(varName)) {
        const varDefLine = interpolatedVars.get(varName);
        if (varDefLine !== undefined) {
          const isSafe = isSafeInterpolation(lines[varDefLine], localConstants, validatedVars, lines, varDefLine, constLists, loopVars);
          if (!isSafe) {
            findings.push({
              severity: 'CRÍTICO',
              file: filePath,
              line: lineIdx + 1,
              description: 'pool.query() com variável contendo interpolação indireta (via template literal)',
              code: line.trim().substring(0, 150),
            });
          }
        }
      }
    }
  }

  return findings;
}

/**
 * Escaneia um arquivo .js/.mjs em busca de interpolação SQL sem prepared statement.
 */
export function scanFile(filePath) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return scanContent(content, filePath);
  } catch (err) {
    console.error(`  ⚠️  Erro ao ler ${filePath}: ${err.message}`);
    return [];
  }
}

function printResults(allFindings, totalFiles) {
  if (allFindings.length === 0) {
    console.log('\n✅ Nenhuma vulnerabilidade de SQL injection encontrada!');
    console.log(`   Arquivos escaneados: ${totalFiles}`);
    return true;
  }

  console.log(`❌ ${allFindings.length} vulnerabilidade(s) encontrada(s) em ${totalFiles} arquivo(s):\n`);

  for (const f of allFindings) {
    console.log(`   🔴 ${f.file}:${f.line}`);
    console.log(`      ${f.description}`);
    console.log(`      → ${f.code}`);
    console.log();
  }

  return false;
}

function main() {
  const args = process.argv.slice(2);
  const scanAll = args.includes('--all');
  const customPath = args.find((a) => a.startsWith('--path='));

  console.log('🔍 Verificação de SQL Injection\n');

  let scanDirs;

  if (customPath) {
    scanDirs = [join(ROOT, customPath.replace('--path=', ''))];
  } else if (scanAll) {
    scanDirs = [ROOT];
  } else {
    scanDirs = [
      join(ROOT, 'pages'),
      join(ROOT, 'lib'),
      join(ROOT, 'hooks'),
      join(ROOT, 'components'),
      join(ROOT, 'scripts'),
    ];
  }

  console.log(`  Ignorando: ${IGNORE_DIRS.join(', ')}\n`);

  const startTime = Date.now();
  const files = [];

  for (const dir of scanDirs) {
    try {
      files.push(...scanDirectory(dir));
    } catch {
      console.warn(`  ⚠️  Diretório não encontrado: ${dir}`);
    }
  }

  console.log(`  Arquivos .js encontrados: ${files.length}`);

  const allFindings = [];

  for (const file of files) {
    const findings = scanFile(file);
    for (const finding of findings) {
      allFindings.push({
        ...finding,
        file: relative(ROOT, file),
      });
    }
  }

  const duration = Date.now() - startTime;
  console.log(`  Tempo de execução: ${duration}ms\n`);

  return printResults(allFindings, files.length);
}

// Execução principal — só quando invocado como CLI, no mesmo padrão do
// check-hardcoded-credentials.js e do reset-db.js: importar o módulo (ex.: no
// teste unitário) não pode chamar process.exit e matar o worker do Jest.
if (process.argv[1] && process.argv[1].endsWith('check-sql-injection.js')) {
  try {
    process.exit(main() ? 0 : 1);
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error.message);
    process.exit(1);
  }
}
