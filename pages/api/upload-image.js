import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';
import { updateSetting } from '../../lib/db';
import { withAuth } from '../../lib/auth';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = new IncomingForm({
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
      return res.status(400).json({ message: 'No image uploaded' });
    }

    // Get relative path for public access
    const fileName = path.basename(imageFile.filepath);
    const publicPath = `/uploads/${fileName}`;

    // Check upload type to decide if we should update settings
    const uploadType = Array.isArray(fields.uploadType) ? fields.uploadType[0] : fields.uploadType;

    if (uploadType === 'site_image') {
      // Update setting in database only for site header
      await updateSetting('site_image', publicPath, 'image', 'Main site image');
    }

    return res.status(200).json({ success: true, path: publicPath });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ message: 'Error uploading image' });
  }
}

export default withAuth(handler);