import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AdminPostManager from './components/AdminPostManager.js';

// Mock do fetch global para evitar chamadas reais à API durante o teste
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
    headers: {
      get: (name) => name === 'content-type' ? 'application/json' : null
    }
  })
);

describe('AdminPostManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderiza corretamente o título, seções e formulário', async () => {
    render(React.createElement(AdminPostManager));

    // Verifica se o título principal está presente
    expect(screen.getByText('Gerenciar Artigos')).toBeInTheDocument();

    // Verifica se as seções principais estão presentes
    expect(screen.getByText('Lista de Posts')).toBeInTheDocument();
    expect(screen.getByText('Novo Post')).toBeInTheDocument();

    // Verifica se o botão de criar post está presente
    expect(screen.getByRole('button', { name: /Criar Post/i })).toBeInTheDocument();

    // Verifica se a função de busca de posts foi chamada ao carregar
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/posts');
    });
  });

  it('preenche o formulário e envia um novo post', async () => {
    // Mock específico para suportar o POST neste teste
    fetch.mockImplementation((url, options) => {
      if (url === '/api/admin/posts' && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ id: 1, title: 'Meu Novo Post' }),
          headers: {
            get: (name) => name === 'content-type' ? 'application/json' : null
          }
        });
      }
      // Default para GET (lista inicial)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
        headers: {
          get: (name) => name === 'content-type' ? 'application/json' : null
        }
      });
    });

    render(React.createElement(AdminPostManager));

    // Preenche os campos do formulário
    fireEvent.change(screen.getByLabelText(/Título/i), { target: { value: 'Meu Novo Post' } });
    fireEvent.change(screen.getByLabelText(/Slug/i), { target: { value: 'meu-novo-post' } });
    fireEvent.change(screen.getByLabelText(/Resumo/i), { target: { value: 'Resumo do teste' } });
    fireEvent.change(screen.getByLabelText(/Conteúdo/i), { target: { value: 'Conteúdo do teste' } });
    
    // Marca o checkbox de publicar
    const checkbox = screen.getByLabelText(/Publicar imediatamente/i);
    if (!checkbox.checked) fireEvent.click(checkbox);

    // Clica no botão de criar
    fireEvent.click(screen.getByRole('button', { name: /Criar Post/i }));

    // Verifica se o fetch foi chamado com os dados corretos (POST)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/admin/posts', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"title":"Meu Novo Post"')
      }));
    });
  });
});
