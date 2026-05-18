import React, { useState, Suspense, lazy } from 'react';
import PropTypes from 'prop-types';
import styles from './styles/Admin.module.css';

const AdminUsersTab = lazy(() => import('./AdminUsersTab'));
const AdminRolesTab = lazy(() => import('./AdminRolesTab'));

/**
 * AdminUsers - Container de abas para Gestão de Usuários e Cargos.
 *
 * Gerencia a navegação entre as abas "Gestão de Usuários e Admins"
 * e "Gestão de Cargos", com lazy loading das abas inativas.
 *
 * @component
 * @returns {JSX.Element} Container com abas e conteúdo dinâmico
 */
export default function AdminUsers() {
  const [activeTab, setActiveTab] = useState('users');

  const tabs = [
    { id: 'users', label: 'Gestão de Usuários e Admins', icon: '👤' },
    { id: 'roles', label: 'Gestão de Cargos', icon: '🛡️' }
  ];

  /**
   * Navegação por teclado entre abas (setas direita/esquerda)
   * @param {React.KeyboardEvent} e - Evento de teclado
   */
  const handleKeyDown = (e) => {
    const currentIndex = tabs.findIndex(t => t.id === activeTab);
    let nextIndex;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }

    if (nextIndex !== undefined) {
      e.preventDefault();
      const nextTabId = tabs[nextIndex].id;
      setActiveTab(nextTabId);
      document.getElementById(`tab-${nextTabId}`)?.focus();
    }
  };

  return (
    <div className={styles.adminPanel}>
      {/* Cabeçalho de Navegação (Abas) */}
      <div
        className={styles.tabs}
        role="tablist"
        aria-label="Navegação de usuários e cargos"
        onKeyDown={handleKeyDown}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`${styles.tabButton}${activeTab === tab.id ? ` ${styles.activeTab}` : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className={styles.icon} aria-hidden="true">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Área de Conteúdo Dinâmico com Lazy Loading */}
      <Suspense
        fallback={
          <div className={styles.placeholderContainer}>
            <div className={styles.placeholderCard}>
              <div className={styles.placeholderIcon}>⏳</div>
              <h3>Carregando...</h3>
              <p>Aguardando carregamento do conteúdo</p>
            </div>
          </div>
        }
      >
        <div
          role="tabpanel"
          id={`tabpanel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === 'users' && <AdminUsersTab />}
          {activeTab === 'roles' && <AdminRolesTab />}
        </div>
      </Suspense>
    </div>
  );
}

AdminUsers.propTypes = {
  // Componente container sem props - usa estado interno para navegação entre abas
};

AdminUsers.displayName = 'AdminUsers';