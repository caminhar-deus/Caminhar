import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import TextField from '../../../../components/Admin/fields/TextField.js';

describe('TextField Component', () => {
  it('deve renderizar corretamente com label e required', () => {
    render(<TextField name="nome" label="Nome" value="" onChange={jest.fn()} required />);
    expect(screen.getByLabelText(/Nome/)).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument(); // Asterisco de obrigatório
  });

  it('deve renderizar erro e hint', () => {
    const { rerender } = render(<TextField name="email" label="Email" value="" onChange={jest.fn()} hint="Dica útil" />);
    expect(screen.getByText('Dica útil')).toBeInTheDocument();

    // Com erro, o hint deve sumir e o erro aparecer
    rerender(<TextField name="email" label="Email" value="" onChange={jest.fn()} hint="Dica útil" error="Email inválido" />);
    expect(screen.queryByText('Dica útil')).not.toBeInTheDocument();
    expect(screen.getByText('Email inválido')).toBeInTheDocument();
  });

  it('deve repassar eventos nativos do input', () => {
    const onChange = jest.fn();
    render(<TextField name="teste" label="Teste" value="" onChange={onChange} />);
    
    fireEvent.change(screen.getByLabelText('Teste'), { target: { value: 'novo valor' } });
    expect(onChange).toHaveBeenCalled();
  });
});