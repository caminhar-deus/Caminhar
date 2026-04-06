import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, jest } from '@jest/globals';
import Sidebar from '../../../../components/Layout/Sidebar.js';

describe('Layout - Sidebar', () => {
  it('deve renderizar sidebar, conteúdo principal e testar toggle do menu mobile', () => {
    const { container } = render(<Sidebar sidebar={<div>Menu</div>}>Main</Sidebar>);
    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
    
    // Abre o menu mobile
    const toggleBtn = screen.getByLabelText('Abrir menu');
    fireEvent.click(toggleBtn);
    
    // O overlay mobile aparece
    const overlay = container.querySelector('[aria-hidden="true"]');
    expect(overlay).toBeInTheDocument();
    
    // Fecha o menu clicando no overlay
    fireEvent.click(overlay);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
  });

  it('deve acionar o handler onCollapse clicando no botão e validar icones (position right)', () => {
    const onCollapseMock = jest.fn();
    render(<Sidebar sidebar="Menu" onCollapse={onCollapseMock} collapsed={false} position="right">Main</Sidebar>);
    
    fireEvent.click(screen.getByLabelText('Colapsar'));
    expect(onCollapseMock).toHaveBeenCalledWith(true);
  });

  it('deve lidar com renderização de posição invertida e botão de expandir', () => {
    render(<Sidebar sidebar="Menu" collapsed={true} position="left">Main</Sidebar>);
    expect(screen.getByLabelText('Expandir')).toBeInTheDocument();
  });

  it('não deve exibir botão de colapsar e toggle se collapsible=false', () => {
    render(<Sidebar sidebar="Menu" collapsible={false}>Main</Sidebar>);
    expect(screen.queryByLabelText('Abrir menu')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Colapsar')).not.toBeInTheDocument();
  });

  it('deve renderizar os subcomponentes Nav, NavItem, Section, Header e Footer', () => {
    render(
      <Sidebar sidebar={
        <>
          <Sidebar.Header>Cabecalho</Sidebar.Header>
          <Sidebar.Section title="Secao"><Sidebar.Nav><Sidebar.NavItem active={true} label="Home" icon={<span>I</span>} badge="Novo" href="/home" /></Sidebar.Nav></Sidebar.Section>
          <Sidebar.Footer>Rodape</Sidebar.Footer>
        </>
      }>Main</Sidebar>
    );
    
    expect(screen.getByText('Cabecalho')).toBeInTheDocument();
    expect(screen.getByText('Secao')).toBeInTheDocument();
    expect(screen.getByText('Novo')).toBeInTheDocument();
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/home');
  });
});