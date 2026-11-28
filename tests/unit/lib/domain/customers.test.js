import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('../../../../lib/infra/db.js', () => ({
  query: jest.fn(),
}));

import { query } from '../../../../lib/infra/db.js';
import {
  registerCustomer,
  authenticateCustomer,
  upsertGoogleCustomer,
  getCustomerById,
  updateCustomerProfile,
  storeCustomerRefreshToken,
  validateCustomerRefreshToken,
  consumeCustomerRefreshToken,
  revokeCustomerRefreshToken,
  revokeAllCustomerRefreshTokens,
} from '../../../../lib/domain/customers.js';

describe('Domínio de Visitantes/Clientes — lib/domain/customers.js', () => {
  beforeEach(() => {
    query.mockReset();
  });

  describe('registerCustomer()', () => {
    it('deve cadastrar um novo cliente com senha hasheada com sucesso', async () => {
      query
        .mockResolvedValueOnce({ rows: [] }) // Verificação de e-mail duplicado
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: 'Maria Silva',
              email: 'maria@exemplo.com',
              phone: '11999998888',
              default_address: JSON.stringify({ cep: '01001-000', city: 'São Paulo' }),
              created_at: new Date().toISOString(),
              last_login_at: new Date().toISOString(),
            },
          ],
        });

      const customer = await registerCustomer({
        name: ' Maria Silva ',
        email: 'MARIA@exemplo.com ',
        password: 'senha_segura_123',
        phone: '11999998888',
      });

      expect(customer).not.toBeNull();
      expect(customer.id).toBe(1);
      expect(customer.name).toBe('Maria Silva');
      expect(customer.email).toBe('maria@exemplo.com');
      expect(customer.default_address).toEqual({ cep: '01001-000', city: 'São Paulo' });

      expect(query).toHaveBeenNthCalledWith(
        1,
        'SELECT id FROM customers WHERE LOWER(email) = $1',
        ['maria@exemplo.com']
      );
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/INSERT INTO customers/i),
        expect.arrayContaining(['Maria Silva', 'maria@exemplo.com'])
      );
    });

    it('deve cadastrar cliente mesmo omitindo o telefone (fallback para null)', async () => {
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              name: 'José',
              email: 'jose@exemplo.com',
              phone: null,
              created_at: new Date().toISOString(),
              last_login_at: new Date().toISOString(),
            },
          ],
        });

      const customer = await registerCustomer({
        name: 'José',
        email: 'jose@exemplo.com',
        password: 'senha_segura_123',
      });

      expect(customer.phone).toBe('');
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        ['José', 'jose@exemplo.com', expect.any(String), null]
      );
    });

    it('deve lançar erro EMAIL_ALREADY_REGISTERED se o e-mail já existir', async () => {
      query.mockResolvedValueOnce({ rows: [{ id: 99 }] });

      await expect(
        registerCustomer({
          name: 'Duplicado',
          email: 'maria@exemplo.com',
          password: 'senha_segura_123',
        })
      ).rejects.toThrow('EMAIL_ALREADY_REGISTERED');
    });
  });

  describe('authenticateCustomer()', () => {
    it('deve autenticar cliente com credenciais válidas e atualizar last_login_at', async () => {
      const bcrypt = (await import('bcryptjs')).default;
      const hash = await bcrypt.hash('minhaSenha123', 10);

      query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 5,
              name: 'João Pedro',
              email: 'joao@exemplo.com',
              password_hash: hash,
              default_address: 'invalid json fallback',
              last_login_at: null,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] }); // Update last_login_at

      const authenticated = await authenticateCustomer({
        email: 'JOAO@exemplo.com',
        password: 'minhaSenha123',
      });

      expect(authenticated).not.toBeNull();
      expect(authenticated.id).toBe(5);
      expect(authenticated.default_address).toBeNull();
      expect(query).toHaveBeenCalledWith(
        'UPDATE customers SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [5]
      );
    });

    it('deve retornar null se o e-mail não for encontrado ou cliente não tiver password_hash', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const res1 = await authenticateCustomer({ email: 'inexistente@exemplo.com', password: '123' });
      expect(res1).toBeNull();

      query.mockResolvedValueOnce({ rows: [{ id: 6, email: 'sem@hash.com', password_hash: null }] });
      const res2 = await authenticateCustomer({ email: 'sem@hash.com', password: '123' });
      expect(res2).toBeNull();
    });

    it('deve retornar null se a senha estiver incorreta', async () => {
      const bcrypt = (await import('bcryptjs')).default;
      const hash = await bcrypt.hash('senhaCorreta', 10);

      query.mockResolvedValueOnce({
        rows: [{ id: 5, email: 'teste@exemplo.com', password_hash: hash }],
      });

      const res = await authenticateCustomer({ email: 'teste@exemplo.com', password: 'senhaErrada' });
      expect(res).toBeNull();
    });
  });

  describe('upsertGoogleCustomer()', () => {
    it('deve atualizar last_login_at quando visitante já tem google_sub vinculado', async () => {
      query
        .mockResolvedValueOnce({
          rows: [{ id: 10, name: 'Google User', email: 'g@exemplo.com', google_sub: 'sub_123' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 10, name: 'Google User', email: 'g@exemplo.com', google_sub: 'sub_123' }],
        });

      const customer = await upsertGoogleCustomer({
        googleSub: 'sub_123',
        email: 'g@exemplo.com',
        name: 'Google User',
      });

      expect(customer.id).toBe(10);
      expect(query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE customers\s+SET last_login_at = CURRENT_TIMESTAMP/i),
        [10]
      );
    });

    it('deve vincular google_sub a uma conta existente que tinha apenas e-mail, anular password_hash com guarda google_id IS NULL e revogar refresh tokens anteriores', async () => {
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 12, name: 'Conta Normal', email: 'normal@exemplo.com', google_id: null }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 12, name: 'Conta Normal', email: 'normal@exemplo.com', google_id: 'sub_new' }],
        })
        .mockResolvedValueOnce({ rowCount: 2 });

      const customer = await upsertGoogleCustomer({
        googleSub: 'sub_new',
        email: 'NORMAL@exemplo.com',
        name: 'Conta Normal',
      });

      expect(customer.id).toBe(12);
      const updateCall = query.mock.calls[2];
      expect(updateCall[0]).toMatch(/UPDATE customers\s+SET google_id = \$1,\s*password_hash = NULL/i);
      expect(updateCall[0]).toMatch(/WHERE id = \$2 AND \(google_id IS NULL OR google_id = \$1\)/i);
      expect(updateCall[1]).toEqual(['sub_new', 12]);
      expect(query).toHaveBeenNthCalledWith(
        4,
        expect.stringMatching(/UPDATE customer_refresh_tokens\s+SET revoked = true\s+WHERE customer_id = \$1 AND revoked = false/i),
        [12]
      );
    });

    it('deve lançar GOOGLE_ACCOUNT_CONFLICT quando conta encontrada por e-mail já possuir outro google_id ou UPDATE condicional não atualizar', async () => {
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 15, name: 'Já Vinculada', email: 'vinculada@exemplo.com', google_id: 'sub_antigo' }],
        });

      await expect(
        upsertGoogleCustomer({
          googleSub: 'sub_diferente',
          email: 'vinculada@exemplo.com',
          name: 'Outro',
        })
      ).rejects.toMatchObject({ code: 'GOOGLE_ACCOUNT_CONFLICT' });
      expect(query).toHaveBeenCalledTimes(2);

      query.mockReset();
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 16, name: 'Corrida', email: 'corrida@exemplo.com', google_id: null }],
        })
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        upsertGoogleCustomer({
          googleSub: 'sub_corrida',
          email: 'corrida@exemplo.com',
          name: 'Corrida',
        })
      ).rejects.toMatchObject({ code: 'GOOGLE_ACCOUNT_CONFLICT' });
    });

    it('deve cadastrar nova conta com fallback de nome para parte antes do arroba ou Visitante', async () => {
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 25, name: 'novo', email: 'novo@gmail.com', google_sub: 'sub_brand_new' }],
        });

      const customer = await upsertGoogleCustomer({
        googleSub: 'sub_brand_new',
        email: 'novo@gmail.com',
      });

      expect(customer.id).toBe(25);
      expect(query).toHaveBeenCalledWith(
        expect.stringMatching(/INSERT INTO customers/i),
        ['novo', 'novo@gmail.com', 'sub_brand_new']
      );

      // Teste do fallback extremo 'Visitante' quando email não tem @
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 26, name: 'Visitante', email: '', google_sub: 'sub_empty' }],
        });

      const customer2 = await upsertGoogleCustomer({
        googleSub: 'sub_empty',
        email: '',
      });
      expect(customer2.name).toBe('Visitante');
    });

    it('deve recuperar-se de corrida 23505 quando INSERT concorrente criou o mesmo google_id', async () => {
      const uniqueViolation = Object.assign(new Error('duplicate key value violates unique constraint'), {
        code: '23505',
      });

      query
        .mockResolvedValueOnce({ rows: [] }) // bySub
        .mockResolvedValueOnce({ rows: [] }) // byEmail
        .mockRejectedValueOnce(uniqueViolation) // INSERT concorrente
        .mockResolvedValueOnce({
          rows: [{ id: 51, name: 'Concorrente', email: 'race@gmail.com', google_id: 'sub_race_1' }],
        }) // retryBySub
        .mockResolvedValueOnce({
          rows: [{ id: 51, name: 'Concorrente', email: 'race@gmail.com', google_id: 'sub_race_1' }],
        }); // touchGoogleCustomerLogin

      const customer = await upsertGoogleCustomer({
        googleSub: 'sub_race_1',
        email: 'race@gmail.com',
        name: 'Concorrente',
      });

      expect(customer.id).toBe(51);
      expect(customer.email).toBe('race@gmail.com');
    });

    it('deve recuperar-se de corrida 23505 vinculando conta criada simultaneamente pelo mesmo e-mail', async () => {
      const uniqueViolation = Object.assign(new Error('duplicate key value'), { code: '23505' });

      query
        .mockResolvedValueOnce({ rows: [] }) // bySub
        .mockResolvedValueOnce({ rows: [] }) // byEmail
        .mockRejectedValueOnce(uniqueViolation) // INSERT concorrente
        .mockResolvedValueOnce({ rows: [] }) // retryBySub
        .mockResolvedValueOnce({
          rows: [{ id: 52, name: 'Maria', email: 'maria@gmail.com', google_id: null }],
        }) // retryByEmail
        .mockResolvedValueOnce({
          rows: [{ id: 52, name: 'Maria', email: 'maria@gmail.com', google_id: 'sub_maria' }],
        }) // linkGoogleAccountByEmail UPDATE
        .mockResolvedValueOnce({ rowCount: 0 }); // revokeAllCustomerRefreshTokens

      const customer = await upsertGoogleCustomer({
        googleSub: 'sub_maria',
        email: 'maria@gmail.com',
        name: 'Maria',
      });

      expect(customer.id).toBe(52);
    });

    it('deve lançar GOOGLE_ACCOUNT_CONFLICT se após corrida 23505 o e-mail já estiver vinculado a outro google_id', async () => {
      const uniqueViolation = Object.assign(new Error('duplicate key value'), { code: '23505' });

      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(uniqueViolation)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 53, name: 'Outro', email: 'outro@gmail.com', google_id: 'sub_other_owner' }],
        });

      await expect(
        upsertGoogleCustomer({
          googleSub: 'sub_attacker',
          email: 'outro@gmail.com',
          name: 'Outro',
        })
      ).rejects.toThrow('GOOGLE_ACCOUNT_CONFLICT');
    });

    it('deve propagar erros de banco diferentes de 23505 no INSERT de upsertGoogleCustomer', async () => {
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('ECONNREFUSED'));

      await expect(
        upsertGoogleCustomer({
          googleSub: 'sub_fail',
          email: 'fail@gmail.com',
          name: 'Fail',
        })
      ).rejects.toThrow('ECONNREFUSED');
    });

    it('deve repropagar 23505 no INSERT se as reconsultas por google_id e LOWER(email) não encontrarem registro', async () => {
      const uniqueViolation = Object.assign(new Error('duplicate key value'), { code: '23505' });

      query
        .mockResolvedValueOnce({ rows: [] }) // bySub
        .mockResolvedValueOnce({ rows: [] }) // byEmail
        .mockRejectedValueOnce(uniqueViolation) // INSERT
        .mockResolvedValueOnce({ rows: [] }) // retryBySub
        .mockResolvedValueOnce({ rows: [] }); // retryByEmail

      await expect(
        upsertGoogleCustomer({
          googleSub: 'sub_missing_after_23505',
          email: 'missing@gmail.com',
          name: 'Missing',
        })
      ).rejects.toThrow('duplicate key value');
    });
  });

  describe('getCustomerById() e updateCustomerProfile()', () => {
    it('getCustomerById deve retornar dados higienizados ou null se não encontrado', async () => {
      query.mockResolvedValueOnce({
        rows: [{ id: 30, name: 'Ana', email: 'ana@exemplo.com', default_address: { cep: '123' } }],
      });
      const c = await getCustomerById(30);
      expect(c.id).toBe(30);
      expect(c.default_address).toEqual({ cep: '123' });

      query.mockResolvedValueOnce({ rows: [] });
      const nullCustomer = await getCustomerById(999);
      expect(nullCustomer).toBeNull();
    });

    it('updateCustomerProfile deve retornar null se visitante não existir', async () => {
      query.mockResolvedValueOnce({ rows: [] });
      const res = await updateCustomerProfile(999, { name: 'Novo Nome' });
      expect(res).toBeNull();
    });

    it('updateCustomerProfile deve atualizar telefone, endereço e nome com sucesso', async () => {
      query
        .mockResolvedValueOnce({
          rows: [{ id: 40, name: 'Original', phone: '111', default_address: null }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 40,
              name: 'Atualizado',
              phone: '222',
              default_address: JSON.stringify({ cep: '01001-000' }),
            },
          ],
        });

      const updated = await updateCustomerProfile(40, {
        name: 'Atualizado',
        phone: '222',
        defaultAddress: { cep: '01001-000' },
      });

      expect(updated.name).toBe('Atualizado');
      expect(updated.phone).toBe('222');
      expect(updated.default_address).toEqual({ cep: '01001-000' });
    });

    it('updateCustomerProfile deve preservar campos quando omitidos e permitir anular defaultAddress', async () => {
      query
        .mockResolvedValueOnce({
          rows: [{ id: 41, name: 'Manter', phone: '333', default_address: JSON.stringify({ cep: '123' }) }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 41,
              name: 'Manter',
              phone: '333',
              default_address: null,
            },
          ],
        });

      const updated = await updateCustomerProfile(41, {
        defaultAddress: null,
      });

      expect(updated.name).toBe('Manter');
      expect(updated.phone).toBe('333');
      expect(updated.default_address).toBeNull();
      expect(query).toHaveBeenNthCalledWith(
        2,
        expect.stringMatching(/UPDATE customers\s+SET name = \$1, phone = \$2, address_json = \$3/i),
        ['Manter', '333', null, 41]
      );
    });
  });

  describe('Refresh tokens do visitante (customer_refresh_tokens)', () => {
    it('storeCustomerRefreshToken deve inserir hash com expires_at calculado por ttlDays', async () => {
      const nowBefore = Date.now();
      query.mockResolvedValueOnce({
        rows: [{ id: 10, customer_id: 77, expires_at: new Date(nowBefore + 7 * 86400000) }],
      });

      const stored = await storeCustomerRefreshToken(77, 'hash-sha256-test', 7);
      expect(stored.id).toBe(10);
      expect(stored.customer_id).toBe(77);

      const [, params] = query.mock.calls[0];
      expect(params[0]).toBe(77);
      expect(params[1]).toBe('hash-sha256-test');
      expect(params[2]).toBeInstanceOf(Date);
      const deltaMs = params[2].getTime() - nowBefore;
      expect(deltaMs).toBeGreaterThanOrEqual(7 * 86400000 - 1000);
      expect(deltaMs).toBeLessThanOrEqual(7 * 86400000 + 2000);

      query.mockResolvedValueOnce({ rows: [{ id: 11, customer_id: 77, expires_at: new Date() }] });
      await storeCustomerRefreshToken(77, 'hash-default-ttl');
      const [, defaultParams] = query.mock.calls[1];
      expect(defaultParams[2].getTime() - nowBefore).toBeGreaterThanOrEqual(30 * 86400000 - 2000);
    });

    it('validateCustomerRefreshToken deve retornar null sem consultar o banco se hash ausente e retornar linha ativa quando válido', async () => {
      expect(await validateCustomerRefreshToken(null)).toBeNull();
      expect(await validateCustomerRefreshToken('')).toBeNull();
      expect(query).not.toHaveBeenCalled();

      query.mockResolvedValueOnce({ rows: [{ id: 1, customer_id: 77, expires_at: new Date() }] });
      const active = await validateCustomerRefreshToken('hash-valido');
      expect(active).toEqual(expect.objectContaining({ id: 1, customer_id: 77 }));

      query.mockResolvedValueOnce({ rows: [] });
      expect(await validateCustomerRefreshToken('hash-expirado')).toBeNull();
    });

    it('consumeCustomerRefreshToken deve rotacionar atomicamente com UPDATE ... RETURNING e recusar replay/nulo', async () => {
      expect(await consumeCustomerRefreshToken(null)).toBeNull();
      expect(query).not.toHaveBeenCalled();

      query.mockResolvedValueOnce({ rows: [{ id: 2, customer_id: 88, expires_at: new Date() }] });
      const consumed = await consumeCustomerRefreshToken('hash-uso-unico');
      expect(consumed).toEqual(expect.objectContaining({ id: 2, customer_id: 88 }));
      expect(query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE customer_refresh_tokens\s+SET revoked = true\s+WHERE token = \$1 AND revoked = false AND expires_at > NOW\(\)\s+RETURNING id, customer_id, expires_at/i),
        ['hash-uso-unico']
      );

      query.mockResolvedValueOnce({ rows: [] });
      expect(await consumeCustomerRefreshToken('hash-ja-revogado')).toBeNull();
    });

    it('revokeCustomerRefreshToken e revokeAllCustomerRefreshTokens devem devolver status booleano e contagem de revogações', async () => {
      expect(await revokeCustomerRefreshToken('')).toBe(false);
      expect(query).not.toHaveBeenCalled();

      query.mockResolvedValueOnce({ rowCount: 1 });
      expect(await revokeCustomerRefreshToken('hash-revogar')).toBe(true);

      query.mockResolvedValueOnce({ rowCount: 0 });
      expect(await revokeCustomerRefreshToken('hash-ausente')).toBe(false);

      query.mockResolvedValueOnce({});
      expect(await revokeCustomerRefreshToken('hash-sem-rowcount')).toBe(false);

      query.mockResolvedValueOnce({ rowCount: 3 });
      expect(await revokeAllCustomerRefreshTokens(77)).toBe(3);

      query.mockResolvedValueOnce({});
      expect(await revokeAllCustomerRefreshTokens(77)).toBe(0);
    });
  });
});
