import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import VideoGallery from '../../../../../components/Features/Video/VideoGallery.js';
import { mockGlobalFetch } from '../../../../helpers/index.js';

let fetchMock;

// Mock do componente filho (VideoCard) para focar apenas na lógica da Galeria
jest.mock('../../../../../components/Features/Video/VideoCard.js', () => {
  return function DummyVideoCard({ video }) {
    return <div data-testid="video-card"><h3>{video.title || video.titulo}</h3></div>;
  };
});

describe('Componente Front-End - VideoGallery', () => {
  beforeEach(() => {
    jest.useFakeTimers(); // Intercepta os setTimeout para testarmos o 'debounce'
    fetchMock = mockGlobalFetch();
  });

  afterEach(() => {
    jest.useRealTimers();
    fetchMock?.mockRestore();
  });

  const mockVideos = {
    success: true,
    data: [
      { id: 1, title: 'Vídeo Teste 1' },
      { id: 2, title: 'Vídeo Teste 2' }
    ],
    pagination: { totalPages: 2, total: 12 }
  };

  it('deve renderizar o estado de loading e exibir os vídeos da API', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockVideos });
    
    render(<VideoGallery />);
    
    expect(screen.getByText('Carregando vídeos...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Vídeo Teste 1')).toBeInTheDocument();
    });
    
    expect(screen.getByText('12 vídeos disponível(is)')).toBeInTheDocument();
  });

  it('deve lidar com singular na contagem de vídeos (1 vídeo disponível)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: [{ id: 1, title: 'Único' }], pagination: { totalPages: 1, total: 1 } })
    });
    
    render(<VideoGallery />);
    
    await waitFor(() => {
      expect(screen.getByText('1 vídeo disponível(is)')).toBeInTheDocument();
    });
  });

  it('deve buscar vídeos com termo de pesquisa (debounce) e limpar a busca', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => mockVideos });
    
    render(<VideoGallery />);
    await waitFor(() => expect(screen.getByText('Vídeo Teste 1')).toBeInTheDocument());
    
    const searchInput = screen.getByPlaceholderText('Pesquisar por título ou descrição...');
    
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Teste' } });
      // Avança o relógio interno para simular o debounce de 300ms do usuário parando de digitar
      jest.advanceTimersByTime(300);
    });
    
    expect(global.fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('search=Teste'), expect.any(Object));
    
    // Testa o botão de limpar do input de busca (aquele com o '✕')
    const clearButton = screen.getByLabelText('Limpar busca');
    await act(async () => {
      fireEvent.click(clearButton);
      jest.advanceTimersByTime(300);
    });
    
    expect(searchInput.value).toBe('');
  });

  it('deve exibir a mensagem de lista vazia e permitir limpar a busca pelo botão "Limpar busca"', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: [], pagination: { totalPages: 1, total: 0 } })
    });
    
    render(<VideoGallery />);
    
    const searchInput = screen.getByPlaceholderText('Pesquisar por título ou descrição...');
    
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Inexistente' } });
      jest.advanceTimersByTime(300);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Nenhum vídeo encontrado')).toBeInTheDocument();
    });
    
    // O botão de Limpar Busca (texto) aparece no centro da tela quando a busca falha
    const retryClearButton = screen.getByText('Limpar busca', { selector: 'button' });
    await act(async () => {
      fireEvent.click(retryClearButton);
      jest.advanceTimersByTime(300);
    });
    
    expect(searchInput.value).toBe('');
  });

  it('deve lidar com resposta da API sem data e sem pagination (fallbacks estruturais)', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }) // Retorna success mas sem as listas
    });
    
    render(<VideoGallery />);
    
    await waitFor(() => {
      expect(screen.getByText('Nenhum vídeo encontrado')).toBeInTheDocument();
    });
  });

  it('deve exibir mensagem de erro se o fetch falhar e tentar de novo', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Erro no servidor' }) });
    render(<VideoGallery />);
    
    await waitFor(() => {
      expect(screen.getByText(/Erro no servidor/)).toBeInTheDocument();
    });
    
    // Simula uma API bem-sucedida após a primeira falha
    const retryBtn = screen.getByText('Tentar novamente');
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => mockVideos });
    
    await act(async () => {
      fireEvent.click(retryBtn);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Vídeo Teste 1')).toBeInTheDocument();
    });
    
    consoleSpy.mockRestore();
  });

  it('deve exibir mensagem de erro se a API retornar HTTP com erro', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: 'Erro interno' }) });
    
    render(<VideoGallery />);
    
    await waitFor(() => {
      expect(screen.getByText(/Erro interno/)).toBeInTheDocument();
    });
    
    consoleSpy.mockRestore();
  });

  it('deve navegar pelas páginas (Anterior e Próxima)', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => mockVideos });
    
    render(<VideoGallery />);
    
    await waitFor(() => {
      expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
    });
    
    const nextBtn = screen.getByText('Próxima');
    await act(async () => { fireEvent.click(nextBtn); });
    
    await waitFor(() => expect(global.fetch).toHaveBeenNthCalledWith(2, expect.stringContaining('page=2'), expect.any(Object)));
    
    const prevBtn = screen.getByText('Anterior');
    await act(async () => { fireEvent.click(prevBtn); });
    
    await waitFor(() => expect(global.fetch).toHaveBeenNthCalledWith(3, expect.stringContaining('page=1'), expect.any(Object)));
  });
});