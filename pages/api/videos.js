import { getPublicPaginatedVideos } from '../../lib/domain/videos.js';
import { getOrSetCache, checkRateLimit } from '../../lib/cache.js';

/**
 * API route handler for fetching public videos.
 * GET /api/videos?page=1&limit=10
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const parsedPage = parseInt(req.query.page);
    const page = !isNaN(parsedPage) ? parsedPage : 1;

    const parsedLimit = parseInt(req.query.limit);
    const limit = !isNaN(parsedLimit) ? parsedLimit : 10;

    const search = req.query.search || '';

    if (page < 1 || limit < 1 || limit > 100) {
      return res.status(400).json({ error: 'Invalid pagination parameters' });
    }

    const cacheKey = `public_videos:${page}:${limit}${search ? `:${search}` : ''}`;
    const result = await getOrSetCache(cacheKey, async () => {
      const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
      const isRateLimited = await checkRateLimit(ip, 'api:public:videos');
      if (isRateLimited) {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
      // Use the new, secure function for public data.
      return await getPublicPaginatedVideos(page, limit, search);
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error.message === 'RATE_LIMIT_EXCEEDED') {
      return res.status(429).json({ error: 'Too many requests' });
    }
    console.error('Error fetching public videos:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}