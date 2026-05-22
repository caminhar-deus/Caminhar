#!/usr/bin/env node

/**
 * Utilitário de formatação de datas usando APIs nativas do JavaScript
 * Substitui o uso de date-fns/format em scripts/backup.js
 *
 * @module scripts/utils/date-format
 */

/**
 * Formata data no padrão ISO usado em nomes de arquivo de backup
 * Ex: "2026-05-21T23-00-00Z"
 *
 * @param {Date} [date = new Date()] - Data a ser formatada
 * @returns {string} Data formatada no padrão ISO com ':' substituídos por '-'
 */
export function formatISODate(date = new Date()) {
  return date.toISOString()
    .replace(/:/g, '-')
    .replace(/\.\d{3}/, '');
}

/**
 * Formata data no padrão de log: "2026-05-21 23:00:00"
 *
 * @param {Date} [date = new Date()] - Data a ser formatada
 * @returns {string} Data formatada como "YYYY-MM-DD HH:mm:ss"
 */
export function formatLogDate(date = new Date()) {
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)}`;
}