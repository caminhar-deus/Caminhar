import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import toast from 'react-hot-toast';

jest.mock('../../../../__mocks__/styleMock.js', () => {
  const ignoredProps = new Set(['__esModule', '$$typeof', 'then']);
  const cssModuleProxy = new Proxy(
    {},
    {
      get(target, prop) {
        if (typeof prop === 'symbol' || ignoredProps.has(prop)) {
          return undefined;
        }
        if (prop in target) {
          return target[prop];
        }
        return String(prop);
      },
    }
  );

  return {
    __esModule: true,
    default: cssModuleProxy,
  };
});

jest.mock('react-hot-toast', () => ({ error: jest.fn(), success: jest.fn() }));

import AdminSales from '../../../../components/Admin/AdminSales.js';
import { subscribeAdminUnauthorized } from '../../../../utils/adminSession.js';
import { mockGlobalFetch } from '../../../helpers/index.js';

function extractCssModuleClasses(cssFilePath) {
  const raw = fs.readFileSync(cssFilePath, 'utf8');
  const withoutComments = raw.replace(/\/\*[\s\S]*?\*\//g, '');
  const withoutKeyframes = withoutComments.replace(
    /@keyframes\s+[^{]+\{(?:[^{}]*|\{[^{}]*\})*\}/g,
    ''
  );
  const selectorsOnly = withoutKeyframes.replace(/\{[^{}]*\}/g, ' ');
  const classes = new Set();

  for (const match of selectorsOnly.matchAll(/\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)) {
    classes.add(match[1]);
  }

  return classes;
}

function extractIconNames(iconsFilePath) {
  const raw = fs.readFileSync(iconsFilePath, 'utf8');
  const match = /const ICON_PATHS = \{([\s\S]*?)^\};/m.exec(raw);
  if (!match) {
    throw new Error('Bloco ICON_PATHS não encontrado em components/UI/icons.js');
  }

  const names = new Set();
  for (const keyMatch of match[1].matchAll(/^ {2}([a-zA-Z0-9_]+):/gm)) {
    names.add(keyMatch[1]);
  }
  return names;
}

describe('Componente Front-End - AdminSales', () => {
  const originalCreateObjectURL = global.URL.createObjectURL;
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
    sessionStorage.clear();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    global.URL.createObjectURL = originalCreateObjectURL;
  });

  it('deve alinhar Sincronizar MP e Exportar CSV com classes válidas, size md e ícone separado via buttonLabel', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { totalPages: 1, total: 0 },
      }),
    });

    render(<AdminSales />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum pedido interno encontrado para os filtros selecionados.')).toBeInTheDocument();
    });

    const heading = screen.getByRole('heading', { name: 'Gestão de Vendas — Pedidos Internos' });
    const titleContainer = heading.parentElement;
    const headerContainer = titleContainer.parentElement;
    const syncBtn = screen.getByRole('button', { name: /Sincronizar MP/i });
    const exportBtn = screen.getByRole('button', { name: /Exportar CSV/i });
    const actionsContainer = syncBtn.parentElement;

    expect(headerContainer).toHaveClass('sectionHeader');
    expect(titleContainer).toHaveClass('headerMeta', 'ordersHeaderMeta');
    expect(actionsContainer).toBe(exportBtn.parentElement);
    expect(actionsContainer.parentElement).toBe(headerContainer);
    expect(titleContainer.nextElementSibling).toBe(actionsContainer);
    expect(actionsContainer).toHaveClass('ordersHeaderActions');
    expect(actionsContainer).not.toHaveClass('headerControls');

    for (const [button, expectedText] of [
      [syncBtn, 'Sincronizar MP'],
      [exportBtn, 'Exportar CSV'],
    ]) {
      expect(button).toHaveClass('button', 'secondary', 'md', 'headerActionButton');

      const labelSpan = button.querySelector('.buttonLabel');
      expect(labelSpan).not.toBeNull();

      const iconSvg = labelSpan.querySelector('svg');
      expect(iconSvg).not.toBeNull();
      expect(iconSvg).toHaveAttribute('aria-hidden', 'true');

      const textSpan = Array.from(labelSpan.children).find((el) => el.tagName === 'SPAN');
      expect(textSpan).toBeDefined();
      expect(textSpan).toHaveTextContent(expectedText);
    }
  });

  it('deve manter a largura estrutural do conteúdo de Sincronizar MP no estado loading e concluir a sincronização', async () => {
    let resolveSyncResponse;
    const syncPromise = new Promise((resolve) => {
      resolveSyncResponse = resolve;
    });

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [],
          pagination: { totalPages: 1, total: 0 },
        }),
      })
      .mockImplementationOnce(() => syncPromise);

    render(<AdminSales />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    const syncBtn = screen.getByRole('button', { name: /Sincronizar MP/i });
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(syncBtn).toHaveAttribute('aria-busy', 'true');
    });

    expect(syncBtn).toBeDisabled();
    expect(syncBtn).toHaveClass('loading');
    expect(syncBtn.querySelector('.buttonLabel')).not.toBeNull();
    expect(syncBtn.querySelector('.buttonLabel svg')).not.toBeNull();
    expect(syncBtn).toHaveTextContent('Sincronizar MP');

    resolveSyncResponse({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { totalPages: 1, total: 0 },
        syncedCount: 2,
      }),
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('2 pedido(s) atualizado(s) com o Mercado Pago.');
      expect(syncBtn).not.toBeDisabled();
      expect(syncBtn).toHaveAttribute('aria-busy', 'false');
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/\/api\/admin\/orders\?.*sync=1/),
      { credentials: 'include' }
    );
  });

  it('deve exibir erro e não criar download ao clicar em Exportar CSV com lista vazia', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { totalPages: 1, total: 0 },
      }),
    });

    global.URL.createObjectURL = jest.fn(() => 'blob:orders-empty');

    render(<AdminSales />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum pedido interno encontrado para os filtros selecionados.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/i }));

    expect(toast.error).toHaveBeenCalledWith('Não há pedidos para exportar.');
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('deve gerar e disparar download do CSV ao clicar em Exportar CSV com pedidos carregados', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 101,
            customer_name: 'Maria Souza',
            customer_email: 'maria@exemplo.com',
            product_name: 'Terço de Madeira',
            quantity: 2,
            formatted_total_amount: 'R$ 99,80',
            payment_method: 'pix',
            payment_status: 'approved',
            order_status: 'paid',
            tracking_code: 'BR123456789BR',
          },
        ],
        pagination: { totalPages: 1, total: 1 },
      }),
    });

    global.URL.createObjectURL = jest.fn(() => 'blob:orders-test');

    render(<AdminSales />);

    await waitFor(() => {
      expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    });

    const mockAnchor = document.createElement('a');
    const linkClickSpy = jest.spyOn(mockAnchor, 'click').mockImplementation(() => {});
    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = jest
      .spyOn(document, 'createElement')
      .mockImplementation((tagName) => (tagName === 'a' ? mockAnchor : originalCreateElement(tagName)));

    try {
      fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/i }));

      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockAnchor.getAttribute('download')).toBe('pedidos_vendas_internas.csv');
      expect(linkClickSpy).toHaveBeenCalledTimes(1);
      expect(toast.error).not.toHaveBeenCalled();
    } finally {
      createElementSpy.mockRestore();
      linkClickSpy.mockRestore();
    }
  });

  it('deve exportar CSV em jsdom 31 sem mock manual de âncora e sem emitir console.error', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 202,
            customer_name: 'João Silva',
            customer_email: 'joao@exemplo.com',
            product_name: 'Bíblia Pastoral',
            quantity: 1,
            formatted_total_amount: 'R$ 75,00',
            payment_method: 'pix',
            payment_status: 'approved',
            order_status: 'paid',
            tracking_code: '',
          },
        ],
        pagination: { totalPages: 1, total: 1 },
      }),
    });

    global.URL.createObjectURL = jest.fn(() => 'blob:orders-real-anchor');

    try {
      render(<AdminSales />);

      await waitFor(() => {
        expect(screen.getByText('João Silva')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Exportar CSV/i }));
      await new Promise((resolve) => setTimeout(resolve, 30));

      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('garante que todas as classes CSS Modules e ícones AppIcon usados em AdminSales.js existem', () => {
    const root = process.cwd();
    const adminSalesSource = fs.readFileSync(
      path.join(root, 'components/Admin/AdminSales.js'),
      'utf8'
    );
    const crudClasses = extractCssModuleClasses(
      path.join(root, 'components/Admin/styles/crud.module.css')
    );
    const salesClasses = extractCssModuleClasses(
      path.join(root, 'components/Admin/styles/AdminSales.module.css')
    );
    const validIcons = extractIconNames(path.join(root, 'components/UI/icons.js'));

    const missingCrudClasses = [];
    for (const match of adminSalesSource.matchAll(/\bcrudStyles\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)) {
      if (!crudClasses.has(match[1])) {
        missingCrudClasses.push(match[1]);
      }
    }

    const missingSalesClasses = [];
    for (const match of adminSalesSource.matchAll(/\bsalesStyles\.([a-zA-Z_][a-zA-Z0-9_-]*)/g)) {
      if (!salesClasses.has(match[1])) {
        missingSalesClasses.push(match[1]);
      }
    }

    const missingIcons = [];
    for (const match of adminSalesSource.matchAll(/<AppIcon\b[^>]*\bname=["']([^"']+)["']/g)) {
      if (!validIcons.has(match[1])) {
        missingIcons.push(match[1]);
      }
    }

    expect(missingCrudClasses).toEqual([]);
    expect(missingSalesClasses).toEqual([]);
    expect(missingIcons).toEqual([]);
  });

  it('pré-carrega a contagem real de pedidos ao abrir diretamente em Produtos Internos e mantém Pedidos (13) ao clicar na subaba', async () => {
    let resolveOrdersCount;
    const ordersCountPromise = new Promise((resolve) => {
      resolveOrdersCount = resolve;
    });

    global.fetch.mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/admin/orders')) {
        if (urlStr.includes('sync=0')) {
          return ordersCountPromise;
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({
            data: [],
            pagination: { page: 1, limit: 10, total: 13, totalPages: 2 },
          }),
        });
      }
      if (urlStr.includes('/api/admin/internal-products')) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({
            data: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({}),
      });
    });

    render(<AdminSales initialSubTab="internal-products" />);

    expect(screen.queryByRole('tab', { name: /Pedidos \(0\)/i })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Pedidos$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Produtos Internos/i })).toHaveAttribute('aria-selected', 'true');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/orders?page=1&limit=1&sync=0',
      { credentials: 'include' }
    );

    resolveOrdersCount({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({
        data: [],
        pagination: { page: 1, limit: 1, total: 13, totalPages: 13 },
      }),
    });

    const ordersTab = await screen.findByRole('tab', { name: /Pedidos \(13\)/i });
    expect(ordersTab).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Produtos Internos/i })).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(ordersTab);

    await waitFor(() => {
      expect(ordersTab).toHaveAttribute('aria-selected', 'true');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/orders?page=1&limit=10',
        { credentials: 'include' }
      );
    });
    expect(screen.getByRole('tab', { name: /Pedidos \(13\)/i })).toBeInTheDocument();
  });

  it('não dispara refetch redundante da contagem ao abrir em Pedidos e trocar para Produtos Internos', async () => {
    global.fetch.mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/admin/orders')) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({
            data: [],
            pagination: { page: 1, limit: 10, total: 13, totalPages: 2 },
          }),
        });
      }
      if (urlStr.includes('/api/admin/internal-products')) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({
            data: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({}),
      });
    });

    render(<AdminSales />);

    const ordersTab = await screen.findByRole('tab', { name: /Pedidos \(13\)/i });
    expect(ordersTab).toHaveAttribute('aria-selected', 'true');

    const internalProductsTab = screen.getByRole('tab', { name: /Produtos Internos/i });
    fireEvent.click(internalProductsTab);

    await waitFor(() => {
      expect(internalProductsTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByRole('heading', { name: 'Produtos Internos (Venda Direta)' })).toBeInTheDocument();
    });

    const ordersCalls = global.fetch.mock.calls.filter(([url]) => String(url).includes('/api/admin/orders'));
    expect(ordersCalls).toHaveLength(1);
    expect(String(ordersCalls[0][0])).not.toContain('sync=0');
    expect(screen.getByRole('tab', { name: /Pedidos \(13\)/i })).toBeInTheDocument();
  });

  it('notifica sessão expirada quando o pré-carregamento da contagem recebe HTTP 401', async () => {
    const onUnauthorized = jest.fn();
    const unsubscribe = subscribeAdminUnauthorized(onUnauthorized);

    global.fetch.mockImplementation((url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/admin/orders')) {
        return Promise.resolve({
          ok: false,
          status: 401,
          headers: { get: () => 'application/json' },
          json: async () => ({ error: 'Unauthorized' }),
        });
      }
      if (urlStr.includes('/api/admin/internal-products')) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({
            data: [],
            pagination: { page: 1, limit: 10, total: 0, totalPages: 1 },
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        headers: { get: () => 'application/json' },
        json: async () => ({}),
      });
    });

    try {
      render(<AdminSales initialSubTab="internal-products" />);

      await waitFor(() => {
        expect(onUnauthorized).toHaveBeenCalledWith('expired');
      });
    } finally {
      unsubscribe();
    }
  });
});
