/**
 * Isolamento de variáveis de ambiente para a suíte Jest.
 *
 * Compartilhado via `setupFiles` em `jest.config.base.js` (cobrindo tanto
 * `jest.config.js` quanto `jest.config.db.js`) antes da carga de qualquer
 * módulo da aplicação ou de `tests/setup.js` / `tests/setup.db.js`.
 *
 * Evita que variáveis injetadas no shell a partir de `.env` local (ex.:
 * `NODE_ENV=development`, credenciais Upstash/Mercado Pago/Google ou flags de
 * transporte/log) contaminem testes unitários e de integração mockados.
 *
 * `TEST_DATABASE_URL` e `DATABASE_URL` são preservadas propositalmente para os
 * testes com PostgreSQL real (`jest.config.db.js` / CI).
 */

process.env.NODE_ENV = 'test';

const VARS_TO_CLEAN = [
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'REDIS_URL',
  'MP_ACCESS_TOKEN',
  'MP_WEBHOOK_SECRET',
  'NEXT_PUBLIC_MP_PUBLIC_KEY',
  'GOOGLE_CLIENT_ID',
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  'DATABASE_SSL',
  'LOG_LEVEL',
  'LOG_FILE_PATH',
  'DISABLE_RATE_LIMIT',
  'TRUST_PROXY',
  'UPLOADS_DIR',
];

for (const envKey of VARS_TO_CLEAN) {
  delete process.env[envKey];
}
