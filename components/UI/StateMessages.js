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
    emoji: '❌',
  },
  empty: {
    color: 'var(--color-text-tertiary)',
    emoji: null,
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
    <div style={{ ...containerStyle, color: config.color }}>
      {config.emoji && <span aria-hidden="true">{config.emoji} </span>}
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
