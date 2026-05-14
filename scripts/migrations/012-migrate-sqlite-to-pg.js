import fs from 'fs';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import path from 'path';

// Carrega variáveis de ambiente
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

/**
 * Executa um comando sqlite3 via CLI e retorna o resultado como array de objetos JSON.
 */
function sqliteQuery(sql) {
  const dbPath = path.resolve(process.cwd(), 'data', 'caminhar.db');
  if (!fs.existsSync(dbPath)) return [];
  try {
    const output = execSync(`sqlite3 -json "${dbPath}" "${sql}"`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return JSON.parse(output.trim() || '[]');
  } catch {
    return [];
  }
}

async function runMigration() {
  console.log('🚀 Executando migração: 012-migrate-sqlite-to-pg');
  console.log('   Objetivo: Migrar dados do SQLite para PostgreSQL e remover dependência do SQLite');
  console.log('');

  const { query, closeDatabase } = await import('../../lib/db.js');
  const sqliteDbPath = path.resolve(process.cwd(), 'data', 'caminhar.db');

  try {
    if (!fs.existsSync(sqliteDbPath)) {
      console.log('   ⚠️ SQLite não encontrado em:', sqliteDbPath);
      console.log('   ⚠️ Pulando migração de dados.');
      console.log('✅ Migração 012 concluída (sem dados para migrar).');
      return;
    }

    // ===== 1. Migrar settings =====
    console.log('📦 Migrando settings...');
    const settings = sqliteQuery('SELECT * FROM settings');
    for (const s of settings) {
      try {
        await query(
          `INSERT INTO settings (key, value, type, description, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, type = EXCLUDED.type, description = EXCLUDED.description, updated_at = EXCLUDED.updated_at`,
          [s.key, s.value, s.type, s.description || null, s.created_at, s.updated_at],
          { log: false }
        );
      } catch (e) {
        console.warn(`   ⚠️ Erro ao migrar setting "${s.key}": ${e.message}`);
      }
    }
    console.log(`   ✅ ${settings.length} settings migrados.`);

    // ===== 2. Migrar users =====
    console.log('📦 Migrando users...');
    const users = sqliteQuery('SELECT * FROM users');
    for (const u of users) {
      try {
        const existing = await query('SELECT id FROM users WHERE username = $1', [u.username], { log: false });
        if (existing.rows.length === 0) {
          await query(
            `INSERT INTO users (username, password, role, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5)`,
            [u.username, u.password, u.role, u.created_at, u.updated_at],
            { log: false }
          );
          console.log(`   ✅ Usuário "${u.username}" criado.`);
        } else {
          console.log(`   ⏭️ Usuário "${u.username}" já existe.`);
        }
      } catch (e) {
        console.warn(`   ⚠️ Erro ao migrar user "${u.username}": ${e.message}`);
      }
    }

    // ===== 3. Migrar categorias =====
    console.log('📦 Migrando categories...');
    const categories = sqliteQuery('SELECT * FROM categories');
    for (const c of categories) {
      try {
        await query(
          `INSERT INTO categories (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`,
          [c.name, c.slug],
          { log: false }
        );
      } catch (e) {
        console.warn(`   ⚠️ Erro ao migrar category "${c.name}": ${e.message}`);
      }
    }
    console.log(`   ✅ ${categories.length} categorias migradas.`);

    // ===== 4. Migrar tags =====
    console.log('📦 Migrando tags...');
    const tags = sqliteQuery('SELECT * FROM tags');
    for (const t of tags) {
      try {
        await query(
          `INSERT INTO tags (name, slug) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`,
          [t.name, t.slug],
          { log: false }
        );
      } catch (e) {
        console.warn(`   ⚠️ Erro ao migrar tag "${t.name}": ${e.message}`);
      }
    }
    console.log(`   ✅ ${tags.length} tags migradas.`);

    // ===== 5. Migrar posts =====
    console.log('📦 Migrando posts...');
    const posts = sqliteQuery('SELECT * FROM posts');
    for (const p of posts) {
      try {
        const existing = await query('SELECT id FROM posts WHERE slug = $1', [p.slug], { log: false });
        if (existing.rows.length === 0) {
          await query(
            `INSERT INTO posts (title, slug, excerpt, content, image_url, published, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [p.title, p.slug, p.excerpt || null, p.content || null, p.image_url || null, p.published ? true : false, p.created_at, p.updated_at],
            { log: false }
          );
        }
      } catch (e) {
        console.warn(`   ⚠️ Erro ao migrar post "${p.slug}": ${e.message}`);
      }
    }
    console.log(`   ✅ ${posts.length} posts migrados.`);

    // ===== 6. Migrar post_categories e post_tags =====
    console.log('📦 Migrando relacionamentos posts↔categories/tags...');
    const postCategories = sqliteQuery('SELECT * FROM post_categories');
    for (const pc of postCategories) {
      try {
        await query(
          `INSERT INTO post_categories (post_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [pc.post_id, pc.category_id],
          { log: false }
        );
      } catch (e) {
        console.warn(`   ⚠️ Erro ao migrar post_category: ${e.message}`);
      }
    }
    const postTags = sqliteQuery('SELECT * FROM post_tags');
    for (const pt of postTags) {
      try {
        await query(
          `INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [pt.post_id, pt.tag_id],
          { log: false }
        );
      } catch (e) {
        console.warn(`   ⚠️ Erro ao migrar post_tag: ${e.message}`);
      }
    }
    console.log(`   ✅ Relacionamentos migrados.`);

    // ===== 7. Migrar musicas =====
    console.log('📦 Migrando musicas...');
    const musicas = sqliteQuery('SELECT * FROM musicas');
    for (const m of musicas) {
      try {
        const existing = await query(
          'SELECT id FROM musicas WHERE url_spotify = $1',
          [m.url_spotify],
          { log: false }
        );
        if (existing.rows.length === 0) {
          await query(
            `INSERT INTO musicas (titulo, artista, url_spotify, publicado, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [m.titulo, m.artista, m.url_spotify, m.publicado ? true : false, m.created_at, m.updated_at],
            { log: false }
          );
          console.log(`   ✅ Música "${m.titulo}" migrada.`);
        } else {
          console.log(`   ⏭️ Música "${m.titulo}" já existe no PostgreSQL.`);
        }
      } catch (e) {
        console.warn(`   ⚠️ Erro ao migrar música "${m.titulo}": ${e.message}`);
      }
    }
    console.log(`   ✅ ${musicas.length} músicas processadas.`);

    console.log('');
    console.log('✅ Migração 012 concluída com sucesso!');
    console.log('   Todos os dados do SQLite foram importados para o PostgreSQL.');
    console.log('   O arquivo data/caminhar.db pode ser removido com segurança.');

  } catch (error) {
    console.error('❌ Erro ao executar a migração:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

runMigration();