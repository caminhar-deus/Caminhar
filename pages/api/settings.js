import { getSettings, getSetting, updateSetting, setSetting, getAllSettingsRaw } from '../../lib/domain/settings.js';
import { withAuth, getAuthToken, verifyToken } from '../../lib/auth.js';
import { getOrSetCache, invalidateCache, checkRateLimit } from '../../lib/cache.js';
import { z } from 'zod';

const SETTINGS_CACHE_TTL = 1800; // 30 minutos

/**
 * Endpoint de configurações do sistema (unificado).
 *
 * GET  /api/settings — Retorna configurações públicas
 * GET  /api/settings?key=x — Retorna configuração específica (autenticado)
 * POST /api/settings — Cria nova configuração (admin)
 * PUT  /api/settings — Atualiza configuração (admin/editor)
 *
 * Query params:
 *   ?response=v1 — Formata resposta no padrão { success, data, ... } (compatível com v1)
 */
export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    case 'PUT':
      return handlePut(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      return res.status(405).json({ error: 'Method Not Allowed', message: `Método ${req.method} não permitido` });
  }
}

/**
 * GET: Retorna configurações públicas ou específica (se autenticado com ?key=)
 */
async function handleGet(req, res) {
  const { key } = req.query;

  // Se tem parâmetro key, exige autenticação (comportamento do v1)
  if (key) {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Autenticação necessária' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Token inválido ou expirado' });
    }

    // Verifica permissões
    if (decoded.role !== 'admin' && decoded.role !== 'editor') {
      return res.status(403).json({ error: 'Forbidden', message: 'Acesso negado - permissões insuficientes' });
    }

    try {
      const value = await getOrSetCache(`settings:${key}`, () => getSetting(key), SETTINGS_CACHE_TTL);
      if (value !== null) {
        const responseData = { success: true, data: { key, value } };
        return res.status(200).json(req.query.response === 'v1' ? { ...responseData, timestamp: new Date().toISOString() } : responseData);
      }
      return res.status(404).json({ error: 'Not Found', message: 'Configuração não encontrada' });
    } catch (error) {
      console.error('Error fetching setting:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao buscar configuração' });
    }
  }

  // GET público (sem key) — retorna todas as configurações com rate limiting
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    const isRateLimited = await checkRateLimit(ip, 'api:public:settings', 30, 60000);
    if (isRateLimited) {
      return res.status(429).json({ error: 'Too Many Requests', message: 'Muitas requisições. Tente novamente mais tarde.' });
    }

    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    const settings = await getSettings();

    if (req.query.response === 'v1') {
      const allSettings = await getAllSettingsRaw();
      return res.status(200).json({ success: true, data: allSettings, count: allSettings.length, timestamp: new Date().toISOString() });
    }

    return res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao buscar configurações' });
  }
}

/**
 * POST: Cria nova configuração (requer role admin)
 */
const handlePost = withAuth(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden', message: 'Acesso negado - requer permissões de administrador' });
  }

  const { key, value, type = 'string', description = '' } = req.body;

  if (!key || !value) {
    return res.status(400).json({ error: 'Bad Request', message: 'Chave e valor são obrigatórios' });
  }

  try {
    const result = await setSetting(key, value, type, description);

    // Invalida cache
    await invalidateCache(`settings:${key}`);
    await invalidateCache('settings:all');

    return res.status(201).json({ success: true, data: { key, value: result }, message: 'Configuração criada com sucesso' });
  } catch (error) {
    console.error('Error creating setting:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao criar configuração' });
  }
});

/**
 * PUT: Atualiza configuração existente (autenticado, admin/editor)
 */
const handlePut = withAuth(async (req, res) => {
  const bodySchema = z.object({
    key: z.string().min(1, { message: 'A chave (key) é obrigatória.' }),
    value: z.any(),
    type: z.string().optional(),
    description: z.string().optional(),
  });

  const validation = bodySchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Parâmetros inválidos.',
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const { key, value, type, description } = validation.data;

  try {
    await updateSetting(key, value, type, description);

    // Invalida cache
    await invalidateCache(`settings:${key}`);
    await invalidateCache('settings:all');

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating setting:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao atualizar configuração' });
  }
});