import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import AdminRolesTab from '../../../../components/Admin/AdminRolesTab.js';
import CrudTable from '../../../../components/Admin/CrudTable.js';

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

  // Trava de integridade do cargo `admin` (§9 do doc privado): a linha do cargo
  // `admin` não exibe "Excluir"; um cargo comum continua exibindo. Editar
  // (permissões) permanece — o ADR-0010 trata `admin` como cargo comum.
  // O AdminCrudBase está mockado aqui, então renderiza a tabela real com o
  // `canDelete` que o AdminRolesTab repassa — é o DOM que o painel montaria.
  it('não exibe o botão "Excluir" na linha do cargo admin e exibe no cargo comum', () => {
    render(<AdminRolesTab />);

    const renderRow = (item) => render(
      <CrudTable
        columns={passedProps.columns}
        items={[item]}
        loading={false}
        canDelete={passedProps.canDelete}
        handleEdit={jest.fn()}
        handleDelete={jest.fn()}
        handleToggleBoolean={jest.fn()}
        localItems={[item]}
        setLocalItems={jest.fn()}
        setDragOverIndex={jest.fn()}
        title={passedProps.title}
        setIsFormVisible={jest.fn()}
      />
    );

    const adminRow = renderRow({ id: 1, name: 'admin', permissions: ['Segurança'] });
    expect(screen.getByText('Editar')).toBeInTheDocument(); // Editar continua sempre visível
    expect(screen.queryByText('Excluir')).not.toBeInTheDocument();
    adminRow.unmount();

    const commonRow = renderRow({ id: 2, name: 'editor', permissions: ['Posts/Artigos'] });
    expect(screen.getByText('Editar')).toBeInTheDocument();
    expect(screen.getByText('Excluir')).toBeInTheDocument();
    commonRow.unmount();
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