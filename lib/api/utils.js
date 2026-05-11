/**
 * @fileoverview API Utility Functions
 * 
 * Utilitários compartilhados entre os módulos da API,
 * evitando duplicação de código.
 * 
 * @module lib/api/utils
 */

/**
 * Gera UUID v4 simples (fallback quando uuid não está disponível)
 * @returns {string} UUID gerado
 */
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Gera metadados padrão para respostas da API
 * @param {Object} customMeta - Metadados customizados
 * @returns {Object} Metadados completos
 */
export function generateMeta(customMeta = {}) {
  return {
    timestamp: new Date().toISOString(),
    requestId: generateUUID(),
    ...customMeta,
  };
}