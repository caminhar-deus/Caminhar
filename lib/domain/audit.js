import { query } from '../db.js';

/**
 * Registra uma atividade no log de auditoria
 * @param {string} username - Nome do usuário que realizou a ação
 * @param {string} action - 'CREATE', 'UPDATE', ou 'DELETE'
 * @param {string} entityType - Ex: 'PRODUCT', 'USER', 'POST'
 * @param {number} entityId - ID do registro modificado
 * @param {string} details - Detalhes textuais adicionais
 * @param {string} ipAddress - IP da requisição
 */
export async function logActivity(username, action, entityType, entityId, details, ipAddress = '', options = {}) {
  const { client } = options;
  const text = `
    INSERT INTO activity_logs (username, action, entity_type, entity_id, details, ip_address)
    VALUES ($1, $2, $3, $4, $5, $6)
  `;
  await query(text, [username, action, entityType, entityId, details, ipAddress], { log: false, client });
}