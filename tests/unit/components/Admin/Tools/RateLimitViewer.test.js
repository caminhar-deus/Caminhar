import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import RateLimitViewer from '../../../../../components/Admin/Tools/RateLimitViewer.js';

describe('Componentes Admin - Tools - RateLimitViewer', () => {
  it('deve renderizar o título e o status corretamente', () => {
    render(<RateLimitViewer />);
    
    expect(screen.getByRole('heading', { level: 3, name: 'Rate Limiting' })).toBeInTheDocument();
    expect(screen.getByText('Status: Ativo (Middleware)')).toBeInTheDocument();
  });
});