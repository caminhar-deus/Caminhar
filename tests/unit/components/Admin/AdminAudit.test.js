import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminAudit from '../../../../components/Admin/AdminAudit.js';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';
import { mockGlobalFetch } from '../../../helpers/index.js';

jest.mock('react-hot-toast', () => ({ error: jest.fn(), success: jest.fn() }));

const mockReload = jest.fn();
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ reload: mockReload }))
}));

describe('Componente Front-End - AdminAudit', () => {
  const originalCreateObjectURL = global.URL.createObjectURL;
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    global.URL.createObjectURL = originalCreateObjectURL;
  });

  it('deve renderizar, buscar logs com sucesso e permitir paginação', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: [{ id: 1, action: 'LOGIN', details: 'User logged in', user_id: 'admin', created_at: '2023-10-10T10:00:00Z' }], pagination: { page: 1, totalPages: 2 } })
    });

    render(<AdminAudit />);

    await waitFor(() => {
      expect(screen.getByText('LOGIN')).toBeInTheDocument();
      expect(screen.getByText('User logged in')).toBeInTheDocument();
    });

    // Paginação para Próxima Página
    const nextBtn = screen.getByText('Próxima');
    global.fetch.mockResolvedValueOnce({
      ok: true, headers: { get: () => 'application/json' }, json: async () => ({ data: [], pagination: { page: 2, totalPages: 2 } })
    });
    fireEvent.click(nextBtn);

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  });

  it('deve filtrar logs localmente pela barra de busca', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true, headers: { get: () => 'application/json' }, json: async () => ({ data: [{ id: 1, action: 'CREATE' }, { id: 2, action: 'DELETE' }] })
    });

    render(<AdminAudit />);
    await waitFor(() => expect(screen.getByText('CREATE')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Buscar ações/), { target: { value: 'CREATE' } });
    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.queryByText('DELETE')).not.toBeInTheDocument();
  });

  it('deve exportar CSV escapando caracteres especiais', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true, headers: { get: () => 'application/json' }, json: async () => ({ data: [{ id: 1, action: 'TESTE, COM VIRGULA', created_at: '2023-01-01' }] })
    });
    render(<AdminAudit />);
    await waitFor(() => expect(screen.getByText('TESTE, COM VIRGULA')).toBeInTheDocument());

    const mockAnchor = document.createElement('a');
    const linkClickSpy = jest.spyOn(mockAnchor, 'click').mockImplementation(() => {});
    const originalCreateElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => tagName === 'a' ? mockAnchor : originalCreateElement(tagName));

    fireEvent.click(screen.getByText('Exportar CSV'));
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(linkClickSpy).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('deve lidar com 401 (Sessão Expirada)', async () => {
    global.fetch.mockResolvedValueOnce({ status: 401 });
    render(<AdminAudit />);

    await waitFor(() => expect(mockReload).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith('Sessão expirada. Faça login novamente.');
  });

  describe('Casos de Borda', () => {
    let consoleErrorSpy;

    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy?.mockRestore();
    });

    it('deve tratar resposta não-ok da API com json de erro', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 400,
        ok: false,
        json: async () => ({ error: 'Bad Request Exclusivo' })
      });

      render(<AdminAudit />);
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Bad Request Exclusivo'));
    });

    it('deve tratar resposta não-ok da API sem json válido (fallback para status)', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 500,
        ok: false,
        json: async () => { throw new Error('Não é JSON'); }
      });

      render(<AdminAudit />);
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro na API (500)'));
    });

    it('deve tratar resposta com content-type inválido', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => 'text/html' },
        json: async () => ({})
      });

      render(<AdminAudit />);
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('A resposta do servidor não é um JSON válido'));
    });

    it('deve usar fallbacks quando pagination/data estão ausentes, e filtrar itens com propriedades null', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          data: null
        })
      });

      render(<AdminAudit />);
      await waitFor(() => expect(screen.getByText('Nenhum registro de log encontrado.')).toBeInTheDocument());

      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          data: [
            { id: 1, action: null, details: null, user_id: null },
            { id: 2, action: 'LOGIN', details: 'sucesso', user_id: 'admin' }
          ],
          pagination: { page: 2, totalPages: 3 }
        })
      });

      const startDateInput = screen.getByTitle('Data Inicial');
      const endDateInput = screen.getByTitle('Data Final');
      fireEvent.change(startDateInput, { target: { value: '2023-01-01T00:00' } });
      fireEvent.change(endDateInput, { target: { value: '2023-12-31T23:59' } });

      fireEvent.click(screen.getByRole('button', { name: /Atualizar/i }));
      await waitFor(() => expect(screen.getByText('Página 2 de 3')).toBeInTheDocument());

      const searchInput = screen.getByPlaceholderText('Buscar ações, usuários ou detalhes...');
      fireEvent.change(searchInput, { target: { value: 'LOGIN' } });

      expect(screen.getByText('sucesso')).toBeInTheDocument();
    });

    it('deve escapar corretamente valores no CSV (vírgulas, aspas e quebras de linha)', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          data: [{
            id: 1,
            created_at: '2023-01-01T12:00:00Z',
            user_id: 'admin',
            action: 'TESTE',
            details: 'Detalhe com, vírgula, "aspas" e \n quebra'
          }]
        })
      });

      render(<AdminAudit />);
      await waitFor(() => expect(screen.getByText('TESTE')).toBeInTheDocument());

      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/i }));

      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      clickSpy.mockRestore();
    });

    it('deve exportar CSV sem precisar aplicar quotes se não houver caracteres especiais', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          data: [{ id: 1, created_at: '2023-01-01T12:00:00Z', user_id: 'admin', action: 'TESTE', details: 'Limpo' }]
        })
      });

      render(<AdminAudit />);
      await waitFor(() => expect(screen.getByText('TESTE')).toBeInTheDocument());

      const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
      const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});
      const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/i }));
      expect(global.URL.createObjectURL).toHaveBeenCalled();

      appendChildSpy.mockRestore();
      removeChildSpy.mockRestore();
      clickSpy.mockRestore();
    });

    it('deve exibir erro ao tentar exportar CSV sem dados', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: [] })
      });

      render(<AdminAudit />);
      await waitFor(() => expect(screen.getByText('Nenhum registro de log encontrado.')).toBeInTheDocument());

      fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/i }));
      expect(toast.error).toHaveBeenCalledWith('Não há dados para exportar.');
    });

    it('deve testar os botões de paginação (Anterior e Próxima)', async () => {
      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          data: [],
          pagination: { page: 2, totalPages: 3 }
        })
      });

      render(<AdminAudit />);
      await waitFor(() => expect(screen.getByText('Página 2 de 3')).toBeInTheDocument());

      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: [], pagination: { page: 1, totalPages: 3 } })
      });
      fireEvent.click(screen.getByRole('button', { name: /Anterior/i }));
      await waitFor(() => expect(screen.getByText('Página 1 de 3')).toBeInTheDocument());

      global.fetch.mockResolvedValueOnce({
        status: 200,
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ data: [], pagination: { page: 2, totalPages: 3 } })
      });
      fireEvent.click(screen.getByRole('button', { name: /Próxima/i }));
      await waitFor(() => expect(screen.getByText('Página 2 de 3')).toBeInTheDocument());
    });
  });
});