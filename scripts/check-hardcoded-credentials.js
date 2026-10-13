#!/usr/bin/env node

/**
 * Script de verificação de segurança — Credenciais hardcoded
 *
 * Motivo real da regra: em 10/2026 foi removido um lote de 3 scripts de
 * `scripts/` por conterem credenciais reais commitadas no repositório (e
 * imports quebrados). `check-sql-injection.js` já cobre injeção de SQL, mas
 * nada impedia que um literal tipo `ADMIN_PASSWORD = '...'` voltasse a entrar.
 * Este scanner fecha essa brecha de forma automatizada, no mesmo estilo dos
 * demais checks de segurança do projeto.
 *
 * Escaneia arquivos .js/.mjs procurando atribuições e propriedades cujo NOME
 * case (case-insensitive, substring) com palavras-chave de credencial e cujo
 * VALOR seja string literal simples ('...' ou "..."):
 *
 *   password, passwd, senha, secret, token, apiKey, api_key,
 *   accessKey, privateKey, credentials
 *
 * NÃO é sinalizado (falsos positivos evitados):
 * - Valores vindos de `process.env.*` ou `import.meta.env.*`
 * - Template literals (interpolação é fluxo dinâmico; o caso real de
 *   credencial hardcoded usa aspas simples/duplas)
 * - Variáveis, imports e chamadas de função (`hashPassword(x)`, `generateToken()`)
 * - Strings vazias ('' / "") — nada a expor
 * - Comparações e validações (`password === 'x'`, `if (senha !== '')`)
 * - Linhas de comentário (bloco /* e linhas que começam com // ou *)
 *
 * Arquivos isentos por allowlist (IGNORE_FILES, por nome de arquivo, mesmo
 * mecanismo de check-sql-injection.js): cada entrada documenta o motivo —
 * são apenas placeholders determinísticos de teste/diagnóstico, não
 * credenciais reais.
 *
 * IMPORTANTE: o relatório NUNCA imprime o valor da credencial — apenas a
 * posição (`arquivo:linha:coluna`), a regra casada e a linha com o literal
 * redigido como '[REDACTED]'.
 *
 * Uso:
 *   node scripts/check-hardcoded-credentials.js             # Escaneia scripts/
 *   node scripts/check-hardcoded-credentials.js --all       # Projeto completo
 *   node scripts/check-hardcoded-credentials.js --path=./x  # Diretório customizado
 *
 * Exit codes:
 *   0 — Nenhuma credencial hardcoded
 *   1 — Credenciais encontradas (ou erro na execução)
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

// ROOT via process.cwd() — mesma decisão documentada em scripts/seed-all.js:
// as invocações reais (`npm run security:check-credentials` e
// `node scripts/check-hardcoded-credentials.js`) partem da raiz do projeto e o
// `import.meta.url` não sobrevive à compilação CommonJS do Babel no Jest (o
// teste unitário importa este módulo).
const ROOT = process.cwd();

const IGNORE_DIRS = [
  'node_modules', '.next', 'out', 'build', 'dist', '.git',
  'coverage', '.nyc_output', 'public/uploads', 'data', 'reports', '__mocks__',
];

/**
 * Allowlist por nome de arquivo (basename), no mesmo mecanismo de
 * check-sql-injection.js. Cada entrada explica por que o arquivo é isento.
 */
export const IGNORE_FILES = [
  // E2E isolado: usa senha determinística de fixture de teste ('e2e') e JWT
  // placeholder do container — não são credenciais reais de produção
  'e2e-isolated.js',
  // Diagnóstico do LSP: sessionToken é token falsificado de cenário sintético
  // ("sem contexto de repositório"), sem valor secreto algum
  'lsp-reusable-workflow.js',
  // Próprio scanner (contém a lista de palavras-chave como literais de teste)
  'check-hardcoded-credentials.js',
  // Fixture proposital do teste unitário deste scanner (senha literal fake)
  'check-hardcoded-credentials.test.js',
];

/**
 * Palavras-chave que identificam um nome como credencial (match por
 * substring, case-insensitive, no nome da variável/propriedade).
 */
export const CREDENTIAL_KEYWORDS = [
  'password', 'passwd', 'senha', 'secret', 'token',
  'apikey', 'api_key', 'accesskey', 'privatekey', 'credentials',
];

/** Substitui o valor encontrado — o relatório nunca imprime o segredo. */
const REDACTED = '[REDACTED]';

/**
 * Verifica se um diretório deve ser ignorado.
 */
function shouldIgnoreDir(dirPath) {
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
 * Verifica se uma linha é de comentário (mesmo critério de
 * check-sql-injection.js: linhas inteiras de //, * ou /*).
 */
function isCommentLine(line) {
  const trimmed = line.trim();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

/**
 * Remove comentários de bloco inline de uma linha (abertura + fechamento na
 * mesma linha), para não casar a regra dentro de documentação colada no código.
 */
function stripInlineBlockComments(line) {
  return line.replace(/\/\*.*?\*\//g, '');
}

/**
 * Verifica se o nome de uma variável/propriedade soa a credencial.
 */
export function isCredentialName(name) {
  const lower = String(name).toLowerCase();
  return CREDENTIAL_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/**
 * Localiza o fechamento de um literal de string iniciado em openIdx.
 * Retorna o índice da aspa de fechamento na mesma linha, ou -1.
 */
function findClosingQuote(line, openIdx, quote) {
  for (let i = openIdx + 1; i < line.length; i++) {
    if (line[i] === '\\') { i++; continue; } // escape: pula o próximo char
    if (line[i] === quote) return i;
  }
  return -1;
}

/**
 * Procura credenciais hardcoded em uma linha.
 *
 * Dois padrões, ambos exigindo string literal ('...' / "...") como valor:
 *   1. propriedade:  identificador : 'literal'   (ex: ADMIN_PASSWORD: 'x')
 *   2. atribuição:   identificador = 'literal'   (ex: const senha = 'x')
 * O lookbehind/ahead descarta comparações (==, ===, !=, !==, <=, >=, =>).
 *
 * @returns {Array<{rule: string, name: string, column: number, redacted: string}>}
 */
export function findCredentialAssignments(line) {
  const results = [];
  const patterns = [
    { re: /([A-Za-z_$][\w$]*)\s*:\s*(['"])/g, rule: 'propriedade' },
    { re: /([A-Za-z_$][\w$]*)\s*(?<![=!<>])=\s*(?!=)(['"])/g, rule: 'atribuição' },
  ];

  for (const { re, rule } of patterns) {
    let match;
    while ((match = re.exec(line)) !== null) {
      const name = match[1];
      if (!isCredentialName(name)) continue;

      const quote = match[2];
      const openIdx = match.index + match[0].length - 1;
      const closeIdx = findClosingQuote(line, openIdx, quote);
      // Literal multi-linha (sem fechamento na mesma linha) não é avaliado
      if (closeIdx === -1) continue;

      // String vazia não é segredo a expor
      if (closeIdx - openIdx - 1 === 0) continue;

      // Redige APENAS o valor; o nome da variável e a estrutura da linha ficam
      results.push({
        rule,
        name,
        column: match.index + 1,
        redacted: line.slice(0, openIdx) + quote + REDACTED + quote + line.slice(closeIdx + 1),
      });
    }
  }

  return results;
}

/**
 * Escaneia o conteúdo de um arquivo (caminho apenas para o relatório).
 * Rastreia comentários de bloco multi-linha para não casar dentro deles.
 */
export function scanContent(content, filePath = '<conteúdo>') {
  const findings = [];
  const lines = content.split('\n');
  let inBlockComment = false;

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = stripInlineBlockComments(lines[lineIdx]);
    const trimmed = line.trim();

    // Shebang não é código a analisar
    if (trimmed.startsWith('#!')) continue;

    if (inBlockComment) {
      if (trimmed.includes('*/')) inBlockComment = false;
      continue;
    }

    if (isCommentLine(line)) {
      // Abertura de bloco sem fechamento nesta linha: ignora até o próximo */
      if (trimmed.startsWith('/*') && !trimmed.includes('*/')) inBlockComment = true;
      continue;
    }

    for (const hit of findCredentialAssignments(line)) {
      const kind = hit.rule === 'propriedade' ? 'Propriedade' : 'Atribuição';
      findings.push({
        severity: 'CRÍTICO',
        file: filePath,
        line: lineIdx + 1,
        column: hit.column,
        rule: hit.rule,
        description: `${kind} '${hit.name}' com string literal (credencial hardcoded)`,
        code: hit.redacted.trim().substring(0, 150),
      });
    }
  }

  return findings;
}

/**
 * Escaneia um arquivo .js/.mjs em busca de credenciais hardcoded.
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

/**
 * Monta o relatório (string). O valor da credencial NUNCA aparece: o campo
 * `code` já chega redigido ([REDACTED]) de scanContent().
 */
export function buildReport(allFindings, totalFiles) {
  if (allFindings.length === 0) {
    return [
      '\n✅ Nenhuma credencial hardcoded encontrada!',
      `   Arquivos escaneados: ${totalFiles}`,
    ].join('\n');
  }

  const out = [
    `❌ ${allFindings.length} credencial(is) hardcoded encontrada(s) em ${totalFiles} arquivo(s):\n`,
  ];

  for (const f of allFindings) {
    out.push(`   🔴 ${f.file}:${f.line}:${f.column}`);
    out.push(`      regra: ${f.rule} — ${f.description}`);
    out.push(`      → ${f.code}`);
    out.push('');
  }

  return out.join('\n');
}

export function printResults(allFindings, totalFiles) {
  console.log(buildReport(allFindings, totalFiles));
  return allFindings.length === 0;
}

export function main(args = process.argv.slice(2)) {
  const scanAll = args.includes('--all');
  const customPath = args.find((a) => a.startsWith('--path='));

  console.log('🔍 Verificação de credenciais hardcoded\n');

  let scanDirs;

  if (customPath) {
    scanDirs = [join(ROOT, customPath.replace('--path=', ''))];
  } else if (scanAll) {
    scanDirs = [ROOT];
  } else {
    scanDirs = [join(ROOT, 'scripts')];
  }

  console.log(`  Ignorando: ${IGNORE_DIRS.join(', ')}\n`);

  const startTime = Date.now();
  const files = [];

  for (const dir of scanDirs) {
    try {
      scanDirectory(dir, files);
    } catch {
      console.warn(`  ⚠️  Diretório não encontrado: ${dir}`);
    }
  }

  console.log(`  Arquivos .js/.mjs encontrados: ${files.length}`);

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

// Execução principal — só quando invocado como CLI, no mesmo estilo do
// reset-password.js: importar o módulo (ex.: no teste unitário) não pode
// chamar process.exit e matar o worker do Jest.
if (process.argv[1] && process.argv[1].endsWith('check-hardcoded-credentials.js')) {
  try {
    process.exit(main() ? 0 : 1);
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error.message);
    process.exit(1);
  }
}
