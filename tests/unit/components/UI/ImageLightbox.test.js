import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import { ImageLightbox } from '../../../../components/UI/ImageLightbox.js';

describe('Componente UI - ImageLightbox', () => {
  it('não deve renderizar quando isOpen for falso', () => {
    const { container } = render(
      <ImageLightbox isOpen={false} onClose={() => {}} image="/test.jpg" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('deve renderizar modal de diálogo acessível quando aberto', () => {
    render(
      <ImageLightbox isOpen={true} onClose={() => {}} image="/test.jpg" alt="Foto teste" />
    );

    const dialog = screen.getByRole('dialog', { name: 'Visualização ampliada da imagem' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    const closeBtn = screen.getByRole('button', { name: 'Fechar visualização ampliada' });
    expect(closeBtn).toBeInTheDocument();

    const img = screen.getByAltText('Foto teste');
    expect(img).toHaveAttribute('src', '/test.jpg');
  });

  it('deve chamar onClose ao clicar no botão fechar ou pressionar Escape', () => {
    const onClose = jest.fn();
    render(
      <ImageLightbox isOpen={true} onClose={onClose} image="/test.jpg" />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    const closeBtn = screen.getByRole('button', { name: 'Fechar visualização ampliada' });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('deve renderizar controles de carrossel quando houver múltiplas imagens', () => {
    const onIndexChange = jest.fn();
    const images = ['/img1.jpg', '/img2.jpg', '/img3.jpg'];

    render(
      <ImageLightbox
        isOpen={true}
        onClose={() => {}}
        images={images}
        currentIndex={1}
        onIndexChange={onIndexChange}
      />
    );

    const prevBtn = screen.getByRole('button', { name: 'Imagem anterior' });
    const nextBtn = screen.getByRole('button', { name: 'Próxima imagem' });

    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();

    fireEvent.click(nextBtn);
    expect(onIndexChange).toHaveBeenCalledWith(2);

    fireEvent.click(prevBtn);
    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('deve chamar onClose ao clicar diretamente na imagem ampliada por propagação', () => {
    const onClose = jest.fn();
    render(
      <ImageLightbox isOpen={true} onClose={onClose} image="/test.jpg" alt="Foto teste" />
    );

    const img = screen.getByAltText('Foto teste');
    fireEvent.click(img);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('deve respeitar ariaLabel customizado e overlayTestId quando fornecidos', () => {
    render(
      <ImageLightbox
        isOpen={true}
        onClose={() => {}}
        image="/test.jpg"
        ariaLabel="Imagem ampliada: Mulher Virtuosa"
        overlayTestId="image-lightbox"
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Imagem ampliada: Mulher Virtuosa' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('data-testid', 'image-lightbox');
  });

  it('deve restaurar o foco para o elemento previamente ativo ao fechar o lightbox', () => {
    const triggerButton = document.createElement('button');
    triggerButton.textContent = 'Abrir zoom';
    document.body.appendChild(triggerButton);
    triggerButton.focus();
    expect(document.activeElement).toBe(triggerButton);

    const { rerender } = render(
      <ImageLightbox isOpen={true} onClose={() => {}} image="/test.jpg" />
    );

    rerender(
      <ImageLightbox isOpen={false} onClose={() => {}} image="/test.jpg" />
    );

    expect(document.activeElement).toBe(triggerButton);
    document.body.removeChild(triggerButton);
  });
});
