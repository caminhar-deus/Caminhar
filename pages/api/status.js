import { query } from '../../lib/infra/db';
import { getAuthToken, verifyToken } from '../../lib/auth/auth';

/**
 * Endpoint de diagnóstico e health check do sistema.
 * Substitui o antigo /api/v1/status.
 *
 * Contrato (na ordem exata de verificação):
 * 1. Método diferente de GET → 405.
 * 2. GET /api/status?mode=health — PÚBLICO (sem token, sem permissão);
 *    retorna apenas { status: 'ok' } (compatível com health check de infra/k6).
 * 3. Sem token válido → 401 (sem token: 'Não autenticado';
 *    com token inválido/expirado: 'Token inválido ou expirado').
 * 4. Com token válido → diagnóstico completo (versão, DB, sistema).
 *    Esta rota NÃO exige permissão nem cargo — é diagnóstico, não painel.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Método não permitido',
    });
  }

  // Modo health check simples — permanece público: é o endpoint consumido
  // pelo health check de infraestrutura e do k6, e não expõe diagnóstico.
  if (req.query.mode === 'health') {
    return res.status(200).json({ status: 'ok' });
  }

  // Modo diagnóstico completo — exige token válido. Usa getAuthToken +
  // verifyToken (mesmo par de pages/api/products.js), e não withAuth, que
  // protegeria a rota inteira inclusive o modo health acima.
  const token = getAuthToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Não autenticado' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Token inválido ou expirado' });
  }

  // Modo diagnóstico completo
  const status = {
    success: true,
    data: {
      api: {
        version: '1.0',
        status: 'operational',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      },
      database: {
        status: 'unknown',
        details: {
          type: 'postgres',
          connected: false
        }
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
        // Métricas de memória para monitoramento via k6 (P4)
        rss: process.memoryUsage().rss,
        heapTotal: process.memoryUsage().heapTotal,
        heapUsed: process.memoryUsage().heapUsed
      }
    },
    message: 'API está operacional',
    timestamp: new Date().toISOString()
  };

  try {
    await query('SELECT 1'); // Teste simples de conexão

    status.data.database.status = 'connected';
    status.data.database.details.connected = true;
  } catch {
    // A mensagem crua do driver pode expor host, porta e usuário do Postgres.
    // Aqui vai uma mensagem fixa e genérica; o diagnóstico original continua
    // registrado no servidor — a camada de banco (lib/infra/db.js) já loga o
    // erro cru no logger.error. Status HTTP 200 e status 'error' permanecem:
    // é um health check.
    status.data.database.status = 'error';
    status.data.database.details.error = 'Falha ao conectar ao banco de dados';
  }

  res.status(200).json(status);
}
