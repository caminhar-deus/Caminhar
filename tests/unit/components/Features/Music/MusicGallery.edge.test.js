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

  it('deve usar fallback vazio se a API retornar um objeto sem a chave data', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ meta: 'only' }) // Não possui a propriedade data
    });

    render(<MusicGallery />);
    
    await waitFor(() => {
      expect(screen.getByText('Nenhuma música encontrada.')).toBeInTheDocument();
    });
  });

  it('deve exibir a mensagem de erro se a requisição falhar', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));

    render(<MusicGallery />);
    
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar músicas. Tente novamente.')).toBeInTheDocument();
    });
  });


});