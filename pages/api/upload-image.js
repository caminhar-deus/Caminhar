import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { updateSetting } from '../../lib/domain/settings.js';
import { withAuth } from '../../lib/auth.js';
import { logger } from '../../lib/logger.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed', message: 'Método não permitido' });
  }

  try {
    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
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
      try { await fs.promises.unlink(imageFile.filepath); } catch (e) {}
      return res.status(400).json({ error: 'Bad Request', message: 'Formato de arquivo inválido' });
    }

    // Validação de Tamanho (5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      try { await fs.promises.unlink(imageFile.filepath); } catch (e) {}
      return res.status(400).json({ error: 'Bad Request', message: 'Arquivo muito grande (tamanho máximo 5MB)' });
    }

    // Validação de conteúdo real via magic bytes (sharp)
    let metadata;
    try {
      metadata = await sharp(imageFile.filepath).metadata();
    } catch (e) {
      try { await fs.promises.unlink(imageFile.filepath); } catch (e2) {}
      return res.status(400).json({ error: 'Bad Request', message: 'Arquivo corrompido ou formato não suportado' });
    }

    // Validação de dimensões máximas
    if (metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT) {
      try { await fs.promises.unlink(imageFile.filepath); } catch (e) {}
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
    logger.error('Upload', 'Erro ao fazer upload da imagem:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao fazer upload da imagem' });
  }
}

export default withAuth(handler);
