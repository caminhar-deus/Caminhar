import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { mockGlobalFetch, suppressConsoleError } from '../../helpers/index.js';
import '../../mocks/next-setup.js';
import { useRouter } from 'next/router';

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
});
