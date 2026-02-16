import pg from 'pg';
import fs from 'fs';
import path from 'path';
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
          const fullPath = path.resolve(__dirname, '../public/uploads', filename);
          
          if (fs.existsSync(fullPath)) {
            console.log(`      ✅ Arquivo físico ENCONTRADO em: public/uploads/${filename}`);
            const stats = fs.statSync(fullPath);
            console.log(`      📏 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
          } else {
            console.log(`      ❌ Arquivo físico NÃO ENCONTRADO em: public/uploads/${filename}`);
            console.log(`      ⚠️  A imagem está vinculada no banco, mas o arquivo não existe no disco.`);
          }
        }
      }
    }

  } catch (err) {
    console.error('❌ Erro no diagnóstico:', err);
  } finally {
    await pool.end();
  }
}

diagnoseHero();