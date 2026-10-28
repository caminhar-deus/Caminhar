import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { suppressConsoleError, mockGlobalFetch } from '../../helpers/index.js';

jest.mock('../../../components/Features/ContentTabs', () => {
  return function DummyContentTabs() { return <div data-testid="content-tabs" />; };
});
jest.mock('../../../components/Features/Testimonials', () => {
  return function DummyTestimonials() { return <div data-testid="testimonials" />; };
});

import Home from '../../../pages/index.js';

describe('pages/index.js — banner hero vem da configuração do painel', () => {
  let consoleErrorSpy;
  let fetchMock;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
    fetchMock?.mockRestore();
    sessionStorage.clear();
  });

  it('usa settings.home_image_url como src do banner quando a setting existe', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        site_title: 'O Caminhar com Deus',
        site_subtitle: 'Subtítulo',
        home_image_url: '/uploads/hero-image-nova.webp',
      }),
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByAltText('Caminhar com Deus')).toHaveAttribute(
        'src',
        '/uploads/hero-image-nova.webp'
      );
    });
  });

  it('mantém o fallback /api/placeholder-image quando a setting não existe', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ site_title: 'O Caminhar com Deus', site_subtitle: 'Subtítulo' }),
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByAltText('Caminhar com Deus')).toHaveAttribute(
        'src',
        '/api/placeholder-image'
      );
    });
  });

  it('não grava cache de settings em sessionStorage (a troca no painel deve aparecer na próxima visita)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ site_title: 'T', site_subtitle: 'S', home_image_url: '/uploads/x.webp' }),
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByAltText('Caminhar com Deus')).toHaveAttribute('src', '/uploads/x.webp');
    });
    expect(sessionStorage.getItem('home_settings')).toBeNull();
  });

  it('rejeita URL com esquema perigoso na setting e mantém o fallback (defesa em profundidade)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ site_title: 'T', site_subtitle: 'S', home_image_url: 'javascript:alert(1)' }),
    });

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByAltText('Caminhar com Deus')).toHaveAttribute(
        'src',
        '/api/placeholder-image'
      );
    });
  });
});
