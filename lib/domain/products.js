import { query } from '../db.js';
import { createRecord, updateRecords, deleteRecords } from '../crud.js';

/**
 * Retorna produtos paginados (públicos).
 * @param {number} page - Número da página (base 1)
 * @param {number} limit - Itens por página
 * @returns {Promise<Object>} Produtos paginados com metadados
 */
export async function getPaginatedProducts(page = 1, limit = 100) {
  const offset = (page - 1) * limit;

  // Filtra apenas produtos publicados para o endpoint público
  const countResult = await query('SELECT COUNT(*) FROM products WHERE published = true', []);
  const total = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  const { rows } = await query(
    'SELECT * FROM products WHERE published = true ORDER BY position ASC, id ASC LIMIT $1 OFFSET $2',
    [limit, offset]
  );

  // Formata moeda para Real (R$) antes de enviar para o frontend
  const formattedRows = rows.map(row => ({
    ...row,
    formatted_price: row.price
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(row.price))
      : 'R$ 0,00',
  }));

  return {
    data: formattedRows,
    pagination: { page, limit, total, totalPages },
  };
}

/**
 * Retorna todos os produtos (admin).
 * @param {number} page - Número da página (base 1)
 * @param {number} limit - Itens por página
 * @returns {Promise<Object>} Produtos paginados com metadados
 */
export async function getAllProducts(page = 1, limit = 100) {
  const offset = (page - 1) * limit;

  const countResult = await query('SELECT COUNT(*) FROM products', []);
  const total = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  const { rows } = await query(
    'SELECT * FROM products ORDER BY position ASC, id ASC LIMIT $1 OFFSET $2',
    [limit, offset]
  );

  const formattedRows = rows.map(row => ({
    ...row,
    formatted_price: row.price
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(row.price))
      : 'R$ 0,00',
  }));

  return {
    data: formattedRows,
    pagination: { page, limit, total, totalPages },
  };
}

/**
 * Cria um novo produto.
 * @param {object} data - Dados do produto
 * @returns {Promise<object>} Produto criado
 */
export async function createProduct(data) {
  const { name, description, price, image_url, category, link } = data;

  // Define posição como último item
  const maxPosResult = await query('SELECT COALESCE(MAX(position), 0) as max_pos FROM products');
  const nextPosition = maxPosResult.rows[0]?.max_pos + 1 || 1;

  const newProduct = await createRecord('products', {
    name,
    description: description || '',
    price,
    image_url: image_url || '',
    category: category || 'geral',
    link: link || '',
    position: nextPosition,
  });

  return newProduct;
}

/**
 * Atualiza um produto existente.
 * @param {number} id - ID do produto
 * @param {object} data - Dados para atualização
 * @returns {Promise<object>} Produto atualizado
 */
export async function updateProduct(id, data) {
  // Constroi o objeto de dados apenas com os campos explicitamente fornecidos,
  // permitindo atualizações parciais (ex: toggle de status sem reenviar todos os campos).
  const updateData = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.price !== undefined) updateData.price = data.price;
  if (data.image_url !== undefined) updateData.image_url = data.image_url;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.link !== undefined) updateData.link = data.link;
  if (data.published !== undefined) updateData.published = data.published;
  if (data.publicado !== undefined) updateData.publicado = data.publicado;

  if (Object.keys(updateData).length === 0) {
    throw new Error('NO_DATA_TO_UPDATE');
  }

  const [updatedProduct] = await updateRecords('products', updateData, { id });
  return updatedProduct;
}

/**
 * Remove um produto pelo ID.
 * @param {number} id - ID do produto
 * @returns {Promise<object>} Produto removido
 */
export async function deleteProduct(id) {
  const [deletedProduct] = await deleteRecords('products', { id });
  return deletedProduct;
}