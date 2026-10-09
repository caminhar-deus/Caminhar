import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import handler from '../../../pages/api/uploads/[...path].js';

// ---------------------------------------------------------------------------
// Testes REAIS da rota que serve os uploads (fs real + diretórios temporários).
//
// Esta rota é a peça de segurança introduzida pela correção do item U
// (`docs/PENDENCIAS_scripts_testes.md`): ela substitui o serving de `public/`
// — que o `next start` snapshotava no boot, fazendo upload em runtime dar 404
// até o restart — e carrega a proteção contra path traversal.
//
// Ela não tinha nenhum teste. Uma regressão aqui seria um problema de
// SEGURANÇA, não de funcionalidade, e o único detector seria o cron de carga
// diário.
//
// O sandbox inteiro mora em um temp dir e o cwd é apontado para ele, de modo que
// o legado vira `<tmp>/public/uploads` e o `public/uploads` REAL do projeto nunca
// é lido nem alterado. Mesmo padrão de `tests/unit/scripts/clear-db.test.js`.
// ---------------------------------------------------------------------------

jest.unmock('../../../lib/infra/logger.js');

describe('API de Upload — rota de serviço /api/uploads/[...path]', () => {
  let tmpRoot;
  let originalCwd;
  let activeDir;
  let legacyDir;
  let hadUploadsDir;
  let originalUploadsDir;
  let logSpy;

  // GIF 1x1 transparente — mesmo asset do `load-tests/functional/upload-flow-test.js`.
  const GIF_BYTES = Buffer.from(
    'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
    'base64'
  );

  /**
   * Monta um req/res mínimo no formato que o handler consome. `res.send`
   * recebe o buffer; os headers ficam disponíveis para asserção.
   */
  const buildReqRes = (method, segments) => {
    const req = { method, query: { path: segments } };
    const res = {
      statusCode: null,
      headers: {},
      body: undefined,
      ended: false,
      setHeader(key, value) {
        this.headers[key.toLowerCase()] = value;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
      send(payload) {
        this.body = payload;
        return this;
      },
      end() {
        this.ended = true;
        return this;
      },
    };
    return { req, res };
  };

  const writeAsset = (dir, name, bytes = GIF_BYTES) => {
    fs.mkdirSync(dir, { recursive: true });
    const target = path.join(dir, name);
    fs.writeFileSync(target, bytes);
    return target;
  };

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'uploads-route-'));
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

    logSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
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
  });

  test('serve arquivo do diretório ativo com Content-Type e headers de cache', async () => {
    writeAsset(activeDir, 'post-image-ativo.gif');

    const { req, res } = buildReqRes('GET', ['post-image-ativo.gif']);
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/gif');
    expect(res.headers['cache-control']).toBe('public, max-age=3600');
    expect(res.headers['content-length']).toBe(GIF_BYTES.length);
    expect(res.headers['last-modified']).toBeDefined();
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect(res.body.equals(GIF_BYTES)).toBe(true);
  });

  test('serve arquivo do diretório legado (public/uploads) quando ausente no ativo', async () => {
    writeAsset(legacyDir, 'post-image-legado.gif');

    const { req, res } = buildReqRes('GET', ['post-image-legado.gif']);
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/gif');
    expect(res.body.equals(GIF_BYTES)).toBe(true);
  });

  test('prioriza o diretório ativo quando o mesmo nome existe nos dois', async () => {
    const ativoBytes = Buffer.concat([GIF_BYTES, Buffer.from('ATIVO')]);
    writeAsset(activeDir, 'post-image-duplicado.gif', ativoBytes);
    writeAsset(legacyDir, 'post-image-duplicado.gif', GIF_BYTES);

    const { req, res } = buildReqRes('GET', ['post-image-duplicado.gif']);
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    // O ativo vence — é onde uploads em runtime realmente vivem.
    expect(res.body.equals(ativoBytes)).toBe(true);
  });

  test('devolve 404 limpo para arquivo inexistente', async () => {
    const { req, res } = buildReqRes('GET', ['nao-existe.gif']);
    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      error: 'Not Found',
      message: 'Arquivo não encontrado',
    });
  });

  test('devolve 404 para requisição sem caminho', async () => {
    const { req, res } = buildReqRes('GET', undefined);
    await handler(req, res);

    expect(res.statusCode).toBe(404);
  });

  test('devolve 405 com header Allow para método que não é GET/HEAD', async () => {
    const { req, res } = buildReqRes('POST', ['post-image-ativo.gif']);
    await handler(req, res);

    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe('GET, HEAD');
    expect(res.body.error).toBe('Method Not Allowed');
  });

  test('responde 200 sem corpo em HEAD', async () => {
    writeAsset(activeDir, 'post-image-head.gif');

    const { req, res } = buildReqRes('HEAD', ['post-image-head.gif']);
    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.ended).toBe(true);
    expect(res.body).toBeUndefined();
    // Headers de tamanho continuam presentes em HEAD.
    expect(res.headers['content-length']).toBe(GIF_BYTES.length);
  });

  test('bloqueia path traversal sem vazar arquivo fora da raiz', async () => {
    // Segredo plantado FORA de qualquer raiz de uploads — o legacy é
    // `<tmp>/public/uploads`, então este arquivo é irmão do diretório legado.
    const secretPath = path.join(tmpRoot, 'public', 'secret.txt');
    fs.writeFileSync(secretPath, 'SEGREDO_QUE_NAO_PODE_VAZAR');

    const { req, res } = buildReqRes('GET', ['..', 'secret.txt']);
    await handler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({
      error: 'Not Found',
      message: 'Arquivo não encontrado',
    });
    expect(String(res.body)).not.toContain('SEGREDO_NAO_PODE_VAZAR');
  });

  test('bloqueia caminho absoluto e null byte', async () => {
    const absoluto = buildReqRes('GET', ['/etc/passwd']);
    await handler(absoluto.req, absoluto.res);
    expect(absoluto.res.statusCode).toBe(404);

    const nullByte = buildReqRes('GET', ['post-image\0.gif']);
    await handler(nullByte.req, nullByte.res);
    expect(nullByte.res.statusCode).toBe(404);
  });

  test('preserva a URL pública: a rota é montada em /api/uploads mas serve /uploads', async () => {
    // Este é o invariante do item U: a rewrite `/uploads/:path*` →
    // `/api/uploads/:path*` mantém a URL pública intacta, então os
    // `image_url` já persistidos no banco continuam valendo.
    const config = (await import('../../../next.config.js')).default;
    const rewrites = await config.rewrites();

    expect(rewrites).toEqual([
      { source: '/uploads/:path*', destination: '/api/uploads/:path*' },
    ]);
  });
});