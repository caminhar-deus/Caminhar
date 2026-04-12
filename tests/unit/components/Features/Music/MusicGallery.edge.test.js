import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, beforeAll, afterAll } from '@jest/globals';
import MusicGallery from '../../../../../components/Features/Music/MusicGallery.js';

describe('Componentes Features - Music - MusicGallery (Edge Cases)', () => {
  const originalFetch = global.fetch;
  const originalConsoleError = console.error;

  beforeAll(() => {
    global.fetch = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve usar fallback vazio se a API retornar um objeto sem a chave data (linha 25)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ meta: 'only' }) // Não é array e não possui a propriedade data
    });

    render(<MusicGallery />);
    
    await waitFor(() => {
      expect(screen.getByText('Nenhuma música encontrada')).toBeInTheDocument();
    });
  });

  it('deve exibir a mensagem de erro se a requisição falhar (linha 98)', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<MusicGallery />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Erro ao carregar músicas')[0]).toBeInTheDocument();
    });
  });

  it('deve avançar e retroceder a página corretamente e testar a estilização dos botões (linhas 148-166)', async () => {
    // Simula 8 músicas para termos 2 páginas (limite é 6 por página)
    const musicasMock = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      titulo: `Música ${i + 1}`,
      artista: `Artista ${i + 1}`,
      url_spotify: `https://open.spotify.com/track/${i + 1}`
    }));

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => musicasMock
    });

    render(<MusicGallery />);

    await waitFor(() => {
      expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    });

    const btnProxima = screen.getByRole('button', { name: /Próxima/i });
    const btnAnterior = screen.getByRole('button', { name: /Anterior/i });

    // Clica em Próxima, forçando a página 2 e ativando o estado "disabled" do botão Próxima
    fireEvent.click(btnProxima);
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
    
    // Tenta clicar novamente mesmo estando na última página, para forçar o Math.min(prev + 1, totalPages)
    fireEvent.click(btnProxima);
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();

    // Clica em Anterior para voltar
    fireEvent.click(btnAnterior);
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  });
});