/**
 * Helper compartilhado para reordenação (Drag & Drop) de itens no Admin.
 *
 * Substitui a lógica duplicada de handleReorder presente em:
 * - AdminMusicas.js
 * - AdminPosts.js
 * - AdminVideos.js
 * - AdminProducts.js
 *
 * @module utils/reorder
 *
 * As posições geradas são **1-based**: a primeira posição da página 1 é `1`
 * (e a da página 2, com 10 itens por página, é `11`). O valor `0` nunca é
 * enviado, porque os schemas de reordenação exigem `position` positiva.
 *
 * @param {string} endpoint - URL da API (ex: '/api/admin/musicas')
 * @param {Array} reorderedItems - Itens na nova ordem
 * @param {number} [currentPage=1] - Página atual (para calcular offset)
 * @param {number} [itemsPerPage=10] - Itens por página
 * @returns {Promise<void>}
 */
export async function handleReorder(endpoint, reorderedItems, currentPage = 1, itemsPerPage = 10) {
  const offset = (currentPage - 1) * itemsPerPage;
  const payload = reorderedItems.map((item, index) => ({ id: item.id, position: offset + index + 1 }));

  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'reorder', items: payload })
  });
  if (!response.ok) throw new Error('Falha ao reordenar');
}