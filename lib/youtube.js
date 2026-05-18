/**
 * Utilitário centralizado para extração de IDs de plataformas de vídeo.
 *
 * Evita duplicação de regex entre AdminVideos, LazyIframe e UrlField.
 */

/**
 * Extrai o ID de um vídeo do YouTube a partir de diferentes formatos de URL.
 * Suporta formatos: youtube.com/watch?v=, youtu.be/, youtube.com/embed/,
 * youtube.com/v/, youtube.com/e/
 *
 * @param {string} url - A URL do YouTube.
 * @returns {string|null} O ID do vídeo (11 caracteres) ou null se não encontrado.
 */
export function extractYoutubeId(url) {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}