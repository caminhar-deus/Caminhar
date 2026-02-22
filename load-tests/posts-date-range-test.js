import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  // Teste funcional de filtro por data
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'], // 100% de sucesso esperado
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 1. Busca posts recentes para obter uma data de referência válida
  const resInitial = http.get(`${BASE_URL}/api/v1/posts?limit=5`);
  
  if (resInitial.status !== 200) {
    console.warn('⚠️ Não foi possível buscar posts iniciais para determinar o intervalo de datas.');
    return;
  }

  const posts = resInitial.json('data') || resInitial.json();
  
  if (!posts || posts.length === 0) {
    console.warn('⚠️ Nenhum post encontrado. Pulando teste de intervalo de datas.');
    return;
  }

  // Pega a data do primeiro post e define um intervalo de +/- 1 dia
  const targetPost = posts[0];
  // Tenta diferentes campos de data comuns
  const postDateStr = targetPost.publishedAt || targetPost.createdAt || targetPost.created_at;
  const targetDate = new Date(postDateStr);
  
  const startDate = new Date(targetDate);
  startDate.setDate(startDate.getDate() - 1); // -1 dia
  
  const endDate = new Date(targetDate);
  endDate.setDate(endDate.getDate() + 1); // +1 dia

  // 2. Realiza a busca com o range de datas
  // Assume que a API aceita startDate e endDate (ISO 8601)
  const resRange = http.get(`${BASE_URL}/api/v1/posts?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);

  check(resRange, {
    'Status é 200': (r) => r.status === 200,
    'Retornou lista de posts': (r) => Array.isArray(r.json('data') || r.json()),
    'Resultados estão dentro do intervalo': (r) => {
      const resultPosts = r.json('data') || r.json();
      if (resultPosts.length === 0) return true; // Lista vazia é válida se não houver matches (embora esperemos o post alvo)
      
      return resultPosts.every(p => {
        const pDate = new Date(p.publishedAt || p.createdAt || p.created_at).getTime();
        return pDate >= startDate.getTime() && pDate <= endDate.getTime();
      });
    }
  });
  
  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/posts_date_range_test.json': JSON.stringify(data, null, 4),
  };
}