import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL } from '../helpers/config.js';
import { getProfile } from '../helpers/profiles.js';
import { generateReport } from '../helpers/report.js';

// Métrica personalizada para rastrear especificamente erros do servidor (5xx)
const ErrorRate500 = new Rate('errors_500');

export const options = getProfile('heavy', {
  stages: [
    { duration: '10s', target: 100 },
    { duration: '30s', target: 500 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    'errors_500': [{ threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '5s' }],
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
    'status 200 (Servidor Resistiu)': (r) => r.status === 200,
    'status 429 (Rate Limit Atuou)': (r) => r.status === 429,
    'status 5xx (Servidor Caiu)': (r) => r.status >= 500,
  });

  // NOTA: Não usamos sleep() aqui intencionalmente.
  // O objetivo é fazer cada VU disparar requisições o mais rápido possível (loop infinito sem pausa).
}

export function handleSummary(data) {
  return generateReport(data, 'ddos_search_test');
}