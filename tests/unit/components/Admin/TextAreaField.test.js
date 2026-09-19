import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import TextAreaField from '../../../../components/Admin/fields/TextAreaField.js';

describe('TextAreaField Component', () => {
  it('deve renderizar corretamente com label, required e contador de caracteres', () => {
    render(<TextAreaField name="desc" label="Descrição" value="Texto" onChange={jest.fn()} maxLength={100} required />);
    expect(screen.getByLabelText(/Descrição/)).toBeInTheDocument();
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('5 / 100 caracteres')).toBeInTheDocument();
  });

  it('deve renderizar erro e hint', () => {
    const { rerender } = render(<TextAreaField name="desc" label="Desc" value="" onChange={jest.fn()} hint="Dica de texto" />);
    expect(screen.getByText('Dica de texto')).toBeInTheDocument();

    rerender(<TextAreaField name="desc" label="Desc" value="" onChange={jest.fn()} hint="Dica de texto" error="Muito curto" />);
    expect(screen.queryByText('Dica de texto')).not.toBeInTheDocument();
    expect(screen.getByText('Muito curto')).toBeInTheDocument();
  });

  it('deve repassar fallback de rows', () => {
    render(<TextAreaField name="desc" label="Desc" value="" onChange={jest.fn()} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '3'); // Padrão
  });

  it('deve normalizar value null para string vazia mantendo o textarea controlado', () => {
    const onChange = jest.fn();
    render(<TextAreaField name="desc" label="Desc" value={null} onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('');

    // Como o value é controlado (resolvido para ''), o DOM não mantém valor sem atualização de estado
    fireEvent.change(textarea, { target: { value: 'novo valor' } });
    expect(onChange).toHaveBeenCalled();
    expect(textarea).toHaveValue('');
  });
});