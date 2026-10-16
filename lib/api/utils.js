/**
 * @fileoverview API Utility Functions
 * 
 * Utilitários compartilhados entre os módulos da API,
 * evitando duplicação de código.
 * 
 * @module lib/api/utils
 */

/**
 * Transforma string de URLs separadas por quebra de linha em array de URLs válidas.
 * @param {string} imagesString - String com URLs separadas por \n
 * @returns {string[]} Array de URLs limpas
 */
export function parseImages(imagesString) {
  if (!imagesString) return [];
  return imagesString
    .split('\n')
    .map(url => url.trim())
    .filter(Boolean);
}
