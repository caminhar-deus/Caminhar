import { getAuthToken, verifyToken } from '../../../lib/auth';
import { clearAllCache } from '../../../lib/cache';

export default async function handler(req, res) {
  // Permite POST (ação) ou DELETE (recurso)
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Método não permitido. Use POST ou DELETE.',
      timestamp: new Date().toISOString()
    });
  }

  // 1. Autenticação
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Autenticação necessária',
      timestamp: new Date().toISOString()
    });
  }

  // 2. Verificação de Permissão (Admin)
  const decoded = verifyToken(token);
  if (!decoded || decoded.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Acesso negado. Requer privilégios de administrador.',
      timestamp: new Date().toISOString()
    });
  }

  try {
    // 3. Limpeza do Cache
    await clearAllCache();
    
    return res.status(200).json({
      success: true,
      message: 'Cache do Redis limpo com sucesso (FLUSHDB).',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao limpar cache:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro ao tentar limpar o cache.',
      timestamp: new Date().toISOString()
    });
  }
}