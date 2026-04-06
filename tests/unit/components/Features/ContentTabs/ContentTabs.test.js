import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, afterEach } from '@jest/globals';
import ContentTabs from '../../../../../components/Features/ContentTabs/index.js';

jest.mock('../../../../../components/Features/Blog/BlogSection', () => () => <div data-testid="blog">Blog</div>);
jest.mock('../../../../../components/Features/Music/MusicGallery', () => () => <div data-testid="music">Music</div>);
jest.mock('../../../../../components/Features/Video/VideoGallery', () => () => <div data-testid="video">Video</div>);
jest.mock('../../../../../components/Products/ProductList', () => () => <div data-testid="products">Products</div>);

describe('Componente Front-End - ContentTabs', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('deve renderizar a aba de Reflexões por padrão', () => {
    render(<ContentTabs />);
    expect(screen.getByTestId('blog')).toBeInTheDocument();
  });

  it('deve alternar para as abas Músicas, Vídeos e Produtos ao clicar', () => {
    render(<ContentTabs />);
    
    fireEvent.click(screen.getByText(/Músicas/i));
    expect(screen.getByTestId('music')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Vídeos/i));
    expect(screen.getByTestId('video')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Produtos Religiosos/i));
    expect(screen.getByTestId('products')).toBeInTheDocument();
  });

  it('não deve mudar de aba ao clicar no projeto bloqueado', () => {
    render(<ContentTabs />);
    const projBtn = screen.getByText('Em Desenvolvimento').closest('button');
    
    fireEvent.click(projBtn);
    expect(screen.getByTestId('blog')).toBeInTheDocument();
  });

  it('deve usar o default do switch para abas desconhecidas (fallback) e para projetos futuros', () => {
    jest.spyOn(React, 'useState').mockReturnValueOnce(['projeto1', jest.fn()]);
    render(<ContentTabs />);
    expect(screen.getByText('Conteúdo será implementado em breve')).toBeInTheDocument();
    expect(screen.getByText('Projeto Futuro')).toBeInTheDocument();
  });
});