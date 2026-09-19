import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import IntegrityCheck from '../../../../../components/Admin/Tools/IntegrityCheck.js';
import {
  mockFetch,
  mockFetchSuccess,
  mockFetchError,
  mockFetchNetworkError,
  clearFetchMock,
} from '../../../../mocks/fetch.js';
import { suppressConsoleError } from '../../../../helpers/console.js';

const mockIntegrityData = {
  status: 'healthy',
  timestamp: '2025-06-11T22:00:00.000Z',
  checks: {
    database: {
      status: 'ok',
      label: 'Banco de Dados',
      details: {
        connected: true,
        latency: '5ms',
        size: '12 MB',
        connections: 3,
      },
    },
    cache: {
      status: 'ok',
      label: 'Cache',
      details: {
        connected: true,
        type: 'Redis',
      },
    },
    storage: {
      status: 'ok',
      label: 'Armazenamento',
      details: {
        totalFiles: 42,
        totalSize: '156 MB',
        diskFree: '45 GB',
        diskTotal: '100 GB',
      },
    },
    backup: {
      status: 'ok',
      label: 'Backup',
      details: {
        totalBackups: 10,
        lastBackup: {
          name: 'backup-2025-06-10.sql.gz',
          size: '8.5 MB',
          age: '2 dias atrás',
        },
      },
    },
    system: {
      status: 'ok',
      label: 'Sistema',
      details: {
        nodeVersion: 'v20.11.0',
        uptime: '3 dias',
        memoryUsage: '45%',
        cpuCores: 4,
        platform: 'linux',
        arch: 'x64',
        env: 'test',
      },
    },
  },
};

describe('Componentes Admin - Tools - IntegrityCheck', () => {
  beforeEach(() => {
    global.fetch = mockFetchSuccess(mockIntegrityData, {
      headers: { 'content-type': 'application/json' },
    });
  });

  afterEach(() => {
    clearFetchMock();
  });

  it('deve renderizar o título e o texto descritivo corretamente', async () => {
    render(<IntegrityCheck />);

    expect(await screen.findByRole('heading', { level: 3, name: 'Verificação de Integridade' })).toBeInTheDocument();
    expect(await screen.findByText('Sistema operacional')).toBeInTheDocument();
  });

  it('deve exibir o status geral saudável', async () => {
    render(<IntegrityCheck />);

    expect(await screen.findByText('✅ Sistema Saudável')).toBeInTheDocument();
  });

  it('deve listar os checks retornados pela API', async () => {
    render(<IntegrityCheck />);

    expect(await screen.findByText('Banco de Dados')).toBeInTheDocument();
    expect(await screen.findByText('Cache')).toBeInTheDocument();
    expect(await screen.findByText('Armazenamento')).toBeInTheDocument();
    expect(await screen.findByText('Backup')).toBeInTheDocument();
    expect(await screen.findByText('Sistema')).toBeInTheDocument();
  });

  it('deve exibir detalhes do sistema corretamente', async () => {
    render(<IntegrityCheck />);

    expect(await screen.findByText('v20.11.0')).toBeInTheDocument();
    expect(await screen.findByText('linux (x64)')).toBeInTheDocument();
  });

  it('deve exibir o estado de erro e recuperar com "Tentar Novamente" quando a API falha', async () => {
    global.fetch = mockFetchError(500, { message: 'Falha no servidor' });

    render(<IntegrityCheck />);

    expect(await screen.findByText('❌ Erro ao carregar verificação de integridade')).toBeInTheDocument();
    expect(screen.getByText('Falha no servidor')).toBeInTheDocument();

    // Reintento exitoso
    global.fetch = mockFetchSuccess(mockIntegrityData, {
      headers: { 'content-type': 'application/json' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tentar Novamente' }));

    expect(await screen.findByText('✅ Sistema Saudável')).toBeInTheDocument();
    expect(screen.queryByText('❌ Erro ao carregar verificação de integridade')).not.toBeInTheDocument();
  });

  it('deve usar mensagem de fallback quando o erro HTTP não traz message', async () => {
    global.fetch = mockFetchError(503, {});

    render(<IntegrityCheck />);

    expect(await screen.findByText('Erro 503 ao carregar integridade')).toBeInTheDocument();
  });

  it('deve exibir o erro quando o fetch falha por rede', async () => {
    global.fetch = mockFetchNetworkError('Falha de rede');

    render(<IntegrityCheck />);

    expect(await screen.findByText('❌ Erro ao carregar verificação de integridade')).toBeInTheDocument();
    expect(screen.getByText('Falha de rede')).toBeInTheDocument();
  });

  it('deve exibir erro quando o servidor responde sem JSON (content-type inválido)', async () => {
    global.fetch = mockFetchSuccess('<html>erro</html>', {
      headers: { 'content-type': 'text/html' },
    });

    render(<IntegrityCheck />);

    expect(
      await screen.findByText('O servidor retornou uma resposta inesperada. Tente novamente.')
    ).toBeInTheDocument();
  });

  it('deve exibir erro quando o servidor não informa o content-type', async () => {
    global.fetch = mockFetchSuccess(mockIntegrityData);

    render(<IntegrityCheck />);

    expect(
      await screen.findByText('O servidor retornou uma resposta inesperada. Tente novamente.')
    ).toBeInTheDocument();
  });

  // window.location e window.location.reload são somente leitura no jsdom
  // (Object.defineProperty lança TypeError) e reload() real não navega: emite
  // o jsdomError "Not implemented: navigation (except hash changes)" de forma
  // síncrona. Essa evidência no console é o que torna a navegação observável.
  it('deve recarregar a página quando a sessão expira (401)', async () => {
    const consoleErrorSpy = suppressConsoleError();
    global.fetch = mockFetchError(401, { message: 'Unauthorized' });

    render(<IntegrityCheck />);

    expect(await screen.findByText('🔄 Atualizar')).toBeInTheDocument();
    expect(screen.queryByText('❌ Erro ao carregar verificação de integridade')).not.toBeInTheDocument();

    // Evidência observável de que a navegação foi de fato solicitada: sem o
    // reload (ou sem o branch 401), nenhum jsdomError de navegação é emitido.
    expect(
      consoleErrorSpy.mock.calls.some(call =>
        call.some(arg => String(arg?.message ?? arg).includes('Not implemented: navigation'))
      )
    ).toBe(true);

    consoleErrorSpy?.mockRestore();
  });

  it('deve recarregar os dados ao clicar em Atualizar (refresh manual)', async () => {
    render(<IntegrityCheck />);
    expect(await screen.findByText('v20.11.0')).toBeInTheDocument();

    const refreshedData = {
      ...mockIntegrityData,
      checks: {
        ...mockIntegrityData.checks,
        system: {
          ...mockIntegrityData.checks.system,
          details: { ...mockIntegrityData.checks.system.details, nodeVersion: 'v24.19.0' },
        },
      },
    };
    const refreshMock = mockFetchSuccess(refreshedData, {
      headers: { 'content-type': 'application/json' },
    });
    global.fetch = refreshMock;

    fireEvent.click(screen.getByRole('button', { name: '🔄 Atualizar' }));

    expect(await screen.findByText('v24.19.0')).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledWith('/api/admin/integrity', { credentials: 'include' });

    // O estado de refreshing deve ser encerrado no finally: sem isso o botão
    // permaneceria travado em "Atualizando..." e desabilitado para sempre.
    expect(await screen.findByRole('button', { name: '🔄 Atualizar' })).toBeEnabled();
  });

  it('deve exibir "Atualizando..." e desabilitar o botão durante o refresh manual', async () => {
    render(<IntegrityCheck />);
    expect(await screen.findByText('✅ Sistema Saudável')).toBeInTheDocument();

    // A resposta fica pendente em response.json() para observar o estado refreshing
    global.fetch = mockFetch(() => new Promise(() => {}), {
      headers: { 'content-type': 'application/json' },
    });

    fireEvent.click(screen.getByRole('button', { name: '🔄 Atualizar' }));

    expect(await screen.findByText('Atualizando...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Atualizando...' })).toBeDisabled();
  });

  // ── Auto-refresh (30s) ───────────────────────────────────────
  it('deve atualizar automaticamente a cada 30 segundos', async () => {
    jest.useFakeTimers();
    try {
      render(<IntegrityCheck />);

      // Purga de microtasks para que o fetch inicial do useEffect se execute
      await act(async () => {});
      expect(global.fetch).toHaveBeenCalledTimes(1);

      act(() => { jest.advanceTimersByTime(30000); });

      expect(global.fetch).toHaveBeenCalledTimes(2);

      // Drena as promessas do refresh automático dentro do act
      await act(async () => {});
    } finally {
      jest.useRealTimers();
    }
  });

  it('deve interromper o auto-refresh ao desmontar o componente', async () => {
    jest.useFakeTimers();
    try {
      const { unmount } = render(<IntegrityCheck />);

      await act(async () => {});
      expect(global.fetch).toHaveBeenCalledTimes(1);

      unmount();

      // Sem o clearInterval no cleanup, o intervalo sobreviveria ao unmount
      act(() => { jest.advanceTimersByTime(60000); });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
