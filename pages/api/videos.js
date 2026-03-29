import { getPaginatedVideos } from '../../lib/domain/videos.js';
import { z } from 'zod';

/**
 * Handles GET requests to fetch paginated and published video data.
 */
async function handleGet(req, res) {
  try {
    // Validate and sanitize input parameters with Zod for robustness.
    const querySchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().default(10),
      search: z.string().optional(),
    });

    const validation = querySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Parâmetros inválidos.',
        errors: validation.error.flatten().fieldErrors,
      });
    }

    const { page, limit, search } = validation.data;

    // Set a caching policy for the response.
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

    // Fetch data using the domain function, ensuring only published videos are returned.
    const result = await getPaginatedVideos(page, limit, search, true);

    // Return data in a standardized and structured format.
    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('API Error fetching videos:', error);
    // Standardized error response.
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor ao buscar vídeos.',
    });
  }
}

/**
 * Main handler for the /api/videos route.
 * Dispatches requests to the appropriate method handler.
 */
export default async function handler(req, res) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}