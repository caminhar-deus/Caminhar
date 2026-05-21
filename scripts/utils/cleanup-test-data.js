#!/usr/bin/env node
import { loadEnv, cleanTableByPattern } from './cleanup.js';

loadEnv();
cleanTableByPattern({ table: 'posts', column: 'slug', patterns: ['post-carga-%'] });