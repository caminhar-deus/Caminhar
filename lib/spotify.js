/**
 * Utilitário centralizado para extração de IDs do Spotify.
 *
 * Evita duplicação de regex entre MusicCard e UrlField.
 */

/**
 * Extrai o ID de uma track do Spotify a partir de diferentes formatos de URL.
 * Suporta formatos: open.spotify.com/track/ID, spotify:track:ID,
 * open.spotify.com/intl-XX/track/ID
 *
 * @param {string} url - A URL do Spotify.
 * @returns {string|null} O ID da track ou null se não encontrado.
 */
export function extractSpotifyId(url) {
  if (!url) return null;
  const regex = /(?:spotify\.com\/(?:intl-\w+\/)?track\/|spotify:track:)([^"&?\/\s]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Converte uma URL do Spotify para URL de embed.
 *
 * @param {string} url - A URL do Spotify.
 * @returns {string|null} A URL de embed ou null se inválida.
 */
export function getSpotifyEmbedUrl(url) {
  const id = extractSpotifyId(url);
  if (!id) return url;
  return `https://open.spotify.com/embed/track/${id}`;
}