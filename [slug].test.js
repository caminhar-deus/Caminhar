import { jest, describe, it, expect } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react';
import BlogPost from './pages/blog/[slug].js';

// Mocks do Next.js
jest.mock('next/link', () => {
  return ({ children }) => {
    return children;
  };
});

jest.mock('next/head', () => {
  return ({ children }) => {
    return children;
  };
});

describe('Página de Post Individual (BlogPost)', () => {
  const mockPost = {
    id: 1,
    title: 'Post de Teste',
    slug: 'post-de-teste',
    excerpt: 'Um resumo do post de teste.',
    content: 'Primeiro parágrafo.\nSegundo parágrafo.',
    image_url: '/uploads/test.jpg',
    created_at: '2026-01-28T12:00:00Z',
    published: true
  };

  it('deve renderizar o conteúdo do post corretamente', () => {
    render(React.createElement(BlogPost, { post: mockPost }));

    // Verifica Título (h1)
    expect(screen.getByRole('heading', { name: /Post de Teste/i, level: 1 })).toBeInTheDocument();

    // Verifica Data
    expect(screen.getByText(/Publicado em/i)).toBeInTheDocument();

    // Verifica Conteúdo (parágrafos separados)
    expect(screen.getByText('Primeiro parágrafo.')).toBeInTheDocument();
    expect(screen.getByText('Segundo parágrafo.')).toBeInTheDocument();

    // Verifica Imagem
    const img = screen.getByRole('img', { name: /Post de Teste/i });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/uploads/test.jpg');

    // Verifica Link de Voltar
    expect(screen.getByText(/Voltar para o Blog/i)).toBeInTheDocument();
  });

  it('deve renderizar os botões de compartilhamento com as URLs corretas', () => {
    render(React.createElement(BlogPost, { post: mockPost }));

    const whatsappLink = screen.getByText('WhatsApp').closest('a');
    const facebookLink = screen.getByText('Facebook').closest('a');

    expect(whatsappLink).toBeInTheDocument();
    expect(facebookLink).toBeInTheDocument();

    // Verifica se as URLs de compartilhamento contêm o slug e título
    // Nota: O componente usa encodeURIComponent, então verificamos partes da string
    expect(whatsappLink).toHaveAttribute('href', expect.stringContaining('wa.me'));
    expect(whatsappLink).toHaveAttribute('href', expect.stringContaining(encodeURIComponent('Post de Teste')));
    
    expect(facebookLink).toHaveAttribute('href', expect.stringContaining('facebook.com/sharer'));
    expect(facebookLink).toHaveAttribute('href', expect.stringContaining('post-de-teste'));
  });

  it('não deve renderizar imagem se não houver URL', () => {
    const postWithoutImage = { ...mockPost, image_url: null };
    render(React.createElement(BlogPost, { post: postWithoutImage }));

    // Garante que a imagem não está no documento
    const img = screen.queryByRole('img', { name: /Post de Teste/i });
    expect(img).not.toBeInTheDocument();
  });
});
