import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Configuração para carregar .env corretamente em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function restorePosts() {
  console.log('📦 Iniciando restauração de posts...');

  try {
    const backupDir = path.resolve(__dirname, '../data/backups');
    
    if (!fs.existsSync(backupDir)) {
      console.log('❌ Diretório de backups não encontrado.');
      return;
    }

    // Encontra o arquivo de backup mais recente
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('posts-backup-') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.log('❌ Nenhum arquivo de backup de posts encontrado.');
      return;
    }

    const latestBackup = files[0];
    const filePath = path.join(backupDir, latestBackup);
    console.log(`📄 Lendo backup: ${latestBackup}`);

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const posts = JSON.parse(fileContent);

    console.log(`📊 Encontrados ${posts.length} posts para restaurar.`);

    let restoredCount = 0;

    for (const post of posts) {
      // Usa UPSERT para evitar erros se o ID já existir (atualiza os dados)
      const query = `
        INSERT INTO posts (id, title, slug, excerpt, content, image_url, published, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          slug = EXCLUDED.slug,
          excerpt = EXCLUDED.excerpt,
          content = EXCLUDED.content,
          image_url = EXCLUDED.image_url,
          published = EXCLUDED.published,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at
      `;

      const values = [
        post.id,
        post.title,
        post.slug,
        post.excerpt,
        post.content,
        post.image_url,
        post.published,
        post.created_at,
        post.updated_at
      ];

      await pool.query(query, values);
      restoredCount++;
    }

    console.log(`✅ Restauração concluída! ${restoredCount} posts processados.`);

  } catch (error) {
    console.error('❌ Erro ao restaurar backup:', error);
  } finally {
    await pool.end();
  }
}

restorePosts();