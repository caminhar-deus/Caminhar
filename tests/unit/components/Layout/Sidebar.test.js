import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, jest, afterEach } from '@jest/globals';
import Sidebar from '../../../../components/Layout/Sidebar.js';

describe('Layout - Sidebar', () => {
  afterEach(() => {
    localStorage.clear();
    jest.useRealTimers();
  });

  it('deve renderizar sidebar, conteúdo principal e testar toggle do menu mobile com inert no main', () => {
    const { container } = render(
      <Sidebar sidebar={<div>Menu</div>} mainId="main-content" sidebarLabel="Navegação lateral">
        Main
      </Sidebar>
    );
    expect(screen.getByText('Menu')).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByLabelText('Navegação lateral')).toBeInTheDocument();

    const mainEl = container.querySelector('#main-content');
    expect(mainEl).not.toHaveAttribute('inert');

    // Abre o menu mobile
    const toggleBtn = screen.getByLabelText('Abrir menu');
    fireEvent.click(toggleBtn);
    expect(mainEl).toHaveAttribute('inert');

    // O overlay mobile aparece
    const overlay = container.querySelector('div[aria-hidden="true"]');
    expect(overlay).toBeInTheDocument();

    // Fecha o menu clicando no overlay
    fireEvent.click(overlay);
    expect(container.querySelector('div[aria-hidden="true"]')).not.toBeInTheDocument();
    expect(mainEl).not.toHaveAttribute('inert');
  });

  it('deve fechar a gaveta mobile ao pressionar Escape ou clicar no overlay (modo não controlado e controlado)', () => {
    const { unmount } = render(<Sidebar sidebar={<div>Menu</div>}>Main</Sidebar>);
    fireEvent.click(screen.getByLabelText('Abrir menu'));
    expect(screen.getByLabelText('Fechar menu')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByLabelText('Abrir menu')).toBeInTheDocument();
    unmount();

    const onMobileToggle = jest.fn();
    const { container } = render(
      <Sidebar sidebar={<div>Menu</div>} mobileOpen={true} onMobileToggle={onMobileToggle}>
        Main
      </Sidebar>
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onMobileToggle).toHaveBeenCalledWith(false);

    fireEvent.click(container.querySelector('div[aria-hidden="true"]'));
    expect(onMobileToggle).toHaveBeenCalledTimes(2);
    expect(onMobileToggle).toHaveBeenLastCalledWith(false);
  });

  it('deve alternar modo recolhido/expandido não controlado e persistir no localStorage', () => {
    jest.useFakeTimers();
    const { unmount } = render(
      <Sidebar
        sidebar="Menu"
        persistCollapsed={true}
        collapseLabels={{ expand: 'Expandir menu lateral', collapse: 'Recolher menu lateral' }}
      >
        Main
      </Sidebar>
    );

    const collapseBtn = screen.getByLabelText('Recolher menu lateral');
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(collapseBtn);
    act(() => {
      jest.advanceTimersByTime(250);
    });

    const expandBtn = screen.getByLabelText('Expandir menu lateral');
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
    expect(localStorage.getItem('sidebar-collapsed')).toBe('true');

    unmount();

    // Restaura estado recolhido na montagem seguinte
    render(
      <Sidebar
        sidebar="Menu"
        persistCollapsed={true}
        collapseLabels={{ expand: 'Expandir menu lateral', collapse: 'Recolher menu lateral' }}
      >
        Main
      </Sidebar>
    );
    expect(screen.getByLabelText('Expandir menu lateral')).toHaveAttribute('aria-expanded', 'false');
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

  it('deve renderizar os subcomponentes Nav, NavItem (link e botão), Section, Header e Footer', () => {
    const onTabClick = jest.fn();
    render(
      <Sidebar sidebar={
        <>
          <Sidebar.Header>Cabecalho</Sidebar.Header>
          <Sidebar.Section title="Secao">
            <Sidebar.Nav>
              <Sidebar.NavItem active={true} label="Home" icon={<span>I</span>} badge="Novo" href="/home" />
              <Sidebar.NavItem active={true} label="Visão Geral" icon={<span>G</span>} onClick={onTabClick} />
              <Sidebar.NavItem active={false} label="Posts" icon={<span>P</span>} onClick={onTabClick} />
            </Sidebar.Nav>
          </Sidebar.Section>
          <Sidebar.Footer>Rodape</Sidebar.Footer>
        </>
      }>Main</Sidebar>
    );
    
    expect(screen.getByText('Cabecalho')).toBeInTheDocument();
    expect(screen.getByText('Secao')).toBeInTheDocument();
    expect(screen.getByText('Novo')).toBeInTheDocument();
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/home');

    const activeBtn = screen.getByRole('button', { name: 'Visão Geral' });
    expect(activeBtn).toHaveAttribute('type', 'button');
    expect(activeBtn).toHaveAttribute('aria-current', 'page');
    expect(activeBtn).toHaveAttribute('title', 'Visão Geral');

    const inactiveBtn = screen.getByRole('button', { name: 'Posts' });
    expect(inactiveBtn).not.toHaveAttribute('aria-current');
    fireEvent.click(inactiveBtn);
    expect(onTabClick).toHaveBeenCalledTimes(1);
  });
});