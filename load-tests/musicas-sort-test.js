import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  // Teste funcional de ordenação
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'], // 100% de sucesso esperado
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Solicita músicas ordenadas por data de criação decrescente (mais recentes primeiro)
  // Assume que a API suporta ?sort=created_at&order=desc
  const res = http.get(`${BASE_URL}/api/v1/musicas?sort=created_at&order=desc`);

  check(res, {
    'Status é 200': (r) => r.status === 200,
    'Retornou lista de músicas': (r) => {
      const body = r.json();
      return Array.isArray(body.data) || Array.isArray(body);
    },
    'Ordenação correta (Decrescente)': (r) => {
      const body = r.json();
      const musicas = body.data || body;
      
      if (musicas.length < 2) {
        console.warn('⚠️ Poucas músicas para validar ordenação. Adicione mais dados.');
        return true; // Não é falha, mas inconclusivo
      }

      // Verifica se cada data é menor ou igual à anterior (mais recente -> mais antiga)
      let isSorted = true;
      for (let i = 0; i < musicas.length - 1; i++) {
        const dateA = new Date(musicas[i].created_at || musicas[i].createdAt).getTime();
        const dateB = new Date(musicas[i+1].created_at || musicas[i+1].createdAt).getTime();
        if (dateA < dateB) isSorted = false;
      }
      return isSorted;
    }
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/musicas_sort_test.json': JSON.stringify(data, null, 4),
  };
}