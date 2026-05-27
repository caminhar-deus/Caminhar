import { getSettings, getSetting, updateSetting, setSetting, getAllSettingsRaw } from '../../lib/domain/settings.js';
import { withAuth, getAuthToken, verifyToken } from '../../lib/auth.js';
import { getOrSetCache, invalidateCache, checkRateLimit } from '../../lib/cache.js';
import { z } from 'zod';
import { getClientIP } from '../../lib/api/helpers.js';

const SETTINGS_CACHE_TTL = 7200; // 2 horas

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

      // Fallback: se a configuração não existir, retorna valor padrão hardcoded
      // para garantir que endpoints que dependem de configurações (ex: site_name)
      // não quebrem durante testes e operação normal.
      const DEFAULT_VALUES = {
        site_name: 'Caminhar',
        site_description: 'Compartilhando mensagens de fé e esperança',
        posts_per_page: '10',
        videos_per_page: '10',
        musicas_per_page: '10',
      };

      if (DEFAULT_VALUES[key] !== undefined) {
        const responseData = { success: true, data: { key, value: DEFAULT_VALUES[key] }, fromDefault: true };
        return res.status(200).json(req.query.response === 'v1' ? { ...responseData, timestamp: new Date().toISOString() } : responseData);
      }

      return res.status(404).json({ error: 'Not Found', message: 'Configuração não encontrada' });
    } catch (error) {
      console.error('Error fetching setting:', error);
      return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao buscar configuração' });
    }
  }

  // GET público (sem key) — retorna todas as configurações com rate limiting e cache
  try {
    const ip = getClientIP(req);

    // Executa cache em paralelo com rate limit para não bloquear cache hits
    const settingsPromise = req.query.response === 'v1'
      ? getOrSetCache('settings:v1:all', () => getAllSettingsRaw(), SETTINGS_CACHE_TTL)
      : getOrSetCache('settings:all', () => getSettings(), SETTINGS_CACHE_TTL);

    const [settings] = await Promise.all([
      settingsPromise,
      checkRateLimit(ip, 'api:public:settings', 600, 60000),
    ]);

    res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');

    if (req.query.response === 'v1') {
      return res.status(200).json({ success: true, data: settings, count: settings.length, timestamp: new Date().toISOString() });
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
const postSchema = z.object({
  key: z.string().min(1, { message: 'A chave (key) é obrigatória.' }),
  value: z.any().refine(v => v !== undefined && v !== null && v !== '', { message: 'O valor (value) é obrigatório.' }),
  type: z.string().optional().default('string'),
  description: z.string().optional().default(''),
});

const handlePost = withAuth(async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden', message: 'Acesso negado - requer permissões de administrador' });
  }

  const validation = postSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Parâmetros inválidos.',
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const { key, value, type = 'string', description = '' } = validation.data;

  try {
    const result = await setSetting(key, value, type, description);

    // Invalida cache
    await invalidateCache(`settings:${key}`);
    await invalidateCache('settings:all');
    await invalidateCache('settings:v1:all');

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
    await invalidateCache('settings:v1:all');

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating setting:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: 'Erro ao atualizar configuração' });
  }
});