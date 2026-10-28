import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
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

  // Chips de categoria (spec posts.md §1) — restaurados após o CRUD de
  // categorias (ADR-0024): aparecem quando `post.categories` vem populado e
  // somem quando o array está vazio/ausente, sem erro.
  it('deve renderizar os chips de categoria quando post.categories vier populado', () => {
    render(<PostCard post={{ ...mockPost, categories: [{ id: 1, name: 'Fé', slug: 'fe' }] }} />);

    expect(screen.getByText('Fé')).toBeInTheDocument();
    // Acima do título (spec §1.1)
    const chip = screen.getByText('Fé');
    const title = screen.getByText('Título de Teste');
    expect(chip.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('deve renderizar todas as categorias com container rotulado (sem truncamento)', () => {
    render(
      <PostCard
        post={{
          ...mockPost,
          categories: [
            { id: 1, name: 'Fé', slug: 'fe' },
            { id: 2, name: 'Oração', slug: 'oracao' },
            { id: 3, name: 'Esperança', slug: 'esperanca' },
          ],
        }}
      />
    );

    const container = screen.getByLabelText('Categorias do post');
    expect(container).toBeInTheDocument();
    expect(screen.getByText('Fé')).toBeInTheDocument();
    expect(screen.getByText('Oração')).toBeInTheDocument();
    expect(screen.getByText('Esperança')).toBeInTheDocument();
  });

  it('usa cat.id como chave e cai para cat.slug quando não houver id', () => {
    // Sem `id`, a chave é `cat.slug` (spec §1.2) — renderiza sem warning de key
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<PostCard post={{ ...mockPost, categories: [{ name: 'Fé', slug: 'fe' }] }} />);

    expect(screen.getByText('Fé')).toBeInTheDocument();
    const missingKeyWarning = consoleErrorSpy.mock.calls.some(
      ([msg]) => typeof msg === 'string' && msg.includes('unique "key" prop')
    );
    expect(missingKeyWarning).toBe(false);
    consoleErrorSpy.mockRestore();
  });

  it('não deve renderizar chips quando categories está vazio ou ausente', () => {
    const { rerender } = render(<PostCard post={mockPost} />);
    expect(screen.queryByLabelText('Categorias do post')).not.toBeInTheDocument();
    expect(screen.queryByText('Fé')).not.toBeInTheDocument();

    rerender(<PostCard post={{ ...mockPost, categories: [] }} />);
    expect(screen.queryByLabelText('Categorias do post')).not.toBeInTheDocument();
  });
});