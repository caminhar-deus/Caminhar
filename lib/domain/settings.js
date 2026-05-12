import { query } from '../db.js';
import { upsertRecord, raw } from '../crud.js';

/**
 * Retorna o valor de uma configuração específica do banco de dados.
 * @param {string} key - Chave da configuração a ser obtida.
 * @param {*} [defaultValue=null] - Valor padrão caso a configuração não exista.
 * @returns {Promise<*>} O valor da configuração ou o valor padrão.
 */
export async function getSetting(key, defaultValue = null) {
  const text = 'SELECT value FROM settings WHERE key = $1';
  const res = await query(text, [key], { log: false });
  
  if (res.rows.length > 0) {
    // O valor geralmente é armazenado como JSON.
    return res.rows[0].value;
  }
  
  return defaultValue;
}

/**
 * Retorna todas as configurações do banco como um objeto chave-valor.
 * @returns {Promise<Object>} Objeto contendo todas as configurações.
 */
export async function getSettings() {
  const text = 'SELECT key, value FROM settings';
  const res = await query(text, [], { log: false });
  
  const settings = {};
  for (const row of res.rows) {
    settings[row.key] = row.value;
  }
  
  return settings;
}

/**
 * Atualiza ou cria uma configuração no banco de dados.
 * @param {string} key - Chave da configuração a ser atualizada.
 * @param {*} value - Novo valor.
 * @param {string} [type] - Tipo de dado da configuração.
 * @param {string} [description] - Descrição da configuração.
 * @returns {Promise<Object>} A configuração atualizada ou criada.
 */
export async function updateSetting(key, value, type, description) {
  const insertData = { key, value, type, description, updated_at: raw('CURRENT_TIMESTAMP') };
  const updateData = { value, type, description, updated_at: raw('CURRENT_TIMESTAMP') };
  return upsertRecord('settings', insertData, 'key', updateData);
}

/**
 * Alias para updateSetting.
 */
export const setSetting = updateSetting;

/**
 * Retorna todas as configurações do banco como um array bruto de registros.
 * @returns {Promise<Array>} Lista de todos os registros de configuração.
 */
export async function getAllSettingsRaw() {
  const text = 'SELECT * FROM settings ORDER BY key ASC';
  const res = await query(text, [], { log: false });
  return res.rows;
}
