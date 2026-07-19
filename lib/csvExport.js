/**
 * Helper compartilhado para exportação de dados para CSV.
 * Centraliza a lógica de geração de Blob com BOM, link temporário e download.
 *
 * @module lib/csvExport
 */

/**
 * Escapa um valor para o formato CSV, tratando aspas, vírgulas e quebras de linha.
 * @param {*} val - Valor a ser escapado
 * @returns {string} Valor escapado para CSV
 */
function escapeCSV(val) {
  let str = String(val).replace(/"/g, '""');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    str = `"${str}"`;
  }
  return str;
}

/**
 * Exporta dados para CSV e inicia o download no navegador.
 *
 * @param {Object} options
 * @param {Array<Object>} options.data - Array de objetos a serem exportados
 * @param {Array<{key: string, header: string, format?: Function}>} options.columns - Configuração das colunas
 *   - `key`: chave do objeto para extrair o valor
 *   - `header`: nome do cabeçalho da coluna
 *   - `format`: função opcional para formatar o valor (ex: boolean → 'Publicado'/'Rascunho')
 * @param {string} options.filename - Nome base do arquivo (sem extensão)
 * @param {Function} [options.onEmpty] - Callback chamado se não houver dados
 * @throws {Error} Se os dados forem inválidos
 */
export function exportToCSV({ data, columns, filename, onEmpty }) {
  if (!data || data.length === 0) {
    if (onEmpty) {
      onEmpty();
    }
    return;
  }

  // Prepara os cabeçalhos
  const headers = columns.map(col => col.header);

  // Prepara as linhas
  const csvRows = data.map(item => {
    return columns.map(col => {
      let val = item[col.key];

      // Aplica formatador customizado, se existir
      if (col.format) {
        val = col.format(val, item);
      }

      // Formata valores booleanos para ficarem amigáveis no Excel
      if (typeof val === 'boolean') {
        val = val ? 'Publicado' : 'Rascunho';
      }

      if (val === null || val === undefined) val = '';
      return escapeCSV(val);
    }).join(',');
  });

  const csvContent = [headers.join(','), ...csvRows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Libera memória do Blob (com proteção para ambientes sem a API, ex.: JSDOM)
  if (typeof URL.revokeObjectURL === 'function') {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}