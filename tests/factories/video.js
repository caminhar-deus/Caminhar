/**
 * Video Factory
 * Gera dados de teste para vídeos do YouTube
 * 
 * Uso básico:
 *   const video = videoFactory();
 * 
 * Com URL customizada:
 *   const video = videoFactory({ 
 *     url_youtube: 'https://youtube.com/watch?v=abc123' 
 *   });
 * 
 * Lista de vídeos:
 *   const videos = videoFactory.list(3);
 */

import { createBaseFactory } from './base.js';

// Templates de dados
const videoTitles = [
  'Mensagem de Esperança',
  'Estudo Bíblico Semanal',
  'Momento de Oração',
  'Reflexão Matinal',
  'Palavra do Dia',
  'Ensinamento Especial',
  'Testemunho Inspirador',
  'Devocional Noturno',
  'Sermão Dominical',
  'Pregação Motivacional',
];

const videoDescriptions = [
  'Uma mensagem especial para edificar sua fé e fortalecer sua caminhada.',
  'Neste vídeo compartilhamos insights profundos sobre as Escrituras.',
  'Momento especial de comunhão e oração com toda a comunidade.',
  'Reflexões matinais para começar o dia com o pé direito.',
  'Palavra inspiradora para o seu dia a dia.',
];

// Gerar ID do YouTube (11 caracteres)
const generateYoutubeId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < 11; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Gera uma URL válida do YouTube
 * @param {string} videoId - ID do vídeo (opcional)
 * @returns {string} URL completa do YouTube
 */
export const generateYoutubeUrl = (videoId) => {
  const id = videoId || generateYoutubeId();
  return `https://youtube.com/watch?v=${id}`;
};

/**
 * Gera os defaults de um vídeo baseado no ID
 * @param {number} id - ID sequencial
 * @returns {Object} Defaults do vídeo
 */
const generateVideoDefaults = (id) => {
  const youtubeId = generateYoutubeId();
  const index = (id - 1) % videoTitles.length;
  const date = new Date();
  date.setDate(date.getDate() - id);

  return {
    id,
    titulo: `${videoTitles[index]} ${id}`,
    url_youtube: generateYoutubeUrl(youtubeId),
    youtube_id: youtubeId,
    descricao: videoDescriptions[index % videoDescriptions.length],
    publicado: true,
    thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    created_at: date.toISOString(),
    updated_at: new Date().toISOString(),
  };
};

/**
 * Cria um objeto de vídeo para testes
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Vídeo completo
 */
export const videoFactory = createBaseFactory(generateVideoDefaults);

/**
 * Cria um vídeo não publicado
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Vídeo não publicado
 */
export const unpublishedVideoFactory = (overrides = {}) =>
  videoFactory({ publicado: false, ...overrides });

/**
 * Cria um vídeo publicado
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Vídeo publicado
 */
export const publishedVideoFactory = (overrides = {}) =>
  videoFactory({ publicado: true, ...overrides });

/**
 * Cria um vídeo com URL do YouTube inválida (para testes de validação)
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Vídeo com URL inválida
 */
export const invalidYoutubeVideoFactory = (overrides = {}) =>
  videoFactory({ 
    url_youtube: 'https://vimeo.com/123456',
    ...overrides 
  });

/**
 * Cria dados para criação de vídeo (sem id, timestamps)
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Dados para criação
 */
export const createVideoInput = (overrides = {}) => ({
  titulo: overrides.titulo ?? 'Novo Vídeo de Teste',
  url_youtube: overrides.url_youtube ?? generateYoutubeUrl(),
  descricao: overrides.descricao ?? 'Descrição do vídeo de teste...',
  publicado: overrides.publicado ?? true,
  ...overrides,
});

/**
 * Cria dados para atualização de vídeo
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Dados para atualização
 */
export const updateVideoInput = (overrides = {}) => ({
  ...(overrides.titulo && { titulo: overrides.titulo }),
  ...(overrides.url_youtube && { url_youtube: overrides.url_youtube }),
  ...(overrides.descricao && { descricao: overrides.descricao }),
  ...(overrides.publicado !== undefined && { publicado: overrides.publicado }),
  ...overrides,
});

/**
 * Extrai o ID do YouTube de uma URL
 * @param {string} url - URL do YouTube
 * @returns {string|null} ID do vídeo ou null
 */
export const extractYoutubeId = (url) => {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
    /\/v\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

/**
 * Cria um vídeo embeddable (para players)
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Vídeo com URL embed
 */
export const embeddableVideoFactory = (overrides = {}) => {
  const video = videoFactory(overrides);
  const youtubeId = extractYoutubeId(video.url_youtube) || generateYoutubeId();
  
  return {
    ...video,
    embed_url: `https://www.youtube.com/embed/${youtubeId}`,
    thumbnail_url: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
  };
};