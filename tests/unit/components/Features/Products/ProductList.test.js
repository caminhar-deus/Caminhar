import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
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
      {product.name}
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
  useApiFetch: (url, config) => {
    const res = mockUseApiFetch(url, config);
    // Emula o hook real: aplica o `transform` do componente sobre a resposta
    // bruta da API antes de devolver o estado ao componente.
    if (typeof config?.transform === 'function' && res && res.data != null) {
      return { ...res, data: config.transform(res.data) };
    }
    return res;
  },
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
    // clearAllMocks preserva implementações definidas com mockReturnValue;
    // mockReset é necessário para evitar vazamento de retorno entre testes.
    mockUseApiFetch.mockReset();
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    fetchMock?.mockRestore();
    jest.useRealTimers();
  });

  const defaultApiResponse = {
    data: [
      { id: 1, name: 'Produto 1', description: 'Desc 1', price: 'R$ 10,00', position: 1 },
      { id: 2, name: 'Produto 2', description: 'Desc 2', price: 'R$ 20,00', position: 2 },
      { id: 3, name: 'Produto 3', description: 'Desc 3', price: 'R$ 30,00', position: 3 },
    ],
    pagination: { totalPages: 2 },
  };

  // Mock da API em formato bruto: o objeto completo `{ data, pagination }`
  // é devolvido como `data` para que a `transform` do componente seja exercitada.
  const setupApiMock = (returnData = defaultApiResponse) => {
    mockUseApiFetch.mockReturnValue({
      data: returnData,
      loading: false,
      error: null,
    });
  };

  // Mock de API paginada: devolve a resposta bruta com produto específico por página
  const setupPaginatedApiMock = (totalPages = 3) => {
    mockUseApiFetch.mockImplementation((url) => {
      const page = Number(url.match(/page=(\d+)/)?.[1]) || 1;
      return {
        data: {
          data: [
            { id: page, name: `Produto Página ${page}`, description: `Desc ${page}`, price: `R$ ${page}0,00`, position: page },
          ],
          pagination: { totalPages },
        },
        loading: false,
        error: null,
      };
    });
  };

  const advancePageLoadingTimer = () => {
    act(() => {
      jest.advanceTimersByTime(150);
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
      data: { data: [], pagination: { totalPages: 1 } },
      loading: false,
      error: null,
    });

    render(<ProductList />);

    expect(screen.getByTestId('empty-message')).toBeInTheDocument();
    expect(screen.getByText('Nenhum produto cadastrado no momento.')).toBeInTheDocument();
  });

  it('deve exibir mensagem de filtro sem resultados quando busca não encontra produtos', () => {
    mockUseApiFetch.mockReturnValue({
      data: { data: [], pagination: { totalPages: 1 } },
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
      data: { data: defaultApiResponse.data, pagination: { totalPages: 1 } },
      loading: false,
      error: null,
    });

    render(<ProductList />);

    const proximaBtn = screen.getByText('Próxima');
    expect(proximaBtn).toBeDisabled();
  });

  it('deve esconder paginação visualmente quando há apenas 1 página', () => {
    mockUseApiFetch.mockReturnValue({
      data: { data: defaultApiResponse.data, pagination: { totalPages: 1 } },
      loading: false,
      error: null,
    });

    render(<ProductList />);

    // O container de paginação deve estar com visibility: hidden
    const paginationContainer = screen.getByText('Anterior').closest('div');
    expect(paginationContainer).toHaveStyle('visibility: hidden');
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

  it('deve limpar os filtros ao clicar em "Limpar filtros"', () => {
    setupApiMock();

    render(<ProductList />);

    const searchInput = screen.getByPlaceholderText('Buscar produtos por nome...');
    fireEvent.change(searchInput, { target: { value: 'produto' } });

    // Indicador de filtro ativo (badge com contagem) e botão de limpar visíveis
    expect(screen.getByText('1', { selector: 'span' })).toBeInTheDocument();
    const limparBtn = screen.getByRole('button', { name: 'Limpar todos os filtros' });
    expect(limparBtn).toBeInTheDocument();

    fireEvent.click(limparBtn);

    expect(searchInput).toHaveValue('');
    expect(screen.queryByRole('button', { name: 'Limpar todos os filtros' })).not.toBeInTheDocument();
    expect(screen.getByText('Produto 1')).toBeInTheDocument();
  });

  it('deve incluir minPrice e maxPrice na URL quando os filtros de preço são preenchidos', () => {
    setupApiMock();

    render(<ProductList />);

    fireEvent.change(screen.getByLabelText('Preço mínimo'), { target: { value: '10.50' } });
    fireEvent.change(screen.getByLabelText('Preço máximo'), { target: { value: '99.90' } });

    const lastUrl = mockUseApiFetch.mock.calls.at(-1)?.[0] || '';
    expect(lastUrl).toContain('&minPrice=10.50');
    expect(lastUrl).toContain('&maxPrice=99.90');
  });

  it('deve navegar para a próxima página ao clicar em "Próxima"', () => {
    jest.useFakeTimers();
    setupPaginatedApiMock(3);

    render(<ProductList />);
    expect(screen.getByText('Produto Página 1')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Próxima'));

    expect(mockUseApiFetch.mock.calls.at(-1)?.[0]).toContain('page=2');
    expect(screen.getByText('Produto Página 2')).toBeInTheDocument();

    advancePageLoadingTimer();
  });

  it('deve navegar para a página anterior ao clicar em "Anterior"', () => {
    jest.useFakeTimers();
    setupPaginatedApiMock(3);

    render(<ProductList />);
    expect(screen.getByLabelText('Página anterior')).toBeDisabled();

    fireEvent.click(screen.getByText('Próxima'));
    advancePageLoadingTimer();
    expect(screen.getByText('Produto Página 2')).toBeInTheDocument();
    expect(screen.getByLabelText('Página anterior')).not.toBeDisabled();

    fireEvent.click(screen.getByLabelText('Página anterior'));
    advancePageLoadingTimer();
    expect(screen.getByText('Produto Página 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Página anterior')).toBeDisabled();
  });

  it('deve exibir loading overlay durante a troca de página e removê-lo ao final', () => {
    jest.useFakeTimers();
    setupPaginatedApiMock(3);

    render(<ProductList />);

    let grid = screen.getByText('Produto Página 1').closest('div[style*="opacity"]');
    expect(grid).toHaveStyle('opacity: 1');

    fireEvent.click(screen.getByText('Próxima'));

    // pageLoading ativo: overlay do Spinner, grid com opacidade reduzida e sem interação
    grid = screen.getByText('Produto Página 2').closest('div[style*="opacity"]');
    expect(grid).toHaveStyle('opacity: 0.4');
    expect(grid).toHaveStyle('pointer-events: none');
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Próxima')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ir para página 3' })).toHaveStyle('cursor: not-allowed');

    advancePageLoadingTimer();

    // pageLoading removido após a transição
    grid = screen.getByText('Produto Página 2').closest('div[style*="opacity"]');
    expect(grid).toHaveStyle('opacity: 1');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Próxima')).not.toBeDisabled();
  });

  it('deve ajustar a faixa de páginas visíveis quando há mais de 5 páginas', () => {
    jest.useFakeTimers();
    setupPaginatedApiMock(8);

    render(<ProductList />);

    const pageButton = (num) => screen.getByRole('button', { name: `Ir para página ${num}` });
    const hasPageButton = (num) => screen.queryByRole('button', { name: `Ir para página ${num}` }) !== null;

    // Página 1: faixa inicial 1 a 5
    expect(hasPageButton(1)).toBe(true);
    expect(hasPageButton(5)).toBe(true);
    expect(hasPageButton(6)).toBe(false);

    // Página 3: faixa permanece 1 a 5
    fireEvent.click(screen.getByText('Próxima'));
    advancePageLoadingTimer();
    fireEvent.click(screen.getByText('Próxima'));
    advancePageLoadingTimer();
    expect(pageButton(3)).toBeDisabled();
    expect(hasPageButton(6)).toBe(false);

    // Página 4: faixa 2 a 6
    fireEvent.click(screen.getByText('Próxima'));
    advancePageLoadingTimer();
    expect(hasPageButton(2)).toBe(true);
    expect(hasPageButton(6)).toBe(true);
    expect(hasPageButton(1)).toBe(false);

    // Página 5: faixa 3 a 7
    fireEvent.click(screen.getByText('Próxima'));
    advancePageLoadingTimer();
    expect(hasPageButton(3)).toBe(true);
    expect(hasPageButton(7)).toBe(true);
    expect(hasPageButton(2)).toBe(false);

    // Página 6 (limite final): faixa 4 a 8
    fireEvent.click(pageButton(6));
    advancePageLoadingTimer();
    expect(pageButton(6)).toBeDisabled();
    expect(hasPageButton(4)).toBe(true);
    expect(hasPageButton(8)).toBe(true);
    expect(hasPageButton(3)).toBe(false);
  });

  it('deve ordenar produtos por position e ID (decrescente)', () => {
    const produtosDesordenados = [
      { id: 1, name: 'Produto 1', description: 'Desc 1', price: 'R$ 10,00', position: 1 },
      { id: 3, name: 'Produto 3', description: 'Desc 3', price: 'R$ 30,00', position: 1 },
      { id: 5, name: 'Produto 5', description: 'Desc 5', price: 'R$ 50,00', position: 3 },
      { id: 4, name: 'Produto 4', description: 'Desc 4', price: 'R$ 40,00' },
    ];

    // A ordenação é responsabilidade da `transform` do próprio componente;
    // o mock entrega apenas a resposta bruta da API, sem pré-ordenar.
    // `pagination` sem `totalPages` exerce o fallback a 1 página.
    mockUseApiFetch.mockReturnValue({
      data: { data: produtosDesordenados, pagination: {} },
      loading: false,
      error: null,
    });

    render(<ProductList />);

    const cards = screen.getAllByTestId('mock-product-card');
    // position=1 ordena por id descendente: Produto 3(id=3), Produto 1(id=1),
    // depois position=3, depois produto sem position (fallback 9999)
    expect(cards[0]).toHaveAttribute('data-product-id', '3');
    expect(cards[1]).toHaveAttribute('data-product-id', '1');
    expect(cards[2]).toHaveAttribute('data-product-id', '5');
    expect(cards[3]).toHaveAttribute('data-product-id', '4');
  });
});