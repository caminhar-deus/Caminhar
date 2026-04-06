import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import PostCard from '../../../../../components/Features/Blog/PostCard';

describe('Componente Front-End - PostCard', () => {
  const mockPost = {
    id: 1,
    title: 'Título de Teste',
    slug: 'titulo-de-teste',
    excerpt: 'Resumo do post de teste.',
    image_url: 'https://example.com/image.jpg',
    created_at: '2023-10-10T10:00:00Z',
    categories: [{ name: 'Fé', slug: 'fe' }]
  };

  it('deve renderizar o card com todas as informações', () => {
    render(<PostCard post={mockPost} />);
    
    expect(screen.getByText('Título de Teste')).toBeInTheDocument();
    expect(screen.getByText('Resumo do post de teste.')).toBeInTheDocument();
    expect(screen.getByText('Fé')).toBeInTheDocument();
    expect(screen.getByAltText('Título de Teste')).toHaveAttribute('src', 'https://example.com/image.jpg');
    
    expect(screen.getByText('Ler mais →')).toHaveAttribute('href', '/blog/titulo-de-teste');
  });

  it('deve usar imagem placeholder se image_url não estiver presente', () => {
    render(<PostCard post={{ ...mockPost, image_url: null }} />);
    expect(screen.getByAltText('Título de Teste')).toHaveAttribute('src', '/api/placeholder-image?text=Reflexão');
  });

  it('deve aceitar texto customizado para o link de ler mais', () => {
    render(<PostCard post={mockPost} readMoreText="Continuar lendo" />);
    expect(screen.getByText('Continuar lendo')).toBeInTheDocument();
  });
  
  it('não deve quebrar se não houver categorias', () => {
    render(<PostCard post={{ ...mockPost, categories: null }} />);
    expect(screen.queryByText('Fé')).not.toBeInTheDocument();
  });
});