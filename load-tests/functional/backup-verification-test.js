import http from 'k6/http';
import { check } from 'k6';
import { generateReport } from '../helpers/report.js';
import { BASE_URL } from '../helpers/config.js';
import { setup } from '../helpers/auth.js';

export const options = {
  // Este é um teste funcional, não de carga. Executa apenas 1 vez com 1 usuário.
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'], // 100% das verificações devem passar
  },
};

export { setup };

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
  };

  console.log('📥 Verificando listagem de backups...');

  // A API atual suporta apenas listagem, não download direto via parâmetro GET
  const res = http.get(`${BASE_URL}/api/admin/backups`, {
    headers: headers,
    tags: { type: 'backup_list' },
  });

  // Validação da resposta JSON
  let hasBackups = false;
  let hasLatest = false;
  
  try {
    const body = res.json();
    hasBackups = Array.isArray(body.backups);
    hasLatest = body.latest === null || (typeof body.latest === 'object' && body.latest.name);
    
    if (hasBackups && body.backups.length > 0) {
      console.log(`✅ Encontrados ${body.backups.length} backups. Último: ${body.latest ? body.latest.name : 'Nenhum'}`);
    }
  } catch (e) {
    console.error('Erro ao fazer parse do JSON:', e);
  }

  const success = check(res, {
    'Status é 200': (r) => r.status === 200,
    'Header Content-Type correto': (r) => {
      const cType = r.headers['Content-Type'] || r.headers['content-type'];
      return cType && cType.includes('application/json');
    },
    'Retornou lista de backups': () => hasBackups,
    'Estrutura de "latest" válida': () => hasLatest,
  });

  if (!success) {
    console.log(`❌ Falha na verificação. Status: ${res.status}. Body: ${res.body}`);
  }
}

export function handleSummary(data) {
  return generateReport(data, 'backup_verification_test');
}
