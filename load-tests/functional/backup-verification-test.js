import http from 'k6/http';
import { check } from 'k6';
import { generateReport } from '../helpers/report.js';
import { BASE_URL } from '../helpers/config.js';
import { setup } from '../helpers/auth.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    'checks': ['rate>0.80'],
    'http_req_duration': ['p(95)<5000'],
  },
};

export { setup };

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
  };

  console.log('📥 Verificando listagem de backups...');

  const res = http.get(`${BASE_URL}/api/admin/backups`, {
    headers: headers,
    tags: { type: 'backup_list' },
  });

  let hasBackups = false;
  let hasLatest = false;
  let parseError = false;
  
  try {
    const body = res.json();
    if (body && typeof body === 'object' && body.data) {
      hasBackups = Array.isArray(body.data.backups);
      hasLatest = body.data.latest === null || (typeof body.data.latest === 'object' && body.data.latest.name);
      
      if (hasBackups && body.data.backups.length > 0) {
        console.log(`✅ Encontrados ${body.data.backups.length} backups. Último: ${body.data.latest ? body.data.latest.name : 'Nenhum'}`);
      }
    }
  } catch (e) {
    parseError = true;
    console.error('Erro ao fazer parse do JSON:', e);
  }

  const success = check(res, {
    'Status é 200': (r) => r.status === 200,
    'Resposta é JSON válido': () => !parseError,
    'Retornou lista de backups': () => hasBackups,
    'Estrutura de "latest" válida': () => hasLatest,
  });

  if (!success) {
    console.log(`❌ Falha na verificação. Status: ${res.status}. Body: ${res.body.substring(0, 200)}`);
  }
}

export function handleSummary(data) {
  return generateReport(data, 'backup_verification_test');
}