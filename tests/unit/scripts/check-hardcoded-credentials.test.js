import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

// Não mockamos o 'fs': o scanner é linha-a-linha sobre arquivos reais e o
// teste exercita a MESMA lógica de produção (scanFile/scanDirectory/buildReport),
// alimentando-a com fixtures temporárias — nada da regra é reimplementado aqui.
import {
  scanFile,
  scanDirectory,
  buildReport,
  isCredentialName,
  IGNORE_FILES,
} from '../../../scripts/check-hardcoded-credentials.js';

describe('check-hardcoded-credentials.js — Credenciais hardcoded', () => {
  let tmpDir;
  let counter = 0;

  /** Cria um fixture .js no diretório temporário e devolve o caminho. */
  function writeFixture(content, name = `fixture-${counter++}.js`) {
    const filePath = path.join(tmpDir, name);
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-credentials-'));
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('isCredentialName()', () => {
    it('deve reconhecer nomes de credencial (case-insensitive)', () => {
      expect(isCredentialName('ADMIN_PASSWORD')).toBe(true);
      expect(isCredentialName('senha')).toBe(true);
      expect(isCredentialName('api_key')).toBe(true);
      expect(isCredentialName('apiKey')).toBe(true);
      expect(isCredentialName('sessionToken')).toBe(true);
      expect(isCredentialName('dbUrl')).toBe(false);
    });
  });

  describe('scanFile()', () => {
    it('deve detectar senha hardcoded como string literal (propriedade e atribuição)', () => {
      const file = writeFixture([
        'const config = {',
        "  ADMIN_PASSWORD: 'minha-senha-secreta-123',",
        '};',
        "const senha = 'outra-senha-secreta-456';",
      ].join('\n'));

      const findings = scanFile(file);

      expect(findings).toHaveLength(2);
      expect(findings[0]).toMatchObject({ line: 2, column: 3, rule: 'propriedade' });
      expect(findings[0].description).toContain('ADMIN_PASSWORD');
      expect(findings[1]).toMatchObject({ line: 4, column: 7, rule: 'atribuição' });
    });

    it('não deve detectar valores vindos de process.env / import.meta.env', () => {
      const file = writeFixture([
        'const opts = {',
        '  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,',
        '  JWT_SECRET: process.env[\'JWT_SECRET\'],',
        '};',
        'const token = import.meta.env.NEXT_PUBLIC_TOKEN;',
      ].join('\n'));

      expect(scanFile(file)).toHaveLength(0);
    });

    it('não deve detectar comparações, comentários, strings vazias nem chamadas de função', () => {
      const file = writeFixture([
        "if (senha === 'x') { console.log('ok'); }",
        "// JWT_SECRET: 'nao-conta-comentario'",
        "const cfg = { EMPTY_TOKEN: '' };",
        "const hashed = hashPassword(newPassword);",
        "const sql = `SELECT * FROM users WHERE token = ${userToken}`;",
      ].join('\n'));

      expect(scanFile(file)).toHaveLength(0);
    });
  });

  describe('scanDirectory() — allowlist', () => {
    it('não deve escanear arquivos presentes em IGNORE_FILES', () => {
      // 'e2e-isolated.js' é a primeira entrada real da allowlist (fixture E2E)
      expect(IGNORE_FILES).toContain('e2e-isolated.js');

      writeFixture("const E2E_PASSWORD = 'segredo-de-fixture-e2e';", 'e2e-isolated.js');
      writeFixture("const JWT_SECRET = 'segredo-fora-da-allowlist';", 'fora-da-allowlist.js');

      const files = scanDirectory(tmpDir);
      const names = files.map((f) => path.basename(f));

      expect(names).not.toContain('e2e-isolated.js');
      expect(names).toContain('fora-da-allowlist.js');
    });
  });

  describe('buildReport()', () => {
    it('deve listar arquivo:linha:coluna no relatório', () => {
      const file = writeFixture("const apiKey = 'chave-secreta-789';", 'report-path.js');

      const findings = scanFile(file);
      const report = buildReport(findings, 1);

      expect(findings).toHaveLength(1);
      expect(report).toContain(`${file}:1:7`);
      expect(report).toContain('regra: atribuição');
    });

    it('não deve expor o valor do segredo no relatório (redação)', () => {
      const file = writeFixture(
        "const ADMIN_PASSWORD = 'valor-secreto-que-nao-pode-vazar';",
        'redacao.js'
      );

      const report = buildReport(scanFile(file), 1);

      expect(report).toContain('[REDACTED]');
      expect(report).not.toContain('valor-secreto-que-nao-pode-vazar');
    });
  });
});
