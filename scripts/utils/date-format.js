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

/**
 * Extrai o timestamp de criação embutido no nome de um arquivo de backup
 * e o converte em Date. O padrão dos nomes é gerado por formatISODate():
 * "<prefixo>_YYYY-MM-DDTHH-MM-SSZ.ext" (os ':' do ISO viraram '-' no nome).
 *
 * Fonte única da extração — usada pela ordenação de `getBackupFiles`,
 * por `getAvailableBackups` e pela API do painel (`/api/admin/backups`).
 *
 * @param {string} filename - Nome do arquivo de backup.
 * @returns {Date|null} A data de criação do backup, ou null se o nome não casar.
 */
export function parseBackupTimestamp(filename) {
  if (!filename || typeof filename !== 'string') return null;
  const match = filename.match(/(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})Z/);
  if (!match) return null;
  return new Date(`${match[1]}T${match[2]}:${match[3]}:${match[4]}Z`);
}