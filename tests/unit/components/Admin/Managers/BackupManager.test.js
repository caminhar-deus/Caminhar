import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import BackupManager from '../../../../../components/Admin/Managers/BackupManager.js';
import { suppressConsoleError, createConfirmSpy, mockGlobalFetch } from '../../../../helpers/index.js';

describe('Componentes Admin - BackupManager', () => {
  let consoleErrorSpy;
  let confirmSpy;
  let fetchMock;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
    confirmSpy = createConfirmSpy(false);
    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    confirmSpy?.mockRestore();
    fetchMock?.mockRestore();
  });

  it('deve carregar e exibir as informações do último backup no mount', async () => {
    global.fetch.mockResolvedValueOnce({
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
    expect(screen.getByText(/2.00 KB/i)).toBeInTheDocument();
  });

  it('deve exibir fallback se não houver backups na resposta da API', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ latest: null }) });
    render(<BackupManager />);

    await waitFor(() => {
      expect(screen.getByText(/Nenhum backup encontrado/i)).toBeInTheDocument();
    });
  });

  it('deve lidar com erro na busca inicial de backups de forma segura (catch)', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Falha de Rede Inicial'));
    render(<BackupManager />);

    await waitFor(() => {
      expect(console.error).toHaveBeenCalledWith('Erro ao buscar backups:', expect.any(Error));
      expect(screen.getByText(/Nenhum backup encontrado/i)).toBeInTheDocument();
    });
  });

  it('deve abortar a criação do backup se o usuário cancelar o confirm', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ latest: null }) });
    confirmSpy.mockReturnValueOnce(false);

    render(<BackupManager />);
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Realizar Backup Agora/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('deve criar um novo backup com sucesso e recarregar a lista', async () => {
    confirmSpy.mockReturnValueOnce(true);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ latest: null }) });
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ message: 'ok' }) });
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ latest: { name: 'novo.sql', date: new Date(), size: 1024 } }) });

    render(<BackupManager />);
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Realizar Backup Agora/i }));
    expect(screen.getByRole('button', { name: /Criando Backup/i })).toBeDisabled();

    await waitFor(() => expect(screen.getByText('✅ Backup realizado com sucesso!')).toBeInTheDocument());
    expect(screen.getByText('📄 novo.sql')).toBeInTheDocument();
  });

  it('deve exibir erros retornados pela API (ex: falha de script de dump) e do Try/Catch', async () => {
    confirmSpy.mockReturnValue(true);
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ latest: null }) });

    render(<BackupManager />);

    global.fetch.mockRejectedValueOnce(new Error('Conexão perdida'));
    fireEvent.click(screen.getByRole('button', { name: /Realizar Backup Agora/i }));
    await waitFor(() => expect(screen.getByText('❌ Erro de conexão ao criar backup')).toBeInTheDocument());
  });

  it('deve exibir mensagem de erro quando a API falha ao criar o backup (ok: false)', async () => {
    confirmSpy.mockReturnValue(true);
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ latest: null }) });

    render(<BackupManager />);
    await waitFor(() => expect(screen.queryByText(/Carregando/i)).not.toBeInTheDocument());

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ message: 'Espaço insuficiente no disco' }) });
    fireEvent.click(screen.getByRole('button', { name: /Realizar Backup Agora/i }));

    await waitFor(() => expect(screen.getByText('❌ Erro: Espaço insuficiente no disco')).toBeInTheDocument());
  });
});