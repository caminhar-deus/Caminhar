import React, { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
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

  it('deve atualizar valor interno quando não controlado', () => {
    render(<Input id="input-livre" />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'novo valor' } });

    expect(input.value).toBe('novo valor');
  });

  it('deve chamar onChange quando controlado', () => {
    const onChange = jest.fn();
    render(<Input value="inicial" onChange={onChange} id="input-controlado" />);
    const input = screen.getByRole('textbox');

    fireEvent.change(input, { target: { value: 'alterado' } });

    expect(onChange).toHaveBeenCalled();
  });

  it('deve renderizar botão de limpar quando clearable e tiver valor', () => {
    render(<Input clearable value="texto" id="input-clearable" />);

    expect(screen.getByRole('button', { name: /limpar campo/i })).toBeInTheDocument();
  });

  it('deve limpar o campo ao clicar no botão de limpar', () => {
    const onClear = jest.fn();
    const onChange = jest.fn();
    render(<Input clearable value="texto" onClear={onClear} onChange={onChange} id="input-limpar" />);

    const botaoLimpar = screen.getByRole('button', { name: /limpar campo/i });
    fireEvent.click(botaoLimpar);

    expect(onClear).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        target: { value: '' },
        currentTarget: { value: '' },
      })
    );
  });
});