#!/usr/bin/env node

const MIGRATION_NAME = '017-add-thumbnail-to-videos';

export async function up(client) {
  console.log(`   ↳ ${MIGRATION_NAME}: Adicionando coluna "thumbnail" à tabela "videos"...`);
  await client.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(255)');
  console.log(`   ✅ ${MIGRATION_NAME} concluída.`);
}

export async function down(client) {
  console.log(`   ↳ ${MIGRATION_NAME}: Removendo coluna "thumbnail" da tabela "videos"...`);
  await client.query('ALTER TABLE videos DROP COLUMN IF EXISTS thumbnail');
  console.log(`   ✅ ${MIGRATION_NAME} (down) concluída.`);
}
