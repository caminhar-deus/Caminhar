import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import AdminUsersTab from '../../../../components/Admin/AdminUsersTab.js';
import toast from 'react-hot-toast';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn()
  }
}));

jest.mock('next/router', () => ({
  useRouter: () => ({ reload: jest.fn() })
}));

describe('AdminUsersTab (Edge Cases)', () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = jest.fn();
    // Evita o erro 'scrollIntoView is not a function' no JSDOM
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve exibir erro se a API não retornar JSON válido ao buscar roles (linhas 71-72)', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: [], pagination: { totalPages: 1 } })
        });
      }
      if (url.includes('/api/admin/roles')) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'text/html' } // Força a falha do Content-Type
        });
      }
      return Promise.resolve({ ok: true });
    });

    render(<AdminUsersTab />);

    // Aguarda o carregamento inicial da tabela terminar (botão habilitado)
    const btn = await screen.findByText('+ Novo Usuário');
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn); // Abre o formulário e dispara o fetch('/roles')

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('A resposta do servidor não é um JSON válido');
    });
  });

  it('deve usar fallbacks de roles se a API retornar lista vazia (linhas 132-134)', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/admin/users')) return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ data: [], pagination: { totalPages: 1 } }) });
      if (url.includes('/api/admin/roles')) return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: async () => [] }); // Array vazio para forçar o Fallback
      return Promise.resolve({ ok: true });
    });

    render(<AdminUsersTab />);
    
    // Aguarda o carregamento inicial da tabela terminar
    const btn = await screen.findByText('+ Novo Usuário');
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);

    await waitFor(() => expect(screen.getByText('Administrador (Padrão)')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Usuário Restrito (Padrão)')).toBeInTheDocument());
  });

  it('deve renderizar as opções de roles quando a API retornar dados envelopados no objeto (linhas 132-134)', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/admin/users')) return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ data: [], pagination: { totalPages: 1 } }) });
      if (url.includes('/api/admin/roles')) return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ data: [{ id: 1, name: 'Editor' }] }) });
      return Promise.resolve({ ok: true });
    });

    render(<AdminUsersTab />);
    
    const btn = await screen.findByText('+ Novo Usuário');
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);

    await waitFor(() => expect(screen.getByText('Editor')).toBeInTheDocument());
  });

  it('deve tratar erro 401 recarregando a página ao buscar roles', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/admin/users')) return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ data: [], pagination: { totalPages: 1 } }) });
      if (url.includes('/api/admin/roles')) return Promise.resolve({ status: 401, ok: false });
      return Promise.resolve({ ok: true });
    });

    render(<AdminUsersTab />);
    const btn = await screen.findByText('+ Novo Usuário');
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Sessão expirada. Faça login novamente.');
    });
  });

  it('deve renderizar colunas da tabela e formatar a data do último login corretamente (formatLastLogin)', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({
            data: [
              { id: 1, username: 'user1', role: 'admin', last_login_at: new Date().toISOString() },
              { id: 2, username: 'user2', role: 'user', last_login_at: null },
              { id: 3, username: 'user3', role: 'editor', last_login_at: 'data-invalida' }
            ],
            pagination: { totalPages: 1 }
          })
        });
      }
      return Promise.resolve({ ok: true });
    });

    render(<AdminUsersTab />);

    await waitFor(() => expect(screen.getByText('user1')).toBeInTheDocument());
    expect(screen.getByText('Nunca')).toBeInTheDocument();
    expect(screen.getByText('Data inválida')).toBeInTheDocument();
  });

  it('deve validar as regras de senha para novos usuários (validateUser)', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/admin/users')) return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ data: [], pagination: { totalPages: 1 } }) });
      if (url.includes('/api/admin/roles')) return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: async () => [] });
      return Promise.resolve({ ok: true });
    });

    render(<AdminUsersTab />);
    
    const btn = await screen.findByText('+ Novo Usuário');
    await waitFor(() => expect(btn).not.toBeDisabled());
    fireEvent.click(btn);

    fireEvent.change(screen.getByLabelText(/Nome de Usuário/i), { target: { value: 'novo_user' } });
    fireEvent.change(screen.getByLabelText(/Senha/i), { target: { value: '123' } });
    
    // O cargo (role) precisa ser selecionado para passar na validação inicial (Zod schema) e chegar na regra da senha
    await waitFor(() => expect(screen.getByText('Administrador (Padrão)')).toBeInTheDocument());
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'admin' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar/i }));
    await waitFor(() => expect(screen.getByText('A senha deve ter no mínimo 6 caracteres para novos usuários.')).toBeInTheDocument());
  });

  it('deve validar as regras de senha ao editar usuários existentes (validateUser)', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/admin/users')) return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: async () => ({ data: [{ id: 1, username: 'admin', role: 'admin', password: '' }], pagination: { totalPages: 1 } }) });
      if (url.includes('/api/admin/roles')) return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: async () => [] });
      return Promise.resolve({ ok: true });
    });

    render(<AdminUsersTab />);

    const editBtn = await screen.findByRole('button', { name: /Editar/i });
    await waitFor(() => expect(editBtn).not.toBeDisabled());
    fireEvent.click(editBtn);

    const passwordInput = screen.getByLabelText(/Senha/i);
    fireEvent.change(passwordInput, { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: /Atualizar/i }));
    await waitFor(() => expect(screen.getByText('A nova senha deve ter no mínimo 6 caracteres.')).toBeInTheDocument());
  });
});