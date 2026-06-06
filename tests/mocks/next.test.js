/**
 * Teste de Sanidade para Mocks do Next.js
 * 
 * Verifica se os mocks centralizados em tests/mocks/next-setup.js e
 * as implementações em tests/mocks/next.js estão funcionando corretamente.
 * 
 * Este teste deve ser executado sempre que a versão do Next.js for atualizada
 * para detectar quebras silenciosas na API mockada.
 * 
 * @see tests/mocks/next-setup.js
 * @see tests/mocks/next.js
 */

import { jest, describe, it, expect } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Importa o setup centralizado que registra todos os jest.mock()
import './next-setup.js';

describe('Mocks do Next.js (Sanidade)', () => {
  describe('next/router', () => {
    it('deve exportar useRouter como funcao', async () => {
      const { useRouter } = await import('next/router');
      expect(useRouter).toBeDefined();
      expect(typeof useRouter).toBe('function');
    });

    it('deve retornar objeto de router com propriedades esperadas', () => {
      const { useRouter } = jest.requireMock('next/router');
      const router = useRouter();
      expect(router).toBeDefined();
      expect(router.pathname).toBe('/');
      expect(router.push).toBeDefined();
      expect(router.replace).toBeDefined();
      expect(router.reload).toBeDefined();
      expect(router.back).toBeDefined();
      expect(router.events).toBeDefined();
      expect(router.events.on).toBeDefined();
      expect(router.events.off).toBeDefined();
      expect(router.events.emit).toBeDefined();
      expect(router.isReady).toBe(true);
    });
  });

  describe('next/navigation', () => {
    it('deve exportar hooks e funcoes do App Router', async () => {
      const mod = await import('next/navigation');
      expect(mod.useRouter).toBeDefined();
      expect(typeof mod.useRouter).toBe('function');
      expect(mod.usePathname).toBeDefined();
      expect(typeof mod.usePathname).toBe('function');
      expect(mod.useSearchParams).toBeDefined();
      expect(typeof mod.useSearchParams).toBe('function');
      expect(mod.useParams).toBeDefined();
      expect(typeof mod.useParams).toBe('function');
      expect(mod.redirect).toBeDefined();
      expect(typeof mod.redirect).toBe('function');
      expect(mod.notFound).toBeDefined();
      expect(typeof mod.notFound).toBe('function');
      expect(mod.permanentRedirect).toBeDefined();
      expect(typeof mod.permanentRedirect).toBe('function');
    });

    it('deve retornar valores padrao do App Router', () => {
      const { useRouter, usePathname, useSearchParams, useParams } = jest.requireMock('next/navigation');
      const router = useRouter();
      expect(router.push).toBeDefined();
      expect(router.refresh).toBeDefined();
      expect(router.back).toBeDefined();
      expect(router.forward).toBeDefined();
      expect(router.prefetch).toBeDefined();
      expect(usePathname()).toBe('/');
      expect(useSearchParams()).toBeInstanceOf(URLSearchParams);
      expect(useParams()).toEqual({});
    });
  });

  describe('next/image', () => {
    it('deve renderizar como elemento img', async () => {
      const { default: NextImage } = await import('next/image');
      const { container } = render(
        React.createElement(NextImage, { src: '/test.jpg', alt: 'Teste', width: 100, height: 100 })
      );
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', '/test.jpg');
      expect(img).toHaveAttribute('alt', 'Teste');
      expect(img).toHaveAttribute('width', '100');
      expect(img).toHaveAttribute('height', '100');
    });
  });

  describe('next/link', () => {
    it('deve renderizar como elemento a', async () => {
      const { default: NextLink } = await import('next/link');
      render(React.createElement(NextLink, { href: '/teste' }, 'Link Teste'));
      const link = screen.getByText('Link Teste');
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe('A');
      expect(link).toHaveAttribute('href', '/teste');
    });
  });

  describe('next/head', () => {
    it('deve renderizar children', async () => {
      const { default: NextHead } = await import('next/head');
      render(
        React.createElement(NextHead, null,
          React.createElement('title', null, 'Test Title')
        )
      );
      expect(document.title).toBe('Test Title');
    });
  });

  describe('next/script', () => {
    it('deve renderizar como elemento script', async () => {
      const { default: NextScript } = await import('next/script');
      const { container } = render(
        React.createElement(NextScript, { src: '/test.js' })
      );
      const script = container.querySelector('script');
      expect(script).toBeInTheDocument();
      expect(script).toHaveAttribute('src', '/test.js');
    });
  });

  describe('next/headers', () => {
    it('deve exportar headers e cookies como funcoes assincronas', async () => {
      const mod = await import('next/headers');
      expect(mod.headers).toBeDefined();
      expect(typeof mod.headers).toBe('function');
      expect(mod.cookies).toBeDefined();
      expect(typeof mod.cookies).toBe('function');

      const headersResult = await mod.headers();
      expect(headersResult.get).toBeDefined();
      expect(typeof headersResult.get).toBe('function');

      const cookiesResult = await mod.cookies();
      expect(cookiesResult.get).toBeDefined();
      expect(typeof cookiesResult.get).toBe('function');
    });
  });
});