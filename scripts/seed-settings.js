#!/usr/bin/env node

/**
 * Script para inicializar configurações padrão do sistema.
 * Cria as configurações necessárias que os testes esperam encontrar.
 *
 * Uso: node scripts/seed-settings.js
 */

import { loadEnv } from './utils/load-env.js';
import { query } from './db/connection.js';

loadEnv();

const DEFAULT_SETTINGS = [
  { key: 'site_name', value: 'Caminhar', type: 'string', description: 'Nome do site' },
  { key: 'site_description', value: 'Compartilhando mensagens de fé e esperança', type: 'string', description: 'Descrição do site' },
  { key: 'posts_per_page', value: '10', type: 'number', description: 'Quantidade de posts por página' },
  { key: 'videos_per_page', value: '10', type: 'number', description: 'Quantidade de vídeos por página' },
  { key: 'musicas_per_page', value: '10', type: 'number', description: 'Quantidade de músicas por página' },
];

async function seedSettings() {
  console.log('📦 Inicializando configurações padrão...\n');

  for (const setting of DEFAULT_SETTINGS) {
    try {
      // Verifica se a configuração já existe
      const existing = await query(
        'SELECT id FROM settings WHERE key = $1',
        [setting.key]
      );

      if (existing.rows.length === 0) {
        await query(
          `INSERT INTO settings (key, value, type, description, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())`,
          [setting.key, setting.value, setting.type, setting.description]
        );
        console.log(`  ✅ Criada: ${setting.key} = ${setting.value}`);
      } else {
        console.log(`  ⏭️  Já existe: ${setting.key}`);
      }
    } catch (error) {
      console.error(`  ❌ Erro ao criar ${setting.key}:`, error.message);
    }
  }

  console.log('\n✅ Seed de configurações concluído!');
  process.exit(0);
}

seedSettings().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});