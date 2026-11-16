/**
 * Testes de Integração com Banco Real (PostgreSQL) — Clientes / Visitantes (`customers`).
 *
 * Valida queries SQL reais, colunas canônicas da migração 023 (`google_id`,
 * `address_json`, `password_hash`, `last_login_at`), constraints UNIQUE/NOT NULL
 * e todas as funções de `lib/domain/customers.js` contra um container PostgreSQL
 * via Testcontainers, prevenindo regressões de schema drift (ADR-0039).
 *
 * Para executar: npm run test:db:container
 * Requer: Docker disponível
 */
import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createTestDb, applyMigrations, withTransaction, isDockerAvailable } from '../../helpers/db-test.js';
import {
  registerCustomer,
  authenticateCustomer,
  upsertGoogleCustomer,
  getCustomerById,
  updateCustomerProfile,
} from '../../../lib/domain/customers.js';

let mockDbQuery = null;

jest.mock('../../../lib/infra/db.js', () => ({
  query: (...args) => {
    if (typeof mockDbQuery !== 'function') {
      return Promise.reject(new Error('mockDbQuery não configurado para este teste'));
    }
    return mockDbQuery(...args);
  },
}));

let pool;
let tx;

beforeAll(async () => {
  if (!isDockerAvailable()) {
    return;
  }
  pool = createTestDb();
  await applyMigrations();
});

afterAll(async () => {
  if (tx && typeof tx.rollback === 'function') {
    try { await tx.rollback(); } catch { /* rollback de segurança */ }
  }
  if (pool) {
    await pool.end();
  }
});

beforeEach(async () => {
  if (!pool) return;
  tx = await withTransaction(pool);
  mockDbQuery = (text, params) => tx.query(text, params);
});

afterEach(async () => {
  mockDbQuery = null;
  if (tx) {
    await tx.rollback();
  }
});

/**
 * describeIf condicional: só executa testes se Docker estiver disponível.
 */
const describeIf = isDockerAvailable() ? describe : describe.skip;

describeIf('Clientes (customers) — Integração com PostgreSQL Real', () => {
  it('registerCustomer persiste no PostgreSQL real com hash bcrypt, e-mail em minúsculas e sanitização sem password_hash', async () => {
    const email = `Visitante.${Date.now()}@Exemplo.com`;
    const created = await registerCustomer({
      name: '  Maria da Fé  ',
      email: `  ${email}  `,
      password: 'SenhaSegura@2026',
      phone: '11988887777',
    });

    expect(created).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        name: 'Maria da Fé',
        email: email.toLowerCase(),
        phone: '11988887777',
        default_address: null,
      })
    );
    expect(created).not.toHaveProperty('password_hash');
    expect(created.created_at).toBeTruthy();
    expect(created.last_login_at).toBeTruthy();

    const raw = await tx.query('SELECT * FROM customers WHERE id = $1', [created.id]);
    expect(raw.rows).toHaveLength(1);
    expect(raw.rows[0].password_hash).toMatch(/^\$2[aby]\$/);
    expect(raw.rows[0].google_id).toBeNull();
    expect(raw.rows[0].address_json).toBeNull();
  });

  it('registerCustomer rejeita e-mail duplicado independente de caixa (EMAIL_ALREADY_REGISTERED)', async () => {
    const baseEmail = `duplicado.${Date.now()}@exemplo.com`;
    await registerCustomer({
      name: 'Primeiro Cadastro',
      email: baseEmail,
      password: 'SenhaSegura@2026',
    });

    await expect(
      registerCustomer({
        name: 'Segundo Cadastro',
        email: baseEmail.toUpperCase(),
        password: 'OutraSenha@2026',
      })
    ).rejects.toThrow('EMAIL_ALREADY_REGISTERED');
  });

  it('authenticateCustomer valida credenciais contra o hash real no banco e recusa senha incorreta ou conta sem senha', async () => {
    const email = `auth.${Date.now()}@exemplo.com`;
    const registered = await registerCustomer({
      name: 'João Batista',
      email,
      password: 'MinhaSenha@123',
    });

    const authenticated = await authenticateCustomer({
      email: email.toUpperCase(),
      password: 'MinhaSenha@123',
    });
    expect(authenticated).not.toBeNull();
    expect(authenticated.id).toBe(registered.id);
    expect(authenticated.email).toBe(email);

    const wrongPass = await authenticateCustomer({
      email,
      password: 'SenhaErrada@000',
    });
    expect(wrongPass).toBeNull();

    const unknown = await authenticateCustomer({
      email: `inexistente.${Date.now()}@exemplo.com`,
      password: 'MinhaSenha@123',
    });
    expect(unknown).toBeNull();
  });

  it('upsertGoogleCustomer cria conta nova com google_id, vincula conta existente pelo e-mail e atualiza login por google_id', async () => {
    const emailExisting = `vinculo.${Date.now()}@exemplo.com`;
    const existing = await registerCustomer({
      name: 'Ana Clara',
      email: emailExisting,
      password: 'SenhaInicial@123',
    });

    const googleSub1 = `google-sub-link-${Date.now()}`;
    const linked = await upsertGoogleCustomer({
      googleSub: googleSub1,
      email: emailExisting.toUpperCase(),
      name: 'Ana Clara Google',
    });
    expect(linked.id).toBe(existing.id);

    const rawLinked = await tx.query('SELECT google_id FROM customers WHERE id = $1', [existing.id]);
    expect(rawLinked.rows[0].google_id).toBe(googleSub1);

    const relogin = await upsertGoogleCustomer({
      googleSub: googleSub1,
      email: emailExisting,
      name: 'Ana Clara',
    });
    expect(relogin.id).toBe(existing.id);

    const googleSub2 = `google-sub-new-${Date.now()}`;
    const emailNew = `novo.google.${Date.now()}@exemplo.com`;
    const createdByGoogle = await upsertGoogleCustomer({
      googleSub: googleSub2,
      email: emailNew,
      name: 'Pedro Google',
    });
    expect(createdByGoogle.id).not.toBe(existing.id);
    expect(createdByGoogle.email).toBe(emailNew);
    expect(createdByGoogle.name).toBe('Pedro Google');

    // Conta criada apenas via Google não possui password_hash -> login por senha retorna null
    const passwordAttempt = await authenticateCustomer({
      email: emailNew,
      password: 'QualquerSenha@123',
    });
    expect(passwordAttempt).toBeNull();
  });

  it('updateCustomerProfile e getCustomerById gravam e serializam address_json como default_address', async () => {
    const email = `perfil.${Date.now()}@exemplo.com`;
    const customer = await registerCustomer({
      name: 'Carlos Eduardo',
      email,
      password: 'SenhaPerfil@123',
    });

    const address = {
      cep: '01001-000',
      street: 'Praça da Sé',
      number: '100',
      neighborhood: 'Sé',
      city: 'São Paulo',
      state: 'SP',
    };

    const updated = await updateCustomerProfile(customer.id, {
      name: 'Carlos E. Atualizado',
      phone: '11977776666',
      defaultAddress: address,
    });

    expect(updated).not.toBeNull();
    expect(updated.name).toBe('Carlos E. Atualizado');
    expect(updated.phone).toBe('11977776666');
    expect(updated.default_address).toEqual(address);

    // Verifica que a coluna física gravada no PostgreSQL é `address_json` (TEXT)
    const raw = await tx.query('SELECT address_json FROM customers WHERE id = $1', [customer.id]);
    expect(typeof raw.rows[0].address_json).toBe('string');
    expect(JSON.parse(raw.rows[0].address_json)).toEqual(address);

    const fetched = await getCustomerById(customer.id);
    expect(fetched).toEqual(updated);

    const notFound = await updateCustomerProfile(99999999, { name: 'Inexistente' });
    expect(notFound).toBeNull();
  });

  it('constraints do banco real: rejeita e-mail nulo, google_id duplicado e faz CASCADE em customer_refresh_tokens', async () => {
    await tx.query('SAVEPOINT antes_not_null');
    await expect(
      tx.query('INSERT INTO customers (name, email) VALUES ($1, $2)', ['Sem Email', null])
    ).rejects.toThrow();
    await tx.query('ROLLBACK TO SAVEPOINT antes_not_null');

    const dupGoogleId = `dup-google-${Date.now()}`;
    await upsertGoogleCustomer({
      googleSub: dupGoogleId,
      email: `g1.${Date.now()}@exemplo.com`,
      name: 'G1',
    });

    await tx.query('SAVEPOINT antes_unique_google');
    await expect(
      tx.query(
        'INSERT INTO customers (name, email, google_id) VALUES ($1, $2, $3)',
        ['G2', `g2.${Date.now()}@exemplo.com`, dupGoogleId]
      )
    ).rejects.toThrow();
    await tx.query('ROLLBACK TO SAVEPOINT antes_unique_google');

    const tempCustomer = await registerCustomer({
      name: 'Cliente Token',
      email: `token.${Date.now()}@exemplo.com`,
      password: 'SenhaToken@123',
    });

    await tx.query(
      `INSERT INTO customer_refresh_tokens (customer_id, token, expires_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '7 days')`,
      [tempCustomer.id, `tok-${Date.now()}`]
    );

    await tx.query('DELETE FROM customers WHERE id = $1', [tempCustomer.id]);
    const remainingTokens = await tx.query(
      'SELECT COUNT(*)::int AS cnt FROM customer_refresh_tokens WHERE customer_id = $1',
      [tempCustomer.id]
    );
    expect(remainingTokens.rows[0].cnt).toBe(0);
  });
});
