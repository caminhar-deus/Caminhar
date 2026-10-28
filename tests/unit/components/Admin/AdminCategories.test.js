import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminCategories from '../../../../components/Admin/AdminCategories.js';
import toast from 'react-hot-toast';
import { mockGlobalFetch } from '../../../helpers/index.js';

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn().mockReturnValue('toast-id'),
}));

/** Resposta no formato mínimo consumido pelo `useApiFetch`/`useAdminCrud`. */
const makeResponse = ({ status, body }) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => null },
  json: async () => body,
});

describe('Componente Front-End - AdminCategories', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
    // jsdom não implementa scrollIntoView (usado pelo AdminCrudBase ao abrir o form)
    Element.prototype.scrollIntoView = jest.fn();
    // Resposta padrão para refetch/segundas chamadas
    fetchMock.mockResolvedValue(makeResponse({ status: 200, body: { data: [] } }));
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  it('deve renderizar a lista de categorias vinda da API com os textos da spec', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({
      status: 200,
      body: { data: [{ id: 1, name: 'Fé', slug: 'fe' }, { id: 2, name: 'Oração', slug: 'oracao' }] },
    }));

    render(<AdminCategories />);

    expect(screen.getByText('Gerenciar Categorias')).toBeInTheDocument();
    expect(screen.getByText('+ Nova Categoria')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Fé')).toBeInTheDocument();
      expect(screen.getByText('oracao')).toBeInTheDocument();
    });

    // Listagem sem paginação: a URL é o endpoint puro
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/categories', { credentials: 'include' });
  });

  it('deve exibir a mensagem de lista vazia', async () => {
    render(<AdminCategories />);

    await waitFor(() =>
      expect(screen.getByText('Nenhuma categoria cadastrada.')).toBeInTheDocument()
    );
  });

  it('deve abrir o formulário, gerar o slug no blur do nome e criar a categoria', async () => {
    // 1ª chamada: listagem no mount
    fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: { data: [] } }));

    render(<AdminCategories />);

    // O botão fica disabled enquanto a listagem carrega
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '+ Nova Categoria' })).toBeEnabled()
    );
    fireEvent.click(screen.getByText('+ Nova Categoria'));

    const nameInput = screen.getByLabelText(/Nome/);
    fireEvent.change(nameInput, { target: { value: 'Vida de Oração' } });
    fireEvent.blur(nameInput);

    // Slug gerado automaticamente (padrão de AdminPosts) e toast uma única vez
    expect(screen.getByLabelText(/Slug/)).toHaveValue('vida-de-oracao');
    expect(toast.success).toHaveBeenCalledWith(
      'Slug gerado automaticamente a partir do nome',
      { id: 'slug-generated' }
    );

    // 2ª chamada: POST de criação
    fetchMock.mockResolvedValueOnce(makeResponse({
      status: 201,
      body: { data: { id: 3, name: 'Vida de Oração', slug: 'vida-de-oracao' } },
    }));

    fireEvent.submit(screen.getByLabelText(/Slug/).closest('form'));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/categories',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Vida de Oração', slug: 'vida-de-oracao' }),
        })
      );
    });

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Item criado com sucesso!', { id: 'toast-id' })
    );

    // Formulário fecha após o sucesso
    expect(screen.queryByLabelText(/Slug/)).not.toBeInTheDocument();
  });

  it('deve manter o formulário aberto quando a API rejeita o slug duplicado (409)', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ status: 200, body: { data: [] } }));
    render(<AdminCategories />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: '+ Nova Categoria' })).toBeEnabled()
    );
    fireEvent.click(screen.getByText('+ Nova Categoria'));

    const nameInput = screen.getByLabelText(/Nome/);
    fireEvent.change(nameInput, { target: { value: 'Fé' } });
    fireEvent.blur(nameInput);

    fetchMock.mockResolvedValueOnce(makeResponse({
      status: 409,
      body: { message: 'Já existe uma categoria com esse slug' },
    }));

    fireEvent.submit(screen.getByLabelText(/Slug/).closest('form'));

    // Toast de erro + formulário mantido aberto (spec posts.md §3.5).
    // O texto do toast é o default do `useAdminCrud` — ele lê `data.error` e a
    // API devolve `message`, comportamento pré-existente de todos os CRUDs.
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByLabelText(/Slug/)).toBeInTheDocument();
  });
});
