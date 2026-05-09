/**
 * Helpers utilitários para componentes do módulo Products
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