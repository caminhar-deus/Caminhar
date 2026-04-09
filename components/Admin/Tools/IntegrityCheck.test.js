import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import IntegrityCheck from './IntegrityCheck.js';

describe('Componentes Admin - Tools - IntegrityCheck', () => {
  it('deve renderizar o título e o texto descritivo corretamente', () => {
    render(<IntegrityCheck />);
    
    expect(screen.getByRole('heading', { level: 3, name: 'Verificação de Integridade' })).toBeInTheDocument();
    expect(screen.getByText('Sistema operacional.')).toBeInTheDocument();
  });
});