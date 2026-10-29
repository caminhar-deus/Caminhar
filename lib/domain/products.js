import { query } from '../infra/db.js';
import { createRecord, updateRecords, deleteRecords, raw } from '../crud/crud.js';
import { normalizePrice } from '../api/utils.js';

// Re-exporta para consumidores do domínio (API e testes) — implementação
// client-safe em lib/api/utils.js, compartilhada com o formulário admin.
export { normalizePrice };

/**
 * Retorna produtos paginados (públicos) com suporte a filtros.
 * @param {number} page - Número da página (base 1)
 * @param {number} limit - Itens por página
 * @param {object} [filters={}] - Filtros opcionais
 * @param {string} [filters.search] - Termo de busca (nome/descrição)
 * @param {number} [filters.minPrice] - Preço mínimo
 * @param {number} [filters.maxPrice] - Preço máximo
 * @param {string} [sort='default'] - Ordenação ('default' | 'positioned' | 'oldest' | 'price_asc' | 'price_desc')
 * @returns {Promise<Object>} Produtos paginados com metadados
 */
export async function getPaginatedProducts(page = 1, limit = 100, filters = {}, sort = 'default') {
  // "Padrão" = Mais recentes (created_at DESC) — PLANO_ACAO F1.2 (D-11/D-12).
  // "Posicionados" = curadoria manual do painel (position ASC) — ADR-0014.
  // A coluna created_at existe em products (ver lib/crud/crud.js TABLE_COLUMNS).
  const orderByMap = {
    default: 'created_at DESC',
    positioned: 'position ASC, id ASC',
    oldest: 'created_at ASC',
    price_asc: 'price ASC',
    price_desc: 'price DESC',
  };
  const orderBy = orderByMap[sort] || orderByMap.default;

  const offset = (page - 1) * limit;
  const { search, minPrice, maxPrice, category } = filters;
  const conditions = ['published = true'];
  const params = [];
  let paramIndex = 0;

  if (search) {
    paramIndex++;
    conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
    params.push(`%${search}%`);
  }

  if (minPrice !== undefined && minPrice !== '') {
    const min = normalizePrice(minPrice);
    if (min !== null) {
      paramIndex++;
      conditions.push(`price >= $${paramIndex}`);
      params.push(min);
    }
  }

  if (maxPrice !== undefined && maxPrice !== '') {
    const max = normalizePrice(maxPrice);
    if (max !== null) {
      paramIndex++;
      conditions.push(`price <= $${paramIndex}`);
      params.push(max);
    }
  }

  if (category !== undefined && category !== '') {
    paramIndex++;
    conditions.push(`category = $${paramIndex}`);
    params.push(String(category));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query(`SELECT COUNT(*) FROM products ${whereClause}`, params);
  const total = parseInt(countResult.rows[0].count, 10);
  const totalPages = Math.ceil(total / limit);

  paramIndex++;
  params.push(limit);
  paramIndex++;
  params.push(offset);

  const { rows } = await query(
    `SELECT * FROM products ${whereClause} ORDER BY ${orderBy} LIMIT $${paramIndex - 1} OFFSET $${paramIndex}`,
    params
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
 * Retorna as categorias distintas dos produtos publicados (facet para o
 * filtro da vitrine).
 * @returns {Promise<string[]>} Lista ordenada de categorias
 */
export async function getProductCategories() {
  const { rows } = await query(
    `SELECT DISTINCT category FROM products WHERE published = true AND category IS NOT NULL AND category <> '' ORDER BY category ASC`
  );
  return rows.map((row) => row.category);
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
    price: normalizePrice(price),
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
  if (data.price !== undefined) updateData.price = normalizePrice(data.price);
  if (data.image_url !== undefined) updateData.image_url = data.image_url;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.link !== undefined) updateData.link = data.link;
  if (data.published !== undefined) updateData.published = data.published;

  if (Object.keys(updateData).length === 0) {
    throw new Error('NO_DATA_TO_UPDATE');
  }

  // Só adiciona updated_at se houver pelo menos um campo para atualizar
  if (Object.keys(updateData).length > 0) {
    updateData.updated_at = raw('CURRENT_TIMESTAMP');
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