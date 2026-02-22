import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  // Teste funcional de validação
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'], // 100% das validações devem passar
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const USERNAME = __ENV.ADMIN_USERNAME || 'admin';
const PASSWORD = __ENV.ADMIN_PASSWORD || '123456';

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  if (loginRes.status !== 200) {
    throw new Error(`Login falhou: ${loginRes.status} ${loginRes.body}`);
  }

  return { token: loginRes.json('data.token') };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // --- Cenário 1: URL Válida do YouTube ---
  const validPayload = JSON.stringify({
    titulo: 'Vídeo Válido K6',
    url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    publicado: false
  });

  const resValid = http.post(`${BASE_URL}/api/v1/videos`, validPayload, { headers });
  
  check(resValid, {
    'URL Válida: status é 201': (r) => r.status === 201,
    'URL Válida: retorna ID': (r) => r.json('data.id') !== undefined,
  });

  sleep(0.5);

  // --- Cenário 2: URL Inválida (Outro domínio) ---
  const invalidDomainPayload = JSON.stringify({
    titulo: 'Vídeo Domínio Inválido',
    url_youtube: 'https://vimeo.com/123456789',
    publicado: false
  });

  const resInvalidDomain = http.post(`${BASE_URL}/api/v1/videos`, invalidDomainPayload, { headers });

  check(resInvalidDomain, {
    'Domínio Inválido: status é 400': (r) => r.status === 400,
    'Domínio Inválido: mensagem de erro': (r) => JSON.stringify(r.body).includes('YouTube'),
  });

  sleep(0.5);

  // --- Cenário 3: URL Malformada ---
  const malformedPayload = JSON.stringify({
    titulo: 'Vídeo URL Quebrada',
    url_youtube: 'youtube.com/watch?v=', // Falta protocolo e ID
    publicado: false
  });

  const resMalformed = http.post(`${BASE_URL}/api/v1/videos`, malformedPayload, { headers });

  check(resMalformed, {
    'URL Malformada: status é 400': (r) => r.status === 400,
  });
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/video_validation_test.json': JSON.stringify(data, null, 4),
  };
}