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
  };

  it('deve renderizar o card com todas as informações', () => {
    render(<PostCard post={mockPost} />);
    
    expect(screen.getByText('Título de Teste')).toBeInTheDocument();
    expect(screen.getByText('Resumo do post de teste.')).toBeInTheDocument();
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

  // Regressão D-20 (PLANO_ACAO F1.5): o bloco de categorias foi removido do
  // PostCard porque a API pública não devolve `categories`. Mesmo que o dado
  // chegue por engano, nenhum chip é renderizado.
  it('não deve renderizar chips de categoria mesmo que o dado venha na prop', () => {
    render(<PostCard post={{ ...mockPost, categories: [{ name: 'Fé', slug: 'fe' }] }} />);
    expect(screen.queryByText('Fé')).not.toBeInTheDocument();
  });
});