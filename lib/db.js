import pg from 'pg';

// Use a connection pool for better performance and connection management.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Permite conexão com certificados auto-assinados (comum em cloud)
  } : undefined
});

/**
 * Executes a query against the database.
 * @param {string} text The SQL query text.
 * @param {Array} params The parameters for the query.
 * @returns {Promise<QueryResult>} The result from the database.
 */
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    // console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query', { text });
    throw error;
  }
}

/**
 * Saves image metadata to the database.
 * @param {string} filename 
 * @param {string} relativePath 
 * @param {string} type 
 * @param {number} fileSize 
 * @param {number|null} userId 
 * @returns {Promise<Object>} The saved image record.
 */
export async function saveImage(filename, relativePath, type, fileSize, userId) {
    const text = `
        INSERT INTO images(filename, path, type, size, user_id)
        VALUES($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const params = [filename, relativePath, type, fileSize, userId];
    const res = await query(text, params);
    return res.rows[0];
}