import { promises as fs } from 'fs';
import path from 'path';
import { withAuth } from '../../lib/auth';
import { saveImage } from '../../lib/db';
import { IncomingForm } from 'formidable';

export default withAuth(async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    // Use formidable for secure file upload handling
    const form = new IncomingForm({
      uploadDir: uploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB max file size
      filter: ({ name, originalFilename, mimetype }) => {
        // Only allow image files
        const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        return validMimeTypes.includes(mimetype);
      }
    });

    // Parse the form data
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parsing error:', err);
          return reject(new Error('Erro ao processar o upload da imagem'));
        }
        resolve([fields, files]);
      });
    });

    // Check if we have the image file
    const imageFile = files.image?.[0];
    if (!imageFile) {
      return res.status(400).json({ message: 'Nenhum arquivo de imagem enviado' });
    }

    // Validação de segurança para o mimetype, mesmo que o formidable já filtre.
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validMimeTypes.includes(imageFile.mimetype)) {
      // Remove o arquivo inválido que foi salvo temporariamente pelo formidable
      await fs.unlink(imageFile.filepath);
      return res.status(400).json({ message: 'Tipo de arquivo inválido. Apenas imagens são permitidas.' });
    }

    // Validação de tamanho do arquivo (5MB)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (imageFile.size > MAX_FILE_SIZE) {
      await fs.unlink(imageFile.filepath);
      return res.status(400).json({ message: 'Arquivo muito grande. O tamanho máximo permitido é 5MB.' });
    }

    // Determine image type and prefix
    const type = fields.type?.[0] || 'hero';
    const prefix = type === 'post' ? 'post-image-' : 'hero-image-';

    // Generate a unique filename
    const timestamp = Date.now();
    const ext = path.extname(imageFile.originalFilename) || '.jpg';
    const filename = `${prefix}${timestamp}${ext}`;
    const filePath = path.join(uploadDir, filename);

    // Rename the file to our desired filename
    await fs.rename(imageFile.filepath, filePath);

    // Save image info to database with relative path
    const fileSize = imageFile.size;
    const userId = req.user?.userId || null;
    const relativePath = `/uploads/${filename}`;

    await saveImage(filename, relativePath, type, fileSize, userId);

    return res.status(200).json({
      message: 'Imagem atualizada com sucesso!',
      filename: filename,
      path: relativePath,
      note: 'A imagem será automaticamente redimensionada para se ajustar ao container (1100x320) mantendo a proporção'
    });

  } catch (error) {
    console.error('Error uploading image:', error);
    return res.status(500).json({ message: 'Erro ao fazer upload da imagem' });
  }
});

export const config = {
  api: {
    bodyParser: false
  }
};
