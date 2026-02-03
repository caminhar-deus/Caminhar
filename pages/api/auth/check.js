import { getAuthCookie, verifyToken } from '../../../lib/auth';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const token = getAuthCookie(req);
  if (!token) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  return res.status(200).json({ user });
}