import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Configuração para carregar .env corretamente em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

// Carrega .env.local com prioridade, fallback para .env
if (fs.existsSync(path.resolve(__dirname, '../../.env.local'))) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
} else {
  dotenv.config({ path: envPath });
}

// --- Parsing de argumentos da CLI ---
const args = process.argv.slice(2);
const FLAGS = {
  force: args.includes('--force'),
  schemaOnly: args.includes('--schema-only'),
  dryRun: args.includes('--dry-run'),
  batchSize: 50, // default
};

// Extrai --batch-size=N
const batchArg = args.find(a => a.startsWith('--batch-size='));
if (batchArg) {
  const parsed = parseInt(batchArg.split('=')[1], 10);
  if (!isNaN(parsed) && parsed > 0) {
    FLAGS.batchSize = parsed;
  }
}

// --- Core ---

async function ensureThumbnailColumn(pool) {
  console.log('🔧 Verificando coluna "thumbnail" na tabela videos...');

  if (FLAGS.dryRun) {
    console.log('   [DRY-RUN] ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(255)');
    return;
  }

  await pool.query('ALTER TABLE videos ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(255)');
  console.log('✅ Coluna "thumbnail" verificada/adicionada com sucesso.');
}

async function populateThumbnails(pool) {
  const filter = FLAGS.force ? '1=1' : 'thumbnail IS NULL';
  const query = `SELECT id, titulo, url_youtube FROM videos WHERE ${filter}`;

  console.log(`🖼️  Buscando vídeos${FLAGS.force ? ' (todos, incluindo já populados)' : ' (apenas sem thumbnail)'}...`);

  if (FLAGS.dryRun) {
    console.log(`   [DRY-RUN] Query: ${query}`);
    console.log('   [DRY-RUN] Nenhuma alteração será feita.');
    return { updatedCount: 0, skippedCount: 0, totalCount: 0 };
  }

  const { rows: videos } = await pool.query(query);

  if (videos.length === 0) {
    console.log('✅ Nenhum vídeo para processar.');
    return { updatedCount: 0, skippedCount: 0, totalCount: 0 };
  }

  console.log(`📊 Encontrados ${videos.length} vídeos para processar.`);

  let updatedCount = 0;
  let skippedCount = 0;
  const totalCount = videos.length;

  // Processa em lotes
  for (let i = 0; i < videos.length; i += FLAGS.batchSize) {
    const batch = videos.slice(i, i + FLAGS.batchSize);
    console.log(`\n📦 Lote ${Math.floor(i / FLAGS.batchSize) + 1}/${Math.ceil(videos.length / FLAGS.batchSize)} (${batch.length} vídeos)`);

    for (const video of batch) {
      if (!video.url_youtube) {
        console.log(`   ⚠️  [${video.id}] Sem URL do YouTube: ${video.titulo}`);
        skippedCount++;
        continue;
      }

      // Extrair ID do YouTube (suporta formatos variados de URL)
      const videoIdMatch = video.url_youtube.match(
        /(?:youtube\.com\/embed\/|youtu\.be\/|youtube\.com\/watch\?v=)([^&?\s]+)/
      );
      const videoId = videoIdMatch ? videoIdMatch[1] : null;

      if (videoId) {
        const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        await pool.query('UPDATE videos SET thumbnail = $1 WHERE id = $2', [thumbnailUrl, video.id]);
        console.log(`   ✅ [${video.id}] Thumbnail salva: ${thumbnailUrl}`);
        updatedCount++;
      } else {
        console.log(`   ⚠️  [${video.id}] Não foi possível extrair ID do YouTube: ${video.url_youtube}`);
        skippedCount++;
      }
    }
  }

  return { updatedCount, skippedCount, totalCount };
}

async function showHelp() {
  console.log(`
🎬 Script Unificado de Thumbnails de Vídeos
=============================================
Uso: node scripts/maintenance/video-thumbnails.js [opções]

Opções:
  --schema-only     Apenas adiciona/verifica a coluna thumbnail, sem popular dados
  --force           Sobrescreve thumbnails existentes (não apenas vídeos sem thumbnail)
  --batch-size=N    Define o tamanho do lote (default: 50)
  --dry-run         Simula a execução sem alterar o banco de dados
  --help            Exibe esta mensagem de ajuda

Exemplos:
  node scripts/maintenance/video-thumbnails.js
  node scripts/maintenance/video-thumbnails.js --force
  node scripts/maintenance/video-thumbnails.js --schema-only
  node scripts/maintenance/video-thumbnails.js --dry-run
  node scripts/maintenance/video-thumbnails.js --batch-size=100
  `);
}

async function main() {
  if (args.includes('--help')) {
    showHelp();
    process.exit(0);
  }

  console.log('🎬 Iniciando script unificado de thumbnails de vídeos...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // 1. Garantir que a coluna existe
    if (!FLAGS.dryRun) {
      await ensureThumbnailColumn(pool);
    } else {
      console.log('   [DRY-RUN] Etapa de verificação de coluna será simulada.');
    }

    // 2. Popular thumbnails (a menos que --schema-only)
    if (!FLAGS.schemaOnly) {
      console.log('');
      const result = await populateThumbnails(pool);

      if (!FLAGS.dryRun) {
        console.log(`\n✨ Concluído! ${result.updatedCount} vídeos atualizados, ${result.skippedCount} ignorados (total: ${result.totalCount}).`);
      } else {
        console.log('\n✨ [DRY-RUN] Simulação concluída. Nenhuma alteração foi feita no banco.');
      }
    } else {
      console.log('\n⏭️  Modo --schema-only ativado. População de dados foi pulada.');
    }
  } catch (error) {
    console.error('❌ Erro durante a execução:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();