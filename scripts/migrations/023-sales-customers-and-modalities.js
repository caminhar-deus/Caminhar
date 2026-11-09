#!/usr/bin/env node

import permissionsList from '../../lib/domain/permissions.js';

const MIGRATION_NAME = '023-sales-customers-and-modalities';

const ADMIN_PERMISSIONS = JSON.stringify(permissionsList);

const UP_SQL = `
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS modality VARCHAR(20) NOT NULL DEFAULT 'external',
  ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_type VARCHAR(20) NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

UPDATE products
   SET published = false
 WHERE modality = 'external'
   AND (link IS NULL OR length(trim(link)) = 0);

CREATE INDEX IF NOT EXISTS idx_products_modality_recent
  ON products (published, modality, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  address_json TEXT,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_refresh_tokens (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  shipping_type VARCHAR(20) NOT NULL DEFAULT 'free',
  shipping_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(10, 2) NOT NULL,
  shipping_address TEXT NOT NULL,
  payment_method VARCHAR(30) NOT NULL,
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  order_status VARCHAR(30) NOT NULL DEFAULT 'awaiting_payment',
  mp_payment_id VARCHAR(120) UNIQUE,
  mp_payload TEXT,
  tracking_code VARCHAR(120),
  stock_restored BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id
  ON orders (customer_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders (payment_status, order_status, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id SERIAL PRIMARY KEY,
  event_key VARCHAR(255) NOT NULL UNIQUE,
  mp_payment_id VARCHAR(120),
  action VARCHAR(100),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

const DOWN_SQL = `
DROP TABLE IF EXISTS payment_webhook_events;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS customer_refresh_tokens;
DROP TABLE IF EXISTS customers;
DROP INDEX IF EXISTS idx_products_modality_recent;
ALTER TABLE products
  DROP COLUMN IF EXISTS shipping_cost,
  DROP COLUMN IF EXISTS shipping_type,
  DROP COLUMN IF EXISTS stock,
  DROP COLUMN IF EXISTS modality;
`;

/**
 * Aplica a migração (ADR-0037).
 * @param {import('pg').PoolClient} client
 */
export async function up(client) {
  console.log(`   ↳ ${MIGRATION_NAME}: criando tabelas de clientes/vendas e colunas de modalidade em products...`);
  await client.query(UP_SQL);
  await client.query(
    `UPDATE roles
        SET permissions = $1,
            updated_at = CURRENT_TIMESTAMP
      WHERE name = 'admin'`,
    [ADMIN_PERMISSIONS]
  );
  console.log(`   ✅ ${MIGRATION_NAME} concluída.`);
}

/**
 * Reverte a migração.
 * @param {import('pg').PoolClient} client
 */
export async function down(client) {
  const previousPermissions = JSON.stringify(
    permissionsList.filter((perm) => perm !== 'Gestão de Vendas')
  );
  await client.query(DOWN_SQL);
  await client.query(
    `UPDATE roles
        SET permissions = $1,
            updated_at = CURRENT_TIMESTAMP
      WHERE name = 'admin'`,
    [previousPermissions]
  );
}
