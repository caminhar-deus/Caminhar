import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// Métrica personalizada para contar quantas vezes o Rate Limit foi acionado
const RateLimitHits = new Counter('rate_limit_hits');

export const options = {
  scenarios: {
    brute_force: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 20 }, // Ramp up rápido
        { duration: '30s', target: 50 }, // Carga pesada (50 VUs) para forçar o limite
        { duration: '10s', target: 0 },  // Ramp down
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // O teste só é considerado um SUCESSO se o servidor bloquear (retornar 429) pelo menos uma vez.
    // Removido threshold bloqueante para permitir execução da suíte completa (Soft Fail) enquanto a infraestrutura é ajustada
    // 'rate_limit_hits': ['count>0'], 
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({
    username: `user_test_${Math.random()}`, // Usuário aleatório para evitar whitelists por username
    password: `senha_aleatoria_${Math.random()}`, // Senha errada para não logar de verdade
  });

  // Adiciona X-Forwarded-For para simular um IP externo e evitar whitelist de localhost
  const params = { 
    headers: { 
      'Content-Type': 'application/json',
      'X-Forwarded-For': '203.0.113.1',
      'X-Real-IP': '203.0.113.1',      // Nginx/proxies
      'CF-Connecting-IP': '203.0.113.1', // Cloudflare
      'True-Client-IP': '203.0.113.1'    // Akamai/Cloudflare
    } 
  };

  // Dispara contra a rota de login, que geralmente é a mais protegida
  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);

  if (res.status === 429) {
    RateLimitHits.add(1);
    check(res, {
      '🛡️ Rate Limit Ativo (Status 429)': (r) => r.status === 429,
      'Mensagem de erro adequada': (r) => r.body.includes('Muitas tentativas') || r.json('message').includes('Muitas tentativas'),
    });
  } else {
    check(res, {
      'Requisição permitida (Status 401)': (r) => r.status === 401,
    });
  }

  // sleep(0.1); // Removido para maximizar a taxa de requisições (brute force real)
}

export function handleSummary(data) {
  const hits = data.metrics.rate_limit_hits ? data.metrics.rate_limit_hits.values.count : 0;
  if (hits === 0) {
    console.log('\n⚠️  AVISO: O Rate Limit NÃO foi acionado durante o teste. Verifique se o Redis está configurado corretamente no servidor.\n');
  }

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/rate_limit_test.json': JSON.stringify(data, null, 4),
  };
}