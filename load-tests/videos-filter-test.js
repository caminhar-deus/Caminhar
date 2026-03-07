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
  
  const res = http.get(`${BASE_URL}/api/v1/videos?page=${page}&limit=${limit}`);

  check(res, {
    'Status é 200': (r) => r.status === 200,
    'Retornou lista de vídeos': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body.data?.videos) || Array.isArray(body);
      } catch (e) {
        return false;
      }
    },
    'Retornou metadados de paginação': (r) => {
      try {
        const body = r.json();
        const pagination = body.data?.pagination;
        return pagination && typeof pagination.page === 'number' && 
               typeof pagination.limit === 'number' && 
               typeof pagination.total === 'number' && 
               typeof pagination.totalPages === 'number';
      } catch (e) {
        return false;
      }
    },
    'Paginação está correta': (r) => {
      try {
        const body = r.json();
        const pagination = body.data?.pagination;
        const videos = body.data?.videos || body;
        
        if (!pagination || !Array.isArray(videos)) return false;
        
        // Verifica se a página retornada corresponde à solicitada
        const pageMatches = pagination.page === page;
        
        // Verifica se o limite está correto (ou menor se for a última página)
        const limitMatches = pagination.limit === limit;
        
        // Verifica se o número de vídeos retornados não excede o limite
        const countMatches = videos.length <= limit;
        
        return pageMatches && limitMatches && countMatches;
      } catch (e) {
        return false;
      }
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