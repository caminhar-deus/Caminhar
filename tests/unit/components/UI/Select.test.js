import React, { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import Select from '../../../../components/UI/Select.js';

describe('Componente UI - Select', () => {
  const options = [
    { value: '1', label: 'Opção 1' },
    { value: '2', label: 'Opção 2', disabled: true },
  ];

  it('deve renderizar o select com label, placeholder e opções', () => {
    const ref = createRef();
    render(<Select ref={ref} label="Escolha" options={options} placeholder="Selecione" id="sel1" required />);
    
    expect(screen.getByLabelText(/Escolha/)).toBeInTheDocument();
    expect(screen.getByText('Selecione')).toBeInTheDocument();
    expect(screen.getByText('Opção 1')).toBeInTheDocument();
    expect(screen.getByText('Opção 2')).toBeDisabled();
    expect(ref.current.id).toBe('sel1');
  });

  it('deve disparar evento onChange ao mudar valor', () => {
    const onChange = jest.fn();
    render(<Select options={options} onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '1' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('deve exibir mensagem de erro e esconder helperText', () => {
    const { rerender } = render(<Select helperText="Ajuda" />);
    rerender(<Select error errorMessage="Erro aqui" helperText="Ajuda" />);
    expect(screen.queryByText('Ajuda')).not.toBeInTheDocument();
    expect(screen.getByText('Erro aqui')).toBeInTheDocument();
  });
});