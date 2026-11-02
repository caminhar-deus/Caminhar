import React from 'react';
import { Spinner } from '@/components/UI';

/**
 * Componentes padronizados para estados de loading, erro e vazio.
 * Garantem consistência visual em todos os componentes do projeto.
 */

const containerStyle = {
  textAlign: 'center',
  padding: 'var(--spacing-10)',
};

const VARIANT_CONFIG = {
  error: {
    color: 'var(--color-error-500)',
    hasIcon: true,
  },
  empty: {
    color: 'var(--color-text-secondary)',
    hasIcon: false,
  },
};

/**
 * StateMessage - Componente unificado para estados de erro e vazio
 * @param {{ variant: 'error'|'empty', message: string }} props
 */
function StateMessage({ variant = 'error', message }) {
  if (!message) return null;
  const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.error;
  return (
    <div style={{ ...containerStyle, color: config.color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-2)' }}>
      {config.hasIcon && (
        <svg viewBox="0 0 24 24" fill="none" width="18" height="18" aria-hidden="true" style={{ flexShrink: 0 }}>
          <path d="M12 8v5m0 3h.01M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
      {message}
    </div>
  );
}

/**
 * ErrorMessage - Exibe mensagem de erro padronizada
 * @param {{ message: string }} props
 */
export function ErrorMessage({ message }) {
  return <StateMessage variant="error" message={message} />;
}

/**
 * EmptyMessage - Exibe estado vazio padronizado
 * @param {{ message: string }} props
 */
export function EmptyMessage({ message }) {
  return <StateMessage variant="empty" message={message} />;
}

/**
 * LoadingMessage - Exibe indicador de carregamento padronizado
 * @param {{ text?: string }} props
 */
export function LoadingMessage({ text = 'Carregando...' }) {
  return (
    <div style={containerStyle}>
      <Spinner size="sm" variant="dots" />
      <div style={{ marginTop: 'var(--spacing-2)' }}>{text}</div>
    </div>
  );
}

export default { ErrorMessage, LoadingMessage, EmptyMessage };
