import { clearAllCache, getCacheMetrics } from '../../../lib/cache';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';

async function handleGet(req, res) {
  const metrics = getCacheMetrics();
  return res.status(200).json(metrics);
}

async function handleClear(req, res) {
  // Limpeza do Cache (confirmação explícita para evitar FLUSHDB acidental)
  await clearAllCache({ confirm: true });

  req.adminUtils.logActivity('LIMPAR CACHE', null, 'Cache limpo manualmente');
  return res.status(200).json({
    success: true,
    message: 'Cache do Redis limpo com sucesso (FLUSHDB).',
    timestamp: new Date().toISOString(),
  });
}

export default createAdminHandler({
  name: 'Cache',
  requireAdmin: true,
  allowedMethods: ['GET', 'POST', 'DELETE'],
  handlers: { GET: handleGet, POST: handleClear, DELETE: handleClear },
  rateLimit: { max: 10, window: 60000 },
});