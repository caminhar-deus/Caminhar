import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import AdminUsers from '../../../../components/Admin/AdminUsers.js';

// Mocka as abas filhas para focar apenas na navegação
jest.mock('../../../../components/Admin/AdminUsersTab', () => {
  return function MockUsersTab() { return <div data-testid="users-tab">Users Tab</div>; };
});
jest.mock('../../../../components/Admin/AdminRolesTab', () => {
  return function MockRolesTab() { return <div data-testid="roles-tab">Roles Tab</div>; };
});

describe('Componente Front-End - AdminUsers', () => {
  it('deve renderizar a aba de usuários por padrão', () => {
    render(<AdminUsers />);
    expect(screen.getByTestId('users-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('roles-tab')).not.toBeInTheDocument();
  });

  it('deve alternar para a aba de cargos ao clicar no botão', () => {
    render(<AdminUsers />);
    
    fireEvent.click(screen.getByText(/Gestão de Cargos/i));
    
    expect(screen.getByTestId('roles-tab')).toBeInTheDocument();
    expect(screen.queryByTestId('users-tab')).not.toBeInTheDocument();
  });
});