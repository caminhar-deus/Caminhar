import http from 'k6/http';
import { check, fail } from 'k6';
import { randomSleep } from '../helpers/sleep.js';
import { generateReport } from '../helpers/report.js';
import { BASE_URL } from '../helpers/config.js';
import { setup } from '../helpers/auth.js';

export const options = {
  // Teste funcional de validação
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'], // 100% das validações devem passar
  },
};

export { setup };

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // --- Cenário 1: URL Válida do YouTube ---
  const validPayload = JSON.stringify({
    titulo: 'Vídeo Válido K6',
    url_youtube: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    publicado: false
  });

  const resValid = http.post(`${BASE_URL}/api/admin/videos`, validPayload, { headers });
  
  check(resValid, {
    'URL Válida: status é 201': (r) => r.status === 201,
    'URL Válida: retorna ID': (r) => {
      // A API pode retornar o ID no root ({id: ...}) ou aninhado ({data: {id: ...}})
      return r.json('id') !== undefined || r.json('data.id') !== undefined;
    },
  });

  randomSleep(0.3, 1.3);

  // --- Cenário 2: URL Inválida (Outro domínio) ---
  const invalidDomainPayload = JSON.stringify({
    titulo: 'Vídeo Domínio Inválido',
    url_youtube: 'https://vimeo.com/123456789',
    publicado: false
  });

  const resInvalidDomain = http.post(`${BASE_URL}/api/admin/videos`, invalidDomainPayload, {
    headers,
  });

  check(resInvalidDomain, {
    'Domínio Inválido: status é 400': (r) => {
      if (r.status !== 400) {
        console.error(`❌ API aceitou domínio inválido (esperado 400, recebido ${r.status}). Validação pode estar desativada.`);
        fail(`Domínio inválido não foi rejeitado pela API. Status: ${r.status}`);
      }
      return true;
    },
    'Domínio Inválido: mensagem de erro': (r) => 
      JSON.stringify(r.body).includes('YouTube'),
  });

  randomSleep(0.3, 1.3);

  // --- Cenário 3: URL Malformada ---
  const malformedPayload = JSON.stringify({
    titulo: 'Vídeo URL Quebrada',
    url_youtube: 'youtube.com/watch?v=', // Falta protocolo e ID
    publicado: false
  });

  const resMalformed = http.post(`${BASE_URL}/api/admin/videos`, malformedPayload, {
    headers,
  });

  check(resMalformed, {
    'URL Malformada: status é 400': (r) => {
      if (r.status !== 400) {
        console.error(`❌ API aceitou URL malformada (esperado 400, recebido ${r.status}). Validação pode estar desativada.`);
        fail(`URL malformada não foi rejeitada pela API. Status: ${r.status}`);
      }
      return true;
    },
  });
}

export function handleSummary(data) {
  return generateReport(data, 'video_validation_test');
}
