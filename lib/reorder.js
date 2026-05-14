/**
 * Helper compartilhado para reordenação (Drag & Drop) de itens no Admin.
 *
 * Substitui a lógica duplicada de handleReorder presente em:
 * - AdminMusicas.js
 * - AdminPosts.js
 * - AdminVideos.js
 * - AdminProducts.js
 *
 * @param {string} endpoint - URL da API (ex: '/api/admin/musicas')
 * @param {Array} reorderedItems - Itens na nova ordem
 * @param {number} [currentPage=1] - Página atual (para calcular offset)
 * @param {number} [itemsPerPage=10] - Itens por página
 * @returns {Promise<void>}
 */
export async function handleReorder(endpoint, reorderedItems, currentPage = 1, itemsPerPage = 10) {
  const offset = (currentPage - 1) * itemsPerPage;
  const payload = reorderedItems.map((item, index) => ({ id: item.id, position: offset + index }));

  try {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', items: payload })
    });
    if (!response.ok) throw new Error('Falha ao reordenar');
  } catch (error) {
    console.error('Erro ao salvar reordenação:', error);
  }
}