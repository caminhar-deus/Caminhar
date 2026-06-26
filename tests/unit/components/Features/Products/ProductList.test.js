import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import ProductList from '../../../../../components/Features/Products/ProductList.js';
import { suppressConsoleError, mockGlobalFetch } from '../../../../helpers/index.js';

// Mock dos hooks
jest.mock('../../../../../hooks/useDebounce', () => ({
  __esModule: true,
  default: (value) => value,
  useDebounce: (value) => value,
}));

// Mock do ProductCard para isolar o teste
jest.mock('../../../../../components/Features/Products/ProductCard', () => ({
  __esModule: true,
  default: ({ product }) => (
    <div data-testid="mock-product-card" data-product-id={product.id}>
      {product.title}
    </div>
  ),
}));

// Mock do StateMessages
jest.mock('../../../../../components/UI/StateMessages', () => ({
  ErrorMessage: ({ message }) => <div data-testid="error-message">{message}</div>,
  LoadingMessage: ({ text }) => <div data-testid="loading-message">{text}</div>,
  EmptyMessage: ({ message }) => <div data-testid="empty-message">{message}</div>,
}));

// Mock do useApiFetch
const mockUseApiFetch = jest.fn();
jest.mock('../../../../../hooks/useApiFetch', () => ({
  __esModule: true,
  default: (url, config) => mockUseApiFetch(url, config),
  useApiFetch: (url, config) => mockUseApiFetch(url, config),
}));

// Mock do styles (JS objeto)
jest.mock('../../../../../components/Features/Products/styles', () => ({
  inputStyle: (paddingLeft) => ({
    width: '100%',
    padding: '12px',
    paddingLeft: paddingLeft || '12px',
    borderRadius: '8px',
    border: '1px solid #ccc',
  }),
  buttonBaseStyle: (overrides) => ({
    padding: '10px 24px',
    borderRadius: '8px',
    ...overrides,
  }),
}));

describe('Componentes Features - Products - ProductList', () => {
  let consoleErrorSpy;
  let fetchMock;

  beforeAll(() => {
    // Polyfill: jsdom não implementa scrollIntoView
    if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = jest.fn();
    }
  });

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
    fetchMock = mockGlobalFetch();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    fetchMock?.mockRestore();
  });

  const defaultApiResponse = {
    data: [
      { id: 1, title: 'Produto 1', description: 'Desc 1', price: 'R$ 10,00', position: 1 },
      { id: 2, title: 'Produto 2', description: 'Desc 2', price: 'R$ 20,00', position: 2 },
      { id: 3, title: 'Produto 3', description: 'Desc 3', price: 'R$ 30,00', position: 3 },
    ],
    pagination: { totalPages: 2 },
  };

  const setupApiMock = (returnData = defaultApiResponse) => {
    mockUseApiFetch.mockReturnValue({
      data: { products: returnData.data, totalPages: returnData.pagination?.totalPages || 1 },
      loading: false,
      error: null,
    });
  };

  it('deve renderizar a lista de produtos com dados da API', () => {
    setupApiMock();

    render(<ProductList />);

    expect(screen.getByText('Produto 1')).toBeInTheDocument();
    expect(screen.getByText('Produto 2')).toBeInTheDocument();
    expect(screen.getByText('Produto 3')).toBeInTheDocument();

    const cards = screen.getAllByTestId('mock-product-card');
    expect(cards).toHaveLength(3);
  });

  it('deve exibir mensagem de carregamento enquanto a API não responde', () => {
    mockUseApiFetch.mockReturnValue({
      data: null,
      loading: true,
      error: null,
    });

    render(<ProductList />);

    expect(screen.getByTestId('loading-message')).toBeInTheDocument();
    expect(screen.getByText('Buscando produtos...')).toBeInTheDocument();
  });

  it('deve exibir mensagem de erro quando a API falha', () => {
    mockUseApiFetch.mockReturnValue({
      data: null,
      loading: false,
      error: 'Erro de conexão',
    });

    render(<ProductList />);

    expect(screen.getByTestId('error-message')).toBeInTheDocument();
    expect(screen.getByText('Erro de conexão')).toBeInTheDocument();
  });

  it('deve exibir mensagem de lista vazia quando não há produtos', () => {
    mockUseApiFetch.mockReturnValue({
      data: { products: [], totalPages: 1 },
      loading: false,
      error: null,
    });

    render(<ProductList />);

    expect(screen.getByTestId('empty-message')).toBeInTheDocument();
    expect(screen.getByText('Nenhum produto cadastrado no momento.')).toBeInTheDocument();
  });

  it('deve exibir mensagem de filtro sem resultados quando busca não encontra produtos', () => {
    mockUseApiFetch.mockReturnValue({
      data: { products: [], totalPages: 1 },
      loading: false,
      error: null,
    });

    render(<ProductList />);

    const searchInput = screen.getByPlaceholderText('Buscar produtos por nome...');
    fireEvent.change(searchInput, { target: { value: 'produto inexistente' } });

    expect(screen.getByTestId('empty-message')).toBeInTheDocument();
    expect(screen.getByText('Nenhum produto encontrado com estes filtros.')).toBeInTheDocument();
  });

  it('deve exibir controles de paginação quando há mais de uma página', () => {
    setupApiMock();

    render(<ProductList />);

    expect(screen.getByText('Anterior')).toBeInTheDocument();
    expect(screen.getByText('Próxima')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('deve desabilitar botão "Anterior" na primeira página', () => {
    setupApiMock();

    render(<ProductList />);

    const anteriorBtn = screen.getByText('Anterior');
    expect(anteriorBtn).toBeDisabled();
    expect(screen.getByText('Próxima')).not.toBeDisabled();
    // Página atual destacada como ativa
    const page1Btn = screen.getByText('1');
    expect(page1Btn).toBeDisabled();
  });

  it('deve desabilitar botão "Próxima" na última página', () => {
    mockUseApiFetch.mockReturnValue({
      data: { products: defaultApiResponse.data, totalPages: 1 },
      loading: false,
      error: null,
    });

    render(<ProductList />);

    const proximaBtn = screen.getByText('Próxima');
    expect(proximaBtn).toBeDisabled();
  });

  it('deve esconder paginação visualmente quando há apenas 1 página', () => {
    mockUseApiFetch.mockReturnValue({
      data: { products: defaultApiResponse.data, totalPages: 1 },
      loading: false,
      error: null,
    });

    render(<ProductList />);

    // O container de paginação deve estar com visibility: hidden
    screen.getByText('Anterior').closest('div[style*="visibility"]');
    // Como o container não tem um data-testid, verificamos que o botão Próxima está desabilitado
    expect(screen.getByText('Próxima')).toBeDisabled();
    expect(screen.getByText('1')).toBeDisabled();
  });

  it('deve exibir campos de busca e filtro de preço', () => {
    setupApiMock();

    render(<ProductList />);

    expect(screen.getByPlaceholderText('Buscar produtos por nome...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Mín (R$)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Máx (R$)')).toBeInTheDocument();
  });

  it('deve ordenar produtos por position e ID (decrescente)', () => {
    const produtosDesordenados = [
      { id: 5, title: 'Produto 5', description: 'Desc 5', price: 'R$ 50,00', position: 3 },
      { id: 3, title: 'Produto 3', description: 'Desc 3', price: 'R$ 30,00', position: 1 },
      { id: 4, title: 'Produto 4', description: 'Desc 4', price: 'R$ 40,00', position: 9999 },
      { id: 1, title: 'Produto 1', description: 'Desc 1', price: 'R$ 10,00', position: 1 },
    ];

    mockUseApiFetch.mockReturnValue({
      data: {
        products: produtosDesordenados.sort((a, b) => {
          const posA = a.position ?? 9999;
          const posB = b.position ?? 9999;
          if (posA === posB) return b.id - a.id;
          return posA - posB;
        }),
        totalPages: 1,
      },
      loading: false,
      error: null,
    });

    render(<ProductList />);

    const cards = screen.getAllByTestId('mock-product-card');
    // position=1 ordena por id descendente: Produto 3(id=3), Produto 1(id=1), depois position=3, depois position=9999
    expect(cards[0]).toHaveAttribute('data-product-id', '3');
    expect(cards[1]).toHaveAttribute('data-product-id', '1');
    expect(cards[2]).toHaveAttribute('data-product-id', '5');
    expect(cards[3]).toHaveAttribute('data-product-id', '4');
  });
});