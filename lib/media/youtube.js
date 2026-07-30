/**
 * Utilitário centralizado para extração de IDs do YouTube.
 *
 * Evita duplicação de regex entre VideoCard, VideoSection e UrlField.
 * Suporta formatos: youtube.com/watch?v=ID, youtu.be/ID,
 * youtube.com/embed/ID, youtube.com/v/ID, youtube.com/e/ID
 *
 * @param {string} url - A URL do YouTube.
 * @returns {string|null} O ID do vídeo (11 caracteres) ou null se não encontrado.
 */
export function extractYoutubeId(url) {
  if (!url) return null;
  const regex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}