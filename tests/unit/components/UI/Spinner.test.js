import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import Spinner from '../../../../components/UI/Spinner.js';

describe('Componente UI - Spinner', () => {
  it('deve renderizar spinner base com label acessível', () => {
    render(<Spinner label="Carregando agora" centered />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Carregando agora')).toBeInTheDocument();
  });

  it('deve renderizar variante dots com 3 pontos', () => {
    const { container } = render(<Spinner variant="dots" />);
    // Apenas 3 spans correspondentes aos dots (sem span visuallyHidden)
    expect(container.querySelectorAll('span')).toHaveLength(3);
  });

  it('deve renderizar Spinner.Container e Spinner.Overlay', () => {
    render(
      <Spinner.Container><Spinner.Overlay label="Carregando Overlay" /></Spinner.Container>
    );
    // Apenas o Spinner interno possui role="status" e aria-label
    // O Overlay agora não tem mais role="status" nem aria-label (delegado ao Spinner filho)
    expect(screen.getByLabelText('Carregando Overlay')).toBeInTheDocument();
  });
});