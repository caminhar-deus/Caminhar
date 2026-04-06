import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import Spinner from '../../../../components/UI/Spinner.js';

describe('Componente UI - Spinner', () => {
  it('deve renderizar spinner base com label invisível', () => {
    render(<Spinner label="Carregando agora" centered />);
    expect(screen.getByText('Carregando agora')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('deve renderizar variante dots com 3 pontos', () => {
    const { container } = render(<Spinner variant="dots" />);
    // Como os CSS Modules mockam as classes, testamos a estrutura HTML:
    // 1 span para acessibilidade (visuallyHidden) + 3 spans dos pontos
    expect(container.querySelectorAll('span')).toHaveLength(4);
  });

  it('deve renderizar Spinner.Container e Spinner.Overlay', () => {
    render(
      <Spinner.Container><Spinner.Overlay label="Carregando Overlay" /></Spinner.Container>
    );
    // O Overlay repassa a prop label para o Spinner interno, gerando 2 elementos com o mesmo label
    const elements = screen.getAllByLabelText('Carregando Overlay');
    expect(elements.length).toBe(2);
  });
});