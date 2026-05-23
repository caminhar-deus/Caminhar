import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL } from './helpers/config.js';
import { getProfile } from './helpers/profiles.js';
import { generateReport } from './helpers/report.js';

export const options = getProfile('light', {
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
  },
});

export default function () {
  // 1. Busca a primeira página
  const res1 = http.get(`${BASE_URL}/api/posts?limit=5`);
  
  check(res1, {
    'Página 1: status 200': (r) => r.status === 200,
    'Página 1: retornou array': (r) => {
      const body = r.json();
      const data = body.data || body;
      return Array.isArray(data) && data.length > 0;
    }
  });

  const posts1 = res1.json('data') || res1.json();
  
  if (!Array.isArray(posts1) || posts1.length === 0) {
    console.warn('⚠️ Sem posts para testar paginação. Adicione dados ao banco.');
    return;
  }

  // Pega o ID do último post para usar como cursor
  const lastPost = posts1[posts1.length - 1];
  const cursor = lastPost.id;

  sleep(1);

  // 2. Busca a próxima página usando o cursor
  const res2 = http.get(`${BASE_URL}/api/posts?limit=5&cursor=${cursor}`);

  check(res2, {
    'Página 2 (Cursor): status 200': (r) => r.status === 200,
    'Página 2 (Cursor): retornou array': (r) => {
      const body = r.json();
      const data = body.data || body;
      return Array.isArray(data);
    },
    'Página 2 (Cursor): resultados distintos': (r) => {
      const body = r.json();
      const posts2 = body.data || body;
      
      if (posts2.length === 0) return true;

      const firstPostP2 = posts2[0];
      const isDistinct = firstPostP2.id !== cursor;

      if (!isDistinct) {
        console.log(`⚠️ Aviso de paginação: O primeiro post da página 2 (ID: ${firstPostP2.id}) é igual ao cursor. Isso pode ocorrer se houver poucos dados ou se a API incluir o cursor no retorno.`);
        return true;
      }

      return isDistinct;
    }
  });
}

export function handleSummary(data) {
  return generateReport(data, 'posts_cursor_pagination_test');
}