/**
 * @fileoverview API de Músicas - Versão Refatorada
 * 
 * Demonstração do uso do API Response Standardizer.
 * Endpoints para listar músicas publicadas com suporte a busca.
 * 
 * @module pages/api/musicas
 * @author API Standardizer Team
 * @version 2.0.0
 */

import { z } from 'zod';
import { getPublishedMusicas } from '../../lib/musicas.js';
import { success, handleError } from '../../lib/api/response.js';
import { validateQuery, createPaginationSchema, createSearchSchema } from '../../lib/api/validate.js';
import { composeMiddleware, withMethod, withRateLimit, withCors, withErrorHandler, withCache } from '../../lib/api/middleware.js';

// Schema de validação para query parameters
const musicasQuerySchema = z.object({
  ...createSearchSchema({ minLength: 2, maxLength: 100 }).shape,
});

/**
 * Handler principal da API de músicas
 * @param {import('http').IncomingMessage} req - Requisição HTTP
 * @param {import('http').ServerResponse} res - Resposta HTTP
 */
async function handler(req, res) {
  const { search } = req.query;

  try {
    // Busca músicas publicadas (com ou sem termo de busca)
    const musicas = await getPublishedMusicas(search);

    // Retorna resposta padronizada
    return success(res, musicas, {
      count: musicas.length,
      search: search || null,
    });

  } catch (error) {
    console.error('Error fetching musicas:', error);
    throw error; // Será capturado pelo withErrorHandler
  }
}

/**
 * Exporta handler com middlewares compostos
 * 
 * Ordem de execução (de fora para dentro):
 * 1. withErrorHandler - Captura erros
 * 2. withCache - Adiciona headers de cache
 * 3. withRateLimit - Rate limiting (100 req/15min)
 * 4. withCors - CORS headers
 * 5. withMethod - Só permite GET
 * 6. validateQuery - Valida query parameters
 * 7. handler - Lógica principal
 */
export default composeMiddleware(
  withErrorHandler({ includeStack: process.env.NODE_ENV === 'development' }),
  withCache(60), // Cache de 1 minuto para GET
  withRateLimit({ maxRequests: 100, windowMs: 15 * 60 * 1000 }),
  withCors({ origins: ['*'] }),
  withMethod(['GET']),
  validateQuery(musicasQuerySchema)
)(handler);

/**
 * Configuração do Next.js
 * Desabilita body parser pois GET não tem body
 */
export const config = {
  api: {
    bodyParser: false,
  },
};
