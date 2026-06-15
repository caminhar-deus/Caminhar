#!/usr/bin/env node

/**
 * Script de cleanup para desbloquear IPs que foram bloqueados pelos testes
 * de segurança (rate limit, IP spoofing).
 *
 * Remove as chaves do Redis usadas durante os testes para que o acesso
 * do usuário não fique bloqueado após a execução dos testes.
 *
 * Uso: node scripts/clear-test-auth-locks.js
 */

import { getRedisInstance } from '../lib/redis.js';

// IPs utilizados pelos testes de segurança (rate-limit-test.js, ip-spoofing-test.js)
const TEST_IPS = [
  '203.0.113.1',        // IP fixo usado pelo rate-limit-test.js
  '127.0.0.1',          // localhost (pode ter sido bloqueado)
  '::1',                // localhost IPv6
];

async function clearTestAuthLocks() {
  console.log('🔓 Limpando bloqueios de autenticação dos testes de segurança...\n');

  let clearedCount = 0;

  // --- 1. Limpa bloqueios no Redis (rate-limit-proxy.js) ---
  const redis = getRedisInstance();
  if (redis) {
    try {
      for (const ip of TEST_IPS) {
        const key = `rate_limit:${ip}`;
        const blockCountKey = `rate_limit:block_count:${ip}`;

        const exists = await redis.exists(key);
        if (exists) {
          await redis.del(key);
          console.log(`  ✅ Chave removida: ${key}`);
          clearedCount++;
        }

        const blockExists = await redis.exists(blockCountKey);
        if (blockExists) {
          await redis.del(blockCountKey);
          console.log(`  ✅ Chave removida: ${blockCountKey}`);
          clearedCount++;
        }
      }

      // Também limpa qualquer chave de rate limit do Redis usada pelo lib/cache.js
      const cacheKeys = await redis.keys('api:auth:login:*');
      if (cacheKeys.length > 0) {
        for (const key of cacheKeys) {
          await redis.del(key);
          console.log(`  ✅ Cache key removida: ${key}`);
          clearedCount++;
        }
      }

      console.log(`\n  📊 Total de chaves limpas no Redis: ${clearedCount}`);
    } catch (error) {
      console.error('  ❌ Erro ao limpar Redis:', error.message);
    }
  } else {
    console.log('  ℹ️  Redis não está configurado. Pulando limpeza no Redis.\n');
  }

  // --- 2. Limpa o Map em memória do rate-limit-proxy.js ---
  // (Não podemos acessar o Map diretamente, mas o Redis foi limpo acima)
  // O Map em memória será limpo automaticamente quando o servidor reiniciar
  // ou quando as janelas de tempo expirarem.

  console.log('\n  💡 Dica: Se ainda estiver com problemas, reinicie o servidor Next.js.');
  console.log('     O Map em memória do rate-limit-proxy.js será limpo.\n');

  if (clearedCount > 0) {
    console.log('🔓 Bloqueios de autenticação limpos com sucesso!\n');
  } else {
    console.log('ℹ️  Nenhum bloqueio encontrado para limpar.\n');
  }
}

clearTestAuthLocks().catch((err) => {
  console.error('❌ Erro ao executar cleanup:', err);
  process.exit(1);
});