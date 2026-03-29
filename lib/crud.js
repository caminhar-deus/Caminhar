import { query } from './db.js';

// A unique symbol to identify raw SQL expressions, preventing accidental misuse.
const RAW_SQL = Symbol('raw-sql');

/**
 * Wraps a string to be treated as a raw SQL expression.
 * Use with caution to avoid SQL injection vulnerabilities. Only for trusted, static values.
 * @param {string} value The raw SQL string (e.g., 'CURRENT_TIMESTAMP').
 * @returns An object marked as a raw SQL value.
 */
export function raw(value) {
  return { [RAW_SQL]: true, value };
}

/**
 * Checks if a value is a raw SQL expression object.
 * @param {*} value The value to check.
 * @returns {boolean}
 */
function isRawSql(value) {
  return value && value[RAW_SQL];
}

/**
 * Validates that a string is a safe SQL identifier (table or column name).
 * Prevents SQL injection by ensuring only alphanumeric characters and underscores are used.
 * @param {string} identifier The identifier to validate.
 * @throws {Error} If the identifier is invalid.
 */
function _validateIdentifier(identifier) {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) {
    throw new Error(`Invalid SQL identifier: ${identifier}. Only alphanumeric characters and underscores are allowed.`);
  }
}

/**
 * Builds a parameterized clause for INSERT or UPDATE statements.
 * @param {object} data The data object to process.
 * @param {number} startingIndex The starting index for placeholders.
 * @returns {{clauseParts: string[], values: any[], nextIndex: number}}
 */
function _buildSetClause(data, startingIndex = 1) {
  const clauseParts = [];
  const values = [];
  let placeholderIndex = startingIndex;

  for (const [field, value] of Object.entries(data)) {
    _validateIdentifier(field);
    if (isRawSql(value)) {
      clauseParts.push(`${field} = ${value.value}`);
    } else {
      clauseParts.push(`${field} = $${placeholderIndex++}`);
      values.push(value);
    }
  }

  return { clauseParts, values, nextIndex: placeholderIndex };
}

/**
 * Builds the parts for an INSERT statement's field list and value placeholders.
 * @param {object} data The data object to process.
 * @param {number} startingIndex The starting index for placeholders.
 * @returns {{fields: string[], placeholders: string[], values: any[], nextIndex: number}}
 */
function _buildInsertClauseParts(data, startingIndex = 1) {
  const fields = [];
  const placeholders = [];
  const values = [];
  let placeholderIndex = startingIndex;

  for (const [field, value] of Object.entries(data)) {
    _validateIdentifier(field);
    fields.push(field);
    if (isRawSql(value)) {
      placeholders.push(value.value);
    } else {
      placeholders.push(`$${placeholderIndex++}`);
      values.push(value);
    }
  }
  return { fields, placeholders, values, nextIndex: placeholderIndex };
}

// === Operações CRUD Genéricas ===

export async function createRecord(table, data, options = {}) {
  const { client, returning = ['*'] } = options;
  const { fields, placeholders, values } = _buildInsertClauseParts(data);

  const returningClause = returning.join(', ');
  
  _validateIdentifier(table);
  
  const text = `
    INSERT INTO ${table} (${fields.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING ${returningClause}
  `;
  
  const result = await query(text, values, { client });
  return result.rows[0];
}

export async function updateRecords(table, data, where, options = {}) {
  const { client, returning = ['*'] } = options;
  const whereFields = Object.keys(where);
  const whereValues = Object.values(where);
  
  const { clauseParts: setClauseParts, values: dataValues, nextIndex } = _buildSetClause(data);
  
  const whereClause = whereFields.map((field, index) => {
    _validateIdentifier(field);
    return `${field} = $${nextIndex + index}`;
  }).join(' AND ');
  const returningClause = returning.join(', ');
  
  _validateIdentifier(table);

  const text = `
    UPDATE ${table}
    SET ${setClauseParts.join(', ')}
    WHERE ${whereClause}
    RETURNING ${returningClause}
  `;
  
  const result = await query(text, [...dataValues, ...whereValues], { client });
  return result.rows;
}

export async function deleteRecords(table, where, options = {}) {
  const { client, returning = ['id'] } = options;
  const whereFields = Object.keys(where);
  const whereValues = Object.values(where);
  
  const whereClause = whereFields.map((field, index) => {
    _validateIdentifier(field);
    return `${field} = $${index + 1}`;
  }).join(' AND ');

  const returningClause = returning.map(field => { _validateIdentifier(field); return field; }).join(', ');
  
  _validateIdentifier(table);

  const text = `
    DELETE FROM ${table}
    WHERE ${whereClause}
    RETURNING ${returningClause}
  `;
  
  const result = await query(text, whereValues, { client });
  return result.rows;
}

export async function upsertRecord(table, insertData, conflictTarget, updateData, options = {}) {
  const { client, returning = ['*'] } = options;

  const {
    fields: insertFields,
    placeholders: insertPlaceholders,
    values: insertValues,
    nextIndex,
  } = _buildInsertClauseParts(insertData);

  const { clauseParts: updateSetParts, values: updateValues } = _buildSetClause(updateData, nextIndex);

  _validateIdentifier(table);
  _validateIdentifier(conflictTarget);

  const text = `
    INSERT INTO ${table} (${insertFields.join(', ')})
    VALUES (${insertPlaceholders.join(', ')})
    ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updateSetParts.join(', ')}
    RETURNING ${returning.join(', ')}
  `;

  const result = await query(text, [...insertValues, ...updateValues], { client });
  return result.rows[0];
}