import { authenticatedApiMiddleware } from '../../../lib/middleware.js';

export default authenticatedApiMiddleware(async (req, res) => {
  // The authentication is already handled by authenticatedApiMiddleware
  // req.user contains the decoded token information
  
  return res.status(200).json({ 
    user: { 
      id: req.user.userId, 
      username: req.user.username, 
      role: req.user.role 
    } 
  });
});
