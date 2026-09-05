import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import toast from 'react-hot-toast';
import { useAdminCrud } from '../../../hooks/useAdminCrud.js';
import { mockGlobalFetch } from '../../helpers/index.js';

// Mock do useApiFetch (usado pelo hook para a listagem), evitando chamadas reais
jest.mock('../../../hooks/useApiFetch.js', () => ({
  useApiFetch: () => ({
    data: { data: [], pagination: null },
    loading: false,
    error: null,
    refetch: jest.fn(),
  }),
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