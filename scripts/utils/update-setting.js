import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Configuração para carregar .env corretamente em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Tipos permitidos para a coluna `type` na tabela settings
const ALLOWED_TYPES = ['string', 'number', 'boolean', 'json'];

// Regex para validar chave: apenas letras minúsculas, números e underscores
const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;

/**
 * Valida e converte o valor conforme o tipo informado.
 * @param {string} value - Valor bruto da linha de comando
 * @param {string} type - Tipo esperado (string, number, boolean, json)
 * @returns {*} Valor convertido/formatado
 * @throws {Error} Se a validação falhar
 */
function validateAndConvertValue(value, type) {
  switch (type) {
    case 'string':
      if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error('O valor do tipo "string" não pode ser vazio.');
      }
      return value.trim();

    case 'number': {
      const num = Number(value);
      if (isNaN(num)) {
        throw new Error(`O valor "${value}" não é um número válido para o tipo "number".`);
      }
      return num;
    }

    case 'boolean': {
      const normalized = value.toLowerCase().trim();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
      throw new Error(`O valor "${value}" não é um booleano válido. Use true/false ou 1/0.`);
    }

    case 'json': {
      try {
        return JSON.parse(value);
      } catch {
        throw new Error(`O valor "${value}" não é um JSON válido.`);
      }
    }

    default:
      throw new Error(`Tipo "${type}" não é suportado. Tipos permitidos: ${ALLOWED_TYPES.join(', ')}`);
  }
}

async function updateSetting() {
  // Pega os argumentos da linha de comando (ignorando node e o nome do script)
  // Ex: node scripts/utils/update-setting.js <chave> <valor> [tipo] [descricao]
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('❌ Uso incorreto.');
    console.log('👉 Uso: node scripts/utils/update-setting.js <chave> <valor> [tipo] [descricao]');
    console.log('   Exemplo: node scripts/utils/update-setting.js site_title "Meu Novo Título" string "Título do site"');
    console.log(`   Tipos permitidos: ${ALLOWED_TYPES.join(', ')}`);
    process.exit(1);
  }

  const [key, value, type = 'string', description = 'Atualizado via CLI'] = args;

  // --- Validação da chave (key) ---
  if (!KEY_PATTERN.test(key)) {
    console.error(`❌ Chave inválida: "${key}".`);
    console.error('   A chave deve começar com uma letra minúscula e conter apenas letras minúsculas, números e underscores.');
    process.exit(1);
  }

  // --- Validação do tipo (type) ---
  if (!ALLOWED_TYPES.includes(type)) {
    console.error(`❌ Tipo inválido: "${type}".`);
    console.error(`   Tipos permitidos: ${ALLOWED_TYPES.join(', ')}`);
    process.exit(1);
  }

  // --- Validação e conversão do valor (value) ---
  let convertedValue;
  try {
    convertedValue = validateAndConvertValue(value, type);
  } catch (validationError) {
    console.error(`❌ ${validationError.message}`);
    process.exit(1);
  }

  // Serializa para string para armazenamento no banco (a coluna value é text)
  const stringValue = typeof convertedValue === 'object' ? JSON.stringify(convertedValue) : String(convertedValue);

  console.log(`🔄 Atualizando configuração: [${key}]...`);

  try {
    const query = `
      INSERT INTO settings (key, value, type, description, updated_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = $2, type = $3, description = $4, updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const { rows } = await pool.query(query, [key, stringValue, type, description]);

    console.log('✅ Configuração salva com sucesso!');
    console.log(`   🔹 ${rows[0].key}: ${rows[0].value}`);

  } catch (error) {
    console.error('❌ Erro ao atualizar configuração:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

updateSetting();