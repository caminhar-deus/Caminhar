import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import Badge from '../../../../components/UI/Badge.js';

describe('Componente UI - Badge', () => {
  it('deve renderizar Badge padrão com leftIcon e rightIcon', () => {
    render(<Badge leftIcon="L" rightIcon="R" pulse position="top-right">B</Badge>);
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('R')).toBeInTheDocument();
  });

  it('deve renderizar apenas o dot se passado na prop', () => {
    render(<Badge dot>D</Badge>);
    expect(screen.getByLabelText('D')).toBeInTheDocument();
    expect(screen.queryByText('D')).not.toBeInTheDocument();
  });

  it('Badge.Counter deve exibir números, limitando pelo max', () => {
    const { rerender, container } = render(<Badge.Counter count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();

    rerender(<Badge.Counter count={100} max={99} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
    
    rerender(<Badge.Counter count={0} />);
    expect(container).toBeEmptyDOMElement();
    
    rerender(<Badge.Counter count={0} showZero />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('Badge.Dot deve renderizar o dot de notificação', () => {
    render(<Badge.Dot pulse={false} />);
    expect(screen.getByLabelText('Notificação')).toBeInTheDocument();
  });
});