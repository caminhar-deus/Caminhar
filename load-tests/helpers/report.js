// Módulo compartilhado para geração de relatórios de teste k6
// Centraliza a lógica de saída de relatórios evitando duplicação
// Nota: handleSummary() deve ser exportado pelo próprio arquivo de teste
// Este módulo fornece a função generateReport() para montar o objeto de saída

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.4/index.js';

/**
 * Sanitiza token JWT nos dados do relatório, substituindo por "*** TOKEN OCULTO ***"
 * para evitar exposição do token em relatórios de saída.
 *
 * @param {Object} data - Dados do teste k6 (podem conter setup_data.token)
 */
function sanitizeToken(data) {
  if (data && data.setup_data && data.setup_data.token) {
    data.setup_data.token = '*** TOKEN OCULTO ***';
  }
}

/**
 * Gera o objeto de saída padronizado para relatórios k6.
 * Sanitiza automaticamente o token JWT antes de exportar os dados.
 * Deve ser chamado dentro da função handleSummary() exportada pelo teste.
 *
 * @param {Object} data - Dados do teste k6
 * @param {string} testName - Nome do teste (usado no nome do arquivo)
 * @returns {Object} Objeto com saídas do relatório ({stdout, json})
 */
export function generateReport(data, testName) {
  // Sanitiza o token JWT antes de gerar o relatório
  sanitizeToken(data);

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    [`./reports/k6-summaries/${testName}.json`]: JSON.stringify(data, null, 4),
  };
}