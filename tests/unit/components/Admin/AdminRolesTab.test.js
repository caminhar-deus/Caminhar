import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import AdminRolesTab from '../../../../components/Admin/AdminRolesTab.js';

let passedProps;
jest.mock('../../../../components/Admin/AdminCrudBase', () => {
  return function MockAdminCrudBase(props) {
    passedProps = props;
    return <div data-testid="mock-crud">Mock CRUD</div>;
  };
});

describe('Componente Front-End - AdminRolesTab', () => {
  it('deve repassar as props corretamente para o CrudBase', () => {
    render(<AdminRolesTab />);
    expect(passedProps.title).toBe('Gestão de Cargos e Permissões');
    expect(passedProps.apiEndpoint).toBe('/api/admin/roles');
  });

  it('PermissionsSelectField: deve adicionar e remover permissões', () => {
    render(<AdminRolesTab />);
    const PermissionsSelectField = passedProps.fields.find(f => f.name === 'permissions').component;
    
    const onChange = jest.fn();
    // Passa 'Visão Geral' já como selecionado e uma permissão legada 'Dicas' que deve ser normalizada
    render(<PermissionsSelectField name="permissions" value={['Visão Geral', 'Dicas']} onChange={onChange} label="Permissões" />);
    
    // Tenta desmarcar 'Visão Geral'
    fireEvent.click(screen.getByLabelText('Visão Geral'));
    expect(onChange).toHaveBeenCalledWith({ target: { name: 'permissions', value: ['Gestão de Dicas'] } });
    
    // Tenta marcar 'Segurança'
    fireEvent.click(screen.getByLabelText('Segurança'));
    expect(onChange).toHaveBeenCalledWith({ target: { name: 'permissions', value: ['Visão Geral', 'Gestão de Dicas', 'Segurança'] } });
  });

  it('PermissionsSelectField: deve lidar com array nulo ou invalido e exibir erro', () => {
    render(<AdminRolesTab />);
    const PermissionsSelectField = passedProps.fields.find(f => f.name === 'permissions').component;
    
    render(<PermissionsSelectField name="permissions" value={null} onChange={jest.fn()} label="Permissões" error="Selecione ao menos 1" />);
    expect(screen.getByText('Selecione ao menos 1')).toBeInTheDocument();
  });

  it('colunas: deve exibir e normalizar as permissões formatadas', () => {
    render(<AdminRolesTab />);
    const permsCol = passedProps.columns.find(c => c.key === 'permissions');
    
    render(permsCol.render({ permissions: ['Visão Geral', 'Dicas', 'Invalida'] }));
    
    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    expect(screen.getByText('Gestão de Dicas')).toBeInTheDocument(); // Normalizado
    expect(screen.queryByText('Invalida')).not.toBeInTheDocument(); // Filtrado
  });
});