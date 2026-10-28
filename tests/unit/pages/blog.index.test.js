import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { suppressConsoleError } from '../../helpers/index.js';

// Mock do PostCard para capturar as props recebidas (sem depender do cartão real)
const mockCapturedProps = [];
jest.mock('../../../components/Features/Blog/PostCard', () => {
  return function DummyPostCard(props) {
    mockCapturedProps.push(props);
    return <div data-testid="post-card">{props.post.title}</div>;
  };
});
jest.mock('../../../lib/domain/posts.js', () => ({
  getRecentPosts: jest.fn(),
}));
jest.mock('../../../lib/cache/cache.js', () => ({
  getOrSetCache: jest.fn(),
}));

import { getServerSideProps, default as BlogIndex } from '../../../pages/blog/index.js';
import { getRecentPosts } from '../../../lib/domain/posts.js';
import { getOrSetCache } from '../../../lib/cache/cache.js';

describe('pages/blog/index.js', () => {
  const fakeResult = {
    data: [{ id: 1, title: 'Post A' }, { id: 2, title: 'Post B' }],
    pagination: { page: 2, limit: 9, total: 20, totalPages: 3 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCapturedProps.length = 0;
    getOrSetCache.mockImplementation((key, fn) => fn());
  });

  describe('getServerSideProps', () => {
    it('usa a camada de domínio com a mesma chave de cache da API e devolve posts e paginação', async () => {
      getRecentPosts.mockResolvedValue(fakeResult);

      const { props } = await getServerSideProps({ query: { page: '2' } });

      expect(getRecentPosts).toHaveBeenCalledWith(9, 2, '');
      expect(getOrSetCache).toHaveBeenCalledWith('posts:list:2:9', expect.any(Function), 7200);
      expect(props.posts).toEqual(fakeResult.data);
      expect(props.currentPage).toBe(2);
      expect(props.totalPages).toBe(3);
      expect(props.fetchError).toBeUndefined();
    });

    it('normaliza página inválida para 1', async () => {
      getRecentPosts.mockResolvedValue(fakeResult);
      await getServerSideProps({ query: { page: 'abc' } });
      expect(getRecentPosts).toHaveBeenCalledWith(9, 1, '');
    });

    it('normaliza página menor que 1 para 1', async () => {
      getRecentPosts.mockResolvedValue(fakeResult);
      await getServerSideProps({ query: { page: '0' } });
      expect(getRecentPosts).toHaveBeenCalledWith(9, 1, '');
    });

    it('sem query param usa a página 1', async () => {
      getRecentPosts.mockResolvedValue(fakeResult);
      await getServerSideProps({ query: {} });
      expect(getRecentPosts).toHaveBeenCalledWith(9, 1, '');
    });

    it('em erro devolve fetchError com lista vazia', async () => {
      const spy = suppressConsoleError();
      try {
        getOrSetCache.mockRejectedValue(new Error('boom'));
        const { props } = await getServerSideProps({ query: {} });
        expect(props.fetchError).toBe(true);
        expect(props.posts).toEqual([]);
        expect(props.totalPages).toBe(1);
      } finally {
        spy?.mockRestore();
      }
    });
  });

  describe('BlogIndex (render)', () => {
    it('não passa rótulo custom ao PostCard — o CTA padrão "Ler mais →" vale para /blog também', () => {
      render(<BlogIndex posts={fakeResult.data} currentPage={1} totalPages={1} />);
      expect(screen.getAllByTestId('post-card')).toHaveLength(2);
      expect(mockCapturedProps[0].readMoreText).toBeUndefined();
      expect(mockCapturedProps[1].readMoreText).toBeUndefined();
    });

    it('exibe mensagem quando não há posts publicados', () => {
      render(<BlogIndex posts={[]} currentPage={1} totalPages={1} />);
      expect(screen.getByText('Nenhum post publicado ainda.')).toBeInTheDocument();
    });
  });
});
