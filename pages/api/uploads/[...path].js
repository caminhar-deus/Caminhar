import fs from 'fs';
import path from 'path';
import { logger } from '../../../lib/infra/logger.js';
import { uploadsRoot, legacyUploadsRoot } from '../../../lib/infra/storage.js';

/**
 * Serve arquivos de upload a partir do diretório de armazenamento que fica
 * FORA de `public/`.
 *
 * Motivo: `next start` tira um snapshot de `public/` no início do processo —
 * arquivo gravado em `public/` enquanto o servidor roda não é servido até o
 * próximo restart (POST devolvia 200 com URL válida e o GET dessa URL dava
 * 404). A rewrite `/uploads/:path* -> /api/uploads/:path*` em `next.config.js`
 * mantém a URL pública `/uploads/<arquivo>` intacta, então nada muda do lado
 * de quem consome `image_url` já persistido no banco.
 *
 * Ordem de resolução:
 * 1. Diretório novo (`UPLOADS_DIR` ou `<cwd>/uploads`) — uploads em runtime;
 * 2. Fallback `public/uploads` — dados legados gravados antes da correção
 *    (inclusive os que o snapshot do `next start` já conhece).
 *
 * Proteção contra path traversal: o caminho é resolvido com `path.resolve`
 * contra cada raiz e só é aceito se permanecer estritamente dentro dela.
 */

const CONTENT_TYPES = {
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

/**
 * Resolve `relativePath` dentro de `baseDir`, rejeitando qualquer resultado
 * que escape do diretório base (path traversal, caminho absoluto, null byte).
 * @param {string} baseDir - Diretório raiz permitido.
 * @param {string} relativePath - Caminho vindo da URL (segmentos já decodificados).
 * @returns {string|null} Caminho absoluto seguro ou `null`.
 */
function resolveInside(baseDir, relativePath) {
  if (!relativePath || relativePath.includes('\0')) return null;
  const target = path.resolve(baseDir, relativePath);
  if (target !== baseDir && !target.startsWith(baseDir + path.sep)) return null;
  return target;
}

/**
 * Procura o arquivo no diretório novo e, se não existir, no legado.
 * @param {string} relativePath - Caminho relativo vindo da URL.
 * @returns {Promise<{filepath: string, stats: fs.Stats}|null>}
 */
async function findFile(relativePath) {
  for (const root of [uploadsRoot(), legacyUploadsRoot()]) {
    const candidate = resolveInside(root, relativePath);
    if (!candidate) continue;
    try {
      // `turbopackIgnore`: o nome do arquivo vem da URL, então o caminho é
      // dinâmico por definição e não é resolvível em build time. A marcação declara
      // que o acesso é intencional; a proteção contra path traversal é a validação
      // em `resolveInside`, acima. Ver `lib/infra/storage.js` para o contexto.
      const stats = await fs.promises.stat(/*turbopackIgnore: true*/ candidate);
      if (stats.isFile()) return { filepath: candidate, stats };
    } catch {
      // Não existe neste root — tenta o próximo (fallback legado).
    }
  }
  return null;
}

/**
 * ETag fraco derivado do `stat` (tamanho + mtime), como o `serve-static`/`send`.
 *
 * Motivo: `res.send(buffer)` do Next trata Buffer como JSON (`typeof` é
 * `'object'`) e faz `JSON.stringify(buffer)` + hash FNV-1a caractere a
 * caractere só para gerar o ETag. Para um PNG de 2 MB isso é uma string de
 * ~7,8 milhões de caracteres e ~100 ms de CPU síncrona por request,
 * bloqueando o event loop. Com várias imagens em paralelo, qualquer outra
 * rota (ex.: `/api/products`) esperava na fila, e era isso que disparava o
 * `[Performance] Slow resource` do `hooks/usePerformanceMetrics.js`.
 *
 * É fraco (`W/`) porque não promete igualdade byte a byte. Basta para
 * revalidar: o nome de cada upload tem UUID e qualquer regravação muda
 * `size`/`mtime`.
 * @param {fs.Stats} stats - Metadados do arquivo.
 * @returns {string} ETag fraco.
 */
function weakEtagFromStats(stats) {
  return `W/"${stats.size.toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}"`;
}

/**
 * Decide se a cópia do cliente ainda vale (resposta 304), conforme RFC 9110 §13.1.
 * `If-None-Match` tem precedência; `If-Modified-Since` só conta sem ele.
 * @param {Record<string, string|undefined>} headers - Headers da requisição.
 * @param {string} etag - ETag atual do arquivo.
 * @param {fs.Stats} stats - Metadados do arquivo.
 * @returns {boolean} `true` quando o cliente já tem a versão atual.
 */
function isClientCacheFresh(headers, etag, stats) {
  const ifNoneMatch = headers['if-none-match'];
  if (ifNoneMatch) {
    if (ifNoneMatch.trim() === '*') return true;
    // Comparação fraca (§8.8.3.2): ignora o prefixo `W/` dos dois lados.
    const current = etag.replace(/^W\//, '');
    return ifNoneMatch
      .split(',')
      .some((tag) => tag.trim().replace(/^W\//, '') === current);
  }

  const ifModifiedSince = headers['if-modified-since'];
  if (ifModifiedSince) {
    const since = Date.parse(ifModifiedSince);
    if (Number.isNaN(since)) return false;
    // O header HTTP tem precisão de segundos; trunca o mtime para comparar.
    return Math.floor(stats.mtimeMs / 1000) * 1000 <= since;
  }

  return false;
}

/**
 * Handler da rota `/api/uploads/<arquivo>`.
 * @param {import('next').NextApiRequest} req - Requisição.
 * @param {import('next').NextApiResponse} res - Resposta.
 */
async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
  }

  try {
    // Catch-all: `req.query.path` chega como array de segmentos decodificados.
    const raw = req.query.path;
    const relativePath = Array.isArray(raw) ? raw.join('/') : raw;

    const found = relativePath ? await findFile(relativePath) : null;
    if (!found) {
      return res.status(404).json({ error: 'Not Found', message: 'Arquivo não encontrado' });
    }

    const contentType = CONTENT_TYPES[path.extname(found.filepath).toLowerCase()]
      || 'application/octet-stream';
    const etag = weakEtagFromStats(found.stats);

    // Headers de validação/cache vão também no 304 (RFC 9110 §15.4.5).
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Last-Modified', found.stats.mtime.toUTCString());
    // Hardening de conteúdo enviado pelo usuário fica em `next.config.js`
    // (`headers()` com `source: '/uploads/:path*'`), e NÃO aqui: essa regra roda
    // antes do `afterFiles` rewrite, então cobre também o arquivo legado em
    // `public/uploads/`, que é servido estaticamente sem passar por esta rota.
    // Um `setHeader` aqui duplicaria a fonte e cobriria só um dos caminhos.
    // O mesmo vale para `X-Content-Type-Options`, que vem da regra global.

    // Revalidação condicional resolvida só com o `stat`: o arquivo nem é lido.
    // Nos `res.end(...)` abaixo não há `return res.end(...)`: `end` devolve o
    // próprio `res` e o Next em dev avisa "API handler should not return a value".
    if (isClientCacheFresh(req.headers || {}, etag, found.stats)) {
      res.status(304).end();
      return;
    }

    res.setHeader('Content-Type', contentType);

    if (req.method === 'HEAD') {
      res.setHeader('Content-Length', found.stats.size);
      res.status(200).end();
      return;
    }

    // Uploads são imagens com limite de tamanho definido em `MAX_UPLOAD_BYTES`
    // (`lib/infra/storage.js`) e aplicado em `upload-image.js`; ler em buffer
    // evita corrida entre stat e open, que um stream deixaria a resposta meio
    // enviada. Em erro, respondemos 500 limpo. `Content-Length` vem do buffer
    // lido, não do `stat`, pela mesma razão.
    const buffer = await fs.promises.readFile(found.filepath);
    res.setHeader('Content-Length', buffer.length);
    // `res.end`, e NÃO `res.send`: o `send` do Next serializaria o Buffer como
    // JSON para gerar o ETag (ver `weakEtagFromStats`). Não troque de volta.
    res.status(200).end(buffer);
  } catch (error) {
    logger.error('Uploads', 'Erro ao servir arquivo de upload:', error);
    if (res.headersSent) {
      res.end();
      return;
    }
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao servir o arquivo' });
  }
}

export default handler;
