import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import MusicGallery from '../../../../../components/Features/Music/MusicGallery.js';
import { suppressConsoleError } from '../../../../helpers/index.js';

describe('Componentes Features - Music - MusicGallery (Edge Cases)', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  it('deve usar fallback vazio se a API retornar um objeto sem a chave data', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ meta: 'only' })
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