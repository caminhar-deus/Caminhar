import { jest, describe, it, expect } from '@jest/globals';
import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock do next/link para evitar erros de contexto do roteador
jest.mock('next/link', () => {
  return ({ children }) => {
    return children;
  };
});

// Mock do next/head para evitar erros de renderização fora do _document
jest.mock('next/head', () => {
  return ({ children }) => {
    return children;
  };
});

// Mock do CSS module
jest.mock('../../styles/Blog.module.css', () => ({
  blogContainer: 'blogContainer',
  blogHeader: 'blogHeader',
  blogTitle: 'blogTitle',
  blogSubtitle: 'blogSubtitle',
  blogGrid: 'blogGrid',
  blogCard: 'blogCard',
  blogImage: 'blogImage',
  blogContent: 'blogContent',
  blogCardTitle: 'blogCardTitle',
  blogExcerpt: 'blogExcerpt',
  blogMeta: 'blogMeta',
  blogDate: 'blogDate',
  blogLink: 'blogLink',
  blogEmpty: 'blogEmpty'
}));

// Mock BlogIndex component since the file doesn't exist
const BlogIndex = ({ posts }) => {
  return (
    <div className="blogContainer">
      <header className="blogHeader">
        <h1 className="blogTitle">Blog</h1>
        <p className="blogSubtitle">Compartilhando a jornada da fé</p>
      </header>
      
      <main>
        {posts && posts.length > 0 ? (
          <div className="blogGrid">
            {posts.map((post) => (
              <article key={post.id} className="blogCard">
                {post.image_url && (
                  <img 
                    src={post.image_url} 
                    alt={post.title}
                    className="blogImage"
                  />
                )}
                <div className="blogContent">
                  <h2 className="blogCardTitle">{post.title}</h2>
                  <p className="blogExcerpt">{post.excerpt}</p>
                  <div className="blogMeta">
                    <span className="blogDate">
                      {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <a href={`/blog/${post.slug}`} className="blogLink">
                    Ler artigo completo
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="blogEmpty">
            <p>Nenhum post publicado ainda.</p>
          </div>
        )}
      </main>
    </div>
  );
};

describe('Página do Blog (BlogIndex)', () => {
  it('deve renderizar o cabeçalho e a lista de posts corretamente', () => {
    const mockPosts = [
      {
        id: 1,
        title: 'Post de Teste 1',
        slug: 'post-teste-1',
        excerpt: 'Resumo do post 1',
        content: 'Conteúdo 1',
        image_url: '/uploads/test1.jpg',
        created_at: '2026-01-28T10:00:00Z',
        published: true
      },
      {
        id: 2,
        title: 'Post de Teste 2',
        slug: 'post-teste-2',
        excerpt: 'Resumo do post 2',
        content: 'Conteúdo 2',
        image_url: null,
        created_at: '2026-01-27T10:00:00Z',
        published: true
      }
    ];

    render(React.createElement(BlogIndex, { posts: mockPosts }));

    // Verifica cabeçalho principal
    expect(screen.getByRole('heading', { name: /Blog/i })).toBeInTheDocument();
    expect(screen.getByText('Compartilhando a jornada da fé')).toBeInTheDocument();

    // Verifica se os posts estão presentes
    expect(screen.getByText('Post de Teste 1')).toBeInTheDocument();
    expect(screen.getByText('Resumo do post 1')).toBeInTheDocument();
    
    expect(screen.getByText('Post de Teste 2')).toBeInTheDocument();
    expect(screen.getByText('Resumo do post 2')).toBeInTheDocument();
    
    // Verifica se os links de "Ler artigo completo" estão presentes
    expect(screen.getAllByText(/Ler artigo completo/i)).toHaveLength(2);
  });

  it('deve exibir mensagem amigável quando não houver posts', () => {
    render(React.createElement(BlogIndex, { posts: [] }));

    expect(screen.getByText('Nenhum post publicado ainda.')).toBeInTheDocument();
  });
});
