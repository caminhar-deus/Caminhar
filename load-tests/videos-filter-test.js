import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  // Teste funcional de paginação
  vus: 1,
  iterations: 5,
  thresholds: {
    checks: ['rate==1.0'], // 100% de sucesso esperado
    http_req_duration: ['p(95)<500'], // Resposta rápida
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Testa diferentes combinações de página e limite
  const page = Math.floor(Math.random() * 3) + 1; // Páginas 1, 2 ou 3
  const limit = [5, 10, 20][Math.floor(Math.random() * 3)]; // Limites 5, 10 ou 20

  const res = http.get(`${BASE_URL}/api/videos?page=${page}&limit=${limit}`);

  check(res, {
    'Status é 200': (r) => r.status === 200,
    'Retornou lista de vídeos': (r) => {
      // A resposta deve ser um objeto, e se 'data.videos' existir, deve ser um array.
      // Tolera a ausência de 'data.videos' se o banco estiver vazio.
      const body = r.json();
      return typeof body === 'object' && (body?.data?.videos === undefined || Array.isArray(body.data.videos));
    },
    'Retornou metadados de paginação': (r) => {
      const body = r.json();
      // Só valida a paginação se houver vídeos retornados.
      if (!body?.data?.videos || body.data.videos.length === 0) {
        if (__ITER === 0) console.warn('⚠️ Sem vídeos para validar metadados de paginação.');
        return true;
      }
      const pagination = body.data.pagination;
      return pagination && typeof pagination.page === 'number' &&
             typeof pagination.limit === 'number' &&
             typeof pagination.total === 'number' &&
             typeof pagination.totalPages === 'number';
    },
    'Paginação está correta': (r) => {
      const body = r.json();
      const pagination = body?.data?.pagination;
      const videos = body?.data?.videos;

      // Só valida a paginação se houver vídeos e metadados.
      if (!videos || !pagination || videos.length === 0) {
        return true;
      }

      const pageMatches = pagination.page === page;
      const limitMatches = pagination.limit === limit;
      const countMatches = videos.length <= limit;

      return pageMatches && limitMatches && countMatches;
    }
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/videos_filter_test.json': JSON.stringify(data, null, 4),
  };
}