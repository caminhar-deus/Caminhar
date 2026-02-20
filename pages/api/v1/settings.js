import { getSetting, setSetting, getAllSettings } from '../../../lib/db.js';
import { getAuthToken, verifyToken } from '../../../lib/auth.js';
import { getOrSetCache, invalidateCache } from '../../../lib/cache.js';

// Configuração de TTL para Settings (ex: 30 minutos)
const SETTINGS_CACHE_TTL = 1800;

/**
 * External Settings API endpoint (v1)
 * Handles CRUD operations for website settings with external authentication
 * @version 1.0
 * @public
 * @authenticated
 */
export default async function handler(req, res) {
    // Get token from header or cookie
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString()
      });
    }

    // Attach user to request
    req.user = decoded;

    try {
      switch (req.method) {
        case 'GET':
          await handleGet(req, res);
          break;
        case 'POST':
          await handlePost(req, res);
          break;
        case 'PUT':
          await handlePut(req, res);
          break;
        default:
          res.status(405).json({
            error: 'Method Not Allowed',
            message: 'Método não permitido',
            timestamp: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error in external settings API:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Erro no servidor',
        timestamp: new Date().toISOString()
      });
    }
  }

/**
 * Handle GET request - get all settings or specific setting
 * Requires authentication and proper permissions
 */
async function handleGet(req, res) {
  const { key } = req.query;

  // Check user permissions
  if (req.user.role !== 'admin' && req.user.role !== 'editor') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Acesso negado - permissões insuficientes',
      timestamp: new Date().toISOString()
    });
  }

  if (key) {
    // Get specific setting from cache or DB
    const value = await getOrSetCache(`settings:v1:${key}`, () => getSetting(key), SETTINGS_CACHE_TTL);
    if (value !== null) {
      res.status(200).json({
        success: true,
        data: { key, value: value },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: 'Configuração não encontrada',
        timestamp: new Date().toISOString()
      });
    }
  } else {
    // Get all settings from cache or DB
    const settings = await getOrSetCache('settings:v1:all', getAllSettings, SETTINGS_CACHE_TTL);
    res.status(200).json({
      success: true,
      data: settings,
      count: settings.length,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Handle POST request - create new setting
 * Requires admin permissions
 */
async function handlePost(req, res) {
  // Check admin permissions
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Acesso negado - requer permissões de administrador',
      timestamp: new Date().toISOString()
    });
  }

  const { key, value, type = 'string', description = '' } = req.body;

  if (!key || !value) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Chave e valor são obrigatórios',
      timestamp: new Date().toISOString()
    });
  }

  const result = await setSetting(key, value, type, description);

  // Invalidate cache
  await invalidateCache('settings:v1:all');
  await invalidateCache(`settings:v1:${key}`);

  res.status(201).json({
    success: true,
    data: { key, value: result },
    message: 'Configuração criada com sucesso',
    timestamp: new Date().toISOString()
  });
}

/**
 * Handle PUT request - update existing setting
 * Requires admin permissions
 */
async function handlePut(req, res) {
  // Check admin permissions
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Acesso negado - requer permissões de administrador',
      timestamp: new Date().toISOString()
    });
  }

  const { key, value, type, description } = req.body;

  if (!key || !value) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Chave e valor são obrigatórios',
      timestamp: new Date().toISOString()
    });
  }

  const result = await setSetting(key, value, type, description);

  // Invalidate cache
  await invalidateCache('settings:v1:all');
  await invalidateCache(`settings:v1:${key}`);

  res.status(200).json({
    success: true,
    data: { key, value: result },
    message: 'Configuração atualizada com sucesso',
    timestamp: new Date().toISOString()
  });
}