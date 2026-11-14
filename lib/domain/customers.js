import bcrypt from 'bcryptjs';
import { query } from '../infra/db.js';

const SALT_ROUNDS = 10;

function sanitizeCustomer(row) {
  if (!row) return null;
  const rawAddress = row.address_json ?? row.default_address ?? null;
  let defaultAddress = null;
  if (rawAddress) {
    try {
      defaultAddress = typeof rawAddress === 'string'
        ? JSON.parse(rawAddress)
        : rawAddress;
    } catch {
      defaultAddress = null;
    }
  }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    default_address: defaultAddress,
    created_at: row.created_at,
    last_login_at: row.last_login_at,
  };
}

/**
 * Cadastra um novo visitante pelo fluxo convencional (nome, e-mail, senha).
 */
export async function registerCustomer({ name, email, password, phone = '' }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const trimmedName = String(name || '').trim();

  const existing = await query('SELECT id FROM customers WHERE LOWER(email) = $1', [normalizedEmail]);
  if (existing.rows.length > 0) {
    throw new Error('EMAIL_ALREADY_REGISTERED');
  }

  const passwordHash = await bcrypt.hash(String(password), SALT_ROUNDS);
  const { rows } = await query(
    `INSERT INTO customers (name, email, password_hash, phone, last_login_at)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
     RETURNING *`,
    [trimmedName, normalizedEmail, passwordHash, phone || null]
  );

  return sanitizeCustomer(rows[0]);
}

/**
 * Autentica um visitante com e-mail e senha.
 */
export async function authenticateCustomer({ email, password }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const { rows } = await query('SELECT * FROM customers WHERE LOWER(email) = $1', [normalizedEmail]);
  const customer = rows[0];

  if (!customer || !customer.password_hash) {
    return null;
  }

  const isValid = await bcrypt.compare(String(password), customer.password_hash);
  if (!isValid) {
    return null;
  }

  await query('UPDATE customers SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [customer.id]);
  return sanitizeCustomer(customer);
}

/**
 * Vincula ou cria uma conta de visitante via Sign in with Google.
 */
export async function upsertGoogleCustomer({ googleSub, email, name }) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const trimmedName = String(name || normalizedEmail.split('@')[0] || 'Visitante').trim();

  const bySub = await query('SELECT * FROM customers WHERE google_id = $1', [googleSub]);
  if (bySub.rows.length > 0) {
    const updated = await query(
      `UPDATE customers
       SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [bySub.rows[0].id]
    );
    return sanitizeCustomer(updated.rows[0]);
  }

  const byEmail = await query('SELECT * FROM customers WHERE LOWER(email) = $1', [normalizedEmail]);
  if (byEmail.rows.length > 0) {
    const updated = await query(
      `UPDATE customers
       SET google_id = $1, last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [googleSub, byEmail.rows[0].id]
    );
    return sanitizeCustomer(updated.rows[0]);
  }

  const inserted = await query(
    `INSERT INTO customers (name, email, google_id, last_login_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     RETURNING *`,
    [trimmedName, normalizedEmail, googleSub]
  );
  return sanitizeCustomer(inserted.rows[0]);
}

/**
 * Busca os dados públicos/perfil de um visitante pelo ID.
 */
export async function getCustomerById(id) {
  const { rows } = await query('SELECT * FROM customers WHERE id = $1', [id]);
  return sanitizeCustomer(rows[0]);
}

/**
 * Atualiza telefone e/ou endereço padrão de um visitante.
 */
export async function updateCustomerProfile(id, { name, phone, defaultAddress }) {
  const current = await query('SELECT * FROM customers WHERE id = $1', [id]);
  if (current.rows.length === 0) {
    return null;
  }

  const row = current.rows[0];
  const nextName = name !== undefined ? String(name).trim() : row.name;
  const nextPhone = phone !== undefined ? String(phone).trim() : row.phone;
  const nextAddress = defaultAddress !== undefined
    ? (defaultAddress ? JSON.stringify(defaultAddress) : null)
    : (row.address_json ?? row.default_address ?? null);

  const { rows } = await query(
    `UPDATE customers
     SET name = $1, phone = $2, address_json = $3, updated_at = CURRENT_TIMESTAMP
     WHERE id = $4
     RETURNING *`,
    [nextName, nextPhone, nextAddress, id]
  );

  return sanitizeCustomer(rows[0]);
}
