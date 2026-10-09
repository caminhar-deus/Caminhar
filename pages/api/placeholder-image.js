import { promises as fs } from 'fs';
import path from 'path';
import { getSetting } from '../../lib/domain/settings.js';
import { logger } from '../../lib/infra/logger.js';
import { uploadRoots } from '../../lib/infra/storage.js';

// Cache em memória do filename da imagem hero, evitando consultar o banco a cada
// request. TTL curto e compatível com a invalidação de settings existente (que não
// alcança este cache local); após o TTL, a resolução é refeita do zero.
const HERO_FILENAME_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
let cachedHeroFilename = null;
let cachedHeroFilenameExpiresAt = 0;

export default async function handler(req, res) {
  try {
    // Diretórios de upload: o ativo vive FORA de `public/` (snapshot do
    // `next start` — ver pages/api/upload-image.js) e `public/uploads` segue
    // como fallback de dados legados. A ordem importa: novo primeiro.
    // A resolução e a ordem vivem em `lib/infra/storage.js`.
    const uploadDirs = uploadRoots();
    let filename = (cachedHeroFilename && Date.now() < cachedHeroFilenameExpiresAt)
      ? cachedHeroFilename
      : null;

    // 1. Tenta buscar a imagem definida nas configurações do banco de dados
    if (!filename) {
      try {
        // Tenta buscar a configuração da imagem principal
        const dbImage = await getSetting('home_image_url');
        
        if (dbImage && typeof dbImage === 'string') {
          // dbImage geralmente é '/uploads/post-image-123.png', pegamos só o nome do arquivo
          filename = path.basename(dbImage);
        }
      } catch (dbError) {
        logger.warn('Placeholder', 'Não foi possível ler a configuração do banco:', dbError.message);
      }

      // 2. Fallback: Se não achou no banco, procura o arquivo mais recente na pasta
      if (!filename) {
        for (const dir of uploadDirs) {
          let files = [];
          try {
            files = (await fs.readdir(dir)) || [];
          } catch {
            files = [];
          }

          // Procura por arquivos com prefixo antigo (hero-) ou novo (post-)
          const imageFiles = files.filter(file =>
            file.startsWith('hero-image-')
          );

          // Pega o último (mais recente pelo nome/timestamp). O primeiro
          // diretório com candidato vence (o ativo vem antes do legado).
          if (imageFiles.length > 0) {
            filename = imageFiles.sort().pop();
            break;
          }
        }
      }

      if (filename) {
        cachedHeroFilename = filename;
        cachedHeroFilenameExpiresAt = Date.now() + HERO_FILENAME_CACHE_TTL_MS;
      }
    }

    // Localiza o arquivo em qual dos diretórios ele existe (novo, depois legado)
    let imagePath = null;
    let stats = null;
    if (filename) {
      for (const dir of uploadDirs) {
        const candidate = path.join(dir, path.basename(filename));
        try {
          // `fs` aqui é `fs.promises` (import nomeado) — não `fs.promises.stat`
          stats = await fs.stat(candidate);
          imagePath = candidate;
          break;
        } catch {
          // Não está neste diretório — tenta o próximo
        }
      }
    }

    if (imagePath) {
      // Serve the uploaded image with aggressive caching

      // Detecta tipo básico pela extensão ou assume jpeg
      const ext = path.extname(imagePath).toLowerCase();
      const contentType = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg');

      // Last-Modified estável baseado no mtime do arquivo (permite revalidação 304)
      // (`stats` já veio do stat acima — um segundo stat aqui quebraria o fluxo)

      // Set aggressive caching headers for better performance
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.setHeader('ETag', `"${filename}"`);
      res.setHeader('Last-Modified', stats.mtime.toUTCString());

      // Revalidação: se o navegador já possui a versão atual, responde 304 sem reler o arquivo
      if (req.headers['if-none-match'] === `"${filename}"`) {
        return res.status(304).end();
      }

      // `turbopackIgnore`: o caminho é montado a partir do filename guardado no
      // banco e da raiz de uploads, então é dinâmico e não é resolvível em build
      // time. A marcação declara que o acesso é intencional. Ver
      // `lib/infra/storage.js` para o contexto.
      const imageBuffer = await fs.readFile(/*turbopackIgnore: true*/ imagePath);
      res.send(imageBuffer);
    } else {
      // Serve a default placeholder image
      // For now, we'll create a simple SVG placeholder
      const svg = `
        <svg width="1100" height="320" xmlns="http://www.w3.org/2000/svg">
          <rect width="1100" height="320" fill="#e5e5e5"/>
          <text x="550" y="160" font-family="Arial, sans-serif" font-size="24" text-anchor="middle" fill="#525252">
            Imagem Principal (1100x320)
          </text>
          <text x="550" y="190" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="#525252">
            Faça upload de uma imagem no painel administrativo
          </text>
        </svg>
      `;

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.send(svg);
    }
  } catch (error) {
    logger.error('Placeholder', 'Erro ao servir imagem:', error);
    res.status(500).json({ message: 'Erro ao carregar imagem' });
  }
}