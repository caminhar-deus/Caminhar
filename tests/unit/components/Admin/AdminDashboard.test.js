import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminDashboard from '../../../../components/Admin/AdminDashboard.js';
import { mockGlobalFetch } from '../../../helpers/index.js';

describe('Componente Front-End - AdminDashboard', () => {
  let fetchMock;
  
  beforeEach(() => { 
    fetchMock = mockGlobalFetch();
    sessionStorage.clear();
  });
  
  afterEach(() => { 
    fetchMock?.mockRestore();
  });

  it('deve renderizar o loading e depois exibir os dados com sucesso, acionando o redirecionamento de abas', async () => {
    const mockStats = { posts: 10, musicas: 5, videos: 2, products: 8, dicas: 3, users: 20 };
    global.fetch.mockResolvedValueOnce({ ok: true, headers: { get: () => 'application/json' }, json: async () => mockStats });
    
    const setActiveTab = jest.fn();
    render(<AdminDashboard setActiveTab={setActiveTab} isAdmin={true} />);
    
    expect(screen.getByText('Carregando painel de estatísticas...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getAllByText('Artigos')[0]).toBeInTheDocument();
      expect(screen.getAllByText('10')[0]).toBeInTheDocument(); // Count aparece no card e no gráfico
    });
    
    // Clica no card de Artigos para disparar setActiveTab('posts')
    fireEvent.click(screen.getAllByText('Artigos')[0].closest('div').parentElement);
    expect(setActiveTab).toHaveBeenCalledWith('posts');
  });

  it('deve renderizar barras e contadores mesmo com valores vazios/nulos', async () => {
    const mockStatsZero = { posts: 0, musicas: null, videos: 0, products: 0, dicas: undefined, users: 0 };
    global.fetch.mockResolvedValueOnce({ ok: true, headers: { get: () => 'application/json' }, json: async () => mockStatsZero });
    
    render(<AdminDashboard isAdmin={true} />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Artigos')[0]).toBeInTheDocument();
      // Garante que o fallback do valor máximo não explodiu (Math.max(..., 1))
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });
  });

  it('deve renderizar a mensagem de erro se a API falhar', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Erro: Falha ao carregar estatísticas/)).toBeInTheDocument();
    });
  });

  it('deve exibir Gestão de Vendas (Pagamento e Andamento) e Produtos Internos (Publicado e Rascunho) e navegar para as subabas corretas', async () => {
    const mockStats = {
      posts: 4,
      musicas: 2,
      videos: 1,
      products: 3,
      productsPublished: 2,
      productsDraft: 1,
      sales: 12,
      salesPaymentPix: 3,
      salesPaymentCreditCard: 7,
      salesPaymentDebitCard: 1,
      salesPaymentTicket: 1,
      salesOrderAwaitingPayment: 2,
      salesOrderPaid: 3,
      salesOrderPreparing: 1,
      salesOrderShipped: 1,
      salesOrderDelivered: 2,
      salesOrderCancelled: 3,
      internalProducts: 7,
      internalProductsPublished: 5,
      internalProductsDraft: 2,
      dicas: 1,
      users: 2,
    };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => mockStats,
    });

    const setActiveTab = jest.fn();
    const setActiveSalesSubTab = jest.fn();
    render(
      <AdminDashboard
        setActiveTab={setActiveTab}
        setActiveSalesSubTab={setActiveSalesSubTab}
        isAdmin={true}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Gestão de Vendas')).toHaveLength(2);
      expect(screen.getAllByText('Produtos Internos')).toHaveLength(2);
    });

    expect(screen.getByText('Pagamento')).toBeInTheDocument();
    expect(screen.getByText('Andamento')).toBeInTheDocument();
    expect(screen.getByText('PIX (3)')).toBeInTheDocument();
    expect(screen.getByText('Cartão de crédito (7)')).toBeInTheDocument();
    expect(screen.getByText('Cartão de débito (1)')).toBeInTheDocument();
    expect(screen.getByText('Boleto bancário (1)')).toBeInTheDocument();
    expect(screen.getByText('Aguardando pagamento (2)')).toBeInTheDocument();
    expect(screen.getByText('Pago (3)')).toBeInTheDocument();
    expect(screen.getByText('Em separação (1)')).toBeInTheDocument();
    expect(screen.getByText('Enviado (1)')).toBeInTheDocument();
    expect(screen.getByText('Entregue (2)')).toBeInTheDocument();
    expect(screen.getByText('Cancelado (3)')).toBeInTheDocument();
    expect(screen.getByText('5 publicados • 2 rascunhos')).toBeInTheDocument();
    expect(screen.getAllByText('12').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getByRole('button', { name: /Ir para Gestão de Vendas: 12 itens cadastrados/i }));
    expect(setActiveSalesSubTab).toHaveBeenCalledWith('orders');
    expect(setActiveTab).toHaveBeenCalledWith('vendas');

    fireEvent.click(screen.getByRole('button', { name: /Ir para Produtos Internos: 7 itens cadastrados/i }));
    expect(setActiveSalesSubTab).toHaveBeenCalledWith('internal-products');
    expect(setActiveTab).toHaveBeenCalledWith('vendas');
  });

  it('deve filtrar Gestão de Vendas e Produtos Internos pela permissão Gestão de Vendas para usuários não-admin', async () => {
    const mockStats = {
      posts: 2,
      musicas: 1,
      videos: 1,
      products: 1,
      sales: 6,
      internalProducts: 3,
      dicas: 1,
      users: 1,
    };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => mockStats,
    });

    const { unmount } = render(
      <AdminDashboard
        isAdmin={false}
        userPermissions={['Visão Geral', 'Posts/Artigos']}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Artigos')).toHaveLength(2);
    });
    expect(screen.queryByText('Gestão de Vendas')).not.toBeInTheDocument();
    expect(screen.queryByText('Produtos Internos')).not.toBeInTheDocument();
    unmount();

    sessionStorage.clear();
    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => mockStats,
    });

    render(
      <AdminDashboard
        isAdmin={false}
        userPermissions={['Visão Geral', 'Gestão de Vendas']}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Gestão de Vendas')).toHaveLength(2);
      expect(screen.getAllByText('Produtos Internos')).toHaveLength(2);
    });
    expect(screen.queryByText('Artigos')).not.toBeInTheDocument();
  });

  it('deve ignorar cache legado em sessionStorage sem os campos de vendas e buscar dados atualizados da API', async () => {
    sessionStorage.setItem(
      'admin_dashboard_stats',
      JSON.stringify({
        data: { posts: 1, musicas: 1, videos: 0, products: 0, dicas: 0, users: 1 },
        timestamp: Date.now(),
      })
    );

    const freshStats = {
      posts: 1,
      musicas: 1,
      videos: 0,
      products: 0,
      sales: 9,
      salesPaymentPix: 4,
      salesPaymentCreditCard: 3,
      salesPaymentDebitCard: 1,
      salesPaymentTicket: 1,
      salesOrderAwaitingPayment: 2,
      salesOrderPaid: 4,
      salesOrderPreparing: 1,
      salesOrderShipped: 1,
      salesOrderDelivered: 1,
      salesOrderCancelled: 0,
      internalProducts: 4,
      internalProductsPublished: 3,
      internalProductsDraft: 1,
      dicas: 0,
      users: 1,
    };

    global.fetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => freshStats,
    });

    render(<AdminDashboard isAdmin={true} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/stats', { credentials: 'include' });
      expect(screen.getByText('PIX (4)')).toBeInTheDocument();
      expect(screen.getByText('Pago (4)')).toBeInTheDocument();
      expect(screen.getByText('3 publicados • 1 rascunhos')).toBeInTheDocument();
    });
  });
});