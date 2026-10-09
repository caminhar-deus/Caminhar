import { jest, describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import { Readable } from 'stream';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// ---------------------------------------------------------------------------
// Teste de upload com DISCO REAL (sem mock de `fs`).
//
// Os 8 testes de `upload-image.test.js` mockam `fs` e `formidable` por inteiro:
// eles verificam que `fs.promises.rename` foi CHAMADO, mas nada grava, nada lê
// de volta e nada confirma que a URL emitida é servível. O teste chamado "Deve
// salvar o arquivo no diretório correto" não salva no disco.
//
// Este arquivo fecha o ciclo do item U (`docs/PENDENCIAS_scripts_testes.md`):
// upload → arquivo no disco → mesma URL servida por `pages/api/uploads/[...path].js`
// respondendo 200. É o cenário exato que falhava 103/103 iterações no run
// `37769829603` e que nenhuma verificação automatizada cobria.
//
// `formidable` e `sharp` são reais aqui; só `auth` e `settings` são mockados
// (o upload exige JWT e o teste não quer tocar no banco).
//
// O sandbox inteiro mora em um temp dir e o cwd é apontado para ele, de modo que
// o legado vira `<tmp>/public/uploads` e tanto o `<repo>/uploads` quanto o
// `<repo>/public/uploads` REAIS nunca são lidos nem alterados. Mesmo padrão de
// `tests/unit/scripts/clear-db.test.js`.
// ---------------------------------------------------------------------------

jest.mock('../../../lib/auth/auth.js', () => ({
  withAuth: (handler) => handler,
}));

jest.mock('../../../lib/domain/settings.js', () => ({
  updateSetting: jest.fn(),
}));

import uploadHandler from '../../../pages/api/upload-image.js';
import uploadRouteHandler from '../../../pages/api/uploads/[...path].js';

// GIF 1x1 transparente — mesmo asset do `load-tests/functional/upload-flow-test.js`.
const GIF_BYTES = Buffer.from(
  'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
);

const FIELD = 'image';
const FILENAME = 'post-image-integracao.gif';

/**
 * `res` mínimo no formato que o handler consome — `createMocks` não é usado
 * aqui porque o `req` precisa ser um Readable de verdade e os dois lados
 * viriam acoplados.
 */
const buildRes = () => ({
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
});

/**
 * Monta um `req` que É um Readable, com o corpo multipart completo, para que o
 * `formidable` real consiga parseá-lo. O `req` precisa ser o próprio stream —
 * copiar as propriedades de um stream para um objeto comum não produz um stream,
 * e o `formidable` fica esperando corpo que nunca chega.
 */
const buildMultipartReq = (buffer, filename, contentType, fields = {}) => {
  const boundary = '----CaminharTestBoundary9x8y7z';
  const parts = [];

  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
          `${value}\r\n`
      )
    );
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${FIELD}"; filename="${filename}"\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`
    )
  );

  const body = Buffer.concat([...parts, buffer, Buffer.from(`\r\n--${boundary}--\r\n`)]);

  const req = Readable.from([body]);
  req.headers = {
    'content-type': `multipart/form-data; boundary=${boundary}`,
    'content-length': String(body.length),
  };
  return req;
};

describe('Upload de imagem com disco real — ciclo completo do item U', () => {
  let tmpRoot;
  let originalCwd;
  let activeDir;
  let legacyDir;
  let hadUploadsDir;
  let originalUploadsDir;
  let logSpy;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-disk-'));
    originalCwd = process.cwd();

    activeDir = path.join(tmpRoot, 'active-uploads');
    legacyDir = path.join(tmpRoot, 'public', 'uploads');
    fs.mkdirSync(activeDir, { recursive: true });
    fs.mkdirSync(legacyDir, { recursive: true });

    hadUploadsDir = Object.prototype.hasOwnProperty.call(process.env, 'UPLOADS_DIR');
    originalUploadsDir = process.env.UPLOADS_DIR;
    process.env.UPLOADS_DIR = activeDir;

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

  test('grava no diretório ativo, devolve /uploads/... e a rota serve o arquivo com 200', async () => {
    // `node-mocks-http` não produz um req que seja Readable, e o `formidable`
    // real exige um stream — então o `req` vem do próprio builder multipart e
    // o `res` do `createMocks`.
    const req = buildMultipartReq(GIF_BYTES, FILENAME, 'image/gif', { uploadType: 'post' });
    req.method = 'POST';
    const res = buildRes();

    await uploadHandler(req, res);

    expect(res.statusCode).toBe(200);

    const { path: publicPath, imageUrl } = res.body;
    // Invariante do item U: a URL pública é `/uploads/...`, não
    // `/api/uploads/...` — por isso os `image_url` já no banco seguem válidos.
    expect(publicPath).toBe(imageUrl);
    expect(publicPath).toMatch(/^\/uploads\/post-image-[0-9a-f-]+\.gif$/);

    // 1. O arquivo existe de fato no diretório ativo, FORA de `public/`.
    const storedName = publicPath.replace('/uploads/', '');
    const storedPath = path.join(activeDir, storedName);
    expect(fs.existsSync(storedPath)).toBe(true);
    expect(fs.readFileSync(storedPath).equals(GIF_BYTES)).toBe(true);

    // 2. Nada foi gravado no legado — é justamente o que causava o 404, já que
    //    o `next start` snapshota `public/` no boot.
    expect(fs.readdirSync(legacyDir)).toEqual([]);

    // 3. A URL emitida é servível: a rota de serviço responde 200.
    const getRes = buildRes();
    await uploadRouteHandler(
      // O catch-all entrega `path` como array de segmentos decodificados.
      { method: 'GET', query: { path: storedName.split('/') } },
      getRes
    );

    expect(getRes.statusCode).toBe(200);
    expect(getRes.headers['content-type']).toBe('image/gif');
    expect(getRes.body.equals(GIF_BYTES)).toBe(true);
  });

  test('rejeita formato não suportado e não deixa arquivo no disco', async () => {
    const req = buildMultipartReq(Buffer.from('nao sou imagem'), 'x.txt', 'text/plain');
    req.method = 'POST';
    const res = buildRes();

    await uploadHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(fs.readdirSync(activeDir)).toEqual([]);
  });
});