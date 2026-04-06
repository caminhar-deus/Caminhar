import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import AdminDashboard from '../../../../components/Admin/AdminDashboard.js';

describe('Componente Front-End - AdminDashboard', () => {
  const originalFetch = global.fetch;
  
  beforeEach(() => { 
    jest.clearAllMocks();
    global.fetch = jest.fn(); 
  });
  
  afterEach(() => { 
    global.fetch = originalFetch; 
  });

  it('deve renderizar o loading e depois exibir os dados com sucesso, acionando o redirecionamento de abas', async () => {
    const mockStats = { posts: 10, musicas: 5, videos: 2, products: 8, dicas: 3, users: 20 };
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockStats });
    
    const setActiveTab = jest.fn();
    render(<AdminDashboard setActiveTab={setActiveTab} />);
    
    expect(screen.getByText('⏳ Carregando painel de estatísticas...')).toBeInTheDocument();
    
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
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockStatsZero });
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Artigos')[0]).toBeInTheDocument();
      // Garante que o fallback do valor máximo não explodiu (Math.max(..., 1))
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    });
  });

  it('deve renderizar mensagem de erro se a API falhar', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });
    
    render(<AdminDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/Erro: Falha ao carregar estatísticas/)).toBeInTheDocument();
    });
  });
});