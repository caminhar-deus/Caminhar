import React from 'react';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
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

    // Padrão único das abas: ❮ Anterior | Página X de Y | Próxima ❯
    expect(screen.getByLabelText('Página anterior')).toBeInTheDocument();
    expect(screen.getByLabelText('Próxima página')).toBeInTheDocument();
    // Live region da paginação (MASTER §7 / decisão D4)
    const pageInfo = screen.getByText('Página 1 de 2');
    expect(pageInfo).toHaveAttribute('aria-live', 'polite');
    expect(pageInfo).toHaveAttribute('aria-atomic', 'true');
  });

  it('deve desabilitar botão "Anterior" na primeira página', () => {
    setupApiMock();

    render(<ProductList />);

    const anteriorBtn = screen.getByLabelText('Página anterior');
    expect(anteriorBtn).toBeDisabled();
    expect(screen.getByLabelText('Próxima página')).not.toBeDisabled();
  });

  it('deve esconder a paginação (não renderizar) quando há apenas 1 página', () => {
    mockUseApiFetch.mockReturnValue({
      data: { data: defaultApiResponse.data, pagination: { totalPages: 1 } },
      loading: false,
      error: null,
    });

    render(<ProductList />);

    expect(screen.queryByLabelText('Página anterior')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Próxima página')).not.toBeInTheDocument();
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

    fireEvent.click(screen.getByLabelText('Próxima página'));

    expect(mockUseApiFetch.mock.calls.at(-1)?.[0]).toContain('page=2');
    expect(screen.getByText('Produto Página 2')).toBeInTheDocument();

    advancePageLoadingTimer();
  });

  it('deve navegar para a página anterior ao clicar em "Anterior"', () => {
    jest.useFakeTimers();
    setupPaginatedApiMock(3);

    render(<ProductList />);
    expect(screen.getByLabelText('Página anterior')).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Próxima página'));
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

    // O loading da grade é classe CSS (D5.1), não style inline
    const getGrid = () => screen.getByTestId('mock-product-card').parentElement;

    let grid = getGrid();
    expect(grid).not.toHaveClass('products-grid-loading');

    fireEvent.click(screen.getByLabelText('Próxima página'));

    // pageLoading ativo: overlay do Spinner, grid com a classe de opacidade
    // reduzida, seletor de ordenação desabilitado e Próxima disabled
    grid = getGrid();
    expect(grid).toHaveClass('products-grid-loading');
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Próxima página')).toBeDisabled();
    expect(screen.getByLabelText('Ordenar produtos')).toBeDisabled();

    advancePageLoadingTimer();

    // pageLoading removido após a transição
    grid = getGrid();
    expect(grid).not.toHaveClass('products-grid-loading');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Próxima página')).not.toBeDisabled();
    expect(screen.getByLabelText('Ordenar produtos')).not.toBeDisabled();
  });

  it('deve enviar o sort escolhido na URL, preservar a ordem do servidor e voltar à página 1', () => {
    // A ordenação é do servidor (F1.2): o componente NÃO re-ordena no cliente,
    // apenas repassa a ordem recebida e o parâmetro sort na URL.
    const produtosNaOrdemDoServidor = [
      { id: 1, name: 'Produto 1', description: 'Desc 1', price: 'R$ 10,00', position: 1 },
      { id: 3, name: 'Produto 3', description: 'Desc 3', price: 'R$ 30,00', position: 1 },
      { id: 5, name: 'Produto 5', description: 'Desc 5', price: 'R$ 50,00', position: 3 },
      { id: 4, name: 'Produto 4', description: 'Desc 4', price: 'R$ 40,00' },
    ];

    mockUseApiFetch.mockReturnValue({
      data: { data: produtosNaOrdemDoServidor, pagination: { totalPages: 1, total: 4 } },
      loading: false,
      error: null,
    });

    render(<ProductList />);

    // Ordem do servidor preservada (sem re-sort client-side)
    const cards = screen.getAllByTestId('mock-product-card');
    expect(cards[0]).toHaveAttribute('data-product-id', '1');
    expect(cards[1]).toHaveAttribute('data-product-id', '3');
    expect(cards[2]).toHaveAttribute('data-product-id', '5');
    expect(cards[3]).toHaveAttribute('data-product-id', '4');

    // Sort padrão presente na URL e seletor com as opções da spec
    expect(mockUseApiFetch.mock.calls.at(-1)?.[0]).toContain('sort=default');
    const sortSelect = screen.getByLabelText('Ordenar produtos');
    expect(screen.getByRole('option', { name: 'Padrão' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Mais antigos' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Menor preço' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Maior preço' })).toBeInTheDocument();

    // Trocar a ordenação envia o novo sort e reseta para a página 1
    fireEvent.change(sortSelect, { target: { value: 'price_asc' } });
    const lastUrl = mockUseApiFetch.mock.calls.at(-1)?.[0] || '';
    expect(lastUrl).toContain('sort=price_asc');
    expect(lastUrl).toContain('page=1');
  });

  it('deve expor "Posicionados" logo após "Padrão" e pedir sort=positioned na URL', () => {
    setupApiMock();

    render(<ProductList />);

    const sortSelect = screen.getByLabelText('Ordenar produtos');

    // "Padrão" continua sendo o valor inicial do seletor
    expect(sortSelect).toHaveValue('default');
    expect(mockUseApiFetch.mock.calls.at(-1)?.[0]).toContain('sort=default');

    // Ordem exata da spec design-system/pages/home.md §1.3
    const optionLabels = within(sortSelect)
      .getAllByRole('option')
      .map((option) => option.textContent.trim());
    expect(optionLabels).toEqual(['Padrão', 'Posicionados', 'Mais antigos', 'Menor preço', 'Maior preço']);

    // Escolher "Posicionados" pede sort=positioned na query string (servidor ordena)
    fireEvent.change(sortSelect, { target: { value: 'positioned' } });

    const lastUrl = mockUseApiFetch.mock.calls.at(-1)?.[0] || '';
    expect(lastUrl).toContain('sort=positioned');
    expect(lastUrl).toContain('page=1');
  });
});