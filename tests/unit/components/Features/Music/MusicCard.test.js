import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import MusicCard from '../../../../../components/Features/Music/MusicCard.js';
import { suppressConsoleError } from '../../../../helpers/index.js';

describe('Componentes Features - Music - MusicCard', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
    jest.spyOn(window, 'open').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  it('deve renderizar título e artista e formatar a URL normal do Spotify para embed', async () => {
    const musica = {
      titulo: 'Hino Teste',
      artista: 'Cantor Teste',
      url_spotify: 'https://open.spotify.com/track/12345abcde'
    };

    render(<MusicCard musica={musica} />);

    expect(screen.getByText('Hino Teste')).toBeInTheDocument();
    expect(screen.getByText('Cantor Teste')).toBeInTheDocument();

    const iframe = await screen.findByTestId('embed-iframe');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('https://open.spotify.com/embed/track/12345abcde'));
  });

  it('deve formatar corretamente uma URL internacional (intl) do Spotify', async () => {
    const musica = { titulo: 'A', artista: 'B', url_spotify: 'https://open.spotify.com/intl-pt/track/98765fghij' };
    render(<MusicCard musica={musica} />);

    const iframe = await screen.findByTestId('embed-iframe');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('https://open.spotify.com/embed/track/98765fghij'));
  });

  it('deve formatar corretamente uma URI (spotify:track:) do Spotify', async () => {
    const musica = { titulo: 'A', artista: 'B', url_spotify: 'spotify:track:zzxyxxww' };
    render(<MusicCard musica={musica} />);

    const iframe = await screen.findByTestId('embed-iframe');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('https://open.spotify.com/embed/track/zzxyxxww'));
  });

  it('deve usar a URL original (fallback) caso o formato seja desconhecido', async () => {
    const musica = { titulo: 'A', artista: 'B', url_spotify: 'https://soundcloud.com/track/123' };
    render(<MusicCard musica={musica} />);

    const iframe = await screen.findByTestId('embed-iframe');
    expect(iframe).toHaveAttribute('src', expect.stringContaining('https://soundcloud.com/track/123'));
  });

  it('deve tratar URL nula de forma segura sem lançar exceção e mostrar Prévia indisponível', async () => {
    const musica = { titulo: 'A', artista: 'B', url_spotify: null };
    render(<MusicCard musica={musica} />);

    expect(screen.getByText('Prévia indisponível')).toBeInTheDocument();
    expect(screen.queryByTestId('embed-iframe')).not.toBeInTheDocument();
  });

  it('não deve exibir botão Ouvir no Spotify se a URL for nula', async () => {
    const musica = { titulo: 'A', artista: 'B', url_spotify: null };
    render(<MusicCard musica={musica} />);

    expect(screen.queryByRole('button', { name: /Ouvir/i })).not.toBeInTheDocument();
  });

  it('deve abrir a url do Spotify em uma nova aba ao clicar no botão "Ouvir"', async () => {
    const musica = { titulo: 'Som', artista: 'Voz', url_spotify: 'https://open.spotify.com/track/111222' };
    render(<MusicCard musica={musica} />);

    await screen.findByTestId('embed-iframe');
    fireEvent.click(screen.getByRole('button', { name: /Ouvir Som no Spotify/i }));
    expect(window.open).toHaveBeenCalledWith('https://open.spotify.com/track/111222', '_blank', 'noopener,noreferrer');
  });
});