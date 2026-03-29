import { getSettings, updateSetting } from '../../lib/domain/settings.js';
import { withAuth } from '../../lib/auth.js';
import { z } from 'zod';

/**
 * Handles GET requests to fetch all settings.
 */
async function handleGet(req, res) {
  try {
    // Cache por 60 segundos (fresco), permite uso de cache antigo por mais 5 minutos enquanto revalida
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    const settings = await getSettings();
    return res.status(200).json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({ error: 'Error fetching settings' });
  }
}

/**
 * Handles PUT requests to update a setting. This is a protected route.
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
      success: false,
      message: 'Parâmetros inválidos.',
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const { key, value, type, description } = validation.data;

  try {
    await updateSetting(key, value, type, description);
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating setting:', error);
    return res.status(500).json({ error: 'Error updating setting' });
  }
});

/**
 * Main handler for the /api/settings route.
 * Dispatches requests to the appropriate method handler.
 */
async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'PUT':
      return handlePut(req, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT']);
      return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}

export default handler;