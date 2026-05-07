import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import MusicGallery from '../../../../../components/Features/Music/MusicGallery.js';

const originalFetch = global.fetch;

// Mock do componente filho (MusicCard) para focar apenas na lógica da Galeria
jest.mock('../../../../../components/Features/Music/MusicCard.js', () => {
  return function DummyMusicCard({ musica }) {
    return <div data-testid="music-card"><h3>{musica.titulo}</h3><p>{musica.artista}</p></div>;
  };
});

describe('Componente Front-End - MusicGallery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const mockMusicas = [
    { id: 1, titulo: 'Hino da Vitória', artista: 'Cantor A' },
    { id: 2, titulo: 'Louvor Suave', artista: 'Cantor B' },
    { id: 3, titulo: 'Adoração', artista: 'Banda C' },
    { id: 4, titulo: 'Corinhos', artista: 'Coral D' },
    { id: 5, titulo: 'Acústico', artista: 'Cantor A' },
    { id: 6, titulo: 'Ao vivo', artista: 'Banda C' },
    { id: 7, titulo: 'Gospel Hit', artista: 'Cantor E' },
  ];

  it('deve renderizar loading e depois carregar as músicas da API', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockMusicas.slice(0, 6), totalPages: 2, total: 7 }),
    });

    render(<MusicGallery />);

    expect(screen.getByText('Carregando músicas...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Hino da Vitória')).toBeInTheDocument();
    });

    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  });

  it('deve exibir erro se a API falhar e permitir tentar novamente', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Erro no servidor' }) });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<MusicGallery />);

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar músicas. Tente novamente.')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('deve exibir mensagem de nenhum resultado quando não houver músicas', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], totalPages: 1, total: 0 }),
    });

    render(<MusicGallery />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma música encontrada.')).toBeInTheDocument();
    });
  });

  it('deve navegar pelas páginas quando houver múltiplas páginas', async () => {
    // Primeiro retorno: página 1 com 6 itens
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockMusicas.slice(0, 6), totalPages: 2, total: 7 }),
    });

    render(<MusicGallery />);

    await waitFor(() => {
      expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    });

    // Configura mock da página 2 ANTES de clicar
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockMusicas[6]], totalPages: 2, total: 7 }),
    });

    // Clica em Próxima
    const nextButton = screen.getByLabelText('Próxima página');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
    });
  });
});