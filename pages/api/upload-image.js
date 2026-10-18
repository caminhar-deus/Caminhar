import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { updateSetting } from '../../lib/domain/settings.js';
import { withAuth } from '../../lib/auth/auth.js';
import { logger } from '../../lib/infra/logger.js';
import { uploadsRoot, MAX_UPLOAD_BYTES } from '../../lib/infra/storage.js';

/**
 * Remove um arquivo do disco de forma segura, ignorando erros silenciosamente.
 * Utilizado para limpeza de arquivos temporários em cenários de validação.
 * @param {string} filepath - Caminho completo do arquivo a ser removido.
 */
async function safeUnlink(filepath) {
  try {
    await fs.promises.unlink(filepath);
  } catch {
    // Falha ao limpar arquivo temporário é aceitável (arquivo pode já ter sido movido)
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Códigos internos do `FormidableError` para "payload acima do limite".
// Fonte: node_modules/formidable/src/FormidableError.js:10,17.
// Constantes locais de propósito: `formidable` só expõe esses códigos pelo
// namespace `errors` (`export * as errors`), e os testes que mockam o módulo
// inteiro (`tests/integration/api/upload-image.test.js` e
// `tests/unit/pages/api/upload-image.edge.test.js`) não o reproduzem — um
// `errors` `undefined` aqui degradaria o `catch` para 500 em silêncio.
const ERRO_TAMANHO_TOTAL = 1009; // biggerThanTotalMaxFileSize
const ERRO_TAMANHO_ARQUIVO = 1016; // biggerThanMaxFileSize

/** Verdadeiro quando o erro do formidable é "arquivo grande demais". */
function ehErroDeTamanho(error) {
  if (!error) return false;
  return (
    error.code === ERRO_TAMANHO_TOTAL ||
    error.code === ERRO_TAMANHO_ARQUIVO ||
    error.httpCode === 413
  );
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
  }

  try {
    // Ensure upload directory exists.
    // FORA de `public/`: `next start` tira um snapshot de `public/` no início
    // do processo, então um arquivo gravado em runtime não é servido até o
    // próximo restart (GET devolvia 404 com URL de sucesso já emitida).
    // O diretório padrão é `<cwd>/uploads` na raiz do repo (mesmo padrão de
    // `reports/`); UPLOADS_DIR permite apontar para um volume persistente.
    // A URL pública continua `/uploads/<arquivo>` — servida pela rota
    // `pages/api/uploads/[...path].js` via rewrite em `next.config.js`.
    // A resolução vive em `lib/infra/storage.js` (ver o comentário de lá sobre
    // por que o acesso dinâmico e o aviso do build são esperados).
    const uploadDir = uploadsRoot();
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: MAX_UPLOAD_BYTES,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    // Formidable v3 returns an array of files
    const imageFile = files.image?.[0] || files.image;
    
    if (!imageFile) {
      return res.status(400).json({ error: 'Bad Request', message: 'Nenhuma imagem enviada' });
    }

    // Validação de Mimetype
    if (!ALLOWED_MIMETYPES.includes(imageFile.mimetype)) {
      await safeUnlink(imageFile.filepath);
      return res.status(400).json({ error: 'Bad Request', message: 'Formato de arquivo inválido' });
    }

    // Validação de Tamanho (defesa em profundidade — o `maxFileSize` do
    // formidable já interrompe o stream antes, respondendo 413 no `catch`)
    if (imageFile.size > MAX_UPLOAD_BYTES) {
      await safeUnlink(imageFile.filepath);
      return res.status(413).json({ error: 'Payload Too Large', message: 'Arquivo muito grande (tamanho máximo 5MB)' });
    }

    // Validação de conteúdo real via magic bytes (sharp)
    let metadata;
    try {
      metadata = await sharp(imageFile.filepath).metadata();
    } catch {
      await safeUnlink(imageFile.filepath);
      // O texto antigo dizia "corrompido", o que prometia integridade de arquivo
      // que este gate não verifica: o `sharp` lê só o HEADER. Medido: um JPEG
      // truncado com header íntegro passa por aqui. O que se rejeita é "isto não
      // é uma imagem legível" — e é isso que a mensagem diz.
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Não foi possível ler a imagem. Envie um arquivo JPG, PNG, WebP ou GIF válido.',
      });
    }

    // Validação de dimensões máximas.
    // `Number()` é defensivo: se `metadata` vier sem `width`/`height`, a
    // comparação crua (`undefined > 1920` → `false`) deixaria passar. Medido que
    // jpeg/png/gif sempre devolvem número, então isto não é bug ativo — é uma
    // comparação a mais num gate de segurança.
    if (Number(metadata.width) > MAX_WIDTH || Number(metadata.height) > MAX_HEIGHT) {
      await safeUnlink(imageFile.filepath);
      return res.status(400).json({
        error: 'Bad Request',
        message: `Imagem muito grande. Dimensões máximas: ${MAX_WIDTH}x${MAX_HEIGHT}px (atual: ${metadata.width}x${metadata.height}px)`
      });
    }

    // Check upload type to decide filename prefix
    const uploadType = Array.isArray(fields.uploadType) ? fields.uploadType[0] : fields.uploadType;
    const prefix = uploadType === 'setting_home_image' ? 'hero-image-' : 'post-image-';

    // Gera nome aleatório seguro com UUID + extensão validada
    const ext = path.extname(imageFile.originalFilename || imageFile.newFilename || '.jpg').toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.includes(ext) ? ext : '.jpg';
    const newFilename = `${prefix}${crypto.randomUUID()}${safeExt}`;
    const newPath = path.join(uploadDir, newFilename);
    await fs.promises.rename(imageFile.filepath, newPath);

    // Get relative path for public access
    const publicPath = `/uploads/${newFilename}`;

    if (uploadType === 'setting_home_image') {
      // Update setting in database only for site header
      await updateSetting('home_image_url', publicPath, 'image', 'Imagem principal da home');
    }

    return res.status(200).json({ success: true, path: publicPath, imageUrl: publicPath });

  } catch (error) {
    // Excesso de tamanho não é falha do servidor: o formidable interrompe o
    // stream e rejeita o parse. Devolver 500 aqui escondia o motivo real.
    if (ehErroDeTamanho(error)) {
      return res.status(413).json({ error: 'Payload Too Large', message: 'Arquivo muito grande (tamanho máximo 5MB)' });
    }
    logger.error('Upload', 'Erro ao fazer upload da imagem:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao fazer upload da imagem' });
  }
}

export default withAuth(handler);
