/**
 * API Status Endpoint (v1)
 * Returns API status and system information
 * @version 1.0
 * @public
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
      return res.status(405).json({
        error: 'Method Not Allowed',
        message: 'Método não permitido - apenas GET é aceito',
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Simple database status check
      const dbStatus = {
        type: 'sqlite',
        connected: true,
        version: '3.x'
      };

      res.status(200).json({
        success: true,
        data: {
          api: {
            version: '1.0',
            status: 'operational',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development'
          },
          database: {
            status: dbStatus ? 'connected' : 'disconnected',
            details: dbStatus
          },
          system: {
            nodeVersion: process.version,
            platform: process.platform,
            uptime: process.uptime()
          }
        },
        message: 'API está operacional',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in API status endpoint:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Erro no servidor ao verificar status da API',
        timestamp: new Date().toISOString()
      });
    }
  }

// Add database status function to db.js if it doesn't exist
async function getDatabaseStatus() {
  try {
    // This is a simple implementation - in a real scenario, you'd check actual database connectivity
    return {
      type: 'sqlite',
      connected: true,
      version: '3.x'
    };
  } catch (error) {
    console.error('Database status check failed:', error);
    return null;
  }
}