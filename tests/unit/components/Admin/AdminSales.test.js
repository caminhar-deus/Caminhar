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

jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
  success: jest.fn(),
  loading: jest.fn().mockReturnValue('toast-id'),
  dismiss: jest.fn(),
}));

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

  it('cobre todos os badges de pagamento/andamento, filtros, erros 401/500/rede e sincronização sem alterações', async () => {
    const onUnauthorized = jest.fn();
    const unsubscribe = subscribeAdminUnauthorized(onUnauthorized);

    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: 1, customer_name: 'C1', customer_email: 'c1@t.com', product_name: 'P1', quantity: 1, formatted_total_amount: 'R$ 10,00', payment_method: 'pix', payment_status: 'pending', order_status: 'awaiting_payment', tracking_code: '' },
            { id: 2, customer_name: 'C2', customer_email: 'c2@t.com', product_name: 'P2', quantity: 1, formatted_total_amount: 'R$ 20,00', payment_method: 'credit_card', payment_status: 'in_process', order_status: 'preparing', tracking_code: '' },
            { id: 3, customer_name: 'C3', customer_email: 'c3@t.com', product_name: 'P3', quantity: 1, formatted_total_amount: 'R$ 30,00', payment_method: 'debit_card', payment_status: 'authorized', order_status: 'shipped', tracking_code: 'TRK3' },
            { id: 4, customer_name: 'C4', customer_email: 'c4@t.com', product_name: 'P4', quantity: 1, formatted_total_amount: 'R$ 40,00', payment_method: 'ticket', payment_status: 'rejected', order_status: 'cancelled', tracking_code: '' },
            { id: 5, customer_name: 'C5', customer_email: 'c5@t.com', product_name: 'P5', quantity: 1, formatted_total_amount: 'R$ 50,00', payment_method: 'pix', payment_status: 'cancelled', order_status: 'delivered', tracking_code: '' },
            { id: 6, customer_name: 'C6', customer_email: 'c6@t.com', product_name: 'P6', quantity: 1, formatted_total_amount: 'R$ 60,00', payment_method: 'pix', payment_status: 'charged_back', order_status: 'status_custom', tracking_code: '' },
            { id: 7, customer_name: 'C7', customer_email: 'c7@t.com', product_name: 'P7', quantity: 1, formatted_total_amount: 'R$ 70,00', payment_method: 'pix', payment_status: 'refunded', order_status: '', tracking_code: '' },
            { id: 8, customer_name: 'C8', customer_email: 'c8@t.com', product_name: 'P8', quantity: 1, formatted_total_amount: 'R$ 80,00', payment_method: 'pix', payment_status: '', order_status: 'paid', tracking_code: '' },
          ],
          pagination: { totalPages: 2, total: 12 },
        }),
      })
      // Filtro de busca
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], pagination: { totalPages: 1, total: 0 } }),
      })
      // Filtro de pagamento
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], pagination: { totalPages: 1, total: 0 } }),
      })
      // Filtro de situação do pedido
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], pagination: { totalPages: 1, total: 0 } }),
      })
      // Filtro de forma de pagamento + sync com 0 alterações
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], pagination: { totalPages: 1, total: 0 }, syncedCount: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], pagination: { totalPages: 1, total: 0 }, syncedCount: 0 }),
      })
      // Sync recebendo HTTP 500 (!res.ok)
      .mockResolvedValueOnce({ ok: false, status: 500 })
      // Sync rejeitando rede
      .mockRejectedValueOnce(new Error('Network down'))
      // Sync recebendo HTTP 401
      .mockResolvedValueOnce({ ok: false, status: 401 });

    try {
      render(<AdminSales />);

      await waitFor(() => {
        expect(screen.getByText('C1')).toBeInTheDocument();
        expect(screen.getByText('Pendente')).toBeInTheDocument();
        expect(screen.getAllByText('Em análise').length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText('Autorizado').length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText('Contestado').length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText('Recusado').length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText('Cancelado').length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText('Reembolsado').length).toBeGreaterThanOrEqual(2);
        expect(screen.getAllByText('PIX').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Cartão de crédito').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Cartão de débito').length).toBeGreaterThanOrEqual(1);
        expect(screen.getAllByText('Boleto bancário').length).toBeGreaterThanOrEqual(1);
        expect(screen.getByText('status_custom')).toBeInTheDocument();
        expect(screen.getByText('TRK3')).toBeInTheDocument();
      });

      // Exercita todos os filtros (resetam page=1)
      fireEvent.change(screen.getByLabelText('Buscar pedidos'), { target: { value: 'Maria' } });
      await waitFor(() => {
        expect(String(global.fetch.mock.calls.at(-1)[0])).toContain('search=Maria');
      });

      fireEvent.change(screen.getByLabelText('Filtrar por status do pagamento'), { target: { value: 'approved' } });
      await waitFor(() => {
        expect(String(global.fetch.mock.calls.at(-1)[0])).toContain('paymentStatus=approved');
      });

      fireEvent.change(screen.getByLabelText('Filtrar por situação do pedido'), { target: { value: 'preparing' } });
      await waitFor(() => {
        expect(String(global.fetch.mock.calls.at(-1)[0])).toContain('orderStatus=preparing');
      });

      fireEvent.change(screen.getByLabelText('Filtrar por forma de pagamento'), { target: { value: 'pix' } });
      await waitFor(() => {
        expect(String(global.fetch.mock.calls.at(-1)[0])).toContain('paymentMethod=pix');
      });

      // Sincronizar MP sem alterações
      const syncBtn = screen.getByRole('button', { name: /Sincronizar MP/i });
      fireEvent.click(syncBtn);
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Todos os pedidos desta página já estão sincronizados.');
      });

      // Falha HTTP 500
      fireEvent.click(syncBtn);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Erro ao carregar os pedidos internos.');
      });

      // Falha de rede
      fireEvent.click(syncBtn);
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Falha de conexão ao buscar pedidos.');
      });

      // HTTP 401 no fetchOrders
      fireEvent.click(syncBtn);
      await waitFor(() => {
        expect(onUnauthorized).toHaveBeenCalledWith('expired');
      });
    } finally {
      unsubscribe();
    }
  });

  it('cobre o modal de gerenciamento de pedido: abertura com endereço, cancelar, salvar 200 (limpando cache), erros 400/rede e 401', async () => {
    const onUnauthorized = jest.fn();
    const unsubscribe = subscribeAdminUnauthorized(onUnauthorized);
    sessionStorage.setItem('admin_dashboard_stats', '{"cached":true}');

    const sampleOrder = {
      id: 55,
      customer_name: 'Ana Paula',
      customer_email: 'ana@exemplo.com',
      product_name: 'Terço de Madeira',
      quantity: 2,
      formatted_total_amount: 'R$ 99,80',
      formatted_shipping_cost: 'R$ 10,00',
      mp_payment_id: '',
      payment_method: 'pix',
      payment_status: 'approved',
      order_status: '',
      tracking_code: '',
      delivery_address: {
        street: 'Rua da Paz',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        cep: '01001-000',
      },
    };

    global.fetch.mockImplementation((url, opts = {}) => {
      if (String(url).startsWith('/api/admin/orders') && (!opts.method || opts.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [sampleOrder],
            pagination: { totalPages: 1, total: 1 },
          }),
        });
      }
      if (String(url) === '/api/admin/orders' && opts.method === 'PUT') {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    try {
      render(<AdminSales />);

      await waitFor(() => {
        expect(screen.getByText('Ana Paula')).toBeInTheDocument();
      });

      // Abre e fecha pelo botão Cancelar
      fireEvent.click(screen.getByRole('button', { name: 'Gerenciar' }));
      expect(screen.getByText(/Gerenciar Pedido #55/i)).toBeInTheDocument();
      expect(screen.getByText(/PIX — Aprovado/i)).toBeInTheDocument();
      expect(screen.getByText(/Aguardando geração/i)).toBeInTheDocument();
      expect(screen.getByText(/Rua da Paz, 123 — Centro, São Paulo\/SP — CEP 01001-000/i)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      await waitFor(() => {
        expect(screen.queryByText(/Gerenciar Pedido #55/i)).not.toBeInTheDocument();
      });

      // Reabre, altera status + rastreio e salva com sucesso (200 OK)
      fireEvent.click(screen.getByRole('button', { name: 'Gerenciar' }));
      fireEvent.change(screen.getByLabelText('Situação Logística do Pedido'), { target: { value: 'shipped' } });
      fireEvent.change(screen.getByLabelText('Código de Rastreio'), { target: { value: 'BR999888777BR' } });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Pedido #55 atualizado com sucesso!');
      });
      expect(sessionStorage.getItem('admin_dashboard_stats')).toBeNull();
      const putCall = global.fetch.mock.calls.find(([, opts]) => opts?.method === 'PUT');
      expect(JSON.parse(putCall[1].body)).toEqual({
        id: 55,
        order_status: 'shipped',
        tracking_code: 'BR999888777BR',
      });

      // Erro 400 da API no PUT
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Status inválido para este pedido' }),
      });
      fireEvent.click(screen.getByRole('button', { name: 'Gerenciar' }));
      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Status inválido para este pedido');
      });

      // Erro de rede no PUT
      global.fetch.mockRejectedValueOnce(new Error('PUT network failure'));
      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Erro ao salvar alterações do pedido.');
      });

      // HTTP 401 no PUT
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Unauthorized' }),
      });
      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
      await waitFor(() => {
        expect(onUnauthorized).toHaveBeenCalledWith('expired');
      });
    } finally {
      unsubscribe();
    }
  });

  it('cobre Produtos Internos: colunas customizadas, ShippingTypeSelect, validação schema, mapItemToFormData e onReorder', async () => {
    Element.prototype.scrollIntoView = jest.fn();

    const internalProducts = [
      {
        id: 10,
        name: 'Terço Artesanal',
        image_url: 'https://cdn.exemplo.com/terco1.jpg\nhttps://cdn.exemplo.com/terco2.jpg',
        description: 'Feito à mão',
        price: 49.9,
        stock: 8,
        shipping_type: 'fixed',
        shipping_cost: 15.5,
        category: 'terços',
        published: true,
      },
      {
        id: 11,
        name: 'Escapulário Simples',
        image_url: '',
        description: '',
        price: null,
        stock: 0,
        shipping_type: 'calculated',
        shipping_cost: null,
        category: 'geral',
        published: false,
      },
      {
        id: 12,
        name: 'Livro Devocional',
        image_url: 'https://cdn.exemplo.com/livro.jpg',
        description: '',
        price: 35,
        stock: null,
        shipping_type: 'free',
        shipping_cost: '',
        category: 'livros',
        published: true,
      },
    ];

    global.fetch.mockImplementation((url, opts = {}) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/admin/orders')) {
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({ data: [], pagination: { page: 1, limit: 1, total: 0, totalPages: 1 } }),
        });
      }
      if (urlStr.includes('/api/admin/internal-products')) {
        if (opts.method === 'POST' || opts.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            status: opts.method === 'POST' ? 201 : 200,
            headers: { get: () => 'application/json' },
            json: async () => ({ data: internalProducts[0] }),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'application/json' },
          json: async () => ({
            data: internalProducts,
            pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
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

    await waitFor(() => {
      expect(screen.getByText('Terço Artesanal')).toBeInTheDocument();
      expect(screen.getByText('Escapulário Simples')).toBeInTheDocument();
      expect(screen.getByText('Livro Devocional')).toBeInTheDocument();
    });

    // Colunas customizadas de Produtos Internos
    expect(screen.getByAltText('Terço Artesanal')).toHaveAttribute('src', 'https://cdn.exemplo.com/terco1.jpg');
    expect(screen.getByText('Sem foto')).toBeInTheDocument();
    expect(screen.getByText('R$ 49,90')).toBeInTheDocument();
    expect(screen.getByText('8 un.')).toBeInTheDocument();
    expect(screen.getAllByText('0 un.')).toHaveLength(2);
    expect(screen.getByText('Fixo')).toBeInTheDocument();
    expect(screen.getByText('Calculado')).toBeInTheDocument();
    expect(screen.getByText('Grátis')).toBeInTheDocument();

    // Edição de item com valores preenchidos e com valores nulos (cobre mapItemToFormData + ShippingTypeSelect)
    const editButtons = screen.getAllByRole('button', { name: 'Editar' });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText('Modalidade de Frete')).toHaveValue('fixed');
    });
    expect(screen.getByLabelText(/Valor Unitário/i)).toHaveValue('R$ 49,90');
    expect(screen.getByLabelText(/Valor Base de Frete/i)).toHaveValue('R$ 15,50');
    expect(screen.getByText('Define como o frete é calculado no checkout do site público.')).toBeInTheDocument();

    // Edição de item com valores nulos para cobrir os fallbacks do mapItemToFormData e preprocess
    fireEvent.click(editButtons[1]);
    await waitFor(() => {
      expect(screen.getByLabelText(/Nome do Produto \(Venda Interna\)/i)).toHaveValue('Escapulário Simples');
    });
    expect(screen.getByLabelText(/Valor Unitário/i)).toHaveValue('');
    expect(screen.getByLabelText(/Valor Base de Frete/i)).toHaveValue('0,00');

    // Altera campos + ShippingTypeSelect e submete para exercitar os preprocessors do internalProductSchema
    fireEvent.change(screen.getByLabelText('Modalidade de Frete'), { target: { value: 'calculated' } });
    fireEvent.change(screen.getByLabelText(/Valor Unitário/i), { target: { value: '29,90' } });
    fireEvent.change(screen.getByLabelText(/Estoque Disponível/i), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText(/Valor Base de Frete/i), { target: { value: '' } });
    fireEvent.change(screen.getByPlaceholderText(/Cole as URLs/i), { target: { value: 'https://cdn.exemplo.com/esc.jpg' } });

    const form = screen.getByLabelText('Modalidade de Frete').closest('form');
    fireEvent.submit(form);

    await waitFor(() => {
      const putCall = global.fetch.mock.calls.find(
        ([url, opts]) => String(url).includes('/api/admin/internal-products') && opts?.method === 'PUT'
      );
      expect(putCall).toBeDefined();
    });

    // Reordenação via drag & drop na tabela de Produtos Internos (exercita onReorder)
    const rows = screen.getAllByRole('row');
    if (rows.length >= 3) {
      fireEvent.dragStart(rows[1], { dataTransfer: { effectAllowed: 'move', setData: jest.fn() } });
      fireEvent.dragOver(rows[2], { dataTransfer: { dropEffect: 'move' } });
      fireEvent.drop(rows[2], { dataTransfer: { getData: () => '0' } });

      await waitFor(() => {
        const reorderCall = global.fetch.mock.calls.find(
          ([url, opts]) => String(url) === '/api/admin/internal-products' && opts?.method === 'PUT'
        );
        expect(reorderCall).toBeDefined();
      });
    }
  });

  it('exibe metadados do MP, alerta de estorno manual e desabilita reabertura no modal de pedido cancelado', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 77,
            customer_name: 'Carlos Cancelled',
            customer_email: 'carlos@exemplo.com',
            product_name: 'Terço Raro',
            quantity: 1,
            formatted_total_amount: 'R$ 50,00',
            formatted_shipping_cost: 'R$ 0,00',
            mp_payment_id: 'ORD_77',
            payment_method: 'credit_card',
            payment_status: 'approved',
            order_status: 'cancelled',
            tracking_code: '',
            created_at: '2026-11-26T00:00:00Z',
            payment_payload: {
              mp_transaction_id: 'PAY_77',
              status_detail: 'accredited',
              payment_method_id: 'elo',
              payment_type_id: 'prepaid_card',
              needs_manual_refund: true,
            },
          },
        ],
        pagination: { totalPages: 1, total: 1 },
      }),
    });

    render(<AdminSales />);
    await waitFor(() => {
      expect(screen.getByText('Carlos Cancelled')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Gerenciar' }));
    expect(screen.getByText('PAY_77')).toBeInTheDocument();
    expect(screen.getByText('accredited')).toBeInTheDocument();
    expect(screen.getByText(/Pré-pago — Elo \(elo \/ prepaid_card\)/)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/estorno manual necessário/i);
    expect(screen.getByLabelText('Situação Logística do Pedido')).toBeDisabled();
  });

  it('permite solicitar estorno explícito via Orders API no modal e aciona Expirar vencidos no cabeçalho', async () => {
    const onUnauthorized = jest.fn();
    const unsubscribe = subscribeAdminUnauthorized(onUnauthorized);

    const paidOrder = {
      id: 88,
      customer_name: 'Paula Martins',
      customer_email: 'paula@exemplo.com',
      product_name: 'Terço de Cristal',
      quantity: 1,
      formatted_total_amount: 'R$ 65,00',
      formatted_shipping_cost: 'R$ 0,00',
      mp_payment_id: 'ORD_88_LIVE',
      payment_method: 'pix',
      payment_status: 'approved',
      order_status: 'paid',
      tracking_code: '',
    };

    global.fetch.mockImplementation((url, opts = {}) => {
      if (String(url).startsWith('/api/admin/orders') && (!opts.method || opts.method === 'GET')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [paidOrder], pagination: { totalPages: 1, total: 1 } }),
        });
      }
      if (String(url) === '/api/admin/orders' && opts.method === 'PUT') {
        const parsedBody = JSON.parse(opts.body);
        if (parsedBody.action === 'expire_abandoned') {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ expiredCount: 2, reconciledToPaidCount: 1 }),
          });
        }
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ success: true }) });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    try {
      render(<AdminSales />);

      await waitFor(() => {
        expect(screen.getByText('Paula Martins')).toBeInTheDocument();
      });

      // Fluxo 1: Modal com checkbox de estorno (desmarcado por padrão; aparece ao selecionar cancelled)
      fireEvent.click(screen.getByRole('button', { name: 'Gerenciar' }));
      expect(
        screen.queryByLabelText(/Solicitar estorno automático no Mercado Pago/i)
      ).not.toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Situação Logística do Pedido'), {
        target: { value: 'cancelled' },
      });

      const refundCheckbox = screen.getByLabelText(/Solicitar estorno automático no Mercado Pago/i);
      expect(refundCheckbox).not.toBeChecked();
      fireEvent.click(refundCheckbox);
      expect(refundCheckbox).toBeChecked();

      fireEvent.click(screen.getByRole('button', { name: 'Salvar Alterações' }));

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Pedido #88 estornado no Mercado Pago e cancelado com sucesso!'
        );
      });

      const refundPut = global.fetch.mock.calls.find(
        ([, opts]) => opts?.method === 'PUT' && opts.body.includes('"refund_payment":true')
      );
      expect(refundPut).toBeDefined();

      // Fluxo 2: Botão Expirar vencidos (com itens expirados, depois com zero itens, depois 401)
      const expireBtn = screen.getByRole('button', { name: /Expirar vencidos/i });
      fireEvent.click(expireBtn);
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Expirados: 2 pedido(s); reconciliados para pago: 1.'
        );
      });

      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ expiredCount: 0, reconciledToPaidCount: 0 }),
      });
      fireEvent.click(expireBtn);
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          'Nenhum pedido vencido aguardando pagamento encontrado.'
        );
      });

      global.fetch.mockResolvedValueOnce({ ok: false, status: 401 });
      fireEvent.click(expireBtn);
      await waitFor(() => {
        expect(onUnauthorized).toHaveBeenCalledWith('expired');
      });
    } finally {
      unsubscribe();
    }
  });
});
