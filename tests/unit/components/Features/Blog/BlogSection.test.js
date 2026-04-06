import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import BlogSection from '../../../../../components/Features/Blog/BlogSection';

// Mock do componente filho PostCard para não precisarmos testar seus internos aqui
jest.mock('../../../../../components/Features/Blog/PostCard', () => {
  return function DummyPostCard({ post }) {
    return <div data-testid="post-card">{post.title}</div>;
  };
});

describe('Componente Front-End - BlogSection', () => {
  const originalFetch = global.fetch;
  const mockPosts = [
    { id: 1, title: 'Post 1' },
    { id: 2, title: 'Post 2' },
    { id: 3, title: 'Post 3' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('deve renderizar o estado de loading inicialmente', async () => {
    // Seguramos a Promise pendente para garantir que o Loading seja visto na tela
    let resolveApi;
    global.fetch.mockReturnValueOnce(new Promise(resolve => { resolveApi = resolve; }));
    
    render(<BlogSection />);
    expect(screen.getByText('Carregando reflexões...')).toBeInTheDocument();
    
    resolveApi({ ok: true, json: async () => ({ success: true, data: [] }) });
    await waitFor(() => expect(screen.queryByText('Carregando reflexões...')).not.toBeInTheDocument());
  });

  it('deve retornar null (não renderizar nada) se não houver posts', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [] }) });
    const { container } = render(<BlogSection />);
    
    await waitFor(() => expect(screen.queryByText('Carregando reflexões...')).not.toBeInTheDocument());
    expect(container).toBeEmptyDOMElement();
  });

  it('deve renderizar os posts carregados da API', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPosts }) });
    render(<BlogSection />);
    
    await waitFor(() => {
      expect(screen.getByText('Reflexões & Estudos')).toBeInTheDocument();
      expect(screen.getAllByTestId('post-card')).toHaveLength(3);
    });
  });

  it('deve respeitar a propriedade limit e mostrar botão de ver todos se houverem mais posts', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPosts }) });
    render(<BlogSection limit={2} />);
    
    await waitFor(() => {
      expect(screen.getAllByTestId('post-card')).toHaveLength(2);
      expect(screen.getByText('Ver todas as postagens')).toBeInTheDocument();
    });
  });

  it('não deve mostrar botão de ver todos se limit for maior que a quantidade de posts', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: mockPosts }) });
    render(<BlogSection limit={5} />);
    
    await waitFor(() => {
      expect(screen.getAllByTestId('post-card')).toHaveLength(3);
      expect(screen.queryByText('Ver todas as postagens')).not.toBeInTheDocument();
    });
  });

  it('deve lidar silenciosamente com erros de lógica da API (sucesso: false)', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: false }) });
    render(<BlogSection />);
    await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('API returned success: false'), expect.any(Object)));
    consoleSpy.mockRestore();
  });

  it('deve lidar silenciosamente com erros HTTP (ex: 500) com retorno JSON', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ message: 'Erro no servidor' }) });
    render(<BlogSection />);
    await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith('API Error fetching posts:', 500, 'Erro no servidor'));
    consoleSpy.mockRestore();
  });

  it('deve usar fallback "Unknown error" se a API retornar erro HTTP sem mensagem', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) }); // JSON vazio
    render(<BlogSection />);
    await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith('API Error fetching posts:', 404, 'Unknown error'));
    consoleSpy.mockRestore();
  });

  it('deve lidar silenciosamente com falha de rede ou JSON inválido', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: () => Promise.reject(new Error('Unparsable')) });
    render(<BlogSection />);
    // O catch principal vai capturar essa quebra no res.json()
    await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith('Erro ao carregar posts:', expect.any(Error)));
    consoleSpy.mockRestore();
  });
});