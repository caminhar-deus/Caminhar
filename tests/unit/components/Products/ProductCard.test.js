import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import ProductCard from '../../../../components/Products/ProductCard.js';

describe('Componente Front-End - ProductCard', () => {
  const baseProduct = {
    id: 1,
    title: 'Bíblia Sagrada',
    description: 'Edição Especial e Limitada',
    price: 'R$ 120,00',
  };

  it('deve renderizar as informações básicas do produto (sem imagens e sem links)', () => {
    render(<ProductCard product={baseProduct} />);
    
    expect(screen.getByText('Bíblia Sagrada')).toBeInTheDocument();
    expect(screen.getByText('Edição Especial e Limitada')).toBeInTheDocument();
    expect(screen.getByText('R$ 120,00')).toBeInTheDocument();
    expect(screen.getByText('Sem imagem')).toBeInTheDocument();
    
    // Não deve ter botões de navegação
    expect(screen.queryByText('▶')).not.toBeInTheDocument();
  });

  it('deve renderizar links de compra (Marketplaces) quando fornecidos', () => {
    const productWithLinks = {
      ...baseProduct,
      link_ml: 'https://mercadolivre.com/produto',
      link_shopee: 'https://shopee.com/produto',
      link_amazon: 'https://amazon.com/produto'
    };
    
    render(<ProductCard product={productWithLinks} />);
    
    expect(screen.getByRole('link', { name: /Mercado Livre/i })).toHaveAttribute('href', 'https://mercadolivre.com/produto');
    expect(screen.getByRole('link', { name: /Shopee/i })).toHaveAttribute('href', 'https://shopee.com/produto');
    expect(screen.getByRole('link', { name: /Amazon/i })).toHaveAttribute('href', 'https://amazon.com/produto');
  });

  it('deve renderizar imagem única e remover o loading quando carregada (onLoad)', () => {
    const productWithOneImage = { ...baseProduct, images: 'img1.jpg' };
    render(<ProductCard product={productWithOneImage} />);
    
    expect(screen.getByText('⏳ Carregando...')).toBeInTheDocument(); // Loading inicial
    
    const image = screen.getByAltText('Bíblia Sagrada');
    expect(image).toHaveAttribute('src', 'img1.jpg');
    
    fireEvent.load(image); // Simula o carregamento da imagem concluído no navegador
    
    expect(screen.queryByText('⏳ Carregando...')).not.toBeInTheDocument(); // Sumiu
    expect(screen.queryByText('▶')).not.toBeInTheDocument(); // Só tem 1 imagem, não tem carrossel
  });

  it('deve permitir navegação no carrossel quando houver múltiplas imagens (ciclo infinito)', () => {
    const productWithMultipleImages = { ...baseProduct, images: 'img1.jpg\nimg2.jpg\nimg3.jpg' };
    render(<ProductCard product={productWithMultipleImages} />);
    
    expect(screen.getByText('1 / 3')).toBeInTheDocument(); // Posição Inicial
    
    const nextButton = screen.getByText('▶');
    const prevButton = screen.getByText('◀');
    
    fireEvent.click(nextButton); // Vai pra img 2
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    
    fireEvent.click(nextButton); // Vai pra img 3
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    
    fireEvent.click(nextButton); // Volta pra img 1 (Ciclo infinito)
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
    
    fireEvent.click(prevButton); // Ciclo reverso (Do 1 volta pro 3)
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
  });

  it('deve abrir o lightbox (Tela Cheia) ao clicar na imagem e permitir fechar e navegar', () => {
    const productWithMultipleImages = { ...baseProduct, images: 'img1.jpg\nimg2.jpg' };
    render(<ProductCard product={productWithMultipleImages} />);
    
    // Pega a imagem principal do carrossel e clica
    const mainImage = screen.getAllByAltText('Bíblia Sagrada')[0];
    fireEvent.click(mainImage);
    
    // O botão de fechar (x) do Lightbox deve aparecer
    const closeButton = screen.getByTitle('Fechar');
    expect(closeButton).toBeInTheDocument();
    
    // Testa a propagação (clicar na imagem grande dentro do lightbox NÃO deve fechá-lo)
    const lightboxImage = screen.getAllByAltText('Bíblia Sagrada')[1];
    fireEvent.click(lightboxImage);
    expect(screen.getByTitle('Fechar')).toBeInTheDocument(); 
    
    // Clicar no botão X ou no fundo (Backdrop) fecha o lightbox
    fireEvent.click(closeButton);
    expect(screen.queryByTitle('Fechar')).not.toBeInTheDocument();
  });
});