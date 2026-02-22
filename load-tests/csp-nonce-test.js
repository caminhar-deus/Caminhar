import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  // Teste funcional de segurança
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'], // 100% das verificações devem passar
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // --- Requisição 1 ---
  const res1 = http.get(BASE_URL);
  
  // Tenta obter o header (case-insensitive)
  const csp1 = res1.headers['Content-Security-Policy'] || res1.headers['content-security-policy'];
  
  // Extrai o nonce usando Regex: procura por 'nonce-ALGUMACOISA'
  const nonceMatch1 = csp1 ? csp1.match(/'nonce-([^']+)'/) : null;
  const nonce1 = nonceMatch1 ? nonceMatch1[1] : null;

  check(res1, {
    'Req 1: Status é 200': (r) => r.status === 200,
    'Req 1: Header CSP existe': () => !!csp1,
    'Req 1: Nonce encontrado no CSP': () => !!nonce1,
    'Req 1: Nonce tem formato Base64 válido': () => nonce1 && /^[A-Za-z0-9+/=]+$/.test(nonce1),
  });

  if (nonce1) console.log(`🔒 Nonce 1 detectado: ${nonce1.substring(0, 10)}...`);

  sleep(0.5);

  // --- Requisição 2 ---
  const res2 = http.get(BASE_URL);
  const csp2 = res2.headers['Content-Security-Policy'] || res2.headers['content-security-policy'];
  
  const nonceMatch2 = csp2 ? csp2.match(/'nonce-([^']+)'/) : null;
  const nonce2 = nonceMatch2 ? nonceMatch2[1] : null;

  check(res2, {
    'Req 2: Status é 200': (r) => r.status === 200,
    'Req 2: Header CSP existe': () => !!csp2,
    'Req 2: Nonce encontrado': () => !!nonce2,
  });

  if (nonce2) console.log(`🔒 Nonce 2 detectado: ${nonce2.substring(0, 10)}...`);

  // --- Validação de Segurança Crítica ---
  check(null, {
    '🛡️ SEGURANÇA: Nonce é dinâmico (diferente a cada requisição)': () => nonce1 !== nonce2 && nonce1 !== null && nonce2 !== null,
  });
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/csp_nonce_test.json': JSON.stringify(data, null, 4),
  };
}