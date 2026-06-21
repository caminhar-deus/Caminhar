import React, { useState, useEffect } from 'react';
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
 * @param {boolean} mobileOpen - Estado mobile controlado externamente (opcional)
 * @param {function} onMobileToggle - Handler para toggle mobile
 * @param {number} breakpoint - Breakpoint em px para modo mobile (default: 1024)
 * @param {boolean} persistCollapsed - Persistir estado colapsado no localStorage
 */
export const Sidebar = ({
  sidebar,
  children,
  collapsed: collapsedProp = false,
  onCollapse,
  position = 'left',
  width = 'md',
  collapsible = true,
  mobileOverlay = true,
  mobileOpen: mobileOpenProp,
  onMobileToggle,
  breakpoint = 1024,
  persistCollapsed = false,
  className = '',
}) => {
  // Estado collapsed: se persistCollapsed, inicializa do localStorage
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    if (persistCollapsed) {
      try {
        const saved = localStorage.getItem('sidebar-collapsed');
        return saved !== null ? JSON.parse(saved) : collapsedProp;
      } catch {
        return collapsedProp;
      }
    }
    return collapsedProp;
  });

  // Sincroniza prop externa com estado interno
  const collapsed = collapsedProp !== undefined ? collapsedProp : internalCollapsed;

  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const isMobileControlled = mobileOpenProp !== undefined;
  const mobileOpen = isMobileControlled ? mobileOpenProp : internalMobileOpen;

  // Persiste estado collapsed quando muda (com debounce de 300ms)
  useEffect(() => {
    if (!persistCollapsed) return;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
      } catch {
        // localStorage indisponível
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [collapsed, persistCollapsed]);

  // Calcula margem dinamicamente para evitar seletores CSS de irmãos frágeis
  const sidebarWidthMap = { sm: 200, md: 260, lg: 320 };
  const collapsedWidthMap = { sm: 64, md: 72, lg: 80 };
  const currentWidth = collapsed ? collapsedWidthMap[width] : sidebarWidthMap[width];

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
    if (isMobileControlled) {
      onMobileToggle?.(!mobileOpen);
    } else {
      setInternalMobileOpen(!mobileOpen);
    }
  };

  const handleCollapse = () => {
    const newCollapsed = !collapsed;
    if (collapsedProp === undefined) {
      setInternalCollapsed(newCollapsed);
    }
    onCollapse?.(newCollapsed);
  };

  return (
    <div
      className={containerClasses}
      style={{ '--sidebar-breakpoint': `${breakpoint}px` }}
      {...(mobileOpen ? { inert: '' } : {})}
    >
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
          onClick={() => {
            if (isMobileControlled) {
              onMobileToggle?.(false);
            } else {
              setInternalMobileOpen(false);
            }
          }}
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
                <path d={collapsed ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              ) : (
                <path d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              )}
            </svg>
          </button>
        )}
        <div className={styles.sidebarContent}>
          {sidebar}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`${styles.main} ${styles.mainContent}`}
        style={{ '--main-margin': `${currentWidth}px` }}
      >
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