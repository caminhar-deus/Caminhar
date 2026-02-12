/**
 * Post Factory
 * Gera dados de teste para posts do blog
 * 
 * Uso básico:
 *   const post = postFactory();
 * 
 * Com overrides:
 *   const draft = postFactory({ published: false, title: 'Rascunho' });
 * 
 * Lista de posts:
 *   const posts = postFactory.list(3);
 */

// Sequencial ID generator
let idCounter = 1;
const generateId = () => idCounter++;

// Reset counter (útil em beforeEach)
export const resetPostIdCounter = () => { idCounter = 1; };

// Helper para gerar slugs
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

// Helper para gerar timestamps
const generateTimestamp = (daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

// Templates de dados
const postTitles = [
  'A Jornada da Fé',
  'Caminhando com Propósito',
  'Encontrando Paz Interior',
  'O Poder da Oração',
  'Vivendo com Gratidão',
  'Superando Desafios',
  'A Importância da Comunhão',
  'Reflexões Diárias',
  'Momentos de Inspiração',
  'Crescimento Espiritual',
];

const postContents = [
  'Hoje quero compartilhar uma reflexão sobre como encontrar força nos momentos difíceis...',
  'A fé nos move montanhas e nos dá coragem para seguir em frente...',
  'Cada passo em nossa jornada é uma oportunidade de aprendizado...',
  'Quando oramos, conectamos nossa alma com o divino...',
  'A gratidão transforma o que temos em suficiente...',
];

/**
 * Cria um objeto de post para testes
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Post completo
 */
export const postFactory = (overrides = {}) => {
  const id = overrides.id ?? generateId();
  const titleIndex = (id - 1) % postTitles.length;
  const title = overrides.title ?? `${postTitles[titleIndex]} ${id}`;
  
  return {
    id,
    title,
    slug: overrides.slug ?? generateSlug(title),
    excerpt: overrides.excerpt ?? postContents[titleIndex % postContents.length].substring(0, 100),
    content: overrides.content ?? postContents[titleIndex % postContents.length] + '\n\nMais conteúdo sobre este tema inspirador...',
    image_url: overrides.image_url ?? `https://picsum.photos/800/400?random=${id}`,
    published: overrides.published ?? true,
    created_at: overrides.created_at ?? generateTimestamp(id),
    updated_at: overrides.updated_at ?? generateTimestamp(0),
    ...overrides,
  };
};

/**
 * Cria um post não publicado (rascunho)
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Post rascunho
 */
export const draftPostFactory = (overrides = {}) =>
  postFactory({ published: false, ...overrides });

/**
 * Cria um post publicado
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Post publicado
 */
export const publishedPostFactory = (overrides = {}) =>
  postFactory({ published: true, ...overrides });

/**
 * Cria múltiplos posts
 * @param {number} count - Quantidade de posts
 * @param {Object} overrides - Propriedades para sobrescrever em todos
 * @param {Function} mapFn - Função para mapear cada post
 * @returns {Array} Lista de posts
 */
postFactory.list = (count, overrides = {}, mapFn) => {
  const posts = Array.from({ length: count }, () => postFactory(overrides));
  return mapFn ? posts.map(mapFn) : posts;
};

/**
 * Cria dados para criação de post (sem id, timestamps)
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Dados para criação
 */
export const createPostInput = (overrides = {}) => {
  const title = overrides.title ?? 'Novo Post de Teste';
  
  return {
    title,
    slug: overrides.slug ?? generateSlug(title),
    excerpt: overrides.excerpt ?? 'Um resumo inspirador para este post de teste...',
    content: overrides.content ?? 'Conteúdo completo do post com reflexões inspiradoras...',
    image_url: overrides.image_url ?? 'https://picsum.photos/800/400',
    published: overrides.published ?? true,
    ...overrides,
  };
};

/**
 * Cria dados para atualização de post (campos opcionais)
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Dados para atualização
 */
export const updatePostInput = (overrides = {}) => ({
  ...(overrides.title && { title: overrides.title }),
  ...(overrides.slug && { slug: overrides.slug }),
  ...(overrides.excerpt && { excerpt: overrides.excerpt }),
  ...(overrides.content && { content: overrides.content }),
  ...(overrides.image_url && { image_url: overrides.image_url }),
  ...(overrides.published !== undefined && { published: overrides.published }),
  ...overrides,
});
