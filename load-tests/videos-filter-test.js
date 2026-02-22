import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  // Teste funcional de filtro
  vus: 1,
  iterations: 5,
  thresholds: {
    checks: ['rate==1.0'], // 100% de sucesso esperado
    http_req_duration: ['p(95)<500'], // Resposta rápida
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Termos comuns para busca em vídeos cristãos
const SEARCH_TERMS = ['Deus', 'Jesus', 'Louvor', 'Adoração', 'Pregação', 'Vida'];

export default function () {
  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  
  // Assume que a API suporta ?search= (padrão do projeto) para filtrar por título
  const res = http.get(`${BASE_URL}/api/v1/videos?search=${term}`);

  check(res, {
    'Status é 200': (r) => r.status === 200,
    'Retornou lista de vídeos': (r) => {
      const body = r.json();
      return Array.isArray(body.data) || Array.isArray(body);
    },
    'Filtro funcionou (título contém termo)': (r) => {
      const body = r.json();
      const videos = body.data || body;
      
      if (videos.length === 0) return true; // Lista vazia é válida se não houver match

      // Verifica se pelo menos um vídeo retornado contém o termo no título (case insensitive)
      return videos.some(v => {
        const title = (v.titulo || v.title || '').toLowerCase();
        return title.includes(term.toLowerCase());
      });
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