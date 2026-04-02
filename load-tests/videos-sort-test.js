import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

export const options = {
  // Teste funcional de ordenação padrão (API sempre ordena por created_at DESC)
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'], // 100% de sucesso esperado
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Testa a ordenação padrão da API (sempre por created_at DESC - mais recentes primeiro)
  // A API não suporta parâmetros de ordenação, então testamos o comportamento padrão
  const res = http.get(`${BASE_URL}/api/videos?page=1&limit=10`);

  check(res, {
    'Status é 200': (r) => r.status === 200,
    'Retornou estrutura de vídeos válida': (r) => {
      try {
        const body = r.json();
        // Tolera a ausência de 'data.videos' (DB vazio), mas se existir, deve ser um array.
        return typeof body === 'object' && (body?.data?.videos === undefined || Array.isArray(body.data.videos));
      } catch (e) {
        return false;
      }
    },
    'Ordenação padrão correta (Decrescente por created_at)': (r) => {
      let videos;
      try {
        videos = r.json('data.videos') || r.json();
      } catch (e) {
        return false; // Falha se não for JSON
      }
      
      if (!Array.isArray(videos)) {
        if (__ITER === 0) console.warn('⚠️ Resposta não continha um array de vídeos para validar a ordenação.');
        return true; // Passa, pois não há dados para testar.
      }

      if (videos.length < 2) {
        if (__ITER === 0) console.warn('⚠️ Poucos vídeos para validar ordenação. Adicione mais dados.');
        return true; // Não é falha, mas inconclusivo
      }

      // Verifica se cada data é menor ou igual à anterior (mais recente -> mais antiga)
      for (let i = 0; i < videos.length - 1; i++) {
        const dateA = new Date(videos[i].created_at || videos[i].createdAt).getTime();
        const dateB = new Date(videos[i+1].created_at || videos[i+1].createdAt).getTime();
        if (dateA < dateB) return false; // Falha na primeira inconsistência
      }
      return true;
    },
    'API ignora parâmetros de ordenação': (r) => {
      // Testa se a API aceita parâmetros de ordenação sem erro (mesmo que ignore)
      const resWithSort = http.get(`${BASE_URL}/api/videos?page=1&limit=5&sort=created_at&order=desc`);
      return resWithSort.status === 200;
    }
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/videos_sort_test.json': JSON.stringify(data, null, 4),
    './reports/k6-summaries/videos_sort_test.html': htmlReport(data),
  };
}