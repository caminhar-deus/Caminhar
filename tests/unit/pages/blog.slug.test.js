import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { suppressConsoleError, filterConsoleWarn } from '../../helpers/index.js';

jest.mock('../../../pages/blog/Blog.module.css', () => ({
  container: 'container',
  postBackLinkWrapper: 'postBackLinkWrapper',
  backLink: 'backLink',
  article: 'article',
  postHeader: 'postHeader',
  postTitle: 'postTitle',
  postDate: 'postDate',
  imageZoomButton: 'imageZoomButton',
  postImage: 'postImage',
  postContent: 'postContent',
  shareSection: 'shareSection',
  shareTitle: 'shareTitle',
  shareActions: 'shareActions',
  shareButton: 'shareButton',
  shareFacebook: 'shareFacebook',
  shareWhatsapp: 'shareWhatsapp',
  shareInstagram: 'shareInstagram',
}));
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

      const warnSpy = filterConsoleWarn(['Falha ao obter site_title do cache no SSR']);
      try {
        const result = await getServerSideProps({ params: { slug: 'post-de-teste' } });

        expect(result).toEqual({
          props: {
            post: fakePost,
            siteTitle: null,
          },
        });
        expect(warnSpy).toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
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
    it('renderiza título, data, skip-link, landmark main, zoom acessível e compartilhamento sem saltos de heading', () => {
      const writeTextMock = jest.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        share: undefined,
        clipboard: { writeText: writeTextMock },
      });

      render(<BlogPost post={fakePost} siteTitle="O Caminhar com Deus" />);

      expect(screen.getByRole('link', { name: 'Pular para o conteúdo principal' })).toHaveAttribute(
        'href',
        '#main-content'
      );
      expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Post de Teste');
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Compartilhe esta reflexão:');
      expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
      expect(screen.getByText('Conteúdo completo do post de teste.')).toBeInTheDocument();

      const backLink = screen.getByRole('link', { name: '← Voltar' });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/');
      expect(backLink).toHaveClass('backLink');
      expect(backLink.parentElement).toHaveClass('postBackLinkWrapper');
      expect(screen.getByRole('article')).toHaveClass('article');

      // Imagem clicável é um botão acessível por teclado que abre o ImageLightbox
      const zoomButton = screen.getByTestId('image-zoom-container');
      expect(zoomButton.tagName).toBe('BUTTON');
      expect(zoomButton).toHaveAttribute('type', 'button');
      expect(zoomButton).toHaveAttribute('aria-label', 'Ampliar imagem: Post de Teste');
      fireEvent.click(zoomButton);
      expect(screen.getByTestId('image-lightbox')).toBeInTheDocument();

      // Botão Instagram possui type="button" e copia o link quando navigator.share não está disponível
      const instagramButton = screen.getByRole('button', { name: 'Instagram / Copiar Link' });
      expect(instagramButton).toHaveAttribute('type', 'button');
      fireEvent.click(instagramButton);
      expect(writeTextMock).toHaveBeenCalledWith('http://localhost:3000/blog/post-de-teste');
    });
  });
});
