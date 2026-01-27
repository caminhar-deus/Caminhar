import { getSetting, setSetting, getAllSettings } from '../../lib/db';
import { apiMiddleware, authenticatedApiMiddleware, errorHandlingMiddleware } from '../../lib/middleware';

/**
 * Settings API endpoint
 * Handles CRUD operations for website settings
 * @version 1.0
 * @public
 */
const handler = async function (req, res) {
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
    console.error('Error in settings API:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Erro no servidor',
      timestamp: new Date().toISOString()
    });
  }
};

// Create the middleware chain
const apiHandler = apiMiddleware(handler);
export default errorHandlingMiddleware(apiHandler);

/**
 * Handle GET request - get all settings or specific setting
 */
async function handleGet(req, res) {
  const { key } = req.query;

  if (key) {
    // Get specific setting
    const value = await getSetting(key);
    if (value !== null) {
      res.status(200).json({ key, value });
    } else {
      res.status(404).json({ message: 'Configuração não encontrada' });
    }
  } else {
    // Get all settings
    const settings = await getAllSettings();
    res.status(200).json(settings);
  }
}

/**
 * Handle POST request - create new setting
 */
async function handlePost(req, res) {
  const { key, value, type = 'string', description = '' } = req.body;

  if (!key || !value) {
    return res.status(400).json({ message: 'Chave e valor são obrigatórios' });
  }

  const result = await setSetting(key, value, type, description);
  res.status(201).json({ key, value: result });
}

/**
 * Handle PUT request - update existing setting
 */
async function handlePut(req, res) {
  const { key, value, type, description } = req.body;

  if (!key || !value) {
    return res.status(400).json({ message: 'Chave e valor são obrigatórios' });
  }

  const result = await setSetting(key, value, type, description);
  res.status(200).json({ key, value: result });
}