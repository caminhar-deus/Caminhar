import { Redis } from '@upstash/redis';
import { createAdminHandler } from '../../../lib/api/adminCrudHandler.js';
import { z } from 'zod';
import { logger } from '../../../lib/logger.js';

const ipSchema = z.object({
  ip: z.string().min(1, 'IP é obrigatório'),
});

// Inicializa o Redis (mesma configuração do middleware)
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const MAX_ATTEMPTS = 5;

/**
 * Executa uma operação Redis com tratamento de erro.
 * Apenas erros de rate limit do Upstash são tratados com fallback silencioso.
 * Erros graves (timeout, conexão, crash) são propagados para o handler superior.
 */
async function redisSafe(operation, fallback = null) {
  if (!redis) return fallback;
  try {
    return await operation();
  } catch (error) {
    const message = error.message || '';
    if (message.includes('max requests limit exceeded')) {
      logger.warn('RateLimit', `Limite de requisições Redis excedido. Operação ignorada: ${message}`);
      return fallback;
    }
    if (message.includes('max commands') || message.includes('rate limit')) {
      logger.warn('RateLimit', 'Rate limit do Redis atingido. Operação ignorada.');
      return fallback;
    }
    // Erros graves são propagados para o catch do createAdminHandler ou dos handlers
    throw error;
  }
}

// Helper para registrar logs de auditoria (com try/catch interno)
async function logAudit(action, ip, user) {
  if (!redis) return;
  const entry = {
    action,
    ip,
    user: user || 'Sistema',
    timestamp: new Date().toISOString()
  };
  // Adiciona ao início da lista e mantém apenas os últimos 100 registros
  await redisSafe(() => redis.lpush('rate_limit:audit_logs', JSON.stringify(entry)));
  await redisSafe(() => redis.ltrim('rate_limit:audit_logs', 0, 99));
}

async function handleGet(req, res) {
  if (!redis) {
    return res.status(501).json({ 
      message: 'O gerenciamento de Rate Limit requer Redis configurado. O modo em memória não pode ser gerenciado remotamente.' 
    });
  }

  const { type } = req.query;

  // Retornar IP atual do requisitante
  if (type === 'current_ip') {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
    return res.status(200).json({ ip: ip === '::1' ? '127.0.0.1' : ip });
  }

  // Listar Whitelist
  if (type === 'whitelist') {
    const whitelist = await redisSafe(() => redis.smembers('rate_limit:whitelist'), []);
    return res.status(200).json(Array.isArray(whitelist) ? whitelist : []);
  }

  // Listar Logs de Auditoria
  if (type === 'audit') {
    const rawLogs = await redisSafe(() => redis.lrange('rate_limit:audit_logs', 0, -1), []);
    
    let logs = [];
    try {
      logs = rawLogs.map(JSON.parse);
    } catch {
      logs = [];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const { startDate, endDate, search } = req.query;

    // Filtra por data se solicitado
    if (startDate || endDate || search) {
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
      const searchLower = search ? search.toLowerCase() : '';

      logs = logs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        const matchesDate = logTime >= start && logTime <= end;
        const matchesSearch = !search || 
          (log.ip && log.ip.toLowerCase().includes(searchLower)) || 
          (log.user && log.user.toLowerCase().includes(searchLower));
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
    const rawLogs = await redisSafe(() => redis.lrange('rate_limit:audit_logs', 0, -1), []);
    
    let logs = [];
    try {
      logs = rawLogs.map(JSON.parse);
    } catch {
      logs = [];
    }

    const { startDate, endDate, search } = req.query;
    if (startDate || endDate || search) {
      const start = startDate ? new Date(startDate).getTime() : 0;
      const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : Infinity;
      const searchLower = search ? search.toLowerCase() : '';

      logs = logs.filter(log => {
        const logTime = new Date(log.timestamp).getTime();
        const matchesDate = logTime >= start && logTime <= end;
        const matchesSearch = !search || 
          (log.ip && log.ip.toLowerCase().includes(searchLower)) || 
          (log.user && log.user.toLowerCase().includes(searchLower));
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
  const keys = await redisSafe(() => redis.keys('rate_limit:*'), []);

  if (!Array.isArray(keys) || keys.length === 0) {
    return res.status(200).json([]);
  }

  // Pipeline para buscar valores e TTLs em uma única requisição (performance)
  const pipeline = redis.pipeline();
  keys.forEach(key => {
    pipeline.get(key);
    pipeline.ttl(key);
  });
  
  const results = await redisSafe(() => pipeline.exec(), []);
  
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

async function handlePost(req, res) {
  if (!redis) {
    return res.status(501).json({ 
      message: 'O gerenciamento de Rate Limit requer Redis configurado. O modo em memória não pode ser gerenciado remotamente.' 
    });
  }

  const validation = ipSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      message: 'IP é obrigatório',
      errors: validation.error.flatten().fieldErrors,
    });
  }

  const { ip } = validation.data;

  try {
    const saddResult = await redisSafe(() => redis.sadd('rate_limit:whitelist', ip));
    if (saddResult === null) {
      return res.status(503).json({ message: 'Redis temporariamente indisponível (limite de requisições excedido). Tente novamente mais tarde.' });
    }
    await redisSafe(() => redis.del(`rate_limit:${ip}`)); // Remove dos bloqueados se existir
    await logAudit('Adicionado à Whitelist', ip, req.user?.username);
    return res.status(200).json({ message: `IP ${ip} adicionado à whitelist com sucesso` });
  } catch (error) {
    logger.error('RateLimit', 'Erro ao adicionar à whitelist:', error.message);
    return res.status(503).json({ message: 'Erro ao processar operação. Redis temporariamente indisponível.' });
  }
}

async function handleDelete(req, res) {
  if (!redis) {
    return res.status(501).json({ 
      message: 'O gerenciamento de Rate Limit requer Redis configurado. O modo em memória não pode ser gerenciado remotamente.' 
    });
  }

  const { ip, type } = req.query;
  if (!ip) return res.status(400).json({ message: 'IP é obrigatório' });

  try {
    if (type === 'whitelist') {
      const sremResult = await redisSafe(() => redis.srem('rate_limit:whitelist', ip));
      if (sremResult === null) {
        return res.status(503).json({ message: 'Redis temporariamente indisponível (limite de requisições excedido). Tente novamente mais tarde.' });
      }
      await logAudit('Removido da Whitelist', ip, req.user?.username);
      return res.status(200).json({ message: `IP ${ip} removido da whitelist` });
    }

    const delResult = await redisSafe(() => redis.del(`rate_limit:${ip}`));
    if (delResult === null) {
      return res.status(503).json({ message: 'Redis temporariamente indisponível (limite de requisições excedido). Tente novamente mais tarde.' });
    }
    await logAudit('Desbloqueio Manual', ip, req.user?.username);
    return res.status(200).json({ message: `IP ${ip} desbloqueado com sucesso` });
  } catch (error) {
    logger.error('RateLimit', 'Erro ao processar deleção:', error.message);
    return res.status(503).json({ message: 'Erro ao processar operação. Redis temporariamente indisponível.' });
  }
}

export default createAdminHandler({
  name: 'RateLimit',
  allowedMethods: ['GET', 'POST', 'DELETE'],
  handlers: {
    GET: handleGet,
    POST: handlePost,
    DELETE: handleDelete,
  },
});