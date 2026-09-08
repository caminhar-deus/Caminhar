import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import MusicGallery from '../../../../../components/Features/Music/MusicGallery.js';
import { mockGlobalFetch } from '../../../../helpers/index.js';

let fetchMock;

// Mock do componente filho (MusicCard) para focar apenas na lógica da Galeria
jest.mock('../../../../../components/Features/Music/MusicCard.js', () => {
  return function DummyMusicCard({ musica }) {
    return <div data-testid="music-card"><h3>{musica.titulo}</h3><p>{musica.artista}</p></div>;
  };
});

describe('Componente Front-End - MusicGallery', () => {
  beforeEach(() => {
    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    fetchMock?.mockRestore();
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
      expect(screen.getByText('Nenhuma música encontrada')).toBeInTheDocument();
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

  it('deve buscar músicas por término e mostrar o contador de resultados', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockMusicas, totalPages: 1, total: 7 }),
    });

    render(<MusicGallery />);

    await waitFor(() => {
      expect(screen.getByText('Hino da Vitória')).toBeInTheDocument();
    });

    // Configura mock da resposta da búsqueda ANTES de digitar (tras el debounce)
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockMusicas[0]], totalPages: 1, total: 1 }),
    });

    const searchInput = screen.getByLabelText('Buscar música ou artista');
    fireEvent.change(searchInput, { target: { value: 'Hino' } });

    await waitFor(() => {
      expect(screen.getByText(/1 resultado para "Hino"/)).toBeInTheDocument();
    });

    expect(searchInput).toHaveValue('Hino');
  });

  it('deve limpar a busca ao clicar no botão ✕', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockMusicas[0]], totalPages: 1, total: 1 }),
    });

    render(<MusicGallery />);

    await waitFor(() => {
      expect(screen.getByText('Hino da Vitória')).toBeInTheDocument();
    });

    const searchInput = screen.getByLabelText('Buscar música ou artista');
    fireEvent.change(searchInput, { target: { value: 'Hino' } });

    // O botão ✕ aparece assim que há um término de busca
    const clearButton = screen.getByLabelText('Limpar pesquisa');
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);

    expect(searchInput).toHaveValue('');
    expect(screen.queryByLabelText('Limpar pesquisa')).not.toBeInTheDocument();
  });

  it('deve cambiar a ordenação e solicitar os dados com o novo sort', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockMusicas.slice(0, 6), totalPages: 2, total: 7 }),
    });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockMusicas.slice(0, 6), totalPages: 2, total: 7 }),
    });

    render(<MusicGallery />);

    await waitFor(() => {
      expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    });

    const sortSelect = screen.getByLabelText('Ordenar músicas');
    fireEvent.change(sortSelect, { target: { value: 'recent' } });

    await waitFor(() => {
      const urls = global.fetch.mock.calls.map((call) => call[0]);
      expect(urls.some((url) => url.includes('sort=recent'))).toBe(true);
    });

    expect(sortSelect).toHaveValue('recent');
  });

  it('deve voltar à página anterior com o botão Anterior', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockMusicas.slice(0, 6), totalPages: 2, total: 7 }),
    });

    render(<MusicGallery />);

    await waitFor(() => {
      expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockMusicas[6]], totalPages: 2, total: 7 }),
    });

    fireEvent.click(screen.getByLabelText('Próxima página'));

    await waitFor(() => {
      expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockMusicas.slice(0, 6), totalPages: 2, total: 7 }),
    });

    fireEvent.click(screen.getByLabelText('Página anterior'));

    await waitFor(() => {
      expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    });

    // Na página 1 o botão Anterior está deshabilitado
    expect(screen.getByLabelText('Página anterior')).toBeDisabled();
  });

  it('deve mostrar mensagem de sem resultados para a busca e permitir limpá-la', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockMusicas, totalPages: 1, total: 7 }),
    });

    render(<MusicGallery />);

    await waitFor(() => {
      expect(screen.getByText('Hino da Vitória')).toBeInTheDocument();
    });

    // Búsqueda sem resultados
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], totalPages: 1, total: 0 }),
    });

    const searchInput = screen.getByLabelText('Buscar música ou artista');
    fireEvent.change(searchInput, { target: { value: 'Xyz' } });

    await waitFor(() => {
      expect(screen.getByText(/Nenhum resultado para "Xyz"/)).toBeInTheDocument();
    });

    // Botão "Limpar busca" presente no estado de sem resultados
    const clearButton = screen.getByText('Limpar busca');
    expect(clearButton).toBeInTheDocument();

    // Tras limpar volta a se cargar a lista completa
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockMusicas, totalPages: 1, total: 7 }),
    });

    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(screen.getByText('Hino da Vitória')).toBeInTheDocument();
    });

    expect(searchInput).toHaveValue('');
  });
});