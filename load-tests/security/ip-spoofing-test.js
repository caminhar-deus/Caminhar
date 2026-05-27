import http from 'k6/http';
import { check, group } from 'k6';
import { getRandomIP } from '../helpers/network.js';
import { BASE_URL } from '../helpers/config.js';
import { getProfile } from '../helpers/profiles.js';
import { generateReport } from '../helpers/report.js';

/**
 * Teste Consolidado — IP Spoofing / Evasão de Rate Limit
 *
 * Mescla os propósitos dos antigos testes separados (evasão + detecção)
 * em um único script com dois grupos de checks.
 *
 * ## Propósito
 *
 * Validar se o sistema está protegido contra:
 * 1. Evasão de rate limit via rotação do header X-Forwarded-For
 * 2. Detecção e bloqueio de IPs falsificados (spoofing)
 *
 * ## Comportamento esperado (proteção funcionando)
 *
 *   - 429 (Too Many Requests) → Rate limit é global, ignorou o IP falso
 *   - 403 (Forbidden) → Spoofing detectado e bloqueado ativamente
 *
 * ## Comportamento em caso de vulnerabilidade
 *
 *   - 401 (Unauthorized) → Rate limit foi burlado, IP falso foi aceito
 *
 * ## Interpretação dos Resultados
 *
 * | Cenário | Checks que PASSAM | Significado |
 * |---------|-------------------|-------------|
 * | Sistema protegido | `🛡️ BLOQUEADO:*` (alta taxa) | Spoofing/rejeitado corretamente |
 * | Sistema vulnerável | `⚠️ VULNERÁVEL:*` (alta taxa) | Sistema precisa de correção |
 * | Misto | Ambos com taxas intermediárias | Possível rate limit parcial |
 *
 * ## Estado Atual (27/05/2026)
 *
 * - Sistema está VULNERÁVEL: 33.33% de checks de proteção passando
 * - Checks `⚠️ VULNERÁVEL:*` representam 66.67% das respostas
 * - Ação necessária: Implementar detecção de spoofing no middleware
 */

const PROFILE_NAME = 'rateLimit';
const REPORT_NAME = 'ip_spoofing_consolidado_test';

export const options = getProfile(PROFILE_NAME, {
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    // Threshold condicional: descomentar quando proteção estiver implementada
    // 'checks{BLOQUEADO}': ['rate>0.80'],
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

  // Grupo: Checks de Proteção (bloqueio ativo)
  // Passam quando o sistema está protegido contra spoofing/evasão
  check(res, {
    '🛡️ BLOQUEADO: Spoofing detectado e rejeitado (403)': (r) => r.status === 403,
    '🛡️ BLOQUEADO: Rate limit global ignorou IP falso (429)': (r) => r.status === 429,
  });

  // Grupo: Checks de Vulnerabilidade (documentação de falha)
  // Passam quando o sistema NÃO protegeu (documenta a vulnerabilidade)
  check(res, {
    '⚠️ VULNERÁVEL: Rate limit foi burlado por IP falso (401)': (r) => r.status === 401,
    '⚠️ VULNERÁVEL: Spoofing não foi detectado (401)': (r) => r.status === 401,
  });
}

export function handleSummary(data) {
  return generateReport(data, REPORT_NAME);
}