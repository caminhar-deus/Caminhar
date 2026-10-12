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

// Mock do módulo que o script REAL importa (`scripts/db/connection.js`, linha 7
// do script). Substitui o mock antigo de `lib/infra/db.js`, que apontava para um
// módulo que `clear-db.js` nem importa — por isso os 4 testes antigos eram
// tautológicos. A factory cria os `jest.fn` nela mesma: referenciar um `const`
// externo falharia com TDZ ("Cannot access 'mockQuery' before initialization")
// porque o babel-plugin-jest-hoist move `jest.mock` acima das declarações. Os
// MESMOS objetos chegam ao teste pelo import com alias `mock*` mais abaixo.
jest.mock('../../../scripts/db/connection.js', () => ({
  query: jest.fn(),
  closePool: jest.fn(),
}));

// Mock do readline: SEM `__esModule`, para ser compatível com o
// `import readline from 'readline'` do script (interop do Babel exige que o
// mock seja o próprio módulo). A resposta vem do `mockAnswer` de escopo de
// módulo, lido apenas quando o prompt é chamado (dentro dos testes), jamais na
// hora de a factory rodar.
jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn((_prompt, cb) => cb(mockAnswer)),
    close: jest.fn(),
  })),
}));

// Mock do load-env
jest.mock('../../../scripts/utils/load-env.js', () => ({
  loadEnv: jest.fn(),
}));

// Import estático só é possível porque `clear-db.js` tem guarda de CLI: ao ser
// importado ele NÃO executa `askConfirmation()` nem `clearDatabase()`.
// Sem a guarda, `main()` rodaria já no import. Com o `readline` MOCKADO isto
// não trava no prompt: `main()` leria `mockAnswer`, ainda em TDZ, e daria
// `ReferenceError` — a suíte falharia por motivo incidental, não por prova
// intencional. Risco real, se um dia o mock de `readline` virar assíncrono:
// o import executaria `clearUploadsDir()` com o cwd do repo e apagaria
// `<repo>/uploads` de verdade.
import {
  askConfirmation,
  clearDatabase,
  clearUploadsDir,
  main,
} from '../../../scripts/clear-db.js';
import { query as mockQuery, closePool as mockClosePool } from '../../../scripts/db/connection.js';

// Resposta única devolvida pelo `readline` mockado ao próximo `question`.
let mockAnswer = 's';

// ---------------------------------------------------------------------------
// Testes REAIS de `askConfirmation` — exercitam o `readline` do próprio script.
// ---------------------------------------------------------------------------
describe('askConfirmation — leitura da resposta do prompt', () => {
  it.each([
    ['s', true],
    ['sim', true],
    ['  S  ', true], // caixa alta com espaços: `trim()` + `toLowerCase()`
    ['n', false],
    ['', false],
    ['x', false],
  ])('responde %j → %s', async (answer, expected) => {
    mockAnswer = answer;

    await expect(askConfirmation()).resolves.toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// Testes REAIS de `clearDatabase`/`main` — mock de `scripts/db/connection.js`
// (o módulo que o script importa) + fs REAL em sandbox.
//
// O sandbox é OBRIGATÓRIO, não defensivo: `clearDatabase` chama
// `clearUploadsDir()` dentro do try e essa função apaga arquivos de verdade
// com base em `process.cwd()`/`UPLOADS_DIR`. Sem apontar o cwd para um temp
// dir, o teste apagaria `<repo>/uploads` e `<repo>/public/uploads` de verdade.
// Mesmo padrão do describe de `clearUploadsDir` abaixo.
// ---------------------------------------------------------------------------
describe('clearDatabase e main — confirmação, TRUNCATE e cancelamento', () => {
  let tmpRoot;
  let originalCwd;
  let hadUploadsDir;
  let originalUploadsDir;
  let logSpy;
  let warnSpy;
  let errorSpy;
  let exitSpy;

  const logLines = () => logSpy.mock.calls.map((args) => args.join(' '));
  const errorLines = () => errorSpy.mock.calls.map((args) => args.join(' '));

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'clear-db-flow-'));
    originalCwd = process.cwd();

    hadUploadsDir = Object.prototype.hasOwnProperty.call(process.env, 'UPLOADS_DIR');
    originalUploadsDir = process.env.UPLOADS_DIR;
    // Caminho inexistente dentro do sandbox: `clearUploadsDir` reporta e segue.
    process.env.UPLOADS_DIR = path.join(tmpRoot, 'nao-existe');
    process.chdir(tmpRoot);

    mockAnswer = 's';
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });
    mockClosePool.mockResolvedValue(undefined);

    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    // Um `process.exit` real encerraria a suíte inteira; um `exit` burro (noop)
    // deixaria o fluxo continuar de um jeito que em produção nunca aconteceria
    // (o caminho "cancelado" de `main()` prosseguiria para `clearDatabase()`).
    // Lançar um erro sentinela interrompe o fluxo no mesmo ponto do `exit` real
    // e mantém o teste determinístico — sem poll de microtasks.
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
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
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it("main com 's': executa o TRUNCATE, fecha o pool e não chama process.exit", async () => {
    await main();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockClosePool).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(logLines().join('\n')).toContain('Banco de dados limpo com sucesso');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("main com 'n': não toca no banco nem no pool, loga o cancelamento e sai com 0", async () => {
    mockAnswer = 'n';

    await expect(main()).rejects.toThrow('process.exit(0)');

    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockClosePool).not.toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(logLines().join('\n')).toContain('cancelada');
  });

  it('clearDatabase: o SQL capturado do mock traz TRUNCATE com as 6 tabelas', async () => {
    await clearDatabase();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    // Aserções sobre o argumento RECEBIDO pelo mock — o SQL vive só no script,
    // não é reescrito como literal aqui (o teste antigo fazia isso e provava
    // nada).
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).toMatch(/TRUNCATE\s+TABLE/i);
    expect(sql).toContain('RESTART IDENTITY CASCADE');

    // Contrato legítimo: a especificação das tabelas a limpar (inclui `images`,
    // que os testes antigos esqueciam).
    const tables = sql
      .replace(/TRUNCATE\s+TABLE/i, '')
      .replace(/RESTART\s+IDENTITY\s+CASCADE;?/i, '')
      .split(',')
      .map((table) => table.trim())
      .filter(Boolean);
    expect(tables).toEqual(['posts', 'videos', 'musicas', 'images', 'settings', 'users']);

    expect(mockClosePool).toHaveBeenCalledTimes(1);
    expect(exitSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('clearDatabase com query rejeitada: loga o erro, sai com 1 e AINDA fecha o pool', async () => {
    mockQuery.mockRejectedValueOnce(new Error('pool indisponível'));

    await expect(clearDatabase()).rejects.toThrow('process.exit(1)');

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorLines()[0]).toContain('Erro ao limpar o banco de dados');
    expect(errorLines()[0]).toContain('pool indisponível');
    expect(exitSpy).toHaveBeenCalledWith(1);
    // Semântica do `finally` em JS: o bloco roda quando o `try` lança, e o pool
    // é fechado. Em produção, `process.exit(1)` (clear-db.js) encerra o
    // processo sincronamente e o `finally` NUNCA executa — o pool morre junto
    // com o processo, encerrado pelo SO. A asserção passa porque o mock de
    // `process.exit` lança uma sentinel em vez de sair de verdade: ela cobre a
    // semântica do bloco `finally` (detectável pela mutação "remover o
    // finally"), não o comportamento do exit real.
    expect(mockClosePool).toHaveBeenCalledTimes(1);
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
