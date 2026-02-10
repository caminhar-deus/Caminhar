import { withAuth } from '../../../lib/auth.js';

export default withAuth(async (req, res) => {
  // The authentication is already handled by withAuth
  // req.user contains the decoded token information
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado: Apenas administradores.' });
  }

  return res.status(200).json({ 
    user: { 
      id: req.user.userId, 
      username: req.user.username, 
      role: req.user.role 
    } 
  });
});
