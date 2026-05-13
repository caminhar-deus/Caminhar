import React from 'react';

/**
 * Componentes padronizados para estados de loading, erro e vazio.
 * Garantem consistência visual em todos os componentes do projeto.
 */

const containerStyle = {
  textAlign: 'center',
  padding: 'var(--spacing-10)',
};

/**
 * ErrorMessage - Exibe mensagem de erro padronizada
 * @param {{ message: string }} props
 */
export function ErrorMessage({ message }) {
  if (!message) return null;
  return (
    <div style={{ ...containerStyle, color: 'var(--color-error-500)' }}>
      ❌ {message}
    </div>
  );
}

/**
 * LoadingMessage - Exibe indicador de carregamento padronizado
 * @param {{ text?: string }} props
 */
export function LoadingMessage({ text = 'Carregando...' }) {
  return (
    <div style={containerStyle}>
      ⏳ {text}
    </div>
  );
}

/**
 * EmptyMessage - Exibe estado vazio padronizado
 * @param {{ message: string }} props
 */
export function EmptyMessage({ message }) {
  return (
    <div style={{ ...containerStyle, color: 'var(--color-text-tertiary)' }}>
      {message}
    </div>
  );
}

export default { ErrorMessage, LoadingMessage, EmptyMessage };