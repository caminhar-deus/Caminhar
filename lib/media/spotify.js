/**
 * Utilitário centralizado para extração de IDs do Spotify.
 *
 * Evita duplicação de regex entre MusicCard e UrlField.
 */

/**
 * Extrai o ID de uma track do Spotify a partir de diferentes formatos de URL.
 * Suporta formatos: open.spotify.com/track/ID, spotify:track:ID,
 * open.spotify.com/intl-XX/track/ID
 * Apenas tracks são suportados para embed.
 *
 * @param {string} url - A URL do Spotify.
 * @returns {string|null} O ID da track ou null se não encontrado.
 */
export function extractSpotifyId(url) {
  if (!url) return null;
  const regex = /(?:spotify\.com\/(?:intl-\w+\/)?track\/|spotify:track:)([^"&?/\s]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

/**
 * Verifica se é uma URL de track do Spotify suportada para embed.
 * Apenas faixas (tracks) são embeddáveis neste projeto.
 *
 * @param {string} url - A URL do Spotify.
 * @returns {boolean}
 */
export function isSpotifyTrackUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return extractSpotifyId(url) !== null;
}

/**
 * Converte uma URL do Spotify para URL de embed.
 * Suporta apenas tracks. Retorna null se não for um track válido/embeddável.
 *
 * @param {string} url - A URL do Spotify.
 * @returns {string|null} A URL de embed ou null se inválida/não suportada.
 */
export function getSpotifyEmbedUrl(url) {
  const id = extractSpotifyId(url);
  if (!id) return null;
  return `https://open.spotify.com/embed/track/${id}`;
}