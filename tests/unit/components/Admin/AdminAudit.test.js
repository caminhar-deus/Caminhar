import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminAudit from '../../../../components/Admin/AdminAudit.js';
import toast from 'react-hot-toast';

jest.mock('react-hot-toast', () => ({ error: jest.fn(), success: jest.fn() }));

const mockReload = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({ reload: mockReload })
}));

describe('Componente Front-End - AdminAudit', () => {
  const originalFetch = global.fetch;
  const originalCreateObjectURL = global.URL.createObjectURL;
  
  beforeEach(() => { 
    jest.clearAllMocks();
    global.fetch = jest.fn(); 
    global.URL.createObjectURL = jest.fn(() => 'blob:test');
  });
  
  afterEach(() => { 
    global.fetch = originalFetch; 
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
});