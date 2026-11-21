import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { mockGlobalFetch, suppressConsoleError } from '../../helpers/index.js';
import '../../mocks/next-setup.js';
import { useRouter } from 'next/router';
import { notifyAdminUnauthorized } from '../../../utils/adminSession.js';

const mockReplace = jest.fn();
const mockReload = jest.fn();

jest.mock('react-easy-crop', () => {
  return function DummyCropper() {
    return <div data-testid="mock-cropper" />;
  };
});

jest.mock('../../../components/Admin/AdminDashboard', () => {
  return function DummyAdminDashboard() {
    return <div data-testid="admin-dashboard">Painel Visão Geral</div>;
  };
});

jest.mock('../../../components/Admin/AdminPosts', () => {
  return function DummyAdminPosts() {
    return <div data-testid="admin-posts">Painel Posts</div>;
  };
});

jest.mock('../../../components/Admin/AdminMusicas', () => {
  return function DummyAdminMusicas() {
    return <div data-testid="admin-musicas">Painel Músicas</div>;
  };
});

jest.mock('../../../components/Admin/AdminVideos', () => {
  return function DummyAdminVideos() {
    return <div data-testid="admin-videos">Painel Vídeos</div>;
  };
});

jest.mock('../../../components/Admin/AdminProducts', () => {
  return function DummyAdminProducts() {
    return <div data-testid="admin-products">Painel Produtos</div>;
  };
});

jest.mock('../../../components/Admin/AdminSales', () => {
  return function DummyAdminSales() {
    return <div data-testid="admin-sales">Painel Vendas</div>;
  };
});

jest.mock('../../../components/Admin/AdminDicas', () => {
  return function DummyAdminDicas() {
    return <div data-testid="admin-dicas">Painel Dicas</div>;
  };
});

jest.mock('../../../components/Admin/Tools/IntegrityCheck', () => {
  return function DummyIntegrityCheck() {
    return <div data-testid="security-integrity">Integridade OK</div>;
  };
});

jest.mock('../../../components/Admin/Managers/BackupManager', () => {
  return function DummyBackupManager() {
    return <div data-testid="security-backup">Backup OK</div>;
  };
});

jest.mock('../../../components/Admin/Tools/RateLimitViewer', () => {
  return function DummyRateLimitViewer() {
    return <div data-testid="security-ratelimit">RateLimit OK</div>;
  };
});

jest.mock('../../../components/Admin/Managers/CacheManager', () => {
  return function DummyCacheManager() {
    return <div data-testid="security-cache">Cache OK</div>;
  };
});

jest.mock('../../../components/Admin/AdminUsers', () => {
  return function DummyAdminUsers() {
    return <div data-testid="admin-users">Painel Usuários</div>;
  };
});

jest.mock('../../../components/Admin/AdminAudit', () => {
  return function DummyAdminAudit() {
    return <div data-testid="admin-audit">Painel Auditoria</div>;
  };
});

import Admin from '../../../pages/admin.js';

const CANONICAL_TABS = [
  'Visão Geral',
  'Posts/Artigos',
  'Gestão de Músicas',
  'Gestão de Vídeos',
  'Gestão de Produtos',
  'Gestão de Vendas',
  'Gestão de Dicas',
  'Configuração de Cabeçalho',
  'Segurança',
  'Usuários',
  'Auditoria',
];

const setupAuthAndSettings = (fetchMock, user) => {
  fetchMock.mockImplementation(async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('/api/auth/check')) {
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true, data: { user } }),
      };
    }
    if (urlStr.includes('/api/settings')) {
      return {
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({
          site_title: 'O Caminhar com Deus',
          site_subtitle: 'Reflexões e ensinamentos sobre a fé, espiritualidade e a jornada cristã',
          home_image_url: '/uploads/hero.webp',
        }),
      };
    }
    if (urlStr.includes('/api/auth/logout')) {
      return { ok: true, json: async () => ({}) };
    }
    return { ok: true, headers: { get: () => 'application/json' }, json: async () => ({}) };
  });
};

describe('pages/admin.js — Navegação lateral esquerda recolhível e RBAC', () => {
  let fetchMock;
  let consoleErrorSpy;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
    consoleErrorSpy = suppressConsoleError();
    mockReplace.mockClear();
    mockReload.mockClear();
    useRouter.mockReturnValue({ replace: mockReplace, reload: mockReload });
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    fetchMock?.mockRestore();
    consoleErrorSpy?.mockRestore();
    localStorage.clear();
  });

  it('renderiza as 10 abas na ordem canônica na barra lateral esquerda para o admin e alterna recolher/expandir', async () => {
    setupAuthAndSettings(fetchMock, {
      id: 1,
      username: 'admin',
      role: 'admin',
      permissions: CANONICAL_TABS,
      permissionsLoaded: true,
    });

    render(<Admin />);

    expect(await screen.findByRole('heading', { level: 1, name: 'Painel Administrativo' })).toBeInTheDocument();

    const sidebarNav = screen.getByRole('navigation', { name: 'Seções do painel administrativo' });
    const navButtons = within(sidebarNav).getAllByRole('button');
    expect(navButtons.map((btn) => btn.textContent.trim())).toEqual(CANONICAL_TABS);

    // Aba inicial Visão Geral selecionada com aria-current="page"
    expect(navButtons[0]).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();

    // Alterna entre modo expandido e modo recolhido
    const collapseBtn = screen.getByLabelText('Recolher menu lateral');
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(collapseBtn);

    const expandBtn = screen.getByLabelText('Expandir menu lateral');
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
    // Ícones/botões continuam acessíveis pelo aria-label e title no modo recolhido
    expect(within(sidebarNav).getByRole('button', { name: 'Gestão de Músicas' })).toHaveAttribute(
      'title',
      'Gestão de Músicas'
    );
  });

  it('filtra abas por permissão (RBAC) para operador não-admin e exibe aviso quando cargo não tem permissões', async () => {
    setupAuthAndSettings(fetchMock, {
      id: 2,
      username: 'editor',
      role: 'editor',
      permissions: ['Posts/Artigos', 'Gestão de Dicas'],
      permissionsLoaded: true,
    });

    const { unmount } = render(<Admin />);
    expect(await screen.findByText('editor')).toBeInTheDocument();

    const sidebarNav = screen.getByRole('navigation', { name: 'Seções do painel administrativo' });
    const navButtons = within(sidebarNav).getAllByRole('button');
    expect(navButtons.map((btn) => btn.textContent.trim())).toEqual(['Posts/Artigos', 'Gestão de Dicas']);

    fireEvent.click(within(sidebarNav).getByRole('button', { name: 'Posts/Artigos' }));
    expect(screen.getByTestId('admin-posts')).toBeInTheDocument();
    unmount();

    // Usuário autenticado sem nenhuma permissão atribuída
    setupAuthAndSettings(fetchMock, {
      id: 3,
      username: 'visitante',
      role: 'visitante',
      permissions: [],
      permissionsLoaded: true,
    });

    render(<Admin />);
    expect(await screen.findByText('Nenhuma permissão atribuída')).toBeInTheDocument();
  });

  it('navega entre abas, fecha gaveta mobile ao selecionar aba e alterna subabas horizontais de Segurança', async () => {
    setupAuthAndSettings(fetchMock, {
      id: 1,
      username: 'admin',
      role: 'admin',
      permissions: CANONICAL_TABS,
      permissionsLoaded: true,
    });

    render(<Admin />);
    expect(await screen.findByTestId('admin-dashboard')).toBeInTheDocument();

    // Abre gaveta mobile e seleciona "Segurança" -> fecha automaticamente a gaveta
    fireEvent.click(screen.getByLabelText('Abrir menu'));
    expect(screen.getByLabelText('Fechar menu')).toBeInTheDocument();

    const sidebarNav = screen.getByRole('navigation', { name: 'Seções do painel administrativo' });
    fireEvent.click(within(sidebarNav).getByRole('button', { name: 'Segurança' }));
    expect(screen.getByLabelText('Abrir menu')).toBeInTheDocument();

    // Verifica as 4 subabas de 2º nível de Segurança
    const securityTablist = screen.getByRole('tablist', { name: 'Ferramentas de segurança' });
    const securityTabs = within(securityTablist).getAllByRole('tab');
    expect(securityTabs.map((t) => t.textContent.trim())).toEqual([
      'Verificação de Integridade',
      'Backup do Sistema',
      'Rate Limiting',
      'Cache do Sistema',
    ]);
    expect(screen.getByTestId('security-integrity')).toBeInTheDocument();

    fireEvent.click(within(securityTablist).getByRole('tab', { name: 'Backup do Sistema' }));
    expect(screen.getByTestId('security-backup')).toBeInTheDocument();

    fireEvent.click(within(securityTablist).getByRole('tab', { name: 'Cache do Sistema' }));
    expect(screen.getByTestId('security-cache')).toBeInTheDocument();

    // Logout redireciona para /login?next=/admin
    fireEvent.click(screen.getByRole('button', { name: 'Sair / Logout' }));
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login?next=/admin');
    });
  });

  it('encerra a sessão e volta para o login após 1 hora de inatividade em qualquer área do painel', async () => {
    jest.useFakeTimers();
    const flushMicrotasks = async () => {
      await act(async () => {
        for (let i = 0; i < 20; i += 1) await Promise.resolve();
      });
    };

    setupAuthAndSettings(fetchMock, {
      id: 1,
      username: 'admin',
      role: 'admin',
      permissions: CANONICAL_TABS,
      permissionsLoaded: true,
    });

    const { unmount } = render(<Admin />);
    try {
      await flushMicrotasks();
      expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();

      // Alterna para outra área do painel (Posts/Artigos)
      const sidebarNav = screen.getByRole('navigation', { name: 'Seções do painel administrativo' });
      fireEvent.click(within(sidebarNav).getByRole('button', { name: 'Posts/Artigos' }));
      expect(screen.getByTestId('admin-posts')).toBeInTheDocument();

      // Simula 1 hora inteira de inatividade
      act(() => {
        jest.advanceTimersByTime(60 * 60 * 1000);
      });
      await flushMicrotasks();

      expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      expect(mockReplace).toHaveBeenCalledWith('/login?next=/admin&reason=inactivity');
    } finally {
      unmount();
    }
  });

  it('deduplica múltiplos 401 concorrentes vindos dos módulos do painel e redireciona para o login', async () => {
    setupAuthAndSettings(fetchMock, {
      id: 1,
      username: 'admin',
      role: 'admin',
      permissions: CANONICAL_TABS,
      permissionsLoaded: true,
    });

    render(<Admin />);
    expect(await screen.findByTestId('admin-dashboard')).toBeInTheDocument();

    act(() => {
      expect(notifyAdminUnauthorized('expired')).toBe(true);
      expect(notifyAdminUnauthorized('expired')).toBe(true);
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login?next=/admin&reason=expired');
    });

    const logoutCalls = fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/auth/logout'));
    expect(logoutCalls).toHaveLength(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('redireciona ao login quando Configuração de Cabeçalho recebe 401 ao salvar configurações', async () => {
    fetchMock.mockImplementation(async (url, options = {}) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/auth/check')) {
        return {
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({
            success: true,
            data: {
              user: {
                id: 1,
                username: 'admin',
                role: 'admin',
                permissions: CANONICAL_TABS,
                permissionsLoaded: true,
              },
            },
          }),
        };
      }
      if (urlStr.includes('/api/settings') && options.method === 'PUT') {
        return {
          ok: false,
          status: 401,
          headers: { get: () => 'application/json' },
          json: async () => ({ error: 'Unauthorized', message: 'Token inválido ou expirado' }),
        };
      }
      if (urlStr.includes('/api/settings')) {
        return {
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({
            site_title: 'O Caminhar com Deus',
            site_subtitle: 'Subtítulo',
          }),
        };
      }
      return { ok: true, headers: { get: () => 'application/json' }, json: async () => ({}) };
    });

    render(<Admin />);
    expect(await screen.findByTestId('admin-dashboard')).toBeInTheDocument();

    const sidebarNav = screen.getByRole('navigation', { name: 'Seções do painel administrativo' });
    fireEvent.click(within(sidebarNav).getByRole('button', { name: 'Configuração de Cabeçalho' }));

    fireEvent.click(screen.getByRole('button', { name: 'Salvar Configurações' }));

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login?next=/admin&reason=expired');
    });
  });

  it('renova a sessão silenciosamente via /api/auth/refresh quando o operador está ativo após 45 min e continua no painel', async () => {
    jest.useFakeTimers();
    const flushMicrotasks = async () => {
      await act(async () => {
        for (let i = 0; i < 20; i += 1) await Promise.resolve();
      });
    };

    setupAuthAndSettings(fetchMock, {
      id: 1,
      username: 'admin',
      role: 'admin',
      permissions: CANONICAL_TABS,
      permissionsLoaded: true,
    });

    const { unmount } = render(<Admin />);
    try {
      await flushMicrotasks();
      expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(46 * 60 * 1000);
        window.dispatchEvent(new Event('pointerdown'));
      });
      await flushMicrotasks();

      expect(fetchMock).toHaveBeenCalledWith('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });
      expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
      expect(mockReplace).not.toHaveBeenCalled();
    } finally {
      unmount();
    }
  });

  it('encerra a sessão e redireciona ao login com reason=expired se /api/auth/refresh responder 401', async () => {
    jest.useFakeTimers();
    const flushMicrotasks = async () => {
      await act(async () => {
        for (let i = 0; i < 20; i += 1) await Promise.resolve();
      });
    };

    fetchMock.mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/auth/check')) {
        return {
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({
            success: true,
            data: {
              user: {
                id: 1,
                username: 'admin',
                role: 'admin',
                permissions: CANONICAL_TABS,
                permissionsLoaded: true,
              },
            },
          }),
        };
      }
      if (urlStr.includes('/api/settings')) {
        return {
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ site_title: 'O Caminhar com Deus', site_subtitle: 'Subtítulo' }),
        };
      }
      if (urlStr.includes('/api/auth/refresh')) {
        return {
          ok: false,
          status: 401,
          headers: { get: () => 'application/json' },
          json: async () => ({ error: 'Unauthorized', message: 'Refresh token inválido ou expirado' }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    const { unmount } = render(<Admin />);
    try {
      await flushMicrotasks();
      expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();

      await act(async () => {
        jest.advanceTimersByTime(46 * 60 * 1000);
        window.dispatchEvent(new Event('pointerdown'));
      });
      await flushMicrotasks();

      expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      expect(mockReplace).toHaveBeenCalledWith('/login?next=/admin&reason=expired');
    } finally {
      unmount();
    }
  });

  it('bloqueia troca de aba após hibernação acima de 1 hora e retorna ao login por inatividade', async () => {
    jest.useFakeTimers();
    const flushMicrotasks = async () => {
      await act(async () => {
        for (let i = 0; i < 20; i += 1) await Promise.resolve();
      });
    };

    setupAuthAndSettings(fetchMock, {
      id: 1,
      username: 'admin',
      role: 'admin',
      permissions: CANONICAL_TABS,
      permissionsLoaded: true,
    });

    const { unmount } = render(<Admin />);
    try {
      await flushMicrotasks();
      expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();

      const start = Date.now();
      jest.setSystemTime(start + 60 * 60 * 1000 + 5000);

      const sidebarNav = screen.getByRole('navigation', { name: 'Seções do painel administrativo' });
      fireEvent.click(within(sidebarNav).getByRole('button', { name: 'Posts/Artigos' }));
      await flushMicrotasks();

      expect(screen.queryByTestId('admin-posts')).not.toBeInTheDocument();
      expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      expect(mockReplace).toHaveBeenCalledWith('/login?next=/admin&reason=inactivity');
    } finally {
      unmount();
    }
  });
});
