import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from '@jest/globals';
import MusicCard from './MusicCard.js';

describe('Componentes Features - Music - MusicCard', () => {
  const originalConsoleError = console.error;

  beforeAll(() => {
    // Silencia o console.error gerado propositalmente no teste do bloco "catch"
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Mockando a ação de abrir nova aba
    window.open = jest.fn();
  });

  it('deve renderizar título e artista e formatar a URL normal do Spotify para embed', () => {
    const musica = {
      titulo: 'Hino Teste',
      artista: 'Cantor Teste',
      url_spotify: 'https://open.spotify.com/track/12345abcde'
    };

    render(<MusicCard musica={musica} />);
    
    expect(screen.getByText('Hino Teste')).toBeInTheDocument();
    expect(screen.getByText('Cantor Teste')).toBeInTheDocument();
    
    const iframe = screen.getByTestId('embed-iframe');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('https://open.spotify.com/embed/track/12345abcde'));
  });

  it('deve formatar corretamente uma URL internacional (intl) do Spotify', () => {
    const musica = { titulo: 'A', artista: 'B', url_spotify: 'https://open.spotify.com/intl-pt/track/98765fghij' };
    render(<MusicCard musica={musica} />);
    
    const iframe = screen.getByTestId('embed-iframe');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('https://open.spotify.com/embed/track/98765fghij'));
  });

  it('deve formatar corretamente uma URI (spotify:track:) do Spotify', () => {
    const musica = { titulo: 'A', artista: 'B', url_spotify: 'spotify:track:zzxyxxww' };
    render(<MusicCard musica={musica} />);
    
    const iframe = screen.getByTestId('embed-iframe');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('https://open.spotify.com/embed/track/zzxyxxww'));
  });

  it('deve usar a URL original (fallback) caso o formato seja desconhecido', () => {
    const musica = { titulo: 'A', artista: 'B', url_spotify: 'https://soundcloud.com/track/123' };
    render(<MusicCard musica={musica} />);
    
    const iframe = screen.getByTestId('embed-iframe');
    // Retorna a URL original sem embed/track
    expect(iframe).toHaveAttribute('src', expect.stringContaining('https://soundcloud.com/track/123'));
  });

  it('deve cair no catch de forma segura se a URL for nula ou inválida e estourar exceção no .match', () => {
    const musica = { titulo: 'A', artista: 'B', url_spotify: null };
    render(<MusicCard musica={musica} />);
    
    expect(console.error).toHaveBeenCalledWith('Erro ao converter URL do Spotify:', expect.any(Error));
    const iframe = screen.getByTestId('embed-iframe');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('null'));
  });

  it('deve abrir a url do Spotify em uma nova aba ao clicar no botão "Ouvir"', () => {
    const musica = { titulo: 'Som', artista: 'Voz', url_spotify: 'https://open.spotify.com/track/111222' };
    render(<MusicCard musica={musica} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Ouvir Som no Spotify/i }));
    expect(window.open).toHaveBeenCalledWith('https://open.spotify.com/track/111222', '_blank', 'noopener,noreferrer');
  });
});