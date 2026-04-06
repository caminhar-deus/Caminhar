import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import Alert from '../../../../components/UI/Alert.js';

describe('Componente UI - Alert', () => {
  it('deve renderizar com título, conteúdo e variantes (info, success, warning, error)', () => {
    const { rerender } = render(<Alert status="success" title="Sucesso">Msg</Alert>);
    expect(screen.getByText('Sucesso')).toBeInTheDocument();
    expect(screen.getByText('Msg')).toBeInTheDocument();
    
    // Testa apenas a renderização dos outros para cobrir os ícones
    rerender(<Alert status="info">Info</Alert>);
    rerender(<Alert status="warning">Warn</Alert>);
    rerender(<Alert status="error">Err</Alert>);
  });

  it('deve renderizar ícone customizado', () => {
    render(<Alert icon={<span data-testid="custom-icon">I</span>}>Msg</Alert>);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('deve fechar o alerta e chamar onClose', () => {
    const onClose = jest.fn();
    const { container } = render(<Alert closable onClose={onClose}>Aviso</Alert>);
    
    const closeBtn = screen.getByLabelText('Fechar alerta');
    fireEvent.click(closeBtn);
    
    expect(onClose).toHaveBeenCalled();
    expect(container).toBeEmptyDOMElement();
  });
});