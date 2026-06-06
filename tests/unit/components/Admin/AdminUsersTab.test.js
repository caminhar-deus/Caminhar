import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminUsersTab from '../../../../components/Admin/AdminUsersTab.js';
import toast from 'react-hot-toast';
import { mockGlobalFetch } from '../../../helpers/index.js';

jest.mock('react-hot-toast', () => ({ error: jest.fn() }));

const mockReload = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ reload: mockReload })
}));

let passedProps;
jest.mock('../../../../components/Admin/AdminCrudBase', () => {
  return function MockAdminCrudBase(props) {
    passedProps = props;
    return <div data-testid="mock-crud">Mock CRUD</div>;
  };
});

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
});

describe('Componente Front-End - AdminUsersTab', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
    sessionStorage.clear();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  it('deve repassar as props corretamente para o CrudBase', () => {
    render(<AdminUsersTab />);
    expect(passedProps.title).toBe('Gestão de Usuários e Admins');
    expect(passedProps.apiEndpoint).toBe('/api/admin/users');
  });

  it('validateUser: deve exigir senha de no mínimo 6 caracteres para novos usuários', () => {
    render(<AdminUsersTab />);
    const { validate } = passedProps;
    expect(() => validate({ id: null, password: '' })).toThrow(/senha é obrigatória/);
    expect(() => validate({ id: null, password: '123' })).toThrow(/mínimo 6 caracteres/);
    expect(() => validate({ id: null, password: 'password' })).not.toThrow();
  });

  it('validateUser: deve validar nova senha na edição, se fornecida', () => {
    render(<AdminUsersTab />);
    const { validate } = passedProps;
    expect(() => validate({ id: 1, password: '' })).not.toThrow(); // Senha em branco (mantém atual)
    expect(() => validate({ id: 1, password: '123' })).toThrow(/nova senha deve ter/);
    expect(() => validate({ id: 1, password: 'newpassword' })).not.toThrow();
  });

  it('formatLastLogin: deve formatar a data ou exibir fallback', () => {
    render(<AdminUsersTab />);
    const loginCol = passedProps.columns.find(c => c.key === 'last_login_at');

    // Data Nula
    const { getByText, unmount } = render(loginCol.render({ last_login_at: null }));
    expect(getByText('Nunca')).toBeInTheDocument();
    unmount();

    // Data Inválida
    const { getByText: getByTextInvalid } = render(loginCol.render({ last_login_at: 'invalid-date' }));
    expect(getByTextInvalid('Data inválida')).toBeInTheDocument();
  });

  describe('RoleSelectField', () => {
    function setupRoleSelectMock(response) {
      global.fetch.mockImplementation((url) => {
        if (url.includes('/api/admin/users')) {
          return Promise.resolve({
            ok: true,
            headers: { get: () => 'application/json' },
            json: async () => ({ data: [], pagination: { totalPages: 1 } })
          });
        }
        if (url.includes('/api/admin/roles')) {
          return Promise.resolve(response);
        }
        return Promise.resolve({ ok: true });
      });
    }

    it('deve carregar os cargos da API e exibir as opções', async () => {
      setupRoleSelectMock({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => [{ id: 1, name: 'Editor' }]
      });
      render(<AdminUsersTab />);

      const roleField = passedProps.fields.find(f => f.name === 'role');
      const RoleSelect = roleField.component;

      render(<RoleSelect name="role" value="" onChange={jest.fn()} label="Cargo" error="Erro" hint="Dica" />);

      expect(screen.getByText('Carregando cargos...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Editor')).toBeInTheDocument();
        expect(screen.getByText('Erro')).toBeInTheDocument();
        expect(screen.getByText('Dica')).toBeInTheDocument();
      });
    });

    it('deve usar fallbacks padrão se a API retornar lista vazia', async () => {
      setupRoleSelectMock({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => []
      });
      render(<AdminUsersTab />);

      const RoleSelect = passedProps.fields.find(f => f.name === 'role').component;
      render(<RoleSelect name="role" value="" onChange={jest.fn()} label="Cargo" />);

      await waitFor(() => {
        expect(screen.getByText('Administrador (Padrão)')).toBeInTheDocument();
        expect(screen.getByText('Usuário Restrito (Padrão)')).toBeInTheDocument();
      });
    });

    it('deve tratar sessão expirada (401)', async () => {
      setupRoleSelectMock({ status: 401 });
      render(<AdminUsersTab />);
      const RoleSelect = passedProps.fields.find(f => f.name === 'role').component;
      render(<RoleSelect name="role" value="" onChange={jest.fn()} label="Cargo" />);
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Sessão expirada. Faça login novamente.'));
    });

    it('deve tratar erros da API graciosamente', async () => {
      setupRoleSelectMock({ ok: false, json: async () => ({ error: 'Erro de permissão' }) });
      render(<AdminUsersTab />);
      const RoleSelect = passedProps.fields.find(f => f.name === 'role').component;
      render(<RoleSelect name="role" value="" onChange={jest.fn()} label="Cargo" />);
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro de permissão'));
    });

    it('deve tratar erro da API sem corpo JSON (fallback)', async () => {
      setupRoleSelectMock({ ok: false, status: 500, json: () => Promise.reject() });
      render(<AdminUsersTab />);
      const RoleSelect = passedProps.fields.find(f => f.name === 'role').component;
      render(<RoleSelect name="role" value="" onChange={jest.fn()} label="Cargo" />);
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro na API (500)'));
    });

    it('deve tratar erro de JSON inválido ao buscar roles', async () => {
      setupRoleSelectMock({
        ok: true,
        headers: { get: () => 'text/html' }
      });
      render(<AdminUsersTab />);
      const RoleSelect = passedProps.fields.find(f => f.name === 'role').component;
      render(<RoleSelect name="role" value="" onChange={jest.fn()} label="Cargo" />);
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('A resposta do servidor não é um JSON válido'));
    });

    it('deve renderizar opções quando a API retornar dados envelopados no objeto', async () => {
      setupRoleSelectMock({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: [{ id: 1, name: 'Editor' }] })
      });
      render(<AdminUsersTab />);
      const RoleSelect = passedProps.fields.find(f => f.name === 'role').component;
      render(<RoleSelect name="role" value="" onChange={jest.fn()} label="Cargo" />);
      await waitFor(() => expect(screen.getByText('Editor')).toBeInTheDocument());
    });
  });

  describe('Casos de Borda — Funções de Formatação e Validação', () => {
    it('formatLastLogin: deve renderizar "Nunca" e "Data inválida" via callback da coluna', () => {
      render(<AdminUsersTab />);
      const loginCol = passedProps.columns.find(c => c.key === 'last_login_at');
      const { getByText, unmount } = render(loginCol.render({ last_login_at: new Date().toISOString() }));
      expect(getByText(/há/)).toBeInTheDocument();
      unmount();
      const { getByText: getByTextNull } = render(loginCol.render({ last_login_at: null }));
      expect(getByTextNull('Nunca')).toBeInTheDocument();
    });

    it('validateUser: fluxo completo — senha inválida para novo usuário', () => {
      render(<AdminUsersTab />);
      const { validate } = passedProps;
      expect(() => validate({ id: null, password: '' })).toThrow(/senha é obrigatória/);
      expect(() => validate({ id: null, password: '12345' })).toThrow(/mínimo 6 caracteres/);
      expect(() => validate({ id: null, password: '123456' })).not.toThrow();
    });

    it('validateUser: fluxo completo — senha inválida na edição', () => {
      render(<AdminUsersTab />);
      const { validate } = passedProps;
      expect(() => validate({ id: 1, password: '' })).not.toThrow();
      expect(() => validate({ id: 1, password: '12345' })).toThrow(/nova senha deve ter/);
      expect(() => validate({ id: 1, password: '123456' })).not.toThrow();
    });
  });
});