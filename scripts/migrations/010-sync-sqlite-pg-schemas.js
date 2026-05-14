import fs from 'fs';
import dotenv from 'dotenv';

// Carrega variáveis de ambiente, priorizando .env.local
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
}
dotenv.config();

async function runMigration() {
  console.log('🚀 Executando migração: 010-sync-sqlite-pg-schemas');
  console.log('   Objetivo: Sincronizar schema PostgreSQL com SQLite');
  console.log('   - Adicionar tabelas faltantes: settings, categories, tags, post_categories, post_tags, musicas');
  console.log('   - Padronizar campo uploaded_by → user_id na tabela images');
  console.log('');

  const { query, closeDatabase } = await import('../../lib/db.js');

  try {
    // ===== 1. Tabela: settings =====
    console.log('📦 Criando tabela "settings"...');
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ Tabela "settings" criada/verificada.');

    // ===== 2. Tabela: categories =====
    console.log('📦 Criando tabela "categories"...');
    await query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE
      );
    `);
    console.log('   ✅ Tabela "categories" criada/verificada.');

    // ===== 3. Tabela: tags =====
    console.log('📦 Criando tabela "tags"...');
    await query(`
      CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE
      );
    `);
    console.log('   ✅ Tabela "tags" criada/verificada.');

    // ===== 4. Tabela: post_categories (N:N) =====
    console.log('📦 Criando tabela "post_categories"...');
    await query(`
      CREATE TABLE IF NOT EXISTS post_categories (
        post_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (post_id, category_id)
      );
    `);
    console.log('   ✅ Tabela "post_categories" criada/verificada.');

    // ===== 5. Tabela: post_tags (N:N) =====
    console.log('📦 Criando tabela "post_tags"...');
    await query(`
      CREATE TABLE IF NOT EXISTS post_tags (
        post_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (post_id, tag_id)
      );
    `);
    console.log('   ✅ Tabela "post_tags" criada/verificada.');

    // ===== 6. Tabela: musicas =====
    console.log('📦 Criando tabela "musicas"...');
    await query(`
      CREATE TABLE IF NOT EXISTS musicas (
        id SERIAL PRIMARY KEY,
        titulo VARCHAR(255) NOT NULL,
        artista VARCHAR(255),
        url_spotify VARCHAR(255) NOT NULL,
        descricao TEXT,
        publicado BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('   ✅ Tabela "musicas" criada/verificada.');

    // ===== 7. Atualizar images: adicionar coluna user_id se não existir =====
    console.log('📦 Verificando campo "user_id" na tabela "images"...');
    // Verifica se a coluna user_id já existe
    const columnCheck = await query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'images' AND column_name = 'user_id'`,
      [],
      { log: false }
    );

    if (columnCheck.rows.length === 0) {
      // Verifica se existe uploaded_by
      const uploadedByCheck = await query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'images' AND column_name = 'uploaded_by'`,
        [],
        { log: false }
      );

      if (uploadedByCheck.rows.length > 0) {
        // Migra dados de uploaded_by para user_id
        console.log('   🔄 Migrando dados de "uploaded_by" para "user_id"...');
        
        // Adiciona user_id primeiro
        await query(`ALTER TABLE images ADD COLUMN user_id INTEGER REFERENCES users(id)`);
        
        // Copia dados
        await query(`UPDATE images SET user_id = uploaded_by WHERE uploaded_by IS NOT NULL`);
        
        // Remove coluna antiga
        await query(`ALTER TABLE images DROP COLUMN uploaded_by`);
        
        console.log('   ✅ Campo "uploaded_by" renomeado para "user_id" com sucesso.');
      } else {
        console.log('   ⚠️ Nenhuma das colunas encontrada. Adicionando "user_id"...');
        await query(`ALTER TABLE images ADD COLUMN user_id INTEGER REFERENCES users(id)`);
      }
    } else {
      console.log('   ✅ Campo "user_id" já existe.');
    }

    console.log('');
    console.log('✅ Migração 010 concluída com sucesso!');
    console.log('   Todas as tabelas do SQLite agora têm correspondência no PostgreSQL.');
    console.log('   Campo padronizado: images.user_id (antes: uploaded_by)');

  } catch (error) {
    console.error('❌ Erro ao executar a migração:', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

runMigration();