import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';

jest.mock('pg');
jest.mock('dotenv');
// `fs` NÃO é mockado aqui (era `jest.mock('fs')` antes): o bloco novo de
// `clearUploadsDir` precisa do sistema de arquivos REAL para provar que dois
// diretórios de verdade são limpos. Mockar `fs` repetiria o mesmo problema
// tautológico dos testes antigos.

// Mock do lib/infra/db.js
jest.mock('../../../lib/infra/db.js', () => require('../../mocks/db-module').mockDb());

// Mock do load-env
jest.mock('../../../scripts/utils/load-env.js', () => ({
  loadEnv: jest.fn(),
}));

// Import estático só é possível porque `clear-db.js` tem guarda de CLI: ao ser
// importado ele NÃO executa `askConfirmation()` nem `clearDatabase()`.
// (Prova extra: se a guarda faltasse, este arquivo travaria no prompt.)
import { clearUploadsDir } from '../../../scripts/clear-db.js';

describe('clear-db.js — Limpeza completa do banco', () => {
  let libDb;

  beforeEach(async () => {
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    libDb = await import('../../../lib/infra/db.js');
  });

  afterEach(() => {
    delete process.env.DATABASE_URL;
  });

  it('deve importar as dependências corretamente', () => {
    expect(typeof libDb.query).toBe('function');
    expect(typeof libDb.closeDatabase).toBe('function');
  });

  it('deve executar TRUNCATE nas tabelas corretas', async () => {
    libDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

    // Simula a query TRUNCATE que o clearDatabase() executa
    const sql = `TRUNCATE TABLE 
        posts, videos, musicas, images, settings, users 
      RESTART IDENTITY CASCADE;`;

    await libDb.query(sql);

    expect(libDb.query).toHaveBeenCalledWith(expect.stringContaining('TRUNCATE TABLE'));
    expect(libDb.query).toHaveBeenCalledWith(expect.stringContaining('posts'));
    expect(libDb.query).toHaveBeenCalledWith(expect.stringContaining('videos'));
    expect(libDb.query).toHaveBeenCalledWith(expect.stringContaining('musicas'));
    expect(libDb.query).toHaveBeenCalledWith(expect.stringContaining('settings'));
    expect(libDb.query).toHaveBeenCalledWith(expect.stringContaining('users'));
    expect(libDb.query).toHaveBeenCalledWith(expect.stringContaining('RESTART IDENTITY CASCADE'));
  });

  it('deve fechar a conexão após limpar', async () => {
    libDb.query.mockResolvedValue({ rows: [], rowCount: 0 });

    await libDb.query('TRUNCATE TABLE posts CASCADE');
    await libDb.closeDatabase();

    expect(libDb.closeDatabase).toHaveBeenCalled();
  });

  it('não deve executar TRUNCATE se usuário cancelar', () => {
    // O script clear-db.js pede confirmação antes de executar
    // O teste verifica que a query não é executada se a confirmação falhar
    const answer = false; // Simula resposta negativa do usuário
    if (!answer) {
      expect(libDb.query).not.toHaveBeenCalled();
    }
  });
});

// ---------------------------------------------------------------------------
// Testes REAIS de clearUploadsDir (fs real + diretórios temporários de verdade).
//
// `clearUploadsDir` resolve os caminhos com `process.cwd()`:
//   - ativo:   `path.resolve(process.env.UPLOADS_DIR || <cwd>/uploads)`
//   - legado:  `path.join(process.cwd(), 'public', 'uploads')`
// O sandbox inteiro mora em um temp dir e o cwd é apontado para ele, de modo
// que o legado vira `<tmp>/public/uploads` e o `public/uploads` REAL do projeto
// nunca é lido nem alterado.
// ---------------------------------------------------------------------------
describe('clearUploadsDir — limpeza real dos diretórios de uploads', () => {
  let tmpRoot;
  let originalCwd;
  let activeDir;
  let legacyDir;
  let hadUploadsDir;
  let originalUploadsDir;
  let logSpy;
  let warnSpy;

  const logLines = () => logSpy.mock.calls.map((args) => args.join(' '));
  // Mensagem `✅ Diretório(s) de uploads limpo(s): <dir>, <dir>` — lista os
  // diretórios existentes na ordem [ativo, legado].
  const clearedMessage = () => logLines().find((line) => line.includes('limpo(s):'));

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clear-db-uploads-'));
    originalCwd = process.cwd();

    activeDir = path.join(tmpRoot, 'active-uploads');
    legacyDir = path.join(tmpRoot, 'public', 'uploads');
    fs.mkdirSync(activeDir, { recursive: true });
    fs.mkdirSync(legacyDir, { recursive: true });

    hadUploadsDir = Object.prototype.hasOwnProperty.call(process.env, 'UPLOADS_DIR');
    originalUploadsDir = process.env.UPLOADS_DIR;
    process.env.UPLOADS_DIR = activeDir;

    // O legado é derivado do cwd: apontá-lo para o sandbox mantém o teste
    // longe de `<repo>/public/uploads`. Restaurado no afterEach.
    process.chdir(tmpRoot);

    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    if (hadUploadsDir) {
      process.env.UPLOADS_DIR = originalUploadsDir;
    } else {
      delete process.env.UPLOADS_DIR;
    }
    // Restaurar o cwd ANTES de remover o sandbox que contém o cwd atual.
    process.chdir(originalCwd);
    if (tmpRoot && fs.existsSync(tmpRoot)) {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('limpa os arquivos do diretório ativo (UPLOADS_DIR) sem apagar o diretório', async () => {
    const fileA = path.join(activeDir, 'a.jpg');
    const fileB = path.join(activeDir, 'b.png');
    fs.writeFileSync(fileA, 'conteudo-a');
    fs.writeFileSync(fileB, 'conteudo-b');

    await clearUploadsDir();

    expect(fs.existsSync(fileA)).toBe(false);
    expect(fs.existsSync(fileB)).toBe(false);
    expect(fs.readdirSync(activeDir)).toEqual([]);
    expect(fs.statSync(activeDir).isDirectory()).toBe(true);
    expect(clearedMessage()).toContain(activeDir);
  });

  it('limpa também o legado public/uploads relativo ao cwd', async () => {
    const legacyFile = path.join(legacyDir, 'legado.jpg');
    fs.writeFileSync(legacyFile, 'legado');

    await clearUploadsDir();

    expect(fs.existsSync(legacyFile)).toBe(false);
    expect(fs.readdirSync(legacyDir)).toEqual([]);
    expect(clearedMessage()).toContain(legacyDir);
  });

  it('UPLOADS_DIR apontando para o legado não executa limpeza duplicada', async () => {
    process.env.UPLOADS_DIR = legacyDir;
    const file = path.join(legacyDir, 'duplicado.jpg');
    fs.writeFileSync(file, 'x');

    const readdirSpy = jest.spyOn(fs.promises, 'readdir');
    await clearUploadsDir();

    expect(fs.existsSync(file)).toBe(false);

    // O `.filter((dir, index, dirs) => dirs.indexOf(dir) === index)` mantém o
    // caminho repetido uma única vez: um único readdir sobre o diretório...
    const legacyReads = readdirSpy.mock.calls.filter(([target]) => target === legacyDir);
    expect(legacyReads).toHaveLength(1);

    // ...e o diretório aparece uma única vez na mensagem de sucesso (sem
    // dedupe, `clearedDirs` seria [dir, dir] e o join repetiria o caminho).
    const message = clearedMessage();
    expect(message).toBeDefined();
    expect(message.split(legacyDir).length - 1).toBe(1);

    readdirSpy.mockRestore();
  });

  it('diretório inexistente é ignorado sem lançar', async () => {
    const missingDir = path.join(tmpRoot, 'nao-existe');
    process.env.UPLOADS_DIR = missingDir;
    fs.rmSync(legacyDir, { recursive: true, force: true });

    await expect(clearUploadsDir()).resolves.toBeUndefined();

    expect(warnSpy).not.toHaveBeenCalled();
    const messages = logLines().join('\n');
    expect(messages).toContain('nada a limpar');
    expect(messages).toContain(`(ignorado): ${missingDir}`);
    expect(messages).toContain(`(ignorado): ${legacyDir}`);
  });

  it('preserva .gitkeep e apaga os demais arquivos', async () => {
    const activeGitkeep = path.join(activeDir, '.gitkeep');
    const legacyGitkeep = path.join(legacyDir, '.gitkeep');
    fs.writeFileSync(activeGitkeep, '');
    fs.writeFileSync(legacyGitkeep, '');
    fs.writeFileSync(path.join(activeDir, 'img.jpg'), 'x');
    fs.writeFileSync(path.join(legacyDir, 'old.png'), 'x');

    await clearUploadsDir();

    expect(fs.existsSync(activeGitkeep)).toBe(true);
    expect(fs.existsSync(legacyGitkeep)).toBe(true);
    expect(fs.existsSync(path.join(activeDir, 'img.jpg'))).toBe(false);
    expect(fs.existsSync(path.join(legacyDir, 'old.png'))).toBe(false);
    expect(fs.readdirSync(activeDir)).toEqual(['.gitkeep']);
    expect(fs.readdirSync(legacyDir)).toEqual(['.gitkeep']);
  });

  it('é idempotente: rodar duas vezes não lança', async () => {
    fs.writeFileSync(path.join(activeDir, 'foto.jpg'), 'x');
    fs.writeFileSync(path.join(activeDir, '.gitkeep'), '');
    fs.writeFileSync(path.join(legacyDir, 'outra.jpg'), 'x');

    await expect(clearUploadsDir()).resolves.toBeUndefined();
    await expect(clearUploadsDir()).resolves.toBeUndefined();

    expect(fs.readdirSync(activeDir)).toEqual(['.gitkeep']);
    expect(fs.readdirSync(legacyDir)).toEqual([]);
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
