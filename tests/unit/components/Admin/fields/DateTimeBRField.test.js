import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import DateTimeBRField from '../../../../../components/Admin/fields/DateTimeBRField';

describe('Componente Admin - DateTimeBRField', () => {
  let onChange;

  beforeEach(() => {
    onChange = jest.fn();
  });

  it('exibe máscara pt-BR quando recebe valor ISO', () => {
    render(<DateTimeBRField value="2026-10-02T14:30" onChange={onChange} />);
    const input = screen.getByPlaceholderText('dd/mm/aaaa hh:mm');
    expect(input.value).toBe('02/10/2026 14:30');
  });

  it('dispara onChange no formato nativo quando a máscara está completa e válida', () => {
    render(<DateTimeBRField onChange={onChange} />);
    const input = screen.getByPlaceholderText('dd/mm/aaaa hh:mm');
    fireEvent.change(input, { target: { value: '02/10/2026 14:30' } });
    expect(input.value).toBe('02/10/2026 14:30');
    expect(onChange).toHaveBeenCalledWith({ target: { value: '2026-10-02T14:30' } });
  });

  it('não dispara onChange com data inválida (mês 13)', () => {
    render(<DateTimeBRField onChange={onChange} />);
    const input = screen.getByPlaceholderText('dd/mm/aaaa hh:mm');
    fireEvent.change(input, { target: { value: '32/13/2026 14:30' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('32/13/2026 14:30');
  });

  it('marca aria-invalid e exibe mensagem de erro inline ligada por aria-describedby em data inválida', () => {
    render(<DateTimeBRField onChange={onChange} />);
    const input = screen.getByPlaceholderText('dd/mm/aaaa hh:mm');
    fireEvent.change(input, { target: { value: '32/13/2026 14:30' } });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby');
    const errorId = input.getAttribute('aria-describedby');
    const erro = screen.getByRole('alert');
    expect(erro).toHaveTextContent('Data inválida');
    expect(erro.id).toBe(errorId);
  });

  it('limpa o erro quando a data é corrigida para válida', () => {
    render(<DateTimeBRField onChange={onChange} />);
    const input = screen.getByPlaceholderText('dd/mm/aaaa hh:mm');
    fireEvent.change(input, { target: { value: '32/13/2026 14:30' } });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(input, { target: { value: '02/10/2026 14:30' } });
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('não marca erro durante a digitação (máscara incompleta é estado transitório)', () => {
    render(<DateTimeBRField onChange={onChange} />);
    const input = screen.getByPlaceholderText('dd/mm/aaaa hh:mm');
    fireEvent.change(input, { target: { value: '02/10/2026' } });
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('usa aria-label como nome acessível em layouts sem rótulo visível (barra densa)', () => {
    render(<DateTimeBRField onChange={onChange} ariaLabel="Data Inicial" title="Data Inicial" />);
    const input = screen.getByLabelText('Data Inicial');
    expect(input).toBeInTheDocument();
  });

  it('renderiza rótulo visível associado por htmlFor quando a prop label é passada', () => {
    render(<DateTimeBRField onChange={onChange} id="data-inicial" label="Data Inicial" />);
    const label = screen.getByText('Data Inicial');
    expect(label).toHaveAttribute('for', 'data-inicial');
    expect(screen.getByLabelText('Data Inicial')).toBeInTheDocument();
  });

  it('não dispara onChange com hora inválida (25h)', () => {
    render(<DateTimeBRField onChange={onChange} />);
    const input = screen.getByPlaceholderText('dd/mm/aaaa hh:mm');
    fireEvent.change(input, { target: { value: '02/10/2026 25:30' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('dispara valor vazio quando o campo é totalmente apagado', () => {
    render(<DateTimeBRField value="2026-10-02T14:30" onChange={onChange} />);
    const input = screen.getByPlaceholderText('dd/mm/aaaa hh:mm');
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ target: { value: '' } });
    expect(input.value).toBe('');
  });

  it('não dispara onChange enquanto a máscara está incompleta', () => {
    render(<DateTimeBRField onChange={onChange} />);
    const input = screen.getByPlaceholderText('dd/mm/aaaa hh:mm');
    fireEvent.change(input, { target: { value: '02/10/2026' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(input.value).toBe('02/10/2026');
  });
});
