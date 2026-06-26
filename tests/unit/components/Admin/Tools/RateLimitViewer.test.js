import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { mockGlobalFetch } from '../../../../helpers/index.js';
import RateLimitViewer from '../../../../../components/Admin/Tools/RateLimitViewer.js';

describe('Componentes Admin - Tools - RateLimitViewer', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = mockGlobalFetch();
    // Mock das duas chamadas de fetch paralelas (blocked e whitelist)
    global.fetch.mockResolvedValue({ ok: true, json: async () => [] });
  });

  afterEach(() => {
    fetchMock?.mockRestore();
  });

  it('deve renderizar o título, abas e botão de atualizar', async () => {
    render(<RateLimitViewer />);
    
    expect(await screen.findByRole('heading', { level: 3, name: 'Rate Limiting' })).toBeInTheDocument();
    expect(await screen.findByText('🔄 Atualizar')).toBeInTheDocument();
    expect(screen.getByText('🔒 Bloqueados (0)')).toBeInTheDocument();
    expect(screen.getByText('✅ Whitelist (0)')).toBeInTheDocument();
    expect(screen.getByText('📋 Auditoria')).toBeInTheDocument();
  });
});
