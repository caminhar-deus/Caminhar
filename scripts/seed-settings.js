#!/usr/bin/env node

/**
 * Script para inicializar configurações padrão do sistema.
 * Cria as configurações necessárias que os testes esperam encontrar.
 *
 * Uso: node scripts/seed-settings.js
 */

import { loadEnv } from './utils/load-env.js';
import { query, closePool } from './db/connection.js';

loadEnv();

const DEFAULT_SETTINGS = [
  { key: 'site_name', value: 'Caminhar', type: 'string', description: 'Nome do site' },
  { key: 'site_description', value: 'Compartilhando mensagens de fé e esperança', type: 'string', description: 'Descrição do site' },
  { key: 'posts_per_page', value: '10', type: 'number', description: 'Quantidade de posts por página' },
  { key: 'videos_per_page', value: '10', type: 'number', description: 'Quantidade de vídeos por página' },
  { key: 'musicas_per_page', value: '10', type: 'number', description: 'Quantidade de músicas por página' },
];

export default async function seedSettings() {
  console.log('📦 Inicializando configurações padrão...\n');

  // Erros por item são acumulados em vez de engolidos: o seed é idempotente,
  // então as chaves que derem certo ficam populadas mesmo com falha em outras,
  // mas o chamador precisa receber um erro — senão `seed-all.js` reporta
  // sucesso e a falha só aparece depois, nos testes de carga.
  const falhas = [];

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
      falhas.push({ key: setting.key, erro: error.message });
    }
  }

  if (falhas.length > 0) {
    throw new Error(
      `Falha ao criar ${falhas.length} de ${DEFAULT_SETTINGS.length} configurações: ` +
      falhas.map((f) => `${f.key} (${f.erro})`).join('; ')
    );
  }

  console.log('\n✅ Seed de configurações concluído!');
}

// Uso como CLI: só neste caminho fechamos o pool e sinalizamos exit code.
// O corpo vai dentro de uma IIFE assíncrona porque o Babel compila o script
// como CommonJS e não há suporte a top-level `await` nessa transformação — sem
// isso o módulo não pode ser importado por testes (mesmo padrão de
// `clear-db.js`).
if (process.argv[1] && process.argv[1].endsWith('seed-settings.js')) {
  (async () => {
    try {
      await seedSettings();
    } catch (error) {
      console.error('❌ Erro fatal:', error);
      process.exitCode = 1;
    } finally {
      await closePool();
    }
  })();
}