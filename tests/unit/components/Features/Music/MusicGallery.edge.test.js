import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import MusicGallery from '../../../../../components/Features/Music/MusicGallery.js';
import { suppressConsoleError, mockGlobalFetch } from '../../../../helpers/index.js';

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
});