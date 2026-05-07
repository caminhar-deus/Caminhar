import React from 'react';
import styles from './StateHandler.module.css';

/**
 * StateHandler - Componente genérico para gerenciar estados de loading, erro e empty
 * @param {boolean} loading - Estado de carregamento
 * @param {boolean} error - Estado de erro (string ou Error)
 * @param {boolean} empty - Estado vazio
 * @param {string} emptyMessage - Mensagem quando vazio (default: 'Nenhum resultado encontrado.')
 * @param {string} loadingMessage - Mensagem durante carregamento (default: 'Carregando...')
 * @param {string} errorMessage - Mensagem de erro (default: 'Erro ao carregar dados.')
 * @param {function} onRetry - Função para tentar novamente
 */
export const StateHandler = ({
  loading = false,
  error = null,
  empty = false,
  emptyMessage = 'Nenhum resultado encontrado.',
  loadingMessage = 'Carregando...',
  errorMessage,
  onRetry,
  children,
  className = '',
}) => {
  if (loading) {
    return (
      <div className={`${styles.stateContainer} ${className}`}>
        <div className={styles.icon}>⏳</div>
        <p className={styles.message}>{loadingMessage}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.stateContainer} ${styles.errorState} ${className}`}>
        <div className={styles.icon}>❌</div>
        <p className={styles.message}>{errorMessage || error?.message || error || 'Erro ao carregar dados.'}</p>
        {onRetry && (
          <button className={styles.retryButton} onClick={onRetry}>
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className={`${styles.stateContainer} ${className}`}>
        <div className={styles.icon}>🔍</div>
        <p className={styles.message}>{emptyMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default StateHandler;