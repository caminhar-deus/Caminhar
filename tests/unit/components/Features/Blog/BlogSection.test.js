import React from 'react';
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import BlogSection from '../../../../../components/Features/Blog/BlogSection';
import { suppressConsoleError, mockGlobalFetch } from '../../../../helpers/index.js';

// Mock do componente filho PostCard para não precisarmos testar seus internos aqui
jest.mock('../../../../../components/Features/Blog/PostCard', () => {
  return function DummyPostCard({ post }) {
    return <div data-testid="post-card">{post.title}</div>;
  };
});

describe('Componente Front-End - BlogSection', () => {
  const mockPosts = [
    { id: 1, title: 'Post 1' },
    { id: 2, title: 'Post 2' },
    { id: 3, title: 'Post 3' }
  ];

  let consoleErrorSpy;
  let fetchMock;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    fetchMock?.mockRestore();
  });

  it('deve renderizar o estado de loading inicialmente', async () => {
    let resolveApi;
    global.fetch.mockReturnValueOnce(new Promise(resolve => { resolveApi = resolve; }));

    render(<BlogSection />);
    expect(screen.getByText('Carregando reflexões...')).toBeInTheDocument();

    resolveApi({ ok: true, json: async () => ({ success: true, data: [] }) });
    await waitForElementToBeRemoved(() => screen.queryByText('Carregando reflexões...'));
  });

  it('deve retornar null (não renderizar nada) se não houver posts', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    });
    const { container } = render(<BlogSection />);

    await waitForElementToBeRemoved(() => screen.queryByText('Carregando reflexões...'));
    expect(container).toBeEmptyDOMElement();
  });

  it('deve renderizar os posts carregados da API', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockPosts }),
    });
    render(<BlogSection />);

    await waitFor(() => {
      expect(screen.getByText('Reflexões & Estudos')).toBeInTheDocument();
      expect(screen.getAllByTestId('post-card')).toHaveLength(3);
    });
  });

  it('deve respeitar a propriedade limit e mostrar botão de ver todos se houverem mais posts', async () => {
    // Com o limite pedido à API (F2.1), o servidor devolve no máximo `limit`
    // itens; o botão depende do `pagination.total` REAL da resposta.
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockPosts.slice(0, 2), pagination: { total: 3 } }),
    });
    render(<BlogSection limit={2} />);

    await waitFor(() => {
      expect(screen.getAllByTestId('post-card')).toHaveLength(2);
      expect(screen.getByText('Ver todas as postagens')).toBeInTheDocument();
    });
  });

  it('não deve mostrar botão de ver todos se limit for maior que a quantidade de posts', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockPosts, pagination: { total: 3 } }),
    });
    render(<BlogSection limit={5} />);

    await waitFor(() => {
      expect(screen.getAllByTestId('post-card')).toHaveLength(3);
      expect(screen.queryByText('Ver todas as postagens')).not.toBeInTheDocument();
    });
  });

  it('deve renderizar nada quando a API retorna formato lógico inválido (sucesso: false)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false }),
    });
    // O fallback defensivo do transform devolve { posts: [], total: 0 } e a
    // seção não renderiza nada; o log de console foi removido do caminho público.
    const { container } = render(<BlogSection />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('deve renderizar nada quando a API falha com erros HTTP (ex: 500) com retorno JSON', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Erro no servidor' }),
    });
    const { container } = render(<BlogSection />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('deve renderizar nada quando a API retorna erro HTTP sem mensagem (fallback "Unknown error")', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ }),
    });
    const { container } = render(<BlogSection />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('deve renderizar nada quando há falha de rede ou JSON inválido', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Unparsable')),
    });
    const { container } = render(<BlogSection />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});