import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import Custom404 from '../../../pages/404.js';

describe('Página 404 personalizada (pages/404.js)', () => {
  it('renderiza o código 404 e o título principal', () => {
    render(<Custom404 />);

    expect(screen.getByTestId('not-found-code')).toHaveTextContent('404');
    expect(screen.getByTestId('not-found-title')).toHaveTextContent('Página não encontrada');
  });

  it('exibe mensagem explicativa ao usuário', () => {
    render(<Custom404 />);

    expect(screen.getByTestId('not-found-message')).toHaveTextContent(
      'A página que você está procurando não existe, foi removida ou o endereço digitado está incorreto.'
    );
  });

  it('renderiza link de retorno para a página inicial com href="/"', () => {
    render(<Custom404 />);

    const link = screen.getByTestId('not-found-home-link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
    expect(link).toHaveTextContent('Voltar para a Página Inicial');
  });
});
