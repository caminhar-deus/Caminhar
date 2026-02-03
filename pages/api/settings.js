import { getSettings, updateSetting } from '../../lib/db';
import { withAuth } from '../../lib/auth';

async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const settings = await getSettings();
      return res.status(200).json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      return res.status(500).json({ error: 'Error fetching settings' });
    }
  }

  if (req.method === 'PUT') {
    const { key, value, type, description } = req.body;
    try {
      await updateSetting(key, value, type, description);
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error updating setting:', error);
      return res.status(500).json({ error: 'Error updating setting' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default withAuth(handler);