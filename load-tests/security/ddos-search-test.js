import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL } from '../helpers/config.js';
import { getProfile } from '../helpers/profiles.js';
import { generateReport } from '../helpers/report.js';

/**
 * Teste de Carga — DDoS / Busca Massiva
 *
 * Propósito: Validar a resiliência do sistema contra ataques de busca em massa,
 * simulando múltiplos VUs realizando requisições de busca simultâneas.
 *
 * ## Interpretação dos Resultados
 *
 * | Cenário | Checks que PASSAM | Significado |
 * |---------|-------------------|-------------|
 * | Sistema resiliente | `🛡️ BLOQUEADO: Rate limit atuou (429)` (alta taxa) | Proteção contra DDoS funcionando |
 * | Sistema subdimensionado | `⚠️ VULNERÁVEL: Servidor caiu sob carga (5xx)` (taxa de `errors_500` até 50%) | Achado de capacidade: **reportado** no resumo, sem reprovar o job |
 * | Sistema estável | `✅ RESISTIU: Servidor respondeu (200)` (alta taxa) | Servidor aguenta carga sem proteção |
 * | App quebrado | taxa de `errors_500` ≥ 50% | Threshold `rate<0.50` reprova o teste |
 *
 * ## Nota
 * - Atualmente o servidor NÃO aciona rate limit para buscas, mesmo com 500 VUs
 * - A proteção DDoS precisa ser implementada ou confirmada como desnecessária
 * - Os 5xx são **resultado a medir**, não motivo de abortar: por isso o
 *   threshold não tem `abortOnFail`/`delayAbortEval` (um teste de resiliência
 *   que aborta com 5s de 5xx destrói a medição que existe para fazer)
 */

// Métrica personalizada para rastrear especificamente erros do servidor (5xx)
const ErrorRate500 = new Rate('errors_500');

export const options = getProfile('heavy', {
  stages: [
    { duration: '10s', target: 100 },
    { duration: '30s', target: 500 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    // Sem abortOnFail/delayAbortEval: 5xx é resultado a medir num teste de
    // resiliência. 50% separa o que é achado de capacidade (taxa parcial sob
    // 500 VUs — reportar, não reprovar) do app quebrado (maioria de respostas
    // 5xx — reprova o job).
    'errors_500': ['rate<0.50'],
  },
});

// Lista de termos para variar a busca e evitar cache de query exata
const SEARCH_TERMS = ['amor', 'paz', 'fé', 'luz', 'vida', 'caminho', 'verdade', 'esperança', 'coração', 'espírito'];

export default function () {
  // Seleciona um termo aleatório
  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  
  // Adiciona um timestamp para "cache busting" (forçar o servidor a processar a requisição)
  const uniqueParam = Date.now();

  // Dispara a requisição GET contra a rota de posts (busca)
  const res = http.get(`${BASE_URL}/api/posts?search=${encodeURIComponent(term)}&_t=${uniqueParam}`, {
    tags: { type: 'ddos_search', name: 'DDoS_Search' },
    expectedStatuses: [200, 429],
  });

  // Alimenta a métrica: true se for erro 5xx, false caso contrário
  ErrorRate500.add(res.status >= 500);

  check(res, {
    '✅ RESISTIU: Servidor respondeu com sucesso (200)': (r) => r.status === 200,
    '🛡️ BLOQUEADO: Rate limit atuou na busca (429)': (r) => r.status === 429,
    '⚠️ VULNERÁVEL: Servidor caiu sob carga (5xx)': (r) => r.status >= 500,
  });

  // NOTA: Não usamos sleep() aqui intencionalmente.
  // O objetivo é fazer cada VU disparar requisições o mais rápido possível (loop infinito sem pausa).
}

export function handleSummary(data) {
  // Taxa de 5xx como medida de resiliência: reportada sempre, mesmo quando
  // dentro do threshold — é ela que diz quanto a aplicação aguentou.
  const errors500 = data.metrics.errors_500 ? data.metrics.errors_500.values.rate : 0;
  const pct = (errors500 * 100).toFixed(2);
  console.log(`\n📊 Resiliência (errors_500): ${pct}% das respostas foram 5xx.` +
    (errors500 >= 0.5
      ? ' Maioria 5xx: sinal de app quebrado, não apenas subdimensionado.'
      : ' Taxa parcial: achado de capacidade, reportado sem reprovar o job.') +
    ' Threshold: rate<0.50, sem abortOnFail: o teste roda até o fim para medir.\n');

  return generateReport(data, 'ddos_search_test');
}