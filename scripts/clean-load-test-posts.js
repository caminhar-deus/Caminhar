import { loadEnv, cleanTableByPattern } from './utils/cleanup.js';

loadEnv();
cleanTableByPattern({ table: 'posts', column: 'slug', patterns: ['post-carga-%'] });