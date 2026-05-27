import http from 'k6/http';
import { check } from 'k6';
import { randomSleep } from '../helpers/sleep.js';
import { BASE_URL } from '../helpers/config.js';
import { getProfile } from '../helpers/profiles.js';
import { generateReport } from '../helpers/report.js';

export const options = getProfile('light', {
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
  },
});

export default function () {
  // 1. Requisita a Página 1 (limit=5)
  const resPage1 = http.get(`${BASE_URL}/api/posts?page=1&limit=5`);
  
  // Helper para extrair array de dados suportando diferentes formatos de resposta:
  // - { data: [...] } (formato paginatedResponse)
  // - { success: true, data: [...], pagination: {...} }
  // - [...] (array direto)
  function extractArray(response) {
    const body = response.json();
    if (Array.isArray(body)) return body;
    if (body.data && Array.isArray(body.data)) return body.data;
    if (body.rows && Array.isArray(body.rows)) return body.rows;
    return [];
  }

  check(resPage1, {
    'Página 1: status 200': (r) => r.status === 200,
    'Página 1: retornou array': (r) => {
      const body = r.json();
      return Array.isArray(body) || Array.isArray(body.data) || Array.isArray(body.rows);
    },
    'Página 1: tem itens': (r) => {
      const items = extractArray(r);
      return items.length > 0;
    },
  });

  const postsPage1 = extractArray(resPage1);
  // Extrai os IDs da página 1 para comparação (com verificação de segurança)
  const idsPage1 = postsPage1.map(function(p) { return p && p.id; }).filter(function(id) { return id !== undefined; });

  randomSleep(0.5, 3);

  // 2. Requisita a Página 2 (limit=5)
  const resPage2 = http.get(`${BASE_URL}/api/posts?page=2&limit=5`);

  check(resPage2, {
    'Página 2: status 200': (r) => r.status === 200,
    'Página 2: retornou array': (r) => {
      const body = r.json();
      return Array.isArray(body) || Array.isArray(body.data) || Array.isArray(body.rows);
    },
  });

  const postsPage2 = extractArray(resPage2);
  
  // Se a página 2 estiver vazia (poucos posts no banco), o teste passa com aviso
  if (postsPage2.length === 0) {
    console.warn('⚠️ Página 2 vazia. Adicione mais posts ao banco para um teste de paginação completo.');
  } else {
    // 3. Validação Cruzada ES5.1-compatible (k6/goja não suporta .some()/.includes())
    // Garante que nenhum ID da página 2 está na página 1
    var hasDuplicates = false;
    for (var i = 0; i < postsPage2.length; i++) {
      for (var j = 0; j < idsPage1.length; j++) {
        if (postsPage2[i] && idsPage1[j] && postsPage2[i].id === idsPage1[j]) {
          hasDuplicates = true;
          break;
        }
      }
      if (hasDuplicates) break;
    }
    
    check(resPage2, {
      'Paginação funciona (IDs diferentes nas págs 1 e 2)': function() { return !hasDuplicates; },
      'Página 2 tem conteúdo diferente': function() { return JSON.stringify(postsPage1) !== JSON.stringify(postsPage2); },
    });
  }

  randomSleep(0.5, 3);
}

export function handleSummary(data) {
  return generateReport(data, 'pagination_test');
}