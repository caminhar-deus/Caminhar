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

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Length', found.stats.size);
    res.setHeader('Last-Modified', found.stats.mtime.toUTCString());

    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    // Uploads são imagens limitadas a 5MB em `upload-image.js`; ler em buffer
    // evita corrida entre stat e open, que um stream deixaria a resposta meio
    // enviada. Em erro, respondemos 500 limpo.
    const buffer = await fs.promises.readFile(found.filepath);
    return res.status(200).send(buffer);
  } catch (error) {
    logger.error('Uploads', 'Erro ao servir arquivo de upload:', error);
    if (res.headersSent) {
      return res.end();
    }
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao servir o arquivo' });
  }
}

export default handler;
