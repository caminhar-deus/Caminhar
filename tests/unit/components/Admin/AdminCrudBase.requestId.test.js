/**
 * Teste do CAMINHO REAL do `X-Request-Id` até o toast.
 *
 * Diferente de `AdminCrudBase.test.js`, este arquivo NÃO mocka `useAdminCrud`
 * nem `useApiFetch`: o componente monta os hooks reais e o único mock é o
 * `global.fetch`, que responde como o `adminCrudHandler` responderia
 * (JSON de erro + header `X-Request-Id`). Único mock de módulo:
 * `react-hot-toast`, só para capturar o texto do toast.
 *
 * Cadeia exercitada de ponta a ponta:
 *   fetch (mock de rede) → useApiFetch (real) → useAdminCrud (real) →
 *   AdminCrudBase (real) → toast.error(...)
 */
import React from 'react';
import { render, renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminCrudBase from '../../../../components/Admin/AdminCrudBase.js';
import { useAdminCrud } from '../../../../hooks/useAdminCrud.js';
import toast from 'react-hot-toast';
import { mockGlobalFetch } from '../../../helpers/index.js';

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn().mockReturnValue('toast-id'),
}));

/** Resposta no formato mínimo consumido pelo `useApiFetch`. */
const makeResponse = ({ status, body, headers = {} }) => {
  const map = new Map(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => map.get(String(name).toLowerCase()) ?? null },
    json: async () => body,
  };
};

/** Corpo idêntico ao de erro 500 do `adminCrudHandler` (message vence error). */
const serverErrorBody = {
  error: 'Erro interno no servidor',
  message: 'Erro genérico de banco',
};

const DummyField = ({ label }) => <span>{label}</span>;

const defaultProps = {
  apiEndpoint: '/api/admin/dicas',
  title: 'Dicas',
  fields: [{ name: 'titulo', component: DummyField, label: 'Título' }],
  columns: [{ key: 'id', header: 'ID' }, { key: 'titulo', header: 'Título' }],
  initialFormData: { titulo: '' },
};

describe('AdminCrudBase - requestId no toast (caminho REAL, sem mock de hook)', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  it('mostra " (ref: <id>)" quando a resposta real traz X-Request-Id', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({
        status: 500,
        body: serverErrorBody,
        headers: { 'X-Request-Id': 'req-real-500' },
      })
    );

    render(<AdminCrudBase {...defaultProps} />);

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Erro genérico de banco (ref: req-real-500)')
    );
    // Prova de que a requisição saiu de verdade pelo fetch global (não houve
    // stub de hook no caminho): a URL é a que o useAdminCrud monta.
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/dicas', {
      credentials: 'include',
    });
  });

  it('mantém o texto de sempre, sem sufixo, quando a resposta NÃO traz o header', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({ status: 500, body: serverErrorBody })
    );

    render(<AdminCrudBase {...defaultProps} />);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro genérico de banco'));
    expect(toast.error).not.toHaveBeenCalledWith(
      expect.stringContaining('(ref:')
    );
  });

  it('encadeia os hooks REAIS: `error` segue string e o ID sai em `requestId`', async () => {
    fetchMock.mockResolvedValue(
      makeResponse({
        status: 500,
        body: serverErrorBody,
        headers: { 'X-Request-Id': 'req-real-hook' },
      })
    );

    const { result } = renderHook(() =>
      useAdminCrud({ apiEndpoint: '/api/admin/dicas', initialFormData: {} })
    );

    await waitFor(() => expect(result.current.requestId).toBe('req-real-hook'));

    // O contrato que os 5 componentes públicos dependem: string, não objeto
    expect(typeof result.current.error).toBe('string');
    expect(result.current.error).toBe('Erro genérico de banco');

    // Sem header → sem id (e o erro continua string)
    fetchMock.mockResolvedValue(makeResponse({ status: 404, body: { message: 'Não encontrado' } }));
    await act(async () => {
      result.current.refetch();
    });
    await waitFor(() => expect(result.current.error).toBe('Não encontrado'));
    expect(result.current.requestId).toBeNull();
    expect(typeof result.current.error).toBe('string');
  });
});
