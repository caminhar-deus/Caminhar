import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// Métrica personalizada para contar quantas vezes o Rate Limit foi acionado
const RateLimitHits = new Counter('rate_limit_hits');

export const options = {
  scenarios: {
    brute_force: {
      executor: 'per-vu-iterations',
      vus: 1, // Usamos apenas 1 VU para garantir que todas as requisições venham do mesmo "IP" (virtualmente)
      iterations: 20, // Tenta 20 vezes rapidamente (se o limite for 5 ou 10, isso deve estourar)
      maxDuration: '15s',
    },
  },
  thresholds: {
    // O teste só é considerado um SUCESSO se o servidor bloquear (retornar 429) pelo menos uma vez.
    // Se count for 0, significa que o Rate Limit NÃO funcionou e o teste falha.
    'rate_limit_hits': ['count>0'], 
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const payload = JSON.stringify({
    username: 'admin',
    password: `senha_aleatoria_${Math.random()}`, // Senha errada para não logar de verdade
  });

  const params = { headers: { 'Content-Type': 'application/json' } };

  // Dispara contra a rota de login, que geralmente é a mais protegida
  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, params);

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

  sleep(0.1); // Pausa muito curta (100ms) para simular ataque rápido
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/rate_limit_test.json': JSON.stringify(data, null, 4),
  };
}