import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import ToggleField from '../../../../components/Admin/fields/ToggleField.js';

describe('ToggleField Component', () => {
  it('deve renderizar os estados de ativo e inativo com labels corretas', () => {
    const { rerender } = render(<ToggleField name="status" label="Status" checked={false} onChange={jest.fn()} description="Desc" />);
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Rascunho')).toBeInTheDocument(); // Padrão
    expect(screen.getByText('Desc')).toBeInTheDocument();

    rerender(<ToggleField name="status" label="Status" checked={true} onChange={jest.fn()} activeLabel="Sim" />);
    expect(screen.getByText('Sim')).toBeInTheDocument();
  });

  it('deve lidar com checkbox disable e click', () => {
    const onChange = jest.fn();
    const { rerender } = render(<ToggleField name="status" label="Status" checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalled();

    rerender(<ToggleField name="status" label="Status" checked={false} onChange={onChange} disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });
});