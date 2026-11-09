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

    it('deve vincular google_sub a uma conta existente que tinha apenas e-mail', async () => {
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{ id: 12, name: 'Conta Normal', email: 'normal@exemplo.com' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: 12, name: 'Conta Normal', email: 'normal@exemplo.com', google_sub: 'sub_new' }],
        });

      const customer = await upsertGoogleCustomer({
        googleSub: 'sub_new',
        email: 'NORMAL@exemplo.com',
        name: 'Conta Normal',
      });

      expect(customer.id).toBe(12);
      expect(query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE customers\s+SET google_sub = \$1/i),
        ['sub_new', 12]
      );
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
        expect.stringMatching(/UPDATE customers\s+SET name = \$1, phone = \$2, default_address = \$3/i),
        ['Manter', '333', null, 41]
      );
    });
  });
});
