/**
 * Estilos compartilhados do módulo Products
 * Centraliza objetos de estilo reutilizáveis entre ProductCard.js e ProductList.js
 */

/**
 * Estilo padrão de input com paddingLeft ajustável para ícone de busca.
 * @param {string} paddingLeft - Padding esquerdo (padrão '16px')
 */
export const inputStyle = (paddingLeft = '16px') => ({
  width: '100%',
  padding: `14px 16px 14px ${paddingLeft}`,
  borderRadius: '8px',
  border: '1px solid #e2e8f0',
  fontSize: '1rem',
  outline: 'none',
  boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
  transition: 'all 0.2s ease',
  backgroundColor: '#fff',
  color: '#2d3748',
});

/**
 * Estilo base de botão, usado como referência para paginação e links de compra.
 * @param {Object} custom - Estilos customizados para sobrescrever o base
 */
export const buttonBaseStyle = (custom = {}) => ({
  padding: '8px 20px',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  outline: 'none',
  ...custom,
});