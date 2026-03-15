import React from 'react';
import { jest, describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import Head from 'next/head';

// Mock do next/head para permitir a inspeção das tags durante o teste.
jest.mock('next/head', () => {
  return {
    __esModule: true,
    default: ({ children }) => {
      // No ambiente de teste, o Head simplesmente renderiza seus filhos,
      // que o testing-library insere no document.head do JSDOM.
      return <>{children}</>;
    },
  };
});

// Componente hipotético que aplica otimizações de SEO e Performance.
const SeoPerformanceWrapper = ({
  title,
  description,
  ogImage,
  isLoading,
  imageUrl,
}) => {
  if (isLoading) {
    return <div data-testid="loading-spinner">Carregando...</div>;
  }

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {ogImage && <meta property="og:image" content={ogImage} />}
      </Head>
      <div>
        <h1>{title}</h1>
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Imagem de performance"
            loading="lazy"
            decoding="async"
          />
        )}
      </div>
    </>
  );
};

describe('Componente de SEO e Performance', () => {
  describe('SEO', () => {
    it('deve renderizar as meta tags corretas no head do documento', () => {
      const seoProps = {
        title: 'Página de Teste de SEO',
        description: 'Esta é uma descrição para teste de SEO.',
        ogImage: 'https://example.com/og-image.jpg',
      };

      render(<SeoPerformanceWrapper {...seoProps} />);

      // Verifica a tag <title>
      expect(document.title).toBe(seoProps.title);

      // Verifica as meta tags
      const descriptionTag = document.querySelector('meta[name="description"]');
      expect(descriptionTag).toHaveAttribute('content', seoProps.description);

      const ogTitleTag = document.querySelector('meta[property="og:title"]');
      expect(ogTitleTag).toHaveAttribute('content', seoProps.title);

      const ogImageTag = document.querySelector('meta[property="og:image"]');
      expect(ogImageTag).toHaveAttribute('content', seoProps.ogImage);
    });
  });

  describe('Performance', () => {
    it('deve exibir um indicador de carregamento quando isLoading for true', () => {
      render(<SeoPerformanceWrapper isLoading={true} />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('deve renderizar a imagem com os atributos de lazy-loading corretos', () => {
      const props = {
        title: 'Página com Imagem Otimizada',
        imageUrl: '/path/to/image.jpg',
        isLoading: false,
      };

      render(<SeoPerformanceWrapper {...props} />);

      const img = screen.getByRole('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('loading', 'lazy');
      expect(img).toHaveAttribute('decoding', 'async');
    });
  });
});