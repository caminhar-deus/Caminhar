import { loadEnv, cleanTableByPattern } from '../utils/cleanup.js';

loadEnv();
cleanTableByPattern({
  table: 'videos',
  column: 'titulo',
  patterns: ['K6%', 'Test Video%', 'Load Test%', 'Performance Test%', 'Video de Teste%'],
  showDeleted: true,
});