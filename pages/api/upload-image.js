import { promises as fs } from 'fs';
import path from 'path';
import { withAuth } from '../../lib/auth';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    // For this simple implementation, we'll just save the file
    // In a real application, you'd want to use a proper file upload library
    // like multer or next-connect with multer

    const data = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => {
        data += chunk;
      });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });

    // Simple file handling - in production, use proper multipart form handling
    const boundary = req.headers['content-type'].split('boundary=')[1];
    const parts = data.split(`--${boundary}`);
    const filePart = parts.find(part => part.includes('filename='));

    if (filePart) {
      const fileContent = filePart.split('\r\n\r\n')[1];
      const filename = `hero-image-${Date.now()}.jpg`;
      const filePath = path.join(uploadDir, filename);

      await fs.writeFile(filePath, fileContent, 'binary');

      return res.status(200).json({
        message: 'Imagem atualizada com sucesso!',
        filename: filename
      });
    }

    return res.status(400).json({ message: 'Nenhum arquivo enviado' });

  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({ message: 'Erro ao fazer upload da imagem' });
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};
