import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import ProductList from '../../../../components/Products/ProductList.js';

// Salvamos o fetch nativo e o mockamos globalmente
const originalFetch = global.fetch;

describe('Componente Front-End - ProductList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers(); // Essencial para testarmos o 'debounce' do campo de busca
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  const mockProducts = {
    data: [
      { id: 1, title: 'Bíblia de Estudo', price: 'R$ 150,00', description: 'Completa', position: 1 },
      { id: 2, title: 'Livro Inspirador', price: 'R$ 45,00', description: 'Lançamento', position: 2 }
    ],
    pagination: { totalPages: 2 }
  };

  it('deve renderizar o estado de loading e logo em seguida exibir os produtos', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockProducts });

    render(<ProductList />);

    // O componente inicia no estado de Loading
    expect(screen.getByText('⏳ Buscando produtos...')).toBeInTheDocument();

    // Aguarda os produtos aparecerem na tela
    await waitFor(() => {
      expect(screen.getByText('Bíblia de Estudo')).toBeInTheDocument();
      expect(screen.getByText('Livro Inspirador')).toBeInTheDocument();
    });

    // Valida se a chamada inicial para a API estava com os parâmetros corretos
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/products?page=1&limit=12&public=true'));
  });

  it('deve exibir mensagem de erro caso a API falhe', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false });

    render(<ProductList />);

    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar produtos/)).toBeInTheDocument();
    });
  });

  it('deve exibir mensagem de lista vazia caso não haja produtos', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], pagination: { totalPages: 1 } })
    });

    render(<ProductList />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum produto cadastrado no momento.')).toBeInTheDocument();
    });
  });

  it('deve chamar a API novamente após o usuário digitar na busca (efeito Debounce de 500ms)', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => mockProducts });

    render(<ProductList />);
    await waitFor(() => expect(screen.getByText('Bíblia de Estudo')).toBeInTheDocument());

    const searchInput = screen.getByPlaceholderText('Buscar produtos por nome...');
    
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Bíblia' } });
      
      // Avançamos o tempo em 500ms para simular que o usuário parou de digitar
      jest.advanceTimersByTime(500); 
    });

    // A API deve ter sido chamada uma segunda vez contendo "search=Bíblia"
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('search=B%C3%ADblia'));
  });

  it('deve avançar a página ao clicar no botão "Próxima"', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => mockProducts });

    render(<ProductList />);
    await waitFor(() => expect(screen.getByText('Bíblia de Estudo')).toBeInTheDocument());

    const nextButton = screen.getByText('Próxima');
    
    // Clica no botão
    await act(async () => {
      fireEvent.click(nextButton);
    });

    // Garante que a API foi chamada com page=2
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('page=2'));
  });

  it('deve aplicar filtros de preço mínimo e máximo na busca da API e exibir mensagem de filtros vazios', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [], pagination: { totalPages: 1 } })
    });

    render(<ProductList />);
    
    // Aguarda o primeiro fetch (sem filtros)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));

    const minInput = screen.getByPlaceholderText('Mín (R$)');
    const maxInput = screen.getByPlaceholderText('Máx (R$)');

    await act(async () => {
      fireEvent.change(minInput, { target: { value: '50' } });
      fireEvent.change(maxInput, { target: { value: '150' } });
      jest.advanceTimersByTime(500); // Aciona o Debounce
    });

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('minPrice=50'));
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('maxPrice=150'));

    await waitFor(() => {
      expect(screen.getByText('Nenhum produto encontrado com estes filtros.')).toBeInTheDocument();
    });
  });

  it('deve ordenar os produtos corretamente pelo campo position e por id como desempate', async () => {
    const unorderedProducts = {
      data: [
        { id: 1, title: 'Prod 1', position: 2 },
        { id: 2, title: 'Prod 2', position: 1 },
        { id: 3, title: 'Prod 3', position: null }, // Fallback para 9999
        { id: 4, title: 'Prod 4', position: 2 }     // Empate: ID maior ganha
      ],
      pagination: { totalPages: 1 }
    };
    
    global.fetch.mockResolvedValue({ ok: true, json: async () => unorderedProducts });
    render(<ProductList />);

    await waitFor(() => {
      // Como mockamos a API para retornar todos de uma vez, a ordenação do Front-end vai atuar
      // A ordem esperada: 2, 4, 1, 3
      const titles = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
      expect(titles).toEqual(['Prod 2', 'Prod 4', 'Prod 1', 'Prod 3']);
    });
  });
});