import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import ProductCard from '../../../../../components/Features/Products/ProductCard.js';
import { suppressConsoleError } from '../../../../helpers/index.js';

// Mock do parseImages para evitar dependência de lib/api/utils
jest.mock('../../../../../lib/api/utils', () => ({
  parseImages: (images) => {
    if (!images) return [];
    try { return JSON.parse(images); }
    catch { return images ? [images] : []; }
  },
}));

describe('Componentes Features - Products - ProductCard', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = suppressConsoleError();
  });

  afterEach(() => {
    consoleErrorSpy?.mockRestore();
  });

  const baseProduct = {
    id: 1,
    title: 'Produto Teste',
    description: 'Descrição do produto teste',
    price: 'R$ 50,00',
    images: '["/img1.jpg"]',
  };

  it('deve renderizar título, descrição e preço do produto', () => {
    render(<ProductCard product={baseProduct} />);

    expect(screen.getByText('Produto Teste')).toBeInTheDocument();
    expect(screen.getByText('Descrição do produto teste')).toBeInTheDocument();
    expect(screen.getByText('R$ 50,00')).toBeInTheDocument();
  });

  it('deve exibir "Sem imagem" quando o produto não possui imagens', () => {
    const product = { ...baseProduct, images: null };
    render(<ProductCard product={product} />);

    expect(screen.getByText('Sem imagem')).toBeInTheDocument();
  });

  it('deve exibir "Sem imagem" quando images é string vazia', () => {
    const product = { ...baseProduct, images: '' };
    render(<ProductCard product={product} />);

    expect(screen.getByText('Sem imagem')).toBeInTheDocument();
  });

  it('deve exibir botões de navegação quando há múltiplas imagens', () => {
    const product = {
      ...baseProduct,
      images: '["/img1.jpg", "/img2.jpg", "/img3.jpg"]',
    };
    render(<ProductCard product={product} />);

    expect(screen.getByLabelText('Imagem anterior')).toBeInTheDocument();
    expect(screen.getByLabelText('Próxima imagem')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('deve navegar entre as imagens ao clicar nos botões', () => {
    const product = {
      ...baseProduct,
      images: '["/img1.jpg", "/img2.jpg"]',
    };
    render(<ProductCard product={product} />);

    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Próxima imagem'));
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Imagem anterior'));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('deve exibir links do Mercado Livre, Shopee e Amazon quando fornecidos', () => {
    const product = {
      ...baseProduct,
      link_ml: 'https://mercadolivre.com.br/produto',
      link_shopee: 'https://shopee.com.br/produto',
      link_amazon: 'https://amazon.com.br/produto',
    };
    render(<ProductCard product={product} />);

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('href', 'https://mercadolivre.com.br/produto');
    expect(links[1]).toHaveAttribute('href', 'https://shopee.com.br/produto');
    expect(links[2]).toHaveAttribute('href', 'https://amazon.com.br/produto');
  });

  it('não deve exibir links de marketplace quando não fornecidos', () => {
    render(<ProductCard product={baseProduct} />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('deve abrir o lightbox ao clicar na imagem', () => {
    render(<ProductCard product={baseProduct} />);

    const img = screen.getByAltText('Produto Teste');
    fireEvent.click(img);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Fechar visualização ampliada')).toBeInTheDocument();
  });

  it('deve fechar o lightbox ao pressionar Escape', () => {
    render(<ProductCard product={baseProduct} />);

    const img = screen.getByAltText('Produto Teste');
    fireEvent.click(img);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deve fechar o lightbox ao clicar no overlay', () => {
    render(<ProductCard product={baseProduct} />);

    const img = screen.getByAltText('Produto Teste');
    fireEvent.click(img);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deve exibir botões de navegação no lightbox quando há múltiplas imagens', () => {
    const product = {
      ...baseProduct,
      images: '["/img1.jpg", "/img2.jpg"]',
    };
    render(<ProductCard product={product} />);

    // Antes do lightbox, há 1 botão de navegação no card
    expect(screen.getAllByLabelText('Imagem anterior')).toHaveLength(1);

    const img = screen.getByAltText('Produto Teste');
    fireEvent.click(img);

    // Com lightbox aberto, há 2 instâncias: uma no card + uma no lightbox
    expect(screen.getAllByLabelText('Imagem anterior')).toHaveLength(2);
    expect(screen.getAllByLabelText('Próxima imagem')).toHaveLength(2);
  });

  it('deve marcar opacidade da imagem como 0 enquanto carrega e 1 após carregar', () => {
    render(<ProductCard product={baseProduct} />);

    const img = screen.getByAltText('Produto Teste');
    expect(img).toHaveStyle('opacity: 0');

    fireEvent.load(img);
    expect(img).toHaveStyle('opacity: 1');
  });
});