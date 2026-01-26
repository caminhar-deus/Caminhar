import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    // Check if there's a custom image uploaded
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const files = await fs.readdir(uploadDir).catch(() => []);

    // Find the latest image file
    const imageFiles = files.filter(file => file.startsWith('hero-image-'));
    const latestImage = imageFiles.sort().pop();

    if (latestImage) {
      // Serve the uploaded image
      const imagePath = path.join(uploadDir, latestImage);
      const imageBuffer = await fs.readFile(imagePath);

      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=3600');
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
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(svg);
    }
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ message: 'Erro ao carregar imagem' });
  }
}