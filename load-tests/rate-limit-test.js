import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { BASE_URL } from './helpers/config.js';
import { getProfile } from './helpers/profiles.js';
import { generateReport } from './helpers/report.js';

// Métrica personalizada para contar quantas vezes o Rate Limit foi acionado
const RateLimitHits = new Counter('rate_limit_hits');

export const options = getProfile('rateLimit');

export default function () {
  const payload = JSON.stringify({
    username: `user_test_${Math.random()}`,
    password: `senha_aleatoria_${Math.random()}`,
  });

  // Adiciona X-Forwarded-For para simular um IP externo e evitar whitelist de localhost
  const params = { 
    headers: { 
      'Content-Type': 'application/json',
      'X-Forwarded-For': '203.0.113.1',
      'X-Real-IP': '203.0.113.1',
      'CF-Connecting-IP': '203.0.113.1',
      'True-Client-IP': '203.0.113.1'
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

  // Nota: intencionalmente sem sleep para maximizar a taxa de requisições (brute force real)
}

export function handleSummary(data) {
  const hits = data.metrics.rate_limit_hits ? data.metrics.rate_limit_hits.values.count : 0;
  if (hits === 0) {
    console.log('\n⚠️  AVISO: O Rate Limit NÃO foi acionado durante o teste. Verifique se o Redis está configurado corretamente no servidor.\n');
  }

  return generateReport(data, 'rate_limit_test');
}