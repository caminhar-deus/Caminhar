import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import Toast, { useToast } from '../../../../components/UI/Toast.js';

const HookTestComponent = () => {
  const { toasts, toast, removeToast } = useToast();
  return (
    <div>
      <button onClick={() => toast.success({ title: 'Sucesso' })}>Add</button>
      <button onClick={() => removeToast(toasts[0]?.id)}>Del</button>
      {toasts.map(t => <Toast key={t.id} {...t} />)}
    </div>
  );
};

describe('Componente UI - Toast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('deve renderizar o toast e fechar automaticamente após a duração', () => {
    const onClose = jest.fn();
    render(<Toast isOpen={true} title="Notificação" description="Desc" duration={1000} onClose={onClose} />);
    
    expect(screen.getByText('Notificação')).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
    
    act(() => jest.advanceTimersByTime(1000)); // Tempo visível
    act(() => jest.advanceTimersByTime(300));  // Tempo de animação de saída
    
    expect(onClose).toHaveBeenCalled();
  });

  it('deve fechar ao clicar no botão de fechar', () => {
    const onClose = jest.fn();
    render(<Toast isOpen={true} title="Aviso" isClosable onClose={onClose} duration={0} />);
    
    fireEvent.click(screen.getByLabelText('Fechar notificação'));
    act(() => jest.advanceTimersByTime(300));
    expect(onClose).toHaveBeenCalled();
  });

  it('não deve fechar automaticamente quando a duração for 0 (persistente)', () => {
    const onClose = jest.fn();
    render(<Toast isOpen={true} title="Persistente" duration={0} onClose={onClose} />);
    
    expect(screen.getByText('Persistente')).toBeInTheDocument();

    // Avança um tempo longo (ex: 10 segundos)
    act(() => jest.advanceTimersByTime(10000));
    
    // Verifica que o onClose NÃO foi chamado e o Toast ainda está no documento
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Persistente')).toBeInTheDocument();
  });

  it('hook useToast deve adicionar e remover toasts', () => {
    render(<HookTestComponent />);
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText('Sucesso')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Del'));
    expect(screen.queryByText('Sucesso')).not.toBeInTheDocument();
  });

  it.each(['info', 'warning', 'error'])(
    'hook useToast deve suportar o status %s',
    (status) => {
      const TestTypes = () => {
        const { toast } = useToast();
        return (
          <button onClick={() => toast[status]({ title: status })}>{status}</button>
        );
      };
      render(<TestTypes />);
      fireEvent.click(screen.getByText(status));
    }
  );

  it('deve renderizar o Toast.Container com diferentes posições e className customizada', () => {
    // Teste padrão
    const { rerender } = render(
      <Toast.Container>
        <Toast isOpen title="Teste 1" />
        <Toast isOpen title="Teste 2" />
      </Toast.Container>
    );

    expect(screen.getByText('Teste 1')).toBeInTheDocument();
    expect(screen.getByText('Teste 2')).toBeInTheDocument();

    // Teste com posição customizada
    rerender(
      <Toast.Container position="bottom-left">
        <Toast isOpen title="Teste Posição" />
      </Toast.Container>
    );

    // Teste com className customizada
    rerender(
      <Toast.Container className="custom-class-name">
        <Toast isOpen title="Teste Custom" />
      </Toast.Container>
    );
  });
});
