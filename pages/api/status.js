import { query } from '../../lib/db';

/**
 * Endpoint de diagnóstico e health check do sistema.
 * Substitui o antigo /api/v1/status.
 *
 * GET /api/status — Retorna diagnóstico completo (versão, DB, sistema)
 * GET /api/status?mode=health — Retorna apenas { status: 'ok' } (compatível com health check)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Método não permitido',
    });
  }

  // Modo health check simples
  if (req.query.mode === 'health') {
    return res.status(200).json({ status: 'ok' });
  }

  // Modo diagnóstico completo
  const status = {
    success: true,
    data: {
      api: {
        version: '1.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      },
      database: {
        status: 'unknown',
        details: {
          type: 'postgres',
          connected: false
        }
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime()
      }
    },
    message: 'API está operacional',
    timestamp: new Date().toISOString()
  };

  try {
    await query('SELECT 1'); // Teste simples de conexão

    status.data.database.status = 'connected';
    status.data.database.details.connected = true;
  } catch (error) {
    status.data.database.status = 'error';
    status.data.database.details.error = error.message;
  }

  res.status(200).json(status);
}