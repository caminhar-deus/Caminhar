import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate } from 'k6/metrics';
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
 * Os dois checks são **mutuamente exclusivos** por status HTTP: uma resposta
 * tem um único status, então exatamente um dos dois passa por iteração. Check
 * em 50% é o valor esperado e correto neste teste — não é sintoma de falha.
 *
 * | Cenário | Check que PASSA | Significado |
 * |---------|-----------------|-------------|
 * | Sistema protegido | `EVASÃO BLOQUEADA: 429 (rate limit por IP real)` | Rotação do IP falso **não** evitou o bloqueio |
 * | Sistema vulnerável | `EVASÃO CONFIRMADA: 401 (rotação@lida)` | App leu a entrada da esquerda; cada IP falso virou um bucket novo |
 *
 * Um 401 isolado **não** é evasão: a requisição usa senha errada de propósito,
 * então 401 costuma ser simply "credencial rejeitada" — proteção funcionando.
 * Por isso o teste mede a **proporção** de 401 (`ip_rotation_evasion_rate`),
 * não a contagem bruta: poucos 401 no warm-up é normal, 401 sustentado é evasão.
 *
 * ## Comportamento esperado
 *
 *   - 429 → a rotação não evitou o bloqueio (proteção funcionando)
 *   - 401 → o limite foi burlado: cada IP falso virou um bucket novo
 *
 * Não há mais 403 por spoofing: a defesa é o rate limit por IP confiável.
 */

// Taxa de respostas 401 — proxy de evasão. Contagem bruta seria enganosa
// porque as primeiras iterações legítimas (antes de o bucket encher) também
// respondem 401.
const EvasionRate = new Rate('ip_rotation_evasion_rate');
const EvasionSuccesses = new Counter('ip_rotation_evasions');

const PROFILE_NAME = 'rateLimit';
const REPORT_NAME = 'ip_spoofing_consolidado_test';

// IP real do cliente, escrito pelo proxy à direita da cadeia — constante
// durante todo o teste, ao contrário do IP forjado.
const REAL_CLIENT_IP = '203.0.113.10';

export const options = getProfile(PROFILE_NAME, {
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    // Evasão sustentada reprova o job. Sem este threshold o teste imprimia
    // "VULNERÁVEL" no log e mesmo assim saía com exit 0.
    'ip_rotation_evasion_rate': ['rate<0.05'],
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
  // 401 conta como evasão; 429 é o estado saudável esperado.
  EvasionRate.add(res.status === 401);

  // Checks mutuamente exclusivos: por iteração, exatamente um passa.
  // A nomenclatura evita a leitura invertida de antes, em que um check
  // vermelho com prefixo ⚠️/VULNERÁVEL era lido como problema sendo o
  // sinal de proteção funcionando.
  check(res, {
    'EVASÃO BLOQUEADA: rate limit por IP real (429)': (r) => r.status === 429,
    'EVASÃO CONFIRMADA: rotação lida, não bloqueou (401)': (r) => r.status === 401,
  });

  // Nota: intencionalmente sem sleep para forçar o mais rápido possível
}

export function handleSummary(data) {
  const rate = data.metrics.ip_rotation_evasion_rate ? data.metrics.ip_rotation_evasion_rate.values.rate : 0;
  const evasions = data.metrics.ip_rotation_evasions ? data.metrics.ip_rotation_evasions.values.count : 0;
  const pct = (rate * 100).toFixed(2);

  if (rate > 0) {
    // A contagem bruta sozinha é enganosa: 401 também é a resposta correta
    // para senha errada. O que distingue evasão é a proporção sustentada.
    console.log(
      `\n📊 Evasão de rate limit por rotação de X-Forwarded-For: ${pct}% das respostas foram 401 ` +
      `(${evasions} no total).` +
      (rate >= 0.05
        ? ' Acima do threshold (5%) — rotação lida, proteção INEFFICAZ: o job reprova.\n'
        : ' Abaixo do threshold (5%) — rotação não burla o limite, proteção funcionando.\n')
    );
  } else {
    console.log('\n📊 Evasão de rate limit por rotação de X-Forwarded-For: 0% — todas as respostas foram 429.\n');
  }

  return generateReport(data, REPORT_NAME);
}
