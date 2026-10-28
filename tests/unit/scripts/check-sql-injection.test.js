import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Mesmo precedente de check-hardcoded-credentials.test.js: sem mock de 'fs'.
// O scanner é linha a linha sobre conteúdo real — o teste exercita o mesmo
// núcleo de produção em memória (scanContent) e as fixtures em disco
// (scanFile/scanDirectory) via tmpdir.
import {
  scanFile,
  scanContent,
  scanDirectory,
  extractConstantLists,
  findLoopVars,
  shouldIgnoreFile,
  IGNORE_FILES,
} from '../../../scripts/check-sql-injection.js';

describe('check-sql-injection.js — SQL Injection', () => {
  let tmpDir;
  let counter = 0;

  /** Cria um fixture .js no diretório temporário e devolve o caminho. */
  function writeFixture(content, name = `fixture-${counter++}.js`) {
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-sql-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('extractConstantLists()', () => {
    it('reconhece lista const de strings literais puras (mesmo formato do reset-db.js)', () => {
      const lists = extractConstantLists([
        "const TABLES_TO_DROP = ['post_tags', 'post_categories', 'posts'];",
        'const VAZIA = [];',
      ]);

      expect(lists.has('TABLES_TO_DROP')).toBe(true);
      expect(lists.has('VAZIA')).toBe(true);
    });

    it('não reconhece lista com identificador, template literal ou chamada de função', () => {
      const lists = extractConstantLists([
        'const DINAMICA = [name, "literal"];',
        'const TEMPLATE = [`SELECT ${param}`];',
        'const CHAMADAS = [listTables()];',
      ]);

      expect([...lists.keys()]).toHaveLength(0);
    });

    it('não reconhece declarações que não sejam `const` (reatribuíveis)', () => {
      const lists = extractConstantLists([
        "let LISTA = ['a', 'b'];",
        "var OUTRA = ['c'];",
      ]);

      expect([...lists.keys()]).toHaveLength(0);
    });
  });

  describe('findLoopVars()', () => {
    it('registra o vínculo for...of (variável do loop -> fonte)', () => {
      const loopVars = findLoopVars([
        'for (const table of TABLES_TO_DROP) {',
        'for (const a of listTables()) {',
      ]);

      expect(loopVars.get('table')).toBe('TABLES_TO_DROP');
      expect(loopVars.get('a')).toBe('listTables');
    });
  });

  describe('scanContent() — regras de detecção', () => {
    // Padrão exato do scripts/reset-db.js (ADR-0025) — é o falso positivo que
    // reprovou a cron "Load Tests (k6)" #25 (run 40673567814, 28/10/2026).
    it('NÃO sinaliza loop for...of sobre lista const de literais puros (ADR-0026)', () => {
      const content = [
        "const TABLES_TO_DROP = ['post_tags', 'post_categories', 'posts'];",
        '',
        'for (const table of TABLES_TO_DROP) {',
        '  await query(`DROP TABLE IF EXISTS ${table} CASCADE;`);',
        '}',
      ].join('\n');

      expect(scanContent(content)).toHaveLength(0);
    });

    it('sinaliza quando a "lista" do loop contém template literal (fluxo dinâmico)', () => {
      const content = [
        "const TABLES = ['post_tags', `t_${env}`];",
        'for (const table of TABLES) {',
        '  await query(`DROP TABLE IF EXISTS ${table} CASCADE;`);',
        '}',
      ].join('\n');

      const findings = scanContent(content);
      expect(findings).toHaveLength(1);
      expect(findings[0].line).toBe(3);
      expect(findings[0].description).toContain('sem array de parâmetros');
    });

    it('sinaliza loop for...of com fonte dinâmica (chamada de função)', () => {
      const content = [
        'for (const table of listTables()) {',
        '  await query(`DROP TABLE IF EXISTS ${table} CASCADE;`);',
        '}',
      ].join('\n');

      expect(scanContent(content)).toHaveLength(1);
    });

    it('sinaliza interpolação direta de input em query() (Regra 2 — caso real)', () => {
      const content = 'await query(`SELECT * FROM users WHERE name = ${name}`);';
      const findings = scanContent(content);

      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('CRÍTICO');
    });

    it('não sinaliza prepared statement com array de parâmetros', () => {
      const content = 'await query(`SELECT * FROM users WHERE name = $1`, [name]);';
      expect(scanContent(content)).toHaveLength(0);
    });

    it('não sinaliza interpolação de constante string local', () => {
      const content = [
        "const ID_COLUMN = 'id';",
        'await query(`SELECT * FROM posts ORDER BY ${ID_COLUMN}`);',
      ].join('\n');

      expect(scanContent(content)).toHaveLength(0);
    });

    it('não sinaliza variável validada por validateIdentifier()', () => {
      const content = [
        'const sb = validateIdentifier(schema);',
        'await query(`SELECT * FROM ${sb}`);',
      ].join('\n');

      expect(scanContent(content)).toHaveLength(0);
    });

    it('não sinaliza pool.query() de 1 argumento com constante local (Regra 1 com isenção)', () => {
      const content = [
        "const MIGRATION_TABLE = '_migrations';",
        'await pool.query(`DELETE FROM ${MIGRATION_TABLE}`);',
      ].join('\n');

      expect(scanContent(content)).toHaveLength(0);
    });

    it('detecta pool.query() de 1 argumento com variável não protegida (Regra 1)', () => {
      const content = 'await pool.query(`DROP TABLE IF EXISTS ${tabela} CASCADE;`);';
      const findings = scanContent(content);

      expect(findings).toHaveLength(1);
      expect(findings[0].description).toContain('pool.query()');
    });

    it('detecta a variável indireta construída com template literal (Regra 3 — regressão)', () => {
      const content = [
        'const sql = `SELECT * FROM logs WHERE ts > ${rawFilter}`;',
        'await query(sql);',
      ].join('\n');

      const findings = scanContent(content);
      expect(findings).toHaveLength(1);
      expect(findings[0].line).toBe(2);
      expect(findings[0].description).toContain('interpolação indireta');
    });

    it('ignora linhas de comentário (//, * de bloco, /*) e blocos com asterisco', () => {
      const content = [
        '  // await query(`SELECT * FROM ${raw}`);',
        '',
        ' * await query(`SELECT * FROM ${raw}`);',
        '',
        '/*',
        ' * await query(`SELECT * FROM ${raw2}`);',
        ' */',
      ].join('\n');

      expect(scanContent(content)).toHaveLength(0);
    });
  });

  describe('allowlist (IGNORE_FILES)', () => {
    it('contém reset-db.js e o próprio scanner', () => {
      expect(IGNORE_FILES).toContain('reset-db.js');
      expect(IGNORE_FILES).toContain('check-sql-injection.js');
    });

    it('não deve escanear arquivos presentes em IGNORE_FILES', () => {
      // 'reset-db.js' é a entrada da allowlist que motivou o ADR-0026
      expect(shouldIgnoreFile('scripts/reset-db.js')).toBe(true);
      expect(shouldIgnoreFile('scripts/outro-script.js')).toBe(false);

      // Fixture com o padrão sinalizável: excluída da varredura por NOME,
      // enquanto o mesmo conteúdo com outro nome produz 1 achado
      const pattern = [
        'for (const table of listTables()) {',
        '  await query(`DROP TABLE IF EXISTS ${table} CASCADE;`);',
        '}',
      ].join('\n');
      writeFixture(pattern, 'reset-db.js');
      writeFixture(pattern, 'fora-da-allowlist.js');

      const names = scanDirectory(tmpDir).map((f) => path.basename(f));
      expect(names).not.toContain('reset-db.js');
      expect(names).toContain('fora-da-allowlist.js');
      expect(scanFile(path.join(tmpDir, 'fora-da-allowlist.js'))).toHaveLength(1);
    });
  });
});
