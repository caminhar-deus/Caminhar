import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import AdminDicas from '../../../../components/Admin/AdminDicas.js';

// Captura as propriedades enviadas para o CrudBase
let passedProps;
jest.mock('../../../../components/Admin/AdminCrudBase', () => {
  return function MockAdminCrudBase(props) {
    passedProps = props;
    return <div data-testid="mock-crud">Mock CRUD</div>;
  };
});

describe('Componente Front-End - AdminDicas', () => {
  it('deve renderizar corretamente e passar as configurações para o AdminCrudBase', () => {
    render(<AdminDicas />);
    
    expect(screen.getByTestId('mock-crud')).toBeInTheDocument();
    expect(passedProps.title).toBe('Gestão de Dicas');
    expect(passedProps.apiEndpoint).toBe('/api/admin/dicas');
    expect(passedProps.itemNameSingular).toBe('dica');
    // Lista paginada em 10 itens (mesmo padrão de AdminVideos): sem isso a API
    // admin devolve só a 1ª página e as demais dicas ficam invisíveis.
    expect(passedProps.usePagination).toBe(true);
    expect(passedProps.itemsPerPage).toBe(10);
  });

  it('a coluna "content" deve formatar e truncar textos maiores que 80 caracteres', () => {
    render(<AdminDicas />);
    const contentColumn = passedProps.columns.find(c => c.key === 'content');
    
    // Testa texto curto (retorna intacto)
    expect(contentColumn.format('Texto curto')).toBe('Texto curto');
    
    // Testa null/undefined
    expect(contentColumn.format(null)).toBeNull();
    
    // Testa texto longo (trunca com reticências)
    expect(contentColumn.format('A'.repeat(100))).toBe('A'.repeat(80) + '...');
  });
});