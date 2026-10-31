import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import toast from 'react-hot-toast';
import { useAdminCrud } from '../../../hooks/useAdminCrud.js';
import { useApiFetch } from '../../../hooks/useApiFetch.js';
import { mockGlobalFetch } from '../../helpers/index.js';

// Mock do useApiFetch (usado pelo hook para a listagem), evitando chamadas reais
jest.mock('../../../hooks/useApiFetch.js', () => ({
  useApiFetch: jest.fn(() => ({
    data: { data: [], pagination: null },
    loading: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn().mockReturnValue('toast-id'),
}));

describe('Hook - useAdminCrud (handleDelete)', () => {
  const baseConfig = {
    apiEndpoint: '/api/admin/dicas',
    initialFormData: {},
    autoFetch: false,
  };

  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
    jest.clearAllMocks();
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('deve enviar DELETE com Content-Type application/json e corpo { id }', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const onConfirmDelete = jest.fn().mockResolvedValue(true);

    const { result } = renderHook(() =>
      useAdminCrud({ ...baseConfig, onConfirmDelete })
    );

    await act(async () => {
      await result.current.handleDelete(42);
    });

    expect(onConfirmDelete).toHaveBeenCalledWith(42);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/admin/dicas',
      expect.objectContaining({
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: 42 }),
      })
    );
    expect(toast.success).toHaveBeenCalledWith('Item excluído com sucesso!', { id: 'toast-id' });
  });

  it('deve abortar a exclusão quando onConfirmDelete resolve false', async () => {
    const onConfirmDelete = jest.fn().mockResolvedValue(false);

    const { result } = renderHook(() =>
      useAdminCrud({ ...baseConfig, onConfirmDelete })
    );

    await act(async () => {
      await result.current.handleDelete(42);
    });

    expect(onConfirmDelete).toHaveBeenCalledWith(42);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('Hook - useAdminCrud (handleSubmit: erros da API)', () => {
  const baseConfig = {
    apiEndpoint: '/api/products',
    initialFormData: { name: '', price: '' },
    autoFetch: false,
  };

  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
    jest.clearAllMocks();
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  const submit = async (result) => {
    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() }, null);
    });
  };

  it('deve expor os erros de campo (formError) e orientar pelo toast quando a validação da API reprova', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Bad Request',
        message: 'Dados inválidos para o produto',
        errors: { price: ['Valor deve ser maior que zero'] },
      }),
    });

    const { result } = renderHook(() => useAdminCrud(baseConfig));
    await submit(result);

    // Antes o toast mostrava o "Bad Request" cru (data.error vencia data.message)
    expect(toast.error).toHaveBeenCalledWith(
      'Verifique os campos em vermelho no formulário.',
      { id: 'toast-id' }
    );
    expect(result.current.formError?.errors).toEqual({
      price: ['Valor deve ser maior que zero'],
    });
  });

  it('deve mostrar a mensagem humana da API quando o erro não tem detalhes de campo', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Bad Request', message: 'Dados inválidos para o produto' }),
    });

    const { result } = renderHook(() => useAdminCrud(baseConfig));
    await submit(result);

    expect(toast.error).toHaveBeenCalledWith('Dados inválidos para o produto', { id: 'toast-id' });
    expect(result.current.formError).toBeNull();
  });

  it('deve limpar os erros de campo ao iniciar um novo envio', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Bad Request', errors: { price: ['Valor deve ser maior que zero'] } }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id: 1 }) });

    const { result } = renderHook(() => useAdminCrud(baseConfig));

    await submit(result);
    expect(result.current.formError).not.toBeNull();

    await submit(result);
    expect(result.current.formError).toBeNull();
    expect(toast.success).toHaveBeenCalled();
  });
});

describe('Hook - useAdminCrud (total do conjunto)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve expor totalItems do pagination para o contador do painel', () => {
    useApiFetch.mockReturnValue({
      data: {
        data: [{ id: 1 }],
        pagination: { page: 1, limit: 10, total: 11, totalPages: 2 },
      },
      loading: false,
      error: null,
      requestId: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useAdminCrud({ apiEndpoint: '/api/products', initialFormData: {}, usePagination: true })
    );

    expect(result.current.totalItems).toBe(11);
    expect(result.current.totalPages).toBe(2);
  });

  it('deve cair no tamanho da lista quando a API não retorna paginação', () => {
    useApiFetch.mockReturnValue({
      data: { data: [{ id: 1 }, { id: 2 }], pagination: null },
      loading: false,
      error: null,
      requestId: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() =>
      useAdminCrud({ apiEndpoint: '/api/products', initialFormData: {} })
    );

    expect(result.current.totalItems).toBe(2);
  });
});