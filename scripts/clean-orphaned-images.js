#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { resolveSslConfig } from '../lib/infra/db.js';
import dotenv from 'dotenv';

const { Pool } = pg;

dotenv.config();

// Idade mínima: nunca mexer em arquivos com menos de 24h (janela upload → save).
const MIN_AGE_MS = 24 * 60 * 60 * 1000;

// Destino seguro: nada é apagado, apenas movido para a lixeira.
const TRASH_DIR = path.join(process.cwd(), 'data', 'uploads-trash');

const ORPHAN_PREFIXES = ['post-image-', 'hero-image-'];

// Colunas que referenciam imagens. `images.path` e `images.filename` existem
// em scripts/migrations/000-create-base-schema.js (linhas 54-55).
const REF_COLUMNS = [
  { table: 'posts', column: 'image_url' },
  { table: 'settings', column: 'value' },
  { table: 'products', column: 'image_url' },
  { table: 'videos', column: 'thumbnail' },
  { table: 'images', column: 'path' },
  { table: 'images', column: 'filename' },
];

// Pool criado sob demanda e encerrado ao final de cada execução: sem isso a
// função só funcionaria uma vez por processo (o `pool.end()` do finally matava
// o pool compartilhado do escopo de módulo).
let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: resolveSslConfig(),
    });
  }
  return pool;
}

export async function cleanOrphanedImages(options = {}) {
  const deleteFiles = options.deleteFiles === true;
  const mode = deleteFiles ? 'delete' : 'report';

  console.log(
    deleteFiles
      ? '🧹 Varredura de imagens órfãs nos diretórios de uploads (UPLOADS_DIR/<cwd>/uploads e o legado public/uploads) (modo delete, movendo para data/uploads-trash)...'
      : '🧹 Varredura de imagens órfãs nos diretórios de uploads (UPLOADS_DIR/<cwd>/uploads e o legado public/uploads) (modo relatório)...'
  );

  const result = {
    aborted: false,
    protectedCount: 0,
    consideredCount: 0,
    skippedNewCount: 0,
    movedCount: 0,
    mode,
  };

  try {
    // 1. Coletar nomes de arquivos que ESTÃO EM USO no banco de dados
    const usedFilenames = new Set();
    let dbFailed = false;

    console.log('🔍 Verificando arquivos em uso no banco de dados...');

    for (const { table, column } of REF_COLUMNS) {
      try {
        // Busca apenas se a coluna não for nula
        const { rows } = await getPool().query(
          `SELECT ${column} FROM ${table} WHERE ${column} IS NOT NULL`
        );

        rows.forEach((row) => {
          const val = row[column];
          if (val && typeof val === 'string') {
            // Extrai o nome do arquivo da URL/Path (ex: '/uploads/post-image-123.jpg' -> 'post-image-123.jpg')
            const filename = val.split('/').pop();
            if (filename) usedFilenames.add(filename);
          }
        });
        console.log(`   - Tabela '${table}.${column}': OK (${rows.length} registros)`);
      } catch (err) {
        if (err.code === '42703') {
          // Coluna não existe
          console.warn(
            `   ⚠️  Aviso: Coluna '${column}' não encontrada na tabela '${table}'. Verifique se o nome está correto.`
          );
        } else if (err.code === '42P01') {
          // Tabela não existe
          console.warn(`   ⚠️  Aviso: Tabela '${table}' não encontrada.`);
        } else {
          // Fail-closed: qualquer outro erro invalida o Set de protegidos.
          console.error(`   ❌ Erro ao consultar '${table}':`, err.message);
          dbFailed = true;
        }
      }
    }

    if (dbFailed) {
      console.error('❌ Falha na consulta ao banco — abortando sem modificar arquivos.');
      result.aborted = true;
      return result;
    }

    result.protectedCount = usedFilenames.size;
    console.log(`📊 Total de arquivos protegidos (em uso): ${usedFilenames.size}`);

    // 2. Listar arquivos nos diretórios de upload: o ativo (mesma resolução da
    // aplicação: `UPLOADS_DIR` ou `<cwd>/uploads`) e o legado `public/uploads`.
    // Diretórios inexistentes são ignorados silenciosamente.
    const uploadDirs = [
      path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads')),
      path.join(process.cwd(), 'public', 'uploads'),
    ].filter((dir, index, dirs) => dirs.indexOf(dir) === index);

    const existingDirs = uploadDirs.filter((dir) => fs.existsSync(dir));

    if (existingDirs.length === 0) {
      console.log(
        'ℹ️  Nenhum diretório de uploads encontrado (nem o ativo nem o legado public/uploads) — nada a varrer.'
      );
      return result;
    }

    // Entradas {dir, file} de todos os diretórios existentes (ativo primeiro).
    const entries = [];
    for (const dir of existingDirs) {
      for (const file of fs.readdirSync(dir)) {
        entries.push({ dir, file });
      }
    }

    let trashReady = false;
    // Um mesmo filename é considerado uma única vez mesmo existindo nos dois
    // diretórios: a lixeira é plana e o segundo rename sobrescreveria o primeiro.
    const seenFilenames = new Set();
    // Origem real de cada arquivo movido, para a instrução de restauração.
    const movedFiles = [];

    // 3. Verificar órfãos: relatório (default) ou movimentação para a lixeira
    for (const { dir: uploadsDir, file } of entries) {
      // Filtra apenas arquivos com os prefixos de produção (post-image-*, hero-image-*)
      if (!ORPHAN_PREFIXES.some((prefix) => file.startsWith(prefix))) {
        continue;
      }

      // Já considerado em outro diretório — não processa de novo.
      if (seenFilenames.has(file)) {
        continue;
      }
      seenFilenames.add(file);

      const filePath = path.join(uploadsDir, file);

      let stat;
      try {
        stat = fs.statSync(filePath);
      } catch (err) {
        console.warn(`⚠️ Não foi possível ler '${file}': ${err.message}`);
        continue;
      }

      if (stat.isDirectory()) {
        continue;
      }

      // Arquivo referenciado no banco: nunca é candidato
      if (usedFilenames.has(file)) {
        continue;
      }

      const ageMs = Date.now() - stat.mtimeMs;
      if (ageMs < MIN_AGE_MS) {
        console.log(`⏳ Ignorado (menos de 24h): ${file}`);
        result.skippedNewCount++;
        continue;
      }

      const ageHours = Math.floor(ageMs / (60 * 60 * 1000));

      if (!deleteFiles) {
        // Modo relatório: informa, mas NUNCA escreve em disco.
        console.log(`[relatório] seria movido: ${file} (idade ${ageHours}h)`);
        result.consideredCount++;
        continue;
      }

      try {
        if (!trashReady) {
          fs.mkdirSync(TRASH_DIR, { recursive: true });
          trashReady = true;
        }
        fs.renameSync(filePath, path.join(TRASH_DIR, file));
        movedFiles.push({ file, sourceDir: uploadsDir });
        console.log(`🗑️  Movido para lixeira: ${file} (origem: ${uploadsDir})`);
        result.movedCount++;
      } catch (err) {
        console.warn(`⚠️ Não foi possível mover '${file}': ${err.message}`);
      }
    }

    if (deleteFiles) {
      if (result.movedCount > 0) {
        console.log(
          `✅ Concluído: ${result.movedCount} movido(s) para data/uploads-trash (restaurar: mover de volta para o diretório de origem de cada arquivo):`
        );
        for (const { file, sourceDir } of movedFiles) {
          console.log(`   - ${file} ← ${sourceDir}`);
        }
      } else {
        console.log('✨ Nenhuma imagem órfã encontrada.');
      }
    } else if (result.consideredCount > 0) {
      console.log(
        `ℹ️  Modo relatório: ${result.consideredCount} arquivo(s) seriam movidos para data/uploads-trash. Execute \`npm run clean:images -- --delete\` para executar.`
      );
    } else {
      console.log('✨ Nenhuma imagem órfã encontrada.');
    }

    return result;
  } catch (error) {
    console.error('❌ Erro fatal ao limpar imagens:', error.message);
    result.aborted = true;
    return result;
  } finally {
    try {
      if (pool) await pool.end();
    } catch (e) {
      console.warn(`⚠️ Erro ao encerrar pool: ${e.message}`);
    } finally {
      pool = null;
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith('clean-orphaned-images.js')) {
  const argv = process.argv.slice(2);
  // default é relatório; --delete executa a movimentação (--dry-run é o alias natural do default)
  const deleteFiles = argv.includes('--delete');

  (async () => {
    try {
      await cleanOrphanedImages({ deleteFiles });
      process.exitCode = 0;
    } catch (error) {
      console.error('❌ Erro fatal ao limpar imagens:', error.message);
      process.exitCode = 1;
    }
  })();
}
