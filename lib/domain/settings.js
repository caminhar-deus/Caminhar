import { query } from '../db.js';
import { upsertRecord, raw } from '../crud.js';

/**
 * Retrieves a specific setting value from the database.
 * @param {string} key The key of the setting to retrieve.
 * @param {*} [defaultValue=null] The default value to return if the setting is not found.
 * @returns {Promise<*>} The value of the setting or the default value.
 */
export async function getSetting(key, defaultValue = null) {
  const text = 'SELECT value FROM settings WHERE key = $1';
  const res = await query(text, [key], { log: false });
  
  if (res.rows.length > 0) {
    // The value is often stored as JSON, so we parse it.
    return res.rows[0].value;
  }
  
  return defaultValue;
}

/**
 * Retrieves all settings from the database as a key-value object.
 * @returns {Promise<Object>} An object containing all settings.
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
 * Updates or creates a setting in the database.
 * @param {string} key The key of the setting to update.
 * @param {*} value The new value.
 * @param {string} [type] The data type of the setting.
 * @param {string} [description] The description of the setting.
 * @returns {Promise<Object>} The updated or created setting record.
 */
export async function updateSetting(key, value, type, description) {
  const insertData = { key, value, type, description, updated_at: raw('CURRENT_TIMESTAMP') };
  const updateData = { value, type, description, updated_at: raw('CURRENT_TIMESTAMP') };
  return upsertRecord('settings', insertData, 'key', updateData);
}

/**
 * Alias for updateSetting.
 */
export const setSetting = updateSetting;

/**
 * Retrieves all settings from the database as a raw array of records.
 * @returns {Promise<Array>} A list of all setting records.
 */
export async function getAllSettings() {
  const text = 'SELECT * FROM settings ORDER BY key ASC';
  const res = await query(text, [], { log: false });
  return res.rows;
}