import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import BackupManager from './BackupManager.js';

// Mocks globais para Fetch e Window.Confirm
const mockFetch = jest.fn();
global.fetch = mockFetch;
window.confirm = jest.fn();

describe('Componentes Admin - BackupManager', () => {
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.error = jest.fn(); // Suprime logs de erro intencionais do terminal
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve carregar e exibir as informações do último backup no mount', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        latest: { name: 'meubackup.sql', date: '2026-04-08T10:00:00.000Z', size: 2048 }
      })
    });

    render(<BackupManager />);
    
    expect(screen.getByText(/Carregando informações/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('📄 meubackup.sql')).toBeInTheDocument();
    });
    // Valida cálculo de KB (2048 / 1024 = 2.00)
    expect(screen.getByText(/2.00 KB/i)).toBeInTheDocument();
  });

  it('deve exibir fallback se não houver backups na resposta da API', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ latest: null }) });
    render(<BackupManager />);
    
    await waitFor(() => {
      expect(screen.getByText(/Nenhum backup encontrado/i)).toBeInTheDocument();
    });
  });

  it('deve lidar com erro na busca inicial de backups de forma segura (catch)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Falha de Rede Inicial'));
    render(<BackupManager />);
    
    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Erro ao buscar backups:', expect.any(Error));
      expect(screen.getByText(/Nenhum backup encontrado/i)).toBeInTheDocument();
    });
  });

  it('deve abortar a criação do backup se o usuário cancelar o confirm', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ latest: null }) });
    window.confirm.mockReturnValueOnce(false); // Usuário clica em Cancelar
    
    render(<BackupManager />);
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Realizar Backup Agora/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1); // Apenas o GET inicial disparou, o POST foi cancelado
  });

  it('deve criar um novo backup com sucesso e recarregar a lista', async () => {
    window.confirm.mockReturnValueOnce(true); // Confirmação Aceita
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ latest: null }) }); // GET mount
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'ok' }) }); // POST criar
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ latest: { name: 'novo.sql', date: new Date(), size: 1024 }}) }); // GET atualizar

    render(<BackupManager />);
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Realizar Backup Agora/i }));
    expect(screen.getByRole('button', { name: /Criando Backup/i })).toBeDisabled();

    await waitFor(() => expect(screen.getByText('✅ Backup realizado com sucesso!')).toBeInTheDocument());
    expect(screen.getByText('📄 novo.sql')).toBeInTheDocument();
  });

  it('deve exibir erros retornados pela API (ex: falha de script de dump) e do Try/Catch', async () => {
    window.confirm.mockReturnValue(true);
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ latest: null }) }); // GET mount
    
    const { rerender } = render(<BackupManager />);
    
    // Testa a rejeição (falha de fetch ou timeout)
    mockFetch.mockRejectedValueOnce(new Error('Conexão perdida'));
    fireEvent.click(screen.getByRole('button', { name: /Realizar Backup Agora/i }));
    await waitFor(() => expect(screen.getByText('❌ Erro de conexão ao criar backup')).toBeInTheDocument());
  });

  it('deve exibir mensagem de erro quando a API falha ao criar o backup (ok: false)', async () => {
    window.confirm.mockReturnValue(true);
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ latest: null }) }); // GET mount
    
    render(<BackupManager />);
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument());

    // Simula a API recusando a criação do backup (ex: erro 400/500)
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Espaço insuficiente no disco' }) }); // POST criar
    fireEvent.click(screen.getByRole('button', { name: /Realizar Backup Agora/i }));
    
    await waitFor(() => expect(screen.getByText('❌ Erro: Espaço insuficiente no disco')).toBeInTheDocument());
  });
});