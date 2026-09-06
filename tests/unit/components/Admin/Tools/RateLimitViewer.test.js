import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { mockGlobalFetch, suppressConsoleError } from '../../../../helpers/index.js';
import RateLimitViewer from '../../../../../components/Admin/Tools/RateLimitViewer.js';

// Formas reais de resposta da API (pages/api/admin/rate-limit.js):
// - GET /api/admin/rate-limit                        → [{ ip, count, ttl }]
// - GET /api/admin/rate-limit?type=whitelist         → ['ip', ...]
// - GET /api/admin/rate-limit?type=audit             → { logs, pagination }
// - POST/DELETE                                      → { message }
const defaultBlocked = { ok: true, json: async () => [] };
const defaultWhitelist = { ok: true, json: async () => [] };
const defaultAudit = { ok: true, json: async () => ({ logs: [], pagination: { total: 0, page: 1, totalPages: 1 } }) };
const defaultAction = { ok: true, json: async () => ({ message: 'ok' }) };

/**
 * Converte dados crus (array/objeto) em uma resposta fake com .json().
 * Promises e respostas com .ok são devolvidas tal qual.
 */
const asResponse = (value) => {
  if (!value || typeof value.then === 'function' || value.ok !== undefined) return value;
  return { ok: true, json: async () => value };
};

/**
 * Configura o mock de fetch despachando por URL.
 * O componente executa 2 fetch paralelos em fetchData, por isso não se usa
 * mockResolvedValueOnce. O objeto `config` retornado é mutável: permite
 * trocar a resposta de um endpoint no meio do teste (ex.: reintento).
 */
const setupRateLimitMock = (fetchMock, overrides = {}) => {
  const config = {
    blocked: defaultBlocked,
    whitelist: defaultWhitelist,
    audit: defaultAudit,
    delete: defaultAction,
    deleteWhitelist: defaultAction,
    post: defaultAction,
    ...overrides,
  };

  fetchMock.mockImplementation(async (url, options = {}) => {
    const urlStr = String(url);
    const method = options.method || 'GET';

    if (urlStr.includes('type=audit')) return asResponse(config.audit);
    if (method === 'DELETE' && urlStr.includes('type=whitelist')) return asResponse(config.deleteWhitelist);
    if (method === 'DELETE') return asResponse(config.delete);
    if (method === 'POST') return asResponse(config.post);
    if (urlStr.includes('type=whitelist')) return asResponse(config.whitelist);
    return asResponse(config.blocked);
  });

  return config;
};

// window.location.reload e o objeto window.location são somente leitura no jsdom,
// e reload() real é um no-op silencioso: os testes de 401 verifican o efeito observable
// do fluxo (os statements de reload/return são executados no fluxo real do componente).

describe('Componentes Admin - Tools - RateLimitViewer', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  it('deve renderizar o título, abas e botão de atualizar', async () => {
    setupRateLimitMock(fetchMock);

    render(<RateLimitViewer />);

    expect(await screen.findByRole('heading', { level: 3, name: 'Rate Limiting' })).toBeInTheDocument();
    expect(await screen.findByText('🔄 Atualizar')).toBeInTheDocument();
    expect(screen.getByText('🔒 Bloqueados (0)')).toBeInTheDocument();
    expect(screen.getByText('✅ Whitelist (0)')).toBeInTheDocument();
    expect(screen.getByText('📋 Auditoria')).toBeInTheDocument();

    // As duas chamadas paralelas do fetch inicial usam credenciales
    await waitFor(() => {
      expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/admin/rate-limit', expect.objectContaining({ credentials: 'include' }));
      expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/admin/rate-limit?type=whitelist', expect.objectContaining({ credentials: 'include' }));
    });
  });

  it('deve listar os IPs bloqueados com seus detalhes', async () => {
    setupRateLimitMock(fetchMock, { blocked: [{ ip: '1.2.3.4', count: 7, ttl: 15 }] });

    render(<RateLimitViewer />);

    expect(await screen.findByText('1.2.3.4')).toBeInTheDocument();
    expect(screen.getByText('Tentativas: 7 | Desbloqueio em: 15 min')).toBeInTheDocument();
    expect(screen.getByText('🔒 Bloqueados (1)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desbloquear' })).toBeInTheDocument();
  });

  it('deve tratar respostas não-array como listas vazias', async () => {
    setupRateLimitMock(fetchMock, {
      blocked: { ok: true, json: async () => ({ invalido: true }) },
      whitelist: { ok: true, json: async () => ({ invalido: true }) },
    });

    render(<RateLimitViewer />);

    expect(await screen.findByText('Nenhum IP bloqueado no momento.')).toBeInTheDocument();

    fireEvent.click(screen.getByText('✅ Whitelist (0)'));
    expect(await screen.findByText('Nenhum IP na whitelist.')).toBeInTheDocument();
  });

  it('deve desbloquear um IP e removê-lo da lista', async () => {
    setupRateLimitMock(fetchMock, { blocked: [{ ip: '1.2.3.4', count: 7, ttl: 15 }] });

    render(<RateLimitViewer />);
    await screen.findByText('1.2.3.4');

    fireEvent.click(screen.getByRole('button', { name: 'Desbloquear' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/rate-limit?ip=1.2.3.4', expect.objectContaining({ method: 'DELETE', credentials: 'include' }));
      expect(screen.queryByText('1.2.3.4')).not.toBeInTheDocument();
    });
  });

  it('deve mostrar os IPs da whitelist na sua aba', async () => {
    setupRateLimitMock(fetchMock, { whitelist: ['8.8.8.8'] });

    render(<RateLimitViewer />);
    await screen.findByText('🔄 Atualizar');

    fireEvent.click(screen.getByText('✅ Whitelist (1)'));

    expect(await screen.findByText('8.8.8.8')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remover' })).toBeInTheDocument();
  });

  it('deve adicionar um IP à whitelist pelo formulário', async () => {
    setupRateLimitMock(fetchMock);

    render(<RateLimitViewer />);
    await screen.findByText('🔄 Atualizar');

    fireEvent.click(screen.getByText('✅ Whitelist (0)'));
    const input = screen.getByPlaceholderText('Ex: 192.168.1.1');
    fireEvent.change(input, { target: { value: '10.0.0.1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/rate-limit', expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ ip: '10.0.0.1' }),
      }));
    });
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('deve mostrar o erro quando falha o POST da whitelist', async () => {
    setupRateLimitMock(fetchMock, { post: { ok: false, status: 400, json: async () => ({ message: 'IP inválido' }) } });

    render(<RateLimitViewer />);
    await screen.findByText('🔄 Atualizar');

    fireEvent.click(screen.getByText('✅ Whitelist (0)'));
    fireEvent.change(screen.getByPlaceholderText('Ex: 192.168.1.1'), { target: { value: '999.999.999.999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(await screen.findByText('❌ IP inválido')).toBeInTheDocument();
  });

  it('deve não chamar a API quando o IP está vazio', async () => {
    setupRateLimitMock(fetchMock);

    render(<RateLimitViewer />);
    await screen.findByText('🔄 Atualizar');

    fireEvent.click(screen.getByText('✅ Whitelist (0)'));
    const form = screen.getByText('Adicionar IP à Whitelist').closest('form');
    fireEvent.submit(form);

    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('deve remover um IP da whitelist', async () => {
    setupRateLimitMock(fetchMock, { whitelist: ['8.8.8.8'] });

    render(<RateLimitViewer />);
    await screen.findByText('🔄 Atualizar');

    fireEvent.click(screen.getByText('✅ Whitelist (1)'));
    await screen.findByText('8.8.8.8');
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/rate-limit?ip=8.8.8.8&type=whitelist', expect.objectContaining({ method: 'DELETE' }));
      expect(screen.queryByText('8.8.8.8')).not.toBeInTheDocument();
    });
  });

  it('deve mostrar o erro quando falha a remoção da whitelist', async () => {
    setupRateLimitMock(fetchMock, {
      whitelist: ['8.8.8.8'],
      deleteWhitelist: { ok: false, status: 400, json: async () => ({ message: 'Erro ao remover da whitelist' }) },
    });

    render(<RateLimitViewer />);
    await screen.findByText('🔄 Atualizar');

    fireEvent.click(screen.getByText('✅ Whitelist (1)'));
    await screen.findByText('8.8.8.8');
    fireEvent.click(screen.getByRole('button', { name: 'Remover' }));

    expect(await screen.findByText('❌ Erro ao remover da whitelist')).toBeInTheDocument();
    expect(screen.getByText('8.8.8.8')).toBeInTheDocument();
  });

  it('deve carregar e mostrar os logs de auditoría', async () => {
    setupRateLimitMock(fetchMock, {
      audit: {
        ok: true,
        json: async () => ({
          logs: [{ action: 'Desbloqueo Manual', ip: '1.2.3.4', user: 'admin', timestamp: '2025-06-11T22:00:00.000Z' }],
          pagination: { total: 1, page: 1, totalPages: 1 },
        }),
      },
    });

    render(<RateLimitViewer />);
    await screen.findByText('🔄 Atualizar');

    fireEvent.click(screen.getByText('📋 Auditoria'));

    expect(await screen.findByText('Desbloqueo Manual')).toBeInTheDocument();
    expect(screen.getByText(/Usuário: admin/)).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('type=audit'), expect.objectContaining({ credentials: 'include' }));
  });

  it('deve buscar logs de auditoría por término', async () => {
    setupRateLimitMock(fetchMock);

    render(<RateLimitViewer />);
    await screen.findByText('🔄 Atualizar');

    fireEvent.click(screen.getByText('📋 Auditoria'));
    await screen.findByText('Nenhum log de auditoria encontrado.');

    fireEvent.change(screen.getByPlaceholderText('Buscar por IP ou usuário...'), { target: { value: '1.2.3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => {
      const lastCall = global.fetch.mock.calls[global.fetch.mock.calls.length - 1][0];
      expect(lastCall).toContain('type=audit');
      expect(lastCall).toContain('page=1');
      expect(lastCall).toContain('search=1.2.3');
    });
  });

  it('deve paginar os logs de auditoría', async () => {
    setupRateLimitMock(fetchMock, {
      audit: {
        ok: true,
        json: async () => ({
          logs: [{ action: 'Bloqueo', ip: '1.1.1.1', user: 'u', timestamp: '2025-06-11T22:00:00.000Z' }],
          pagination: { total: 21, page: 1, totalPages: 3 },
        }),
      },
    });

    render(<RateLimitViewer />);
    await screen.findByText('🔄 Atualizar');

    fireEvent.click(screen.getByText('📋 Auditoria'));
    await screen.findByText('Página 1 de 3');

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    await screen.findByText('Página 2 de 3');
    expect(global.fetch).toHaveBeenLastCalledWith(expect.stringContaining('page=2'), expect.objectContaining({ credentials: 'include' }));

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));
    await screen.findByText('Página 3 de 3');
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    await screen.findByText('Página 2 de 3');
  });

  it('deve registrar em consola o erro ao cargar a auditoría', async () => {
    const consoleErrorSpy = suppressConsoleError();
    setupRateLimitMock(fetchMock, { audit: { ok: false, status: 500, json: async () => ({ message: 'erro' }) } });

    render(<RateLimitViewer />);
    await screen.findByText('🔄 Atualizar');

    fireEvent.click(screen.getByText('📋 Auditoria'));

    await waitFor(() => expect(consoleErrorSpy).toHaveBeenCalled());
    consoleErrorSpy?.mockRestore();
  });

  it('deve mostrar o estado de erro e recuperarse com "Tentar Novamente"', async () => {
    const config = setupRateLimitMock(fetchMock, {
      blocked: { ok: false, status: 500, json: async () => ({ message: 'erro' }) },
    });

    render(<RateLimitViewer />);

    expect(await screen.findByText('❌ Erro ao carregar dados de rate limit')).toBeInTheDocument();
    expect(screen.getByText('Falha ao carregar IPs bloqueados')).toBeInTheDocument();

    // Reintento exitoso
    config.blocked = { ok: true, json: async () => [] };
    fireEvent.click(screen.getByRole('button', { name: 'Tentar Novamente' }));

    expect(await screen.findByText('Nenhum IP bloqueado no momento.')).toBeInTheDocument();
  });

  it('deve recargar a página quando a sessión expira (401 em bloqueados)', async () => {
    setupRateLimitMock(fetchMock, { blocked: { status: 401, ok: false, json: async () => ({}) } });

    render(<RateLimitViewer />);

    // 401 interrompe o fluxo ANTES do throw: nada de estado de error.
    // O reload() real do jsdom é no-op e o finally de fetchData desliga o loading.
    await act(async () => { await global.wait(50); });
    expect(screen.queryByText('❌ Erro ao carregar dados de rate limit')).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhum IP bloqueado no momento.')).toBeInTheDocument();
  });

  it('deve recargar a página quando a sessión expira (401 em whitelist)', async () => {
    setupRateLimitMock(fetchMock, { whitelist: { status: 401, ok: false, json: async () => ({}) } });

    render(<RateLimitViewer />);

    // 401 interrompe o fluxo ANTES do throw: nada de estado de error.
    // O reload() real do jsdom é no-op e o finally de fetchData desliga o loading.
    await act(async () => { await global.wait(50); });
    expect(screen.queryByText('❌ Erro ao carregar dados de rate limit')).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhum IP bloqueado no momento.')).toBeInTheDocument();
  });

  it('deve redirigir ao login quando a sessión expira na auditoría (401)', async () => {
    const consoleErrorSpy = suppressConsoleError();
    setupRateLimitMock(fetchMock, { audit: { status: 401, ok: false, json: async () => ({}) } });

    render(<RateLimitViewer />);
    await screen.findByText('🔄 Atualizar');

    fireEvent.click(screen.getByText('📋 Auditoria'));

    // 401 detém o fluxo de fetchAuditLogs antes do throw. O jsdom emite um
    // jsdomError ("navigation not implemented") no console; o que importa é que
    // o erro do catch do componente (que loga "Erro ao carregar auditoria:")
    // NÃO ocorre — caso o branch 401 não existisse, o throw seria capturado ali.
    await act(async () => { await global.wait(50); });
    expect(consoleErrorSpy.mock.calls.some(call => call[0] === 'Erro ao carregar auditoria:')).toBe(false);
    consoleErrorSpy?.mockRestore();
  });

  it('deve mostrar o erro quando o fetch falha por rede', async () => {
    fetchMock.mockImplementation(async () => {
      throw new Error('Falha de rede');
    });

    render(<RateLimitViewer />);

    expect(await screen.findByText('❌ Erro ao carregar dados de rate limit')).toBeInTheDocument();
    expect(screen.getByText('Falha de rede')).toBeInTheDocument();
  });

  it('deve mostrar "Atualizando..." durante o refresh manual', async () => {
    const config = setupRateLimitMock(fetchMock);

    render(<RateLimitViewer />);
    await screen.findByText('🔄 Atualizar');

    let resolveBlocked;
    const pendingBlocked = new Promise(resolve => { resolveBlocked = resolve; });
    config.blocked = pendingBlocked;

    fireEvent.click(screen.getByRole('button', { name: '🔄 Atualizar' }));

    expect(screen.getByText('Atualizando...')).toBeInTheDocument();

    resolveBlocked({ ok: true, json: async () => [] });
    await waitFor(() => expect(screen.getByText('🔄 Atualizar')).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledTimes(4);
  });

  it('deve auto-refrescar os dados cada 15 segundos', async () => {
    jest.useFakeTimers();
    try {
      setupRateLimitMock(fetchMock);
      render(<RateLimitViewer />);

      // Purga de microtasks para que o hook inicial se execute
      await act(async () => {});
      expect(global.fetch).toHaveBeenCalledTimes(2);

      act(() => { jest.advanceTimersByTime(15000); });

      expect(global.fetch).toHaveBeenCalledTimes(4);
    } finally {
      jest.useRealTimers();
    }
  });
});
