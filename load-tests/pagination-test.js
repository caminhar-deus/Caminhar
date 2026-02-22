import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  // Teste funcional: 1 usuário fazendo a validação lógica
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'], // 100% das verificações devem passar
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // 1. Requisita a Página 1 (limit=5)
  const resPage1 = http.get(`${BASE_URL}/api/v1/posts?page=1&limit=5`);
  
  check(resPage1, {
    'Página 1: status 200': (r) => r.status === 200,
    'Página 1: retornou array': (r) => Array.isArray(r.json('data') || r.json()),
    'Página 1: tem itens': (r) => (r.json('data') || r.json()).length > 0,
  });

  const postsPage1 = resPage1.json('data') || resPage1.json();
  // Extrai os IDs da página 1 para comparação
  const idsPage1 = postsPage1.map(p => p.id);

  sleep(1);

  // 2. Requisita a Página 2 (limit=5)
  const resPage2 = http.get(`${BASE_URL}/api/v1/posts?page=2&limit=5`);

  check(resPage2, {
    'Página 2: status 200': (r) => r.status === 200,
    'Página 2: retornou array': (r) => Array.isArray(r.json('data') || r.json()),
  });

  const postsPage2 = resPage2.json('data') || resPage2.json();
  
  // Se a página 2 estiver vazia (poucos posts no banco), o teste passa com aviso
  if (postsPage2.length === 0) {
    console.warn('⚠️ Página 2 vazia. Adicione mais posts ao banco para um teste de paginação completo.');
  } else {
    // 3. Validação Cruzada: Garante que nenhum ID da página 2 está na página 1
    const hasDuplicates = postsPage2.some(p => idsPage1.includes(p.id));
    
    check(resPage2, {
      'Paginação funciona (IDs diferentes nas págs 1 e 2)': () => !hasDuplicates,
      'Página 2 tem conteúdo diferente': () => JSON.stringify(postsPage1) !== JSON.stringify(postsPage2),
    });
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/pagination_test.json': JSON.stringify(data, null, 4),
  };
}