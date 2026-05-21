#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function cleanOrphanedImages() {
  console.log('🧹 Iniciando limpeza de imagens de teste órfãs...');
  
  try {
    // 1. Coletar nomes de arquivos que ESTÃO EM USO no banco de dados
    const usedFilenames = new Set();
    
    // ⚠️ IMPORTANTE: O script tenta adivinhar os nomes das colunas (imagem/thumbnail).
    // Se o seu banco usar nomes diferentes, ajuste abaixo.
    const tablesToCheck = [
      { table: 'posts', column: 'image_url' },  // Corrigido para 'image_url' conforme esquema
      { table: 'settings', column: 'value' }, // Protege imagens salvas nas configurações
    ];

    console.log('🔍 Verificando arquivos em uso no banco de dados...');

    for (const { table, column } of tablesToCheck) {
      try {
        // Busca apenas se a coluna não for nula
        const { rows } = await pool.query(`SELECT ${column} FROM ${table} WHERE ${column} IS NOT NULL`);
        
        rows.forEach(row => {
          const val = row[column];
          if (val && typeof val === 'string') {
            // Extrai o nome do arquivo da URL/Path (ex: '/uploads/post-image-123.jpg' -> 'post-image-123.jpg')
            const filename = val.split('/').pop();
            if (filename) usedFilenames.add(filename);
          }
        });
        console.log(`   - Tabela '${table}.${column}': OK (${rows.length} registros)`);
      } catch (err) {
        if (err.code === '42703') { // Coluna não existe
           console.warn(`   ⚠️  Aviso: Coluna '${column}' não encontrada na tabela '${table}'. Verifique se o nome está correto.`);
        } else if (err.code === '42P01') { // Tabela não existe
           console.warn(`   ⚠️  Aviso: Tabela '${table}' não encontrada.`);
        } else {
           console.error(`   ❌ Erro ao consultar '${table}':`, err.message);
        }
      }
    }

    console.log(`📊 Total de arquivos protegidos (em uso): ${usedFilenames.size}`);

    // 2. Listar arquivos na pasta uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Diretório public/uploads não encontrado.');
      return;
    }

    const files = fs.readdirSync(uploadsDir);
    let deletedCount = 0;

    // 3. Verificar e deletar órfãos
    for (const file of files) {
      // Filtra apenas arquivos que seguem o padrão dos testes (post-image-*, hero-image-*)
      if (!file.startsWith('post-image-') && !file.startsWith('hero-image-')) {
        continue;
      }

      // Se o arquivo NÃO estiver no Set de usados, é órfão e pode ser deletado
      if (!usedFilenames.has(file)) {
        const filePath = path.join(uploadsDir, file);
        fs.unlinkSync(filePath);
        console.log(`🗑️  Deletado: ${file}`);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      console.log(`✅ Limpeza concluída! ${deletedCount} arquivos de teste órfãos foram removidos.`);
    } else {
      console.log('✨ Nenhum arquivo de teste órfão encontrado para exclusão.');
    }

  } catch (error) {
    console.error('❌ Erro fatal ao limpar imagens:', error);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('clean-orphaned-images.js')) {
  cleanOrphanedImages();
}