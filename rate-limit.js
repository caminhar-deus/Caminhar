import { withAuth } from '../../../lib/auth';
import { Redis } from '@upstash/redis';

// Inicializa o Redis (mesma configuração do middleware)
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const MAX_ATTEMPTS = 5;

// Helper para registrar logs de auditoria
async function logAudit(action, ip, user) {
  if (!redis) return;
  const entry = {
    action,
    ip,
    user: user || 'Sistema',
    timestamp: new Date().toISOString()
  };
  // Adiciona ao início da lista e mantém apenas os últimos 100 registros
  await redis.lpush('rate_limit:audit_logs', JSON.stringify(entry));
  await redis.ltrim('rate_limit:audit_logs', 0, 99);
}

async function handler(req, res) {
  if (!redis) {
    return res.status(501).json({ 
      message: 'O gerenciamento de Rate Limit requer Redis configurado. O modo em memória não pode ser gerenciado remotamente.' 
    });
  }

  try {
    // LISTAR IPs BLOQUEADOS
    if (req.method === 'GET') {
      const { type } = req.query;

      // Retornar IP atual do requisitante
      if (type === 'current_ip') {
        const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
        return res.status(200).json({ ip: ip === '::1' ? '127.0.0.1' : ip });
      }

      // Listar Whitelist
      if (type === 'whitelist') {
        const whitelist = await redis.smembers('rate_limit:whitelist');
        return res.status(200).json(whitelist);
      }

      // Listar Logs de Auditoria
      if (type === 'audit') {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const { startDate, endDate, search } = req.query;

        // Busca todos os logs para filtrar em memória (limitado a 100 pelo ltrim)
        const rawLogs = await redis.lrange('rate_limit:audit_logs', 0, -1);
        let logs = rawLogs.map(JSON.parse);

        // Filtra por data se solicitado
        if (startDate || endDate || search) {
          const start = startDate ? new Date(startDate).getTime() : 0;
          const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
          const searchLower = search ? search.toLowerCase() : '';

          logs = logs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            const matchesDate = logTime >= start && logTime <= end;
            const matchesSearch = !search || (log.ip && log.ip.toLowerCase().includes(searchLower)) || (log.user && log.user.toLowerCase().includes(searchLower));
            return matchesDate && matchesSearch;
          });
        }

        const total = logs.length;
        const startIndex = (page - 1) * limit;
        const paginatedLogs = logs.slice(startIndex, startIndex + limit);

        return res.status(200).json({
          logs: paginatedLogs,
          pagination: {
            total,
            page,
            totalPages: Math.ceil(total / limit)
          }
        });
      }

      // Exportar Logs como CSV
      if (type === 'export_csv') {
        const { startDate, endDate, search } = req.query;
        const rawLogs = await redis.lrange('rate_limit:audit_logs', 0, -1);
        let logs = rawLogs.map(JSON.parse);

        if (startDate || endDate || search) {
          const start = startDate ? new Date(startDate).getTime() : 0;
          const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
          const searchLower = search ? search.toLowerCase() : '';

          logs = logs.filter(log => {
            const logTime = new Date(log.timestamp).getTime();
            const matchesDate = logTime >= start && logTime <= end;
            const matchesSearch = !search || (log.ip && log.ip.toLowerCase().includes(searchLower)) || (log.user && log.user.toLowerCase().includes(searchLower));
            return matchesDate && matchesSearch;
          });
        }
        
        const header = 'Data/Hora,Ação,IP,Usuário\n';
        const rows = logs.map(log => {
          const date = new Date(log.timestamp).toLocaleString('pt-BR');
          return `"${date}","${log.action}","${log.ip}","${log.user}"`;
        }).join('\n');

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
        return res.status(200).send(header + rows);
      }

      // Busca todas as chaves de rate limit
      const keys = await redis.keys('rate_limit:*');
      
      if (keys.length === 0) {
        return res.status(200).json([]);
      }

      // Pipeline para buscar valores e TTLs em uma única requisição (performance)
      const pipeline = redis.pipeline();
      keys.forEach(key => {
        pipeline.get(key);
        pipeline.ttl(key);
      });
      
      const results = await pipeline.exec();
      
      const blockedIps = [];
      
      // Processa os resultados (cada chave gera 2 respostas: valor e ttl)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const count = results[i * 2]; // Valor do contador
        const ttl = results[(i * 2) + 1]; // Tempo restante em segundos
        
        // Filtra apenas quem excedeu o limite
        if (count > MAX_ATTEMPTS) {
          blockedIps.push({
            ip: key.replace('rate_limit:', ''),
            count,
            ttl: Math.ceil(ttl / 60) // Converte para minutos
          });
        }
      }

      return res.status(200).json(blockedIps);
    }

    // ADICIONAR À WHITELIST (POST)
    if (req.method === 'POST') {
      const { ip } = req.body;
      if (!ip) return res.status(400).json({ message: 'IP é obrigatório' });

      await redis.sadd('rate_limit:whitelist', ip);
      await redis.del(`rate_limit:${ip}`); // Remove dos bloqueados se existir
      
      await logAudit('Adicionado à Whitelist', ip, req.user?.username);
      
      return res.status(200).json({ message: `IP ${ip} adicionado à whitelist com sucesso` });
    }

    // DESBLOQUEAR IP (DELETE)
    if (req.method === 'DELETE') {
      const { ip, type } = req.query;
      if (!ip) return res.status(400).json({ message: 'IP é obrigatório' });

      if (type === 'whitelist') {
        await redis.srem('rate_limit:whitelist', ip);
        await logAudit('Removido da Whitelist', ip, req.user?.username);
        return res.status(200).json({ message: `IP ${ip} removido da whitelist` });
      }

      await redis.del(`rate_limit:${ip}`);
      await logAudit('Desbloqueio Manual', ip, req.user?.username);
      return res.status(200).json({ message: `IP ${ip} desbloqueado com sucesso` });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);

  } catch (error) {
    console.error('Rate Limit API Error:', error);
    return res.status(500).json({ message: 'Erro interno ao consultar Redis' });
  }
}

export default withAuth(handler);