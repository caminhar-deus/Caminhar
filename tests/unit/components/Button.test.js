import React from 'react';
import { jest, describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Componente hipotético para demonstração.
// Em um caso real, você importaria seu componente:
// import Button from '@components/Button';
const Button = ({ children, onClick, variant = 'primary', disabled = false }) => {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;

  return (
    <button
      className={`${baseClass} ${variantClass}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

describe('Componente Button', () => {
  it('deve renderizar com o texto correto', () => {
    render(<Button>Clique Aqui</Button>);

    // Acessibilidade: Busca o botão pelo seu nome/texto visível.
    const buttonElement = screen.getByRole('button', { name: /clique aqui/i });
    expect(buttonElement).toBeInTheDocument();
  });

  it('deve disparar o evento onClick quando clicado', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();

    render(<Button onClick={handleClick}>Salvar</Button>);

    const buttonElement = screen.getByRole('button', { name: /salvar/i });
    await user.click(buttonElement);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  describe('Variantes de Estilo', () => {
    it('deve aplicar a classe de variante primária por padrão', () => {
      render(<Button>Primário</Button>);
      const buttonElement = screen.getByRole('button', { name: /primário/i });
      expect(buttonElement).toHaveClass('btn-primary');
    });

    it('deve aplicar a classe de variante secundária corretamente', () => {
      render(<Button variant="secondary">Secundário</Button>);
      const buttonElement = screen.getByRole('button', { name: /secundário/i });
      expect(buttonElement).toHaveClass('btn-secondary');
    });
  });

  describe('Estado Desabilitado', () => {
    it('deve estar desabilitado quando a prop disabled for true', () => {
      render(<Button disabled>Desabilitado</Button>);
      const buttonElement = screen.getByRole('button', { name: /desabilitado/i });
      expect(buttonElement).toBeDisabled();
    });

    it('não deve disparar o evento onClick quando desabilitado', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();

      render(
        <Button onClick={handleClick} disabled>
          Não Clicável
        </Button>
      );

      const buttonElement = screen.getByRole('button', { name: /não clicável/i });
      await user.click(buttonElement);

      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});