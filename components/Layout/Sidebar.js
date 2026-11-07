import React, { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';

const DEFAULT_COLLAPSE_LABELS = {
  expand: 'Expandir',
  collapse: 'Colapsar',
};

/**
 * Sidebar - Layout com sidebar vertical recolhível/expansível
 * @param {ReactNode} sidebar - Conteúdo da sidebar
 * @param {ReactNode} children - Conteúdo principal
 * @param {boolean} collapsed - Estado colapsado controlado (opcional)
 * @param {boolean} defaultCollapsed - Estado inicial quando não controlado
 * @param {function} onCollapse - Handler para colapsar/expandir
 * @param {string} position - 'left' | 'right'
 * @param {string} width - Largura da sidebar ('sm' | 'md' | 'lg')
 * @param {boolean} collapsible - Permite colapsar
 * @param {boolean} mobileOverlay - Mostrar overlay em mobile
 * @param {boolean} mobileOpen - Estado mobile controlado externamente (opcional)
 * @param {function} onMobileToggle - Handler para toggle mobile
 * @param {number} breakpoint - Breakpoint em px para modo mobile (default: 1024)
 * @param {boolean} persistCollapsed - Persistir estado colapsado no localStorage
 * @param {object} collapseLabels - Rótulos acessíveis ({ expand, collapse })
 * @param {string} mainId - ID do elemento <main> (ex.: 'main-content' para skip-link)
 * @param {string} sidebarLabel - aria-label do elemento <aside>
 */
export const Sidebar = ({
  sidebar,
  children,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapse,
  position = 'left',
  width = 'md',
  collapsible = true,
  mobileOverlay = true,
  mobileOpen: mobileOpenProp,
  onMobileToggle,
  breakpoint = 1024,
  persistCollapsed = false,
  collapseLabels = DEFAULT_COLLAPSE_LABELS,
  mainId,
  sidebarLabel,
  className = '',
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(() => {
    const initialValue = collapsedProp !== undefined ? collapsedProp : defaultCollapsed;
    if (persistCollapsed && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sidebar-collapsed');
        return saved !== null ? Boolean(JSON.parse(saved)) : initialValue;
      } catch {
        return initialValue;
      }
    }
    return initialValue;
  });

  const isCollapsedControlled = collapsedProp !== undefined;
  const collapsed = isCollapsedControlled ? collapsedProp : internalCollapsed;

  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const isMobileControlled = mobileOpenProp !== undefined;
  const mobileOpen = isMobileControlled ? mobileOpenProp : internalMobileOpen;

  const closeMobileMenu = () => {
    if (isMobileControlled) {
      onMobileToggle?.(false);
    } else {
      setInternalMobileOpen(false);
    }
  };

  // Persiste estado collapsed quando muda (com debounce de 200ms)
  useEffect(() => {
    if (!persistCollapsed) return undefined;

    const timer = setTimeout(() => {
      try {
        localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
      } catch {
        // localStorage indisponível
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [collapsed, persistCollapsed]);

  // Fecha a gaveta mobile ao pressionar Escape
  useEffect(() => {
    if (!mobileOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isMobileControlled) {
          onMobileToggle?.(false);
        } else {
          setInternalMobileOpen(false);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, isMobileControlled, onMobileToggle]);

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
    if (!isCollapsedControlled) {
      setInternalCollapsed(newCollapsed);
    }
    onCollapse?.(newCollapsed);
  };

  const toggleLabel = collapsed
    ? (collapseLabels?.expand || DEFAULT_COLLAPSE_LABELS.expand)
    : (collapseLabels?.collapse || DEFAULT_COLLAPSE_LABELS.collapse);

  // Em position="left": expandido aponta para esquerda (recolher), recolhido aponta para direita (expandir)
  const pointsLeft = position === 'left' ? !collapsed : collapsed;

  return (
    <div
      className={containerClasses}
      style={{ '--sidebar-breakpoint': `${breakpoint}px` }}
    >
      {/* Mobile Toggle Button */}
      {collapsible && (
        <button
          type="button"
          className={styles.mobileToggle}
          onClick={handleMobileToggle}
          aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={mobileOpen}
        >
          <svg viewBox="0 0 24 24" fill="none" width="22" height="22" aria-hidden="true">
            {mobileOpen ? (
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 12h16M4 6h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      )}

      {/* Overlay para mobile */}
      {mobileOverlay && mobileOpen && (
        <div
          className={styles.overlay}
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={sidebarClasses} aria-label={sidebarLabel}>
        {collapsible && (
          <div className={styles.collapseBar}>
            <button
              type="button"
              className={styles.collapseButton}
              onClick={handleCollapse}
              aria-label={toggleLabel}
              aria-expanded={!collapsed}
              title={toggleLabel}
            >
              <svg viewBox="0 0 24 24" fill="none" width="20" height="20" aria-hidden="true">
                <path
                  d={pointsLeft ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}
        <div className={styles.sidebarContent}>
          {sidebar}
        </div>
      </aside>

      {/* Main Content */}
      <main
        id={mainId}
        className={`${styles.main} ${styles.mainContent}`}
        style={{ '--main-margin': `${currentWidth}px` }}
        {...(mobileOpen ? { inert: true } : {})}
      >
        {children}
      </main>
    </div>
  );
};

/**
 * Sidebar.Nav - Navegação da sidebar
 */
Sidebar.Nav = ({ children, className = '', ...props }) => (
  <nav className={[styles.nav, className].filter(Boolean).join(' ')} {...props}>
    {children}
  </nav>
);

/**
 * Sidebar.NavItem - Item de navegação (renderiza <a> com href ou <button> em abas client-side)
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
  href,
  title,
  className = '',
  'aria-label': ariaLabel,
  'aria-current': ariaCurrent,
  ...props
}) => {
  const itemClasses = [
    styles.navItem,
    active && styles.navItemActive,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const resolvedTitle = title !== undefined ? title : label;
  const resolvedAriaCurrent = ariaCurrent !== undefined ? ariaCurrent : (active ? 'page' : undefined);
  const Component = href !== undefined ? 'a' : 'button';

  return (
    <Component
      type={Component === 'button' ? 'button' : undefined}
      href={href}
      className={itemClasses}
      aria-label={ariaLabel || label}
      aria-current={resolvedAriaCurrent}
      title={resolvedTitle}
      {...props}
    >
      {icon && <span className={styles.navIcon} aria-hidden="true">{icon}</span>}
      <span className={styles.navLabel}>{label}</span>
      {badge && <span className={styles.navBadge}>{badge}</span>}
    </Component>
  );
};

/**
 * Sidebar.Section - Seção na sidebar
 */
Sidebar.Section = ({ title, children, className = '' }) => (
  <div className={[styles.section, className].filter(Boolean).join(' ')}>
    {title && <h4 className={styles.sectionTitle}>{title}</h4>}
    {children}
  </div>
);

/**
 * Sidebar.Header - Header da sidebar
 */
Sidebar.Header = ({ children, className = '' }) => (
  <div className={[styles.header, className].filter(Boolean).join(' ')}>
    {children}
  </div>
);

/**
 * Sidebar.Footer - Footer da sidebar
 */
Sidebar.Footer = ({ children, className = '' }) => (
  <div className={[styles.footer, className].filter(Boolean).join(' ')}>
    {children}
  </div>
);

export default Sidebar;
