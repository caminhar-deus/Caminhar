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

  it('hook useToast deve adicionar e remover toasts', () => {
    render(<HookTestComponent />);
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByText('Sucesso')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Del'));
    expect(screen.queryByText('Sucesso')).not.toBeInTheDocument();
  });

  it('hook useToast deve suportar todos os tipos de status (info, warning, error)', () => {
    const TestTypes = () => {
      const { toast } = useToast();
      return (
        <div>
          <button onClick={() => toast.info({ title: 'I' })}>I</button>
          <button onClick={() => toast.warning({ title: 'W' })}>W</button>
          <button onClick={() => toast.error({ title: 'E' })}>E</button>
        </div>
      );
    };
    render(<TestTypes />);
    fireEvent.click(screen.getByText('I'));
    fireEvent.click(screen.getByText('W'));
    fireEvent.click(screen.getByText('E'));
  });
});