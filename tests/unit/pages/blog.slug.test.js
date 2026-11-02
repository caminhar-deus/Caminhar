import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { suppressConsoleError } from '../../helpers/index.js';

jest.mock('../../../lib/infra/db.js', () => ({
  query: jest.fn(),
}));
jest.mock('../../../lib/cache/cache.js', () => ({
  getOrSetCache: jest.fn(),
}));
jest.mock('../../../lib/domain/settings.js', () => ({
  getSetting: jest.fn(),
}));

import { getServerSideProps, default as BlogPost } from '../../../pages/blog/[slug].js';
import { query } from '../../../lib/infra/db.js';
import { getOrSetCache } from '../../../lib/cache/cache.js';

describe('pages/blog/[slug].js (SSR e componente)', () => {
  const fakePost = {
    id: 1,
    title: 'Post de Teste',
    slug: 'post-de-teste',
    excerpt: 'Resumo do post',
    content: 'Conteúdo completo do post de teste.',
    image_url: 'https://images.unsplash.com/photo-test',
    published: true,
    created_at: '2026-10-30T12:00:00.000Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getServerSideProps', () => {
    it('retorna o post e siteTitle quando o slug existe e está publicado', async () => {
      query.mockResolvedValueOnce({ rows: [fakePost] });
      getOrSetCache.mockResolvedValueOnce('O Caminhar com Deus');

      const result = await getServerSideProps({ params: { slug: 'post-de-teste' } });

      expect(query).toHaveBeenCalledWith(
        'SELECT * FROM posts WHERE slug = $1 AND published = true',
        ['post-de-teste']
      );
      expect(getOrSetCache).toHaveBeenCalledWith(
        'settings:site_title',
        expect.any(Function),
        7200
      );
      expect(result).toEqual({
        props: {
          post: fakePost,
          siteTitle: 'O Caminhar com Deus',
        },
      });
    });

    it('retorna o post com siteTitle null se o cache falhar, sem derrubar a página (resiliência)', async () => {
      query.mockResolvedValueOnce({ rows: [fakePost] });
      getOrSetCache.mockRejectedValueOnce(new Error('Redis connection timeout'));

      const result = await getServerSideProps({ params: { slug: 'post-de-teste' } });

      expect(result).toEqual({
        props: {
          post: fakePost,
          siteTitle: null,
        },
      });
    });

    it('retorna notFound: true quando o post não existe no banco', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const result = await getServerSideProps({ params: { slug: 'post-inexistente' } });

      expect(result).toEqual({ notFound: true });
      expect(getOrSetCache).not.toHaveBeenCalled();
    });

    it('retorna notFound: true quando a query ao banco falha', async () => {
      const consoleErrorSpy = suppressConsoleError();
      query.mockRejectedValueOnce(new Error('DB Connection Error'));

      const result = await getServerSideProps({ params: { slug: 'slug-erro' } });

      expect(result).toEqual({ notFound: true });
      consoleErrorSpy?.mockRestore();
    });
  });

  describe('Componente BlogPost', () => {
    it('renderiza título, data e conteúdo do post', () => {
      render(<BlogPost post={fakePost} siteTitle="O Caminhar com Deus" />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Post de Teste');
      expect(screen.getByText('Conteúdo completo do post de teste.')).toBeInTheDocument();
      expect(screen.getByText('← Voltar')).toBeInTheDocument();
    });
  });
});
