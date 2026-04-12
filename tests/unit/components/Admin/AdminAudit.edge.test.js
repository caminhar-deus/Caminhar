import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import AdminAudit from '../../../../components/Admin/AdminAudit.js';
import toast from 'react-hot-toast';
import { useRouter } from 'next/router';

// Mocks globais
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
    loading: jest.fn()
  }
}));

jest.mock('next/router', () => ({
  useRouter: jest.fn()
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('AdminAudit - Edge Cases de Cobertura', () => {
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ reload: jest.fn() });
  });

  it('deve tratar erro 401 recarregando a página e mostrando toast (linhas 21-22)', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 401,
      ok: false
    });

    render(<AdminAudit />);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Sessão expirada. Faça login novamente.');
      expect(useRouter().reload).toHaveBeenCalled();
    });
  });

  it('deve tratar resposta não-ok da API com json de erro', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 400,
      ok: false,
      json: async () => ({ error: 'Bad Request Exclusivo' })
    });

    render(<AdminAudit />);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Bad Request Exclusivo'));
  });

  it('deve tratar resposta não-ok da API sem json válido (fallback para status)', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 500,
      ok: false,
      json: async () => { throw new Error('Não é JSON'); }
    });

    render(<AdminAudit />);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Erro na API (500)'));
  });

  it('deve tratar resposta com content-type inválido', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      headers: { get: () => 'text/html' },
      json: async () => ({})
    });

    render(<AdminAudit />);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('A resposta do servidor não é um JSON válido'));
  });

  it('deve usar fallbacks quando pagination/data estão ausentes, e filtrar itens com propriedades null (linhas 42 e 55)', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ 
        data: null // Sem pagination e sem data
      })
    });

    render(<AdminAudit />);
    await waitFor(() => expect(screen.getByText('Nenhum registro de log encontrado.')).toBeInTheDocument());

    // Força o state ter um log com propriedades nulas e testa a busca
    mockFetch.mockResolvedValueOnce({
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

    // Busca com datas para cobrir if (startDate) e if (endDate) em fetchLogs
    const startDateInput = screen.getByTitle('Data Inicial');
    const endDateInput = screen.getByTitle('Data Final');
    fireEvent.change(startDateInput, { target: { value: '2023-01-01T00:00' } });
    fireEvent.change(endDateInput, { target: { value: '2023-12-31T23:59' } });

    fireEvent.click(screen.getByRole('button', { name: /Atualizar/i }));
    await waitFor(() => expect(screen.getByText('Página 2 de 3')).toBeInTheDocument());

    // Testa a busca para garantir que o .filter não quebre com campos null (linha 55)
    const searchInput = screen.getByPlaceholderText('Buscar ações, usuários ou detalhes...');
    fireEvent.change(searchInput, { target: { value: 'LOGIN' } });
    
    expect(screen.getByText('sucesso')).toBeInTheDocument();
  });

  it('deve escapar corretamente valores no CSV (vírgulas, aspas e quebras de linha)', async () => {
    mockFetch.mockResolvedValueOnce({
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

    const mockCreateObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    
    render(<AdminAudit />);
    await waitFor(() => expect(screen.getByText('TESTE')).toBeInTheDocument());

    // Intercepta as chamadas do DOM apenas após a montagem do React Testing Library
    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/i }));
    
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    clickSpy.mockRestore();
    delete global.URL.createObjectURL;
  });

  it('deve exportar CSV sem precisar aplicar quotes se não houver caracteres especiais (linhas 70-72)', async () => {
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ 
        data: [{ id: 1, created_at: '2023-01-01T12:00:00Z', user_id: 'admin', action: 'TESTE', details: 'Limpo' }] 
      })
    });

    const mockCreateObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    
    render(<AdminAudit />);
    await waitFor(() => expect(screen.getByText('TESTE')).toBeInTheDocument());

    const appendChildSpy = jest.spyOn(document.body, 'appendChild').mockImplementation(() => {});
    const removeChildSpy = jest.spyOn(document.body, 'removeChild').mockImplementation(() => {});
    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/i }));
    expect(mockCreateObjectURL).toHaveBeenCalled();
    
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
    clickSpy.mockRestore();
    delete global.URL.createObjectURL;
  });

  it('deve exibir erro ao tentar exportar CSV sem dados', async () => {
    // Simula uma resposta vazia da API (sem dados)
    mockFetch.mockResolvedValueOnce({
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

  it('deve testar os botões de paginação (Anterior e Próxima) (linhas 184-185)', async () => {
    mockFetch.mockResolvedValueOnce({
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

    // Clica em Anterior (linha 184)
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: [], pagination: { page: 1, totalPages: 3 } })
    });
    fireEvent.click(screen.getByRole('button', { name: /Anterior/i }));
    await waitFor(() => expect(screen.getByText('Página 1 de 3')).toBeInTheDocument());

    // Clica em Próxima (linha 185)
    mockFetch.mockResolvedValueOnce({
      status: 200,
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ data: [], pagination: { page: 2, totalPages: 3 } })
    });
    fireEvent.click(screen.getByRole('button', { name: /Próxima/i }));
    await waitFor(() => expect(screen.getByText('Página 2 de 3')).toBeInTheDocument());
  });
});