/**
 * Music Factory
 * Gera dados de teste para músicas
 * 
 * Uso básico:
 *   const music = musicFactory();
 * 
 * Com Spotify URL:
 *   const music = musicFactory({ 
 *     url_spotify: 'https://open.spotify.com/track/123456789' 
 *   });
 * 
 * Lista de músicas:
 *   const musicas = musicFactory.list(5);
 */

let idCounter = 1;
const generateId = () => idCounter++;

export const resetMusicIdCounter = () => { idCounter = 1; };

// Templates de dados
const musicTitles = [
  'Amazing Grace',
  'How Great Thou Art',
  'Blessed Assurance',
  'Great Is Thy Faithfulness',
  'It Is Well With My Soul',
  'Holy Holy Holy',
  'To God Be The Glory',
  'The Old Rugged Cross',
  'What A Friend We Have In Jesus',
  'How Firm A Foundation',
];

const artists = [
  'Hillsong Worship',
  'Chris Tomlin',
  'Casting Crowns',
  'Lauren Daigle',
  'Elevation Worship',
  'Bethel Music',
  'Matt Redman',
  'Kari Jobe',
  'Phil Wickham',
  'Cory Asbury',
];

// Gerar track ID do Spotify (22 caracteres alfanuméricos)
const generateTrackId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 22; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Gera uma URL válida do Spotify para testes
 * @returns {string} URL do Spotify
 */
export const generateSpotifyUrl = () => {
  return `https://open.spotify.com/track/${generateTrackId()}`;
};

/**
 * Cria um objeto de música para testes
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Música completa
 */
export const musicFactory = (overrides = {}) => {
  const id = overrides.id ?? generateId();
  const index = (id - 1) % musicTitles.length;
  
  return {
    id,
    titulo: overrides.titulo ?? musicTitles[index],
    artista: overrides.artista ?? artists[index % artists.length],
    url_imagem: overrides.url_imagem ?? `https://picsum.photos/300/300?random=${id}`,
    url_spotify: overrides.url_spotify ?? generateSpotifyUrl(),
    publicado: overrides.publicado ?? true,
    created_at: overrides.created_at ?? new Date(Date.now() - id * 86400000).toISOString(),
    updated_at: overrides.updated_at ?? new Date().toISOString(),
    ...overrides,
  };
};

/**
 * Cria uma música não publicada
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Música não publicada
 */
export const unpublishedMusicFactory = (overrides = {}) =>
  musicFactory({ publicado: false, ...overrides });

/**
 * Cria uma música publicada
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Música publicada
 */
export const publishedMusicFactory = (overrides = {}) =>
  musicFactory({ publicado: true, ...overrides });

/**
 * Cria uma música com URL do Spotify inválida (para testes de validação)
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Música com URL inválida
 */
export const invalidSpotifyMusicFactory = (overrides = {}) =>
  musicFactory({ 
    url_spotify: 'https://youtube.com/watch?v=invalid',
    ...overrides 
  });

/**
 * Cria múltiplas músicas
 * @param {number} count - Quantidade de músicas
 * @param {Object} overrides - Propriedades para sobrescrever em todas
 * @param {Function} mapFn - Função para mapear cada música
 * @returns {Array} Lista de músicas
 */
musicFactory.list = (count, overrides = {}, mapFn) => {
  const musicas = Array.from({ length: count }, () => musicFactory(overrides));
  return mapFn ? musicas.map(mapFn) : musicas;
};

/**
 * Cria dados para criação de música (sem id, timestamps)
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Dados para criação
 */
export const createMusicInput = (overrides = {}) => ({
  titulo: overrides.titulo ?? 'Nova Música de Teste',
  artista: overrides.artista ?? 'Artista Teste',
  url_imagem: overrides.url_imagem ?? 'https://picsum.photos/300/300',
  url_spotify: overrides.url_spotify ?? generateSpotifyUrl(),
  publicado: overrides.publicado ?? true,
  ...overrides,
});

/**
 * Cria dados para atualização de música
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Dados para atualização
 */
export const updateMusicInput = (overrides = {}) => ({
  ...(overrides.titulo && { titulo: overrides.titulo }),
  ...(overrides.artista && { artista: overrides.artista }),
  ...(overrides.url_imagem && { url_imagem: overrides.url_imagem }),
  ...(overrides.url_spotify && { url_spotify: overrides.url_spotify }),
  ...(overrides.publicado !== undefined && { publicado: overrides.publicado }),
  ...overrides,
});

/**
 * Cria uma música completa com álbum e gênero (mais detalhada)
 * @param {Object} overrides - Propriedades para sobrescrever
 * @returns {Object} Música detalhada
 */
export const detailedMusicFactory = (overrides = {}) =>
  musicFactory({
    album: overrides.album ?? 'Álbum de Louvor',
    genero: overrides.genero ?? 'Gospel',
    ano: overrides.ano ?? 2024,
    duracao: overrides.duracao ?? 240,
    ...overrides,
  });
