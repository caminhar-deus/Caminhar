/**
 * Estilos compartilhados do módulo Products
 * Centraliza objetos de estilo reutilizáveis entre ProductCard.js e ProductList.js
 */

// Tokens de paddingLeft permitidos para evitar injeção de CSS
const VALID_PADDING_LEFT = [
  'var(--spacing-4)',
  'var(--spacing-2)',
  'var(--spacing-3)',
  'var(--spacing-5)',
  '46px',
];

/**
 * Estilo padrão de input com paddingLeft ajustável para ícone de busca.
 * @param {string} paddingLeft - Padding esquerdo (padrão 'var(--spacing-4)')
 */
export const inputStyle = (paddingLeft = 'var(--spacing-4)') => {
  const safePadding = VALID_PADDING_LEFT.includes(paddingLeft)
    ? paddingLeft
    : 'var(--spacing-4)';

  return {
    width: '100%',
    padding: `var(--spacing-3_5) var(--spacing-4) var(--spacing-3_5) ${safePadding}`,
    borderRadius: 'var(--border-radius-lg)',
    border: 'var(--border-width-1) solid var(--color-border-light)',
    fontSize: 'var(--font-size-base)',
    outline: 'none',
    boxShadow: 'var(--shadow-xs)',
    transition: 'var(--transition-all)',
    backgroundColor: 'var(--color-bg-primary)',
    color: 'var(--color-text-primary)',
  };
};

/**
 * Estilo base de botão, usado como referência para paginação e links de compra.
 * @param {Object} custom - Estilos customizados para sobrescrever o base
 */
export const buttonBaseStyle = (custom = {}) => ({
  padding: 'var(--spacing-2) var(--spacing-5)',
  borderRadius: 'var(--border-radius-md)',
  border: 'var(--border-width-1) solid var(--color-border-light)',
  fontWeight: 'var(--font-weight-semibold)',
  cursor: 'pointer',
  transition: 'var(--transition-all)',
  outline: 'none',
  ...custom,
});
