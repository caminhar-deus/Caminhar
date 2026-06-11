import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import IntegrityCheck from '../../../../../components/Admin/Tools/IntegrityCheck.js';
import { mockFetchSuccess, clearFetchMock } from '../../../../mocks/fetch.js';

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
});
