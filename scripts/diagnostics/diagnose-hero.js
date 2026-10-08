#!/usr/bin/env node
import pg from 'pg';
import { resolveSslConfig } from '../../lib/infra/db.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Configuração para carregar .env corretamente em ES Modules.
// Dois níveis acima: o .env da raiz do repo (o `../` apontava para
// `scripts/.env`, que não existe — e sem ele o UPLOADS_DIR definido no .env da
// raiz ficaria invisível para este diagnóstico).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: resolveSslConfig(),
});

async function diagnoseHero() {
  console.log('🕵️‍♂️ Iniciando diagnóstico da Imagem Principal...');

  try {
    // 1. Verificar configurações no banco
    console.log('\n1️⃣  Configurações no Banco de Dados (tabela settings):');
    // Busca chaves comuns para imagem principal
    const settingsRes = await pool.query("SELECT * FROM settings WHERE key IN ('hero_image', 'header_image', 'site_logo', 'logo') OR key LIKE '%image%'");
    
    if (settingsRes.rows.length === 0) {
      console.log('   ❌ Nenhuma configuração de imagem encontrada no banco.');
    } else {
      for (const row of settingsRes.rows) {
        console.log(`   🔹 Chave: [${row.key}]`);
        console.log(`      Valor: ${row.value}`);
        
        // Verificar se é um caminho de arquivo
        if (row.value && typeof row.value === 'string' && row.value.includes('/uploads/')) {
          const filename = row.value.split('/').pop();
          // Raízes de upload procuradas, na mesma ordem da aplicação:
          // 1. ativo — UPLOADS_DIR ou <raiz do repo>/uploads (base local __dirname);
          // 2. legado — public/uploads.
          const candidateRoots = [
            path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '..', '..', 'uploads')),
            path.resolve(__dirname, '../../public/uploads'),
          ];

          const foundRoot = candidateRoots.find((root) => fs.existsSync(path.join(root, filename)));

          if (foundRoot) {
            const fullPath = path.join(foundRoot, filename);
            console.log(`      ✅ Arquivo físico ENCONTRADO em: ${fullPath}`);
            const stats = fs.statSync(fullPath);
            console.log(`      📏 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
          } else {
            console.log('      ❌ Arquivo físico NÃO ENCONTRADO em nenhum dos diretórios de uploads:');
            for (const root of candidateRoots) {
              console.log(`         - ${path.join(root, filename)}`);
            }
            console.log('      ⚠️  A imagem está vinculada no banco, mas o arquivo não existe no disco.');
          }
        }
      }
    }

  } catch (err) {
    console.error('❌ Erro no diagnóstico:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

diagnoseHero();