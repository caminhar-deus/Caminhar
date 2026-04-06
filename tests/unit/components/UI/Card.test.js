import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import Card from '../../../../components/UI/Card.js';

describe('Componente UI - Card', () => {
  it('deve renderizar Card simples com children e footer/header nodes', () => {
    render(
      <Card header={<div>H</div>} footer={<div>F</div>} hoverable>
        Content
      </Card>
    );
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('F')).toBeInTheDocument();
  });

  it('deve renderizar media como string (img) ou component', () => {
    const { rerender } = render(<Card media="/img.png" mediaAlt="Alt" clickable>C</Card>);
    expect(screen.getByAltText('Alt')).toHaveAttribute('src', '/img.png');
    
    rerender(<Card media={<span data-testid="custom-media">M</span>}>C</Card>);
    expect(screen.getByTestId('custom-media')).toBeInTheDocument();
  });

  it('deve acionar onClick e definir role button se passado', () => {
    const onClick = jest.fn();
    render(<Card onClick={onClick}>C</Card>);
    const card = screen.getByRole('button');
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalled();
  });

  it('Card.Header e Card.Footer devem ser renderizados', () => {
    render(<Card.Header title="T" subtitle="S" icon="I" action={<button>A</button>} />);
    expect(screen.getByText('T')).toBeInTheDocument();
    
    render(<Card.Footer align="center">Foo</Card.Footer>);
    expect(screen.getByText('Foo')).toBeInTheDocument();
  });
});