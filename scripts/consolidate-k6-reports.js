import fs from 'fs';
import path from 'path';

const REPORTS_DIR = path.join(process.cwd(), 'reports', 'k6-summaries');

function generateSummary() {
  if (!fs.existsSync(REPORTS_DIR)) {
    console.log('Nenhum diretório de relatórios encontrado.');
    return;
  }

  const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('Nenhum arquivo JSON de relatório K6 encontrado.');
    return;
  }

  console.log('\n=============================================================');
  console.log('📊 RESUMO GERAL DOS TESTES DE CARGA (K6)');
  console.log('=============================================================\n');

  let totalReqs = 0;
  let totalFails = 0;

  files.forEach(file => {
    const filePath = path.join(REPORTS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    const testName = file.replace('.json', '');
    const reqs = data.metrics.http_reqs?.values?.count || 0;
    // O K6 contabiliza as falhas dentro do array "passes" da métrica de falha
    const fails = data.metrics.http_req_failed?.values?.passes || 0; 
    const avgDuration = data.metrics.http_req_duration?.values?.avg?.toFixed(2) || 0;
    const p95Duration = data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || 0;
    const vus = data.metrics.vus_max?.values?.value || data.metrics.vus?.values?.max || 0;

    totalReqs += reqs;
    totalFails += fails;

    console.log(`🚀 Teste: ${testName.replace(/_/g, ' ').toUpperCase()}`);
    console.log(`   - Máx VUs Simulados:  ${vus}`);
    console.log(`   - Requisições Totais: ${reqs}`);
    console.log(`   - Falhas Registradas: ${fails} (${reqs > 0 ? ((fails/reqs)*100).toFixed(2) : 0}%)`);
    console.log(`   - Tempo Médio (Avg):  ${avgDuration} ms`);
    console.log(`   - Tempo Limite (P95): ${p95Duration} ms`);
    console.log('-------------------------------------------------------------');
  });

  console.log('\n🏆 RESULTADO FINAL CONSOLIDADO:');
  console.log(`   - Total de Requisições: ${totalReqs}`);
  console.log(`   - Total de Erros HTTP:  ${totalFails}`);
  console.log(`   - Taxa de Sucesso:      ${totalReqs > 0 ? (((totalReqs - totalFails)/totalReqs)*100).toFixed(2) : 0}%\n`);
}

generateSummary();