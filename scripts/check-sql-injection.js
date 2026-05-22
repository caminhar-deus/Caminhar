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
 *
 * Falsos positivos conhecidos e ignorados:
 * - Comentários de código
 * - Identificadores SQL (nomes de tabelas/colunas) vindos de whitelists fixas
 * - Identificadores protegidos por _validateIdentifier() (padrão do lib/crud.js)
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
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

const IGNORE_DIRS = [
  'node_modules', '.next', 'out', 'build', 'dist', '.git',
  'coverage', '.nyc_output', 'public/uploads', 'data', 'reports', '__mocks__',
];

const IGNORE_FILES = [
  'next.config.js', 'babel.jest.config.js', 'jest.config.js',
  'jest.setup.js', 'jest.teardown.js', 'knip.json', 'schema.knip.json',
  'cypress.config.js', 'rate-limit-proxy.js',
  // Script de limpeza de imagens: usa tabelas/colunas de whitelist fixa, não de input do usuário
  'clean-orphaned-images.js',
];

function shouldIgnoreDir(dirPath) {
  return dirPath.split('/').some((part) => IGNORE_DIRS.includes(part));
}

function shouldIgnoreFile(filePath) {
  const fileName = filePath.split('/').pop();
  if (IGNORE_FILES.includes(fileName)) return true;
  const ext = extname(fileName);
  return ext !== '.js' && ext !== '.mjs';
}

function scanDirectory(dirPath, files = []) {
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

function isCommentLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

function hasValidateIdentifier(lines, lineIndex) {
  for (let i = Math.max(0, lineIndex - 5); i <= Math.min(lines.length - 1, lineIndex + 1); i++) {
    if (lines[i].includes('_validateIdentifier(')) return true;
  }
  return false;
}

/**
 * Detecção principal: procura por query()/pool.query() com interpolação direta
 * sem prepared statements (array de parâmetros).
 */
function scanFile(filePath) {
  const findings = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx];

      // Ignora linhas de comentário
      if (isCommentLine(line)) continue;

      // Verifica se o código está próximo de _validateIdentifier (caso seguro)
      const isProtected = hasValidateIdentifier(lines, lineIdx);

      // ===== REGRA 1: pool.query() com 1 argumento e interpolação =====
      const poolQuerySingle = line.match(/pool\.query\s*\(\s*`[^`]*\$\{[^}]*\}[^`]*`\s*\)/i);
      if (poolQuerySingle && !isProtected) {
        findings.push({
          severity: 'CRÍTICO',
          file: filePath,
          line: lineIdx + 1,
          description: 'pool.query() com interpolação sem prepared statement (1 argumento)',
          code: line.trim().substring(0, 150),
        });
        continue;
      }

      // ===== REGRA 2: query() com template literal + interpolação SEM array =====
      const queryRegex = /(?:^|\s)(?:await\s+)?query\s*\(\s*`/i;
      const queryMatch = line.match(queryRegex);

      if (queryMatch && !isProtected) {
        const openParenIdx = line.indexOf('(', queryMatch.index);
        if (openParenIdx === -1) continue;

        const afterOpenParen = line.substring(openParenIdx + 1).trim();

        if (!afterOpenParen.startsWith('`')) continue;
        if (!afterOpenParen.includes('${')) continue;

        const closesWithParen = afterOpenParen.match(/`\s*\)/);
        const hasCommaThenArray = afterOpenParen.match(/`\s*,\s*\[/);

        if (closesWithParen && !hasCommaThenArray) {
          findings.push({
            severity: 'CRÍTICO',
            file: filePath,
            line: lineIdx + 1,
            description: 'query() com interpolação e sem array de parâmetros',
            code: line.trim().substring(0, 150),
          });
        }
      }
    }
  } catch (err) {
    console.error(`  ⚠️  Erro ao ler ${filePath}: ${err.message}`);
  }

  return findings;
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

try {
  const success = main();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('❌ Erro durante a verificação:', error.message);
  process.exit(1);
}
