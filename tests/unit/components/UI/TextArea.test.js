import React, { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import TextArea from '../../../../components/UI/TextArea.js';

describe('Componente UI - TextArea', () => {
  beforeEach(() => {
    // Mock getComputedStyle para testes de lineHeight
    window.getComputedStyle = jest.fn(() => ({
      lineHeight: '20px'
    }));
  });
  it('deve renderizar textarea com label e repassar ref', () => {
    const ref = createRef();
    render(<TextArea ref={ref} label="Obs" id="ta1" required />);
    expect(screen.getByLabelText(/Obs/)).toBeInTheDocument();
    expect(ref.current.id).toBe('ta1');
  });

  it('deve exibir contador de caracteres e tratar autoResize', () => {
    const onChange = jest.fn();
    render(<TextArea value="123" maxLength={10} showCount autoResize onChange={onChange} />);
    
    expect(screen.getByText('3 / 10 caracteres')).toBeInTheDocument();
    
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
    expect(screen.getByText('5 / 10 caracteres')).toBeInTheDocument();
    
    // Como o CSS Modules é mockado, navegamos pela estrutura para pegar a última div (footer)
    const footer = container.firstChild.lastChild;
    const emptySpan = footer.firstChild;
    expect(emptySpan.tagName).toBe('SPAN');
    expect(emptySpan).toBeEmptyDOMElement();
  });

  it('deve respeitar limite minRows no autoResize', () => {
    render(<TextArea autoResize minRows={3} value="" />);
    const textarea = screen.getByRole('textbox');
    
    Object.defineProperty(textarea, 'scrollHeight', { value: 30, configurable: true });
    
    fireEvent.change(textarea, { target: { value: 'a' } });
    
    // 3 rows * 20px = 60px mínimo
    expect(textarea.style.height).toBe('60px');
  });

  it('deve respeitar limite maxRows no autoResize', () => {
    render(<TextArea autoResize maxRows={5} value="" />);
    const textarea = screen.getByRole('textbox');
    
    Object.defineProperty(textarea, 'scrollHeight', { value: 200, configurable: true });
    
    fireEvent.change(textarea, { target: { value: 'conteudo muito longo' } });
    
    // 5 rows * 20px = 100px máximo
    expect(textarea.style.height).toBe('100px');
    expect(textarea.style.overflowY).toBe('auto');
  });

  it('deve limpar estilo e overflow quando autoResize for desabilitado', () => {
    const { rerender } = render(<TextArea autoResize value="teste" />);
    const textarea = screen.getByRole('textbox');

    // Primeiro com autoResize ativado
    Object.defineProperty(textarea, 'scrollHeight', { value: 100, configurable: true });
    fireEvent.change(textarea, { target: { value: 'conteudo' } });
    expect(textarea.style.height).toBe('100px');

    // Desabilita autoResize
    act(() => {
      rerender(<TextArea autoResize={false} value="conteudo" />);
    });

    expect(textarea.style.height).toBe('');
    expect(textarea.style.overflowY).toBe('');
  });

  it('deve aplicar autoResize automaticamente na montagem do componente', () => {
    const longText = 'linha1\nlinha2\nlinha3\nlinha4\nlinha5\nlinha6';
    
    // Precisamos mockar scrollHeight ANTES do componente ser montado
    Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
      value: 150,
      configurable: true
    });

    render(<TextArea autoResize maxRows={4} value={longText} />);
    const textarea = screen.getByRole('textbox');

    // 4 rows * 20px = 80px (limite máximo)
    expect(textarea.style.height).toBe('80px');
  });

  it('deve bloquear digitação quando blockOnLimit=true e atingir maxLength', () => {
    const onChange = jest.fn();
    render(<TextArea maxLength={5} blockOnLimit value="12345" onChange={onChange} />);
    const textarea = screen.getByRole('textbox');

    // Mock preventDefault para verificar se foi chamado
    const preventDefault = jest.spyOn(Event.prototype, 'preventDefault');

    // Tenta digitar caractere adicional
    fireEvent.keyDown(textarea, { key: 'a' });
    
    expect(preventDefault).toHaveBeenCalled();
    expect(textarea.getAttribute('maxLength')).toBeNull();
    
    preventDefault.mockRestore();
  });

  it('deve permitir teclas de edição mesmo quando bloqueado', () => {
    render(<TextArea maxLength={5} blockOnLimit value="12345" />);
    const textarea = screen.getByRole('textbox');

    const preventDefault = jest.spyOn(Event.prototype, 'preventDefault');

    // Teclas permitidas não devem ser bloqueadas
    fireEvent.keyDown(textarea, { key: 'Backspace' });
    fireEvent.keyDown(textarea, { key: 'ArrowLeft' });
    fireEvent.keyDown(textarea, { key: 'Delete' });

    expect(preventDefault).not.toHaveBeenCalled();
    
    preventDefault.mockRestore();
  });

  it('não deve bloquear digitação quando blockOnLimit=false por padrão', () => {
    render(<TextArea maxLength={5} value="12345" />);
    const textarea = screen.getByRole('textbox');

    const preventDefault = jest.spyOn(Event.prototype, 'preventDefault');

    // Por padrão continua permitindo digitar mesmo passando do limite
    fireEvent.keyDown(textarea, { key: 'a' });
    
    expect(preventDefault).not.toHaveBeenCalled();
    expect(textarea.getAttribute('maxLength')).toBe('5');
    
    preventDefault.mockRestore();
  });

  it('não deve fazer nada quando não tem maxLength definido', () => {
    render(<TextArea blockOnLimit value="teste longo sem limite" />);
    const textarea = screen.getByRole('textbox');

    const preventDefault = jest.spyOn(Event.prototype, 'preventDefault');

    fireEvent.keyDown(textarea, { key: 'a' });
    
    expect(preventDefault).not.toHaveBeenCalled();
    
    preventDefault.mockRestore();
  });
});
