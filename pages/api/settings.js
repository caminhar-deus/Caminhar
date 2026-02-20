import { getSettings, updateSetting } from '../../lib/db.js';
import { withAuth } from '../../lib/auth.js';

async function handler(req, res) {
  if (req.method === 'GET') {
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

  if (req.method === 'PUT') {
    return withAuth(async (req, res) => {
      const { key, value, type, description } = req.body;
      try {
        await updateSetting(key, value, type, description);
        return res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error updating setting:', error);
        return res.status(500).json({ error: 'Error updating setting' });
      }
    })(req, res);
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default handler;