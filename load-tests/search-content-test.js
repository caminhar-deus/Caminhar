import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  // Teste funcional: poucas iterações para validar a lógica da busca
  vus: 1,
  iterations: 10,
  thresholds: {
    checks: ['rate==1.0'], // 100% das verificações devem passar
    http_req_duration: ['p(95)<500'], // Busca deve ser rápida
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Termos comuns que provavelmente existem no banco de dados
const SEARCH_TERMS = ['Deus', 'Jesus', 'amor', 'fé', 'vida', 'caminho', 'luz'];

export default function () {
  // Seleciona um termo aleatório
  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  
  // Realiza a busca
  const res = http.get(`${BASE_URL}/api/v1/posts?search=${term}`);

  check(res, {
    'Status é 200': (r) => r.status === 200,
    'Retornou estrutura válida (Array)': (r) => {
      const body = r.json();
      return Array.isArray(body.data) || Array.isArray(body);
    },
    'Resultados contêm o termo (se houver)': (r) => {
      const body = r.json();
      const posts = body.data || body;
      
      if (posts.length === 0) return true; // Se não achou nada, não é erro de lógica

      // Verifica se pelo menos um dos posts retornados contém o termo (case insensitive)
      return posts.some(post => {
        const title = (post.title || '').toLowerCase();
        const content = (post.content || post.description || '').toLowerCase();
        const searchTerm = term.toLowerCase();
        return title.includes(searchTerm) || content.includes(searchTerm);
      });
    }
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/search_content_test.json': JSON.stringify(data, null, 4),
  };
}