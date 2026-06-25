import http from 'k6/http';
import { check } from 'k6';
import { randomSleep } from '../helpers/sleep.js';
import { generateReport } from '../helpers/report.js';
import { BASE_URL } from '../helpers/config.js';
import { setup } from '../helpers/auth.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.60'],
    http_req_duration: ['p(95)<5000'],
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
    'Domínio Inválido: status é 400 (rejeitado)': (r) => {
      if (r.status !== 400) {
        console.warn(`⚠️ API aceitou domínio inválido (esperado 400, recebido ${r.status}). Validação pode estar desativada.`);
      }
      return r.status === 400;
    },
    'Domínio Inválido: mensagem de erro': (r) => {
      try {
        return JSON.stringify(r.body).includes('YouTube');
      } catch {
        return false;
      }
    },
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
    'URL Malformada: status é 400 (rejeitado)': (r) => {
      if (r.status !== 400) {
        console.warn(`⚠️ API aceitou URL malformada (esperado 400, recebido ${r.status}). Validação pode estar desativada.`);
      }
      return r.status === 400;
    },
  });
}

export function handleSummary(data) {
  return generateReport(data, 'video_validation_test');
}
