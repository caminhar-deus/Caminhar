import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import Button from '../../../../components/UI/Button.js';

describe('Componente UI - Button', () => {
  it('deve renderizar botão com ícones esquerdo e direito', () => {
    const onClick = jest.fn();
    render(<Button leftIcon="L" rightIcon="R" onClick={onClick} fullWidth>Btn</Button>);
    expect(screen.getByText('Btn')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('deve renderizar em modo loading sem mostrar os ícones laterais e prevenir cliques', () => {
    const onClick = jest.fn();
    render(<Button loading leftIcon="L" rightIcon="R" onClick={onClick}>Load</Button>);
    
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
    expect(screen.queryByText('L')).not.toBeInTheDocument();
    
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});