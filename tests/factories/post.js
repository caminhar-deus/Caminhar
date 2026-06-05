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

import { createBaseFactory } from './base.js';

// Helper para gerar slugs
const generateSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
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
 * Gera os defaults de um post baseado no ID
 * @param {number} id - ID sequencial
 * @returns {Object} Defaults do post
 */
const generatePostDefaults = (id) => {
  const titleIndex = (id - 1) % postTitles.length;
  const title = `${postTitles[titleIndex]} ${id}`;
  const date = new Date();
  date.setDate(date.getDate() - id);

  return {
    id,
    title,
    slug: generateSlug(title),
    excerpt: postContents[titleIndex % postContents.length].substring(0, 100),
    content: postContents[titleIndex % postContents.length] + '\n\nMais conteúdo sobre este tema inspirador...',
    image_url: `https://picsum.photos/800/400?random=${id}`,
    published: true,
    created_at: date.toISOString(),
    updated_at: new Date().toISOString(),
  };
};

/**
 * Cria um objeto de post para testes
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Post completo
 */
export const postFactory = createBaseFactory(generatePostDefaults);

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