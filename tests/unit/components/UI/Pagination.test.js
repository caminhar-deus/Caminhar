import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { Pagination } from '../../../../components/UI/Pagination.js';

describe('Componente UI - Pagination', () => {
  it('não deve renderizar quando totalPages for menor ou igual a 1', () => {
    const { container } = render(<Pagination currentPage={1} totalPages={1} />);
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar botões de navegação e informações de página', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={5}
        totalItems={50}
        itemLabel="item"
        onPageChange={() => {}}
      />
    );

    expect(screen.getByText('❮ Anterior')).toBeInTheDocument();
    expect(screen.getByText('Próxima ❯')).toBeInTheDocument();
    expect(screen.getByText(/Página 2 de 5/)).toBeInTheDocument();
    expect(screen.getByText(/\(50 items\)/)).toBeInTheDocument();
  });

  it('deve desabilitar botão anterior na primeira página', () => {
    const onPageChange = jest.fn();
    render(
      <Pagination
        currentPage={1}
        totalPages={3}
        onPageChange={onPageChange}
      />
    );

    const prevButton = screen.getByRole('button', { name: 'Página anterior' });
    const nextButton = screen.getByRole('button', { name: 'Próxima página' });

    expect(prevButton).toBeDisabled();
    expect(nextButton).not.toBeDisabled();

    fireEvent.click(prevButton);
    expect(onPageChange).not.toHaveBeenCalled();

    fireEvent.click(nextButton);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('deve desabilitar botão próximo na última página', () => {
    const onPageChange = jest.fn();
    render(
      <Pagination
        currentPage={3}
        totalPages={3}
        onPageChange={onPageChange}
      />
    );

    const prevButton = screen.getByRole('button', { name: 'Página anterior' });
    const nextButton = screen.getByRole('button', { name: 'Próxima página' });

    expect(prevButton).not.toBeDisabled();
    expect(nextButton).toBeDisabled();

    fireEvent.click(prevButton);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('deve suportar modo SSR com getPageUrl', () => {
    render(
      <Pagination
        currentPage={2}
        totalPages={4}
        getPageUrl={(page) => `/blog?page=${page}`}
      />
    );

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', '/blog?page=1');
    expect(links[1]).toHaveAttribute('href', '/blog?page=3');
  });
});
