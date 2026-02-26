import { promises as fs } from 'fs';
import path from 'path';
import { getSetting } from '../../lib/db.js';

export default async function handler(req, res) {
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    let filename = null;

    // 1. Tenta buscar a imagem definida nas configurações do banco de dados
    try {
      // Tenta buscar a configuração da imagem principal
      const dbImage = await getSetting('home_image_url');
      
      if (dbImage && typeof dbImage === 'string') {
        // dbImage geralmente é '/uploads/post-image-123.png', pegamos só o nome do arquivo
        filename = path.basename(dbImage);
      }
    } catch (dbError) {
      console.warn('Aviso: Não foi possível ler a configuração do banco:', dbError.message);
    }

    // 2. Fallback: Se não achou no banco, procura o arquivo mais recente na pasta
    if (!filename) {
      const files = await fs.readdir(uploadDir).catch(() => []);
      
      // Procura por arquivos com prefixo antigo (hero-) ou novo (post-)
      const imageFiles = files.filter(file => 
        file.startsWith('hero-image-')
      );
      
      // Pega o último (mais recente pelo nome/timestamp)
      if (imageFiles.length > 0) {
        filename = imageFiles.sort().pop();
      }
    }

    if (filename) {
      // Serve the uploaded image with aggressive caching
      const imagePath = path.join(uploadDir, filename);
      const imageBuffer = await fs.readFile(imagePath);

      // Set aggressive caching headers for better performance
      // Detecta tipo básico pela extensão ou assume jpeg
      const ext = path.extname(filename).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg');
      
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.setHeader('ETag', `"${filename}"`);
      res.setHeader('Last-Modified', new Date().toUTCString());
      res.send(imageBuffer);
    } else {
      // Serve a default placeholder image
      // For now, we'll create a simple SVG placeholder
      const svg = `
        <svg width="1100" height="320" xmlns="http://www.w3.org/2000/svg">
          <rect width="1100" height="320" fill="#e9ecef"/>
          <text x="550" y="160" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#6c757d">
            Imagem Principal (1100x320)
          </text>
          <text x="550" y="190" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="#6c757d">
            Faça upload de uma imagem no painel administrativo
          </text>
        </svg>
      `;

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.send(svg);
    }
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ message: 'Erro ao carregar imagem' });
  }
}