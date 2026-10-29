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

/**
 * Normaliza um valor de preço para número (2 casas).
 * Aceita "R$ 89,90", "89,90", "89.90", "R$ 1.234,56" e números.
 * Retorna null quando não é um preço válido (NaN ou negativo).
 *
 * Client-safe (sem dependência de banco): usado pelo Zod do formulário
 * admin, pela validação server-side da API e pelo domínio de produtos.
 * @param {string|number} value
 * @returns {number|null}
 */
export function normalizePrice(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
  }

  const cleaned = String(value).trim();
  if (cleaned === '') return null;

  // Remove "R$", espaços e símbolos; mantém dígitos, vírgula e ponto.
  let normalized = cleaned.replace(/[^\d.,-]/g, '');

  if (normalized.includes(',')) {
    // Formato pt-BR: ponto é milhar, vírgula é decimal ("1.234,56" → "1234.56").
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  }

  const parsed = parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}
