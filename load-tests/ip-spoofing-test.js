import http from 'k6/http';
import { check } from 'k6';
import { getRandomIP } from './helpers/network.js';
import { BASE_URL } from './helpers/config.js';
import { getProfile } from './helpers/profiles.js';
import { generateReport } from './helpers/report.js';

/**
 * Teste de Vulnerabilidade — IP Spoofing / Evasão de Rate Limit (Opção A)
 *
 * Propósito: Verificar se o rate limit do sistema pode ser burlado
 * via rotação do header X-Forwarded-For.
 *
 * Comportamento esperado (proteção funcionando):
 *   - 429 (Too Many Requests) → Rate limit é global, ignorou o IP falso
 *
 * Comportamento em caso de vulnerabilidade:
 *   - 401 (Unauthorized) → Rate limit foi burlado, IP falso foi aceito
 */

const PROFILE_NAME = 'rateLimit';
const REPORT_NAME = 'ip_spoofing_evasao_test';

export const options = getProfile(PROFILE_NAME, {
  thresholds: {
    // Se recebermos 429, o rate limit global está protegendo
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.50'],
  },
});

export default function () {
  // Gera um IP único para esta iteração (tentativa de evadir rate limit)
  const virtualIP = getRandomIP();

  const payload = JSON.stringify({
    username: 'admin',
    password: 'wrong_password', // Senha errada intencionalmente
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // Tenta burlar o rate limit injetando IP falso no header padrão de proxy
      'X-Forwarded-For': virtualIP,
    },
  };

  const res = http.post(`${BASE_URL}/api/auth/login?response=body`, payload, params);

  // Opção A: Teste de Vulnerabilidade
  // - 429 = protegido (rate limit global ignorou IP falso)
  // - 401 = vulnerável (rate limit foi burlado)
  check(res, {
    '✅ Protegido: Rate limit global ignorou IP falso (429)': (r) => r.status === 429,
    '❌ Vulnerável: IP spoofing burlou rate limit (401)': (r) => r.status === 401,
  });
}

export function handleSummary(data) {
  return generateReport(data, REPORT_NAME);
}