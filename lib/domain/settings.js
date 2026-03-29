import { query } from '../db.js';
import { upsertRecord, raw } from '../crud.js';

/**
 * Updates or inserts a setting.
 */
export async function updateSetting(key, value, type, description, options = {}) {
  const insertData = {
    key,
    value,
    type,
    description,
    updated_at: raw('CURRENT_TIMESTAMP'),
  };

  const updateData = {
    value,
    type,
    description,
    updated_at: raw('CURRENT_TIMESTAMP'),
  };

  return upsertRecord('settings', insertData, 'key', updateData, options);
}

/**
 * Alias for updateSetting to maintain compatibility with existing code.
 */
export async function setSetting(key, value, type, description, options = {}) {
  return updateSetting(key, value, type, description, options);
}

/**
 * Retrieves all settings as a key-value object.
 * @returns {Promise<Object>} The settings object.
 */
export async function getSettings() {
  const text = 'SELECT * FROM settings';
  const res = await query(text);
  return res.rows.reduce((acc, curr) => {
    acc[curr.key] = curr.value;
    return acc;
  }, {});
}

/**
 * Retrieves a specific setting by key.
 * @param {string} key The setting key.
 * @returns {Promise<string|null>} The setting value or null if not found.
 */
export async function getSetting(key) {
  const text = 'SELECT value FROM settings WHERE key = $1';
  const res = await query(text, [key]);
  return res.rows.length > 0 ? res.rows[0].value : null;
}

/**
 * Retrieves all settings as an array of objects.
 * @returns {Promise<Array>} The settings array.
 */
export async function getAllSettings() {
  const text = 'SELECT * FROM settings';
  const res = await query(text);
  return res.rows;
}