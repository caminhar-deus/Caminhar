import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import Input from '../../../../components/UI/Input.js';

describe('Componente UI - Input', () => {
  it('deve renderizar Input com label, required, leftAddon e rightAddon', () => {
    const ref = createRef();
    render(<Input ref={ref} label="Nome" required leftAddon="L" rightAddon="R" id="inp1" />);
    
    expect(screen.getByLabelText(/Nome/)).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
    expect(ref.current.id).toBe('inp1');
  });

  it('deve exibir helperText e escondê-lo ao mostrar errorMessage', () => {
    const { rerender } = render(<Input helperText="Ajuda" />);
    expect(screen.getByText('Ajuda')).toBeInTheDocument();
    
    rerender(<Input helperText="Ajuda" error errorMessage="Inválido" />);
    expect(screen.queryByText('Ajuda')).not.toBeInTheDocument();
    expect(screen.getByText('Inválido')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});