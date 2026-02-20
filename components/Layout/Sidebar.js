import React, { useState } from 'react';
import styles from './Sidebar.module.css';

/**
 * Sidebar - Layout com sidebar colapsável
 * @param {ReactNode} sidebar - Conteúdo da sidebar
 * @param {ReactNode} children - Conteúdo principal
 * @param {boolean} collapsed - Estado colapsado
 * @param {function} onCollapse - Handler para colapsar
 * @param {string} position - 'left' | 'right'
 * @param {string} width - Largura da sidebar ('sm' | 'md' | 'lg')
 * @param {boolean} collapsible - Permite colapsar
 * @param {boolean} mobileOverlay - Mostrar overlay em mobile
 */
export const Sidebar = ({
  sidebar,
  children,
  collapsed = false,
  onCollapse,
  position = 'left',
  width = 'md',
  collapsible = true,
  mobileOverlay = true,
  className = '',
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const containerClasses = [
    styles.container,
    styles[position],
    collapsed && styles.collapsed,
    mobileOpen && styles.mobileOpen,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const sidebarClasses = [
    styles.sidebar,
    styles[width],
    collapsible && styles.collapsible,
    collapsed && styles.sidebarCollapsed,
  ]
    .filter(Boolean)
    .join(' ');

  const handleMobileToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleCollapse = () => {
    onCollapse?.(!collapsed);
  };

  return (
    <div className={containerClasses}>
      {/* Mobile Toggle Button */}
      {collapsible && (
        <button
          className={styles.mobileToggle}
          onClick={handleMobileToggle}
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileOpen}
        >
          <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
            {mobileOpen ? (
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            ) : (
              <path d="M4 12h16M4 6h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            )}
          </svg>
        </button>
      )}

      {/* Overlay para mobile */}
      {mobileOverlay && mobileOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={sidebarClasses}>
        {collapsible && (
          <button
            className={styles.collapseButton}
            onClick={handleCollapse}
            aria-label={collapsed ? 'Expandir' : 'Colapsar'}
          >
            <svg viewBox="0 0 24 24" fill="none" width="20" height="20">
              {position === 'left' ? (
                <path d={collapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <path d={collapsed ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              )}
            </svg>
          </button>
        )}
        <div className={styles.sidebarContent}>
          {sidebar}
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
};

/**
 * Sidebar.Nav - Navegação da sidebar
 */
Sidebar.Nav = ({ children, className = '' }) => (
  <nav className={`${styles.nav} ${className}`}>
    {children}
  </nav>
);

/**
 * Sidebar.NavItem - Item de navegação
 * @param {boolean} active - Item ativo
 * @param {ReactNode} icon - Ícone do item
 * @param {string} label - Label do item
 * @param {ReactNode} badge - Badge opcional
 */
Sidebar.NavItem = ({
  active = false,
  icon,
  label,
  badge,
  className = '',
  ...props
}) => {
  const itemClasses = [
    styles.navItem,
    active && styles.navItemActive,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <a className={itemClasses} {...props}>
      {icon && <span className={styles.navIcon}>{icon}</span>}
      <span className={styles.navLabel}>{label}</span>
      {badge && <span className={styles.navBadge}>{badge}</span>}
    </a>
  );
};

/**
 * Sidebar.Section - Seção na sidebar
 */
Sidebar.Section = ({ title, children, className = '' }) => (
  <div className={`${styles.section} ${className}`}>
    {title && <h4 className={styles.sectionTitle}>{title}</h4>}
    {children}
  </div>
);

/**
 * Sidebar.Header - Header da sidebar
 */
Sidebar.Header = ({ children, className = '' }) => (
  <div className={`${styles.header} ${className}`}>
    {children}
  </div>
);

/**
 * Sidebar.Footer - Footer da sidebar
 */
Sidebar.Footer = ({ children, className = '' }) => (
  <div className={`${styles.footer} ${className}`}>
    {children}
  </div>
);

export default Sidebar;
