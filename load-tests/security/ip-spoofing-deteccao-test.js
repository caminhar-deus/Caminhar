import http from 'k6/http';
import { check } from 'k6';
import { getRandomIP } from '../helpers/network.js';
import { BASE_URL } from '../helpers/config.js';
import { getProfile } from '../helpers/profiles.js';
import { generateReport } from '../helpers/report.js';

/**
 * Teste de Proteção — Detecção de IP Spoofing (Opção B)
 *
 * Propósito: Validar que o sistema detecta e rejeita ativamente
 * requisições com header X-Forwarded-For falsificado.
 *
 * Comportamento esperado (proteção funcionando):
 *   - 403 (Forbidden) ou 400 (Bad Request) → Spoofing detectado e bloqueado
 *
 * Comportamento em caso de falha de segurança:
 *   - 401 (Unauthorized) → Spoofing não foi detectado, requisição passou
 */

const PROFILE_NAME = 'rateLimit';
const REPORT_NAME = 'ip_spoofing_deteccao_test';

export const options = getProfile(PROFILE_NAME, {
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.50'],
  },
});

export default function () {
  // Gera um IP único para esta iteração
  const virtualIP = getRandomIP();

  const payload = JSON.stringify({
    username: 'admin',
    password: 'wrong_password',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Forwarded-For': virtualIP,
      // Headers adicionais frequentemente usados em spoofing
      'X-Real-IP': virtualIP,
      'CF-Connecting-IP': virtualIP,
    },
  };

  const res = http.post(`${BASE_URL}/api/auth/login?response=body`, payload, params);

  // Opção B: Teste de Detecção
  // - 403/400 = protegido (sistema detectou e bloqueou o spoofing)
  // - 429 = protegido (rate limit global se sobrepôs)
  // - 401 = vulnerável (spoofing não foi detectado)
  check(res, {
    '✅ Protegido: Spoofing foi detectado e bloqueado (403/400)': (r) => r.status === 403 || r.status === 400,
    '✅ Protegido: Rate limit global bloqueou (429)': (r) => r.status === 429,
    '❌ Vulnerável: Spoofing não foi detectado (401)': (r) => r.status === 401,
  });
}

export function handleSummary(data) {
  return generateReport(data, REPORT_NAME);
}