import React, { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import TextArea from '../../../../components/UI/TextArea.js';

describe('Componente UI - TextArea', () => {
  it('deve renderizar textarea com label e repassar ref', () => {
    const ref = createRef();
    render(<TextArea ref={ref} label="Obs" id="ta1" required />);
    expect(screen.getByLabelText(/Obs/)).toBeInTheDocument();
    expect(ref.current.id).toBe('ta1');
  });

  it('deve exibir contador de caracteres e tratar autoResize', () => {
    const onChange = jest.fn();
    render(<TextArea value="123" maxLength={10} showCount autoResize onChange={onChange} />);
    
    expect(screen.getByText('3 / 10')).toBeInTheDocument();
    
    const textarea = screen.getByRole('textbox');
    // Mock scrollHeight para testar altura ajustada
    Object.defineProperty(textarea, 'scrollHeight', { value: 100, configurable: true });
    
    fireEvent.change(textarea, { target: { value: '1234' } });
    expect(onChange).toHaveBeenCalled();
    expect(textarea.style.height).toBe('100px');
  });

  it('deve exibir helperText e alternar para erro', () => {
    const { rerender } = render(<TextArea helperText="Ajuda TA" />);
    rerender(<TextArea helperText="Ajuda TA" error errorMessage="Erro TA" />);
    expect(screen.queryByText('Ajuda TA')).not.toBeInTheDocument();
    expect(screen.getByText('Erro TA')).toBeInTheDocument();
  });

  it('deve usar defaultValue para o contador e renderizar espaço reservado se não houver texto auxiliar', () => {
    const { container } = render(<TextArea defaultValue="teste" maxLength={10} showCount />);
    expect(screen.getByText('5 / 10')).toBeInTheDocument();
    
    // Como o CSS Modules é mockado, navegamos pela estrutura para pegar a última div (footer)
    const footer = container.firstChild.lastChild;
    const emptySpan = footer.firstChild;
    expect(emptySpan.tagName).toBe('SPAN');
    expect(emptySpan).toBeEmptyDOMElement();
  });
});