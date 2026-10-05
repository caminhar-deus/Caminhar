import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
import { getRandomIP } from '../helpers/network.js';
import { BASE_URL } from '../helpers/config.js';
import { getProfile } from '../helpers/profiles.js';
import { generateReport } from '../helpers/report.js';

/**
 * Teste Consolidado — Evasão de Rate Limit por rotação de X-Forwarded-For
 *
 * ## Propósito
 *
 * Simular o ataque clássico de bypass: o cliente escreve uma entrada
 * diferente de X-Forwarded-For a cada requisição para ganhar um bucket de
 * rate limit novo, enquanto o IP real permanece o mesmo.
 *
 * ## Topologia simulada (TRUST_PROXY=1 na CI)
 *
 * A cadeia enviada tem DUAS entradas:
 *
 *   X-Forwarded-For: <ip-falso-que-rotaciona>, <ip-real-constante>
 *
 * A última entrada é a que o proxy confiável acrescentou (o IP real do
 * cliente). A primeira é a que o cliente forjou. O app lê pela direita, então
 * todas as requisições caem no MESMO bucket.
 *
 * ## Interpretação dos Resultados
 *
 * | Cenário | Checks que PASSAM | Significado |
 * |---------|-------------------|-------------|
 * | Sistema protegido | `🛡️ BLOQUEADO: Rate limit por IP real (429)` (alta taxa) | Rotação do IP falso não evade o limite |
 * | Sistema vulnerável | `⚠️ VULNERÁVEL: Evasão por rotação de IP falso (401)` (alta taxa) | App leu a entrada da esquerda; corrigir TRUST_PROXY/leitura do header |
 *
 * ## Comportamento esperado
 *
 *   - 429 → a rotação não evitou o bloqueio (proteção funcionando)
 *   - 401 → o limite foi burlado: cada IP falso virou um bucket novo
 *
 * Não há mais 403 por spoofing: a defesa é o rate limit por IP confiável.
 */

// Métrica personalizada para contar evasões que chegaram a 401
const EvasionSuccesses = new Counter('ip_rotation_evasions');

const PROFILE_NAME = 'rateLimit';
const REPORT_NAME = 'ip_spoofing_consolidado_test';

// IP real do cliente, escrito pelo proxy à direita da cadeia — constante
// durante todo o teste, ao contrário do IP forjado.
const REAL_CLIENT_IP = '203.0.113.10';

export const options = getProfile(PROFILE_NAME, {
  thresholds: {
    http_req_duration: ['p(95)<5000'],
  },
});

export default function () {
  // IP forjado pelo cliente, rotativo a cada iteração (tentativa de evasão)
  const forgedIP = getRandomIP();

  const payload = JSON.stringify({
    username: 'admin',
    password: 'wrong_password', // Senha errada intencionalmente
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // Cadeia de 2 entradas: a falsa (esquerda, rotativa) e a real (direita,
      // acrescentada pelo proxy). O app lê pela direita, então a rotação da
      // entrada falsificada não deve criar buckets novos.
      'X-Forwarded-For': `${forgedIP}, ${REAL_CLIENT_IP}`,
    },
  };

  const res = http.post(`${BASE_URL}/api/auth/login?response=body`, payload, params);

  if (res.status === 401) {
    EvasionSuccesses.add(1);
  }

  // Checks de Proteção: passam quando a rotação do IP falso NÃO evitou o bloqueio
  check(res, {
    '🛡️ BLOQUEADO: Rate limit por IP real (429)': (r) => r.status === 429,
  });

  // Checks de Vulnerabilidade: passam quando a rotação burlou o limite
  check(res, {
    '⚠️ VULNERÁVEL: Evasão por rotação de IP falso (401)': (r) => r.status === 401,
  });

  // Nota: intencionalmente sem sleep para forçar o mais rápido possível
}

export function handleSummary(data) {
  const evasions = data.metrics.ip_rotation_evasions ? data.metrics.ip_rotation_evasions.values.count : 0;
  if (evasions > 0) {
    console.log(`\n⚠️  AVISO: ${evasions} requisição(ões) escaparam do rate limit via rotação de X-Forwarded-For.\n`);
  }

  return generateReport(data, REPORT_NAME);
}
