import { authenticate, generateToken } from '../../../../lib/auth';

/**
 * External Authentication Login Endpoint (v1)
 * Authenticates users and returns JWT token for API access
 * @version 1.0
 * @public
 */
export default async function handler(req, res) {
      if (req.method !== 'POST') {
        return res.status(405).json({
          error: 'Method Not Allowed',
          message: 'Método não permitido - apenas POST é aceito',
          timestamp: new Date().toISOString()
        });
      }

      try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
          return res.status(400).json({
            error: 'Bad Request',
            message: 'Usuário e senha são obrigatórios',
            timestamp: new Date().toISOString()
          });
        }

        // Authenticate user
        const user = await authenticate(username, password);
        if (!user) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Credenciais inválidas',
            timestamp: new Date().toISOString()
          });
        }

        // Generate JWT token
        const token = generateToken(user);

        // Return token in response body (for external API consumption)
        res.status(200).json({
          success: true,
          data: {
            token,
            token_type: 'Bearer',
            expires_in: 3600, // 1 hour in seconds
            user: {
              userId: user.id,
              username: user.username,
              role: user.role
            }
          },
          message: 'Autenticação bem-sucedida',
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('Error in external auth login:', error);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Erro no servidor durante autenticação',
          timestamp: new Date().toISOString()
        });
      }
    }
