#!/usr/bin/env node
import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

async function clearCache() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log('⚠️  Redis (Upstash) não configurado nas variáveis de ambiente.');
    console.log('ℹ️  Se você estiver usando cache em memória (local), reinicie o servidor para limpar o cache.');
    return;
  }

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  console.log('🧹 Limpando cache do Redis...');
  await redis.flushdb();
  console.log('✅ Cache limpo com sucesso!');
}

try {
  await clearCache();
  process.exit(0);
} catch (error) {
  console.error('❌ Erro ao limpar cache:', error.message);
  process.exit(1);
}