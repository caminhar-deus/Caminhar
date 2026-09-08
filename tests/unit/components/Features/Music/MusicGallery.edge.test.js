import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import MusicGallery from '../../../../../components/Features/Music/MusicGallery.js';
import { suppressConsoleError, mockGlobalFetch } from '../../../../helpers/index.js';

// Mock do componente filho (MusicCard) para focar na lógica da Galeria
jest.mock('../../../../../components/Features/Music/MusicCard.js', () => {
  return function DummyMusicCard({ musica }) {
    return <div data-testid="music-card"><h3>{musica.titulo}</h3><p>{musica.artista}</p></div>;
  };
});

describe('Componentes Features - Music - MusicGallery (Edge Cases)', () => {
  let consoleErrorSpy;
  let fetchMock;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
    consoleErrorSpy?.mockRestore();
  });

  it('deve usar fallback vazio se a API retornar um objeto sem a chave data', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ meta: 'only' })
    });

    render(<MusicGallery />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma música encontrada')).toBeInTheDocument();
    });
  });

  it('deve exibir a mensagem de erro se a requisição falhar', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    render(<MusicGallery />);

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar músicas. Tente novamente.')).toBeInTheDocument();
    });
  });

  it('deve suportar resposta como array plano e calcular a paginação', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { id: 1, titulo: 'Hino da Vitória', artista: 'Cantor A' },
        { id: 2, titulo: 'Louvor Suave', artista: 'Cantor B' },
        { id: 3, titulo: 'Adoração', artista: 'Banda C' },
        { id: 4, titulo: 'Corinhos', artista: 'Coral D' },
        { id: 5, titulo: 'Acústico', artista: 'Cantor A' },
        { id: 6, titulo: 'Ao vivo', artista: 'Banda C' },
        { id: 7, titulo: 'Gospel Hit', artista: 'Cantor E' },
      ],
    });

    render(<MusicGallery />);

    await waitFor(() => {
      expect(screen.getByText('Gospel Hit')).toBeInTheDocument();
    });

    // 7 elementos / 6 por página → paginação calculada a 2 páginas
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  });

  it('deve suportar resposta com paginação anidada', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ id: 1, titulo: 'Hino da Vitória', artista: 'Cantor A' }],
        pagination: { totalPages: 3, total: 13 },
      }),
    });

    render(<MusicGallery />);

    await waitFor(() => {
      expect(screen.getByText('Hino da Vitória')).toBeInTheDocument();
    });

    expect(screen.getByText('Página 1 de 3')).toBeInTheDocument();
    expect(screen.getByText(/Mostrando 1 de 13 música/)).toBeInTheDocument();
  });

  it('deve manejar uma resposta nula com fallback seguro', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => null });

    render(<MusicGallery />);

    await waitFor(() => {
      expect(screen.getByText('Nenhuma música encontrada')).toBeInTheDocument();
    });
  });
});