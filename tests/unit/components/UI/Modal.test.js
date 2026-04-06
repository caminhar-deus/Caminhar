import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import Modal from '../../../../components/UI/Modal.js';

describe('Componente UI - Modal', () => {
  it('não deve renderizar nada se isOpen for falso', () => {
    const { container } = render(<Modal isOpen={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('deve renderizar modal aberto com título e filhos', () => {
    render(
      <Modal isOpen={true} title="Título do Modal">
        <p>Conteúdo</p>
      </Modal>
    );
    expect(screen.getByText('Título do Modal')).toBeInTheDocument();
    expect(screen.getByText('Conteúdo')).toBeInTheDocument();
  });

  it('deve chamar onClose ao clicar no botão de fechar ou no overlay', () => {
    const onClose = jest.fn();
    render(<Modal isOpen={true} onClose={onClose} closeOnOverlayClick={true} />);
    
    // Clica no botão de fechar
    fireEvent.click(screen.getByLabelText('Fechar modal'));
    expect(onClose).toHaveBeenCalledTimes(1);

    // Clica no overlay (o role="dialog")
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('deve chamar onClose ao pressionar Escape', () => {
    const onClose = jest.fn();
    render(<Modal isOpen={true} onClose={onClose} />);
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('deve renderizar o footer e aplicar classes preventScroll no body', () => {
    const { unmount } = render(<Modal isOpen={true} preventScroll={true} footer={<Modal.Footer>Rodapé</Modal.Footer>}>Body</Modal>);
    expect(screen.getByText('Rodapé')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  it('deve retornar o modal diretamente (sem portal) no ambiente SSR (sem document.body)', () => {
    const originalBody = document.body;
    Object.defineProperty(document, 'body', { value: null, configurable: true });
    
    try {
      const customContainer = document.createElement('div');
      render(<Modal isOpen={true} title="SSR Title">SSR</Modal>, { container: customContainer });
      expect(customContainer).toHaveTextContent('SSR Title');
    } finally {
      Object.defineProperty(document, 'body', { value: originalBody, configurable: true });
    }
  });
});