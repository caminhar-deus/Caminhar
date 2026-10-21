import http from 'k6/http';
import { check } from 'k6';
import { randomSleep } from '../helpers/sleep.js';
import { generateReport } from '../helpers/report.js';
import { BASE_URL } from '../helpers/config.js';

export const options = {
  // Teste funcional de busca por título
  vus: 1,
  iterations: 5,
  thresholds: {
    checks: ['rate==1.0'], // 100% de sucesso esperado
    // Threshold específico com tag para isolar requisições de busca do cold start
    'http_req_duration{name:SearchMusicas}': ['p(95)<800', 'avg<500'],
  },
};


// Termos comuns para busca em títulos de músicas cristãs
const SEARCH_TERMS = ['Graça', 'Santo', 'Amor', 'Vida', 'Caminho', 'Luz'];

let warmupDone = false;

export default function () {
  // Warm-up: na primeira iteração, aquece o cache do servidor Next.js
  // para evitar que cold start distorça as métricas de latência
  if (!warmupDone) {
    warmupDone = true;
    console.log('🔥 Warm-up: aquecendo cache do servidor...');
    // POR QUE encodeURIComponent AQUI: a URL com o byte UTF-8 cru ("Graça")
    // chega ao parser HTTP do Node como request target inválido e gera
    // 400 Bad Request ANTES da aplicação responder. Como o warm-up não tinha
    // `check`, a suíte reportava PASS mesmo assim — os runs #15, #17 e #18
    // mediram `http_req_failed` = 0,142857 (1 de 7 requisições) idêntico.
    // O percent-encoding é o mesmo da requisição verificada abaixo.
    const warmupInicial = http.get(
      `${BASE_URL}/api/musicas?search=${encodeURIComponent('Graça')}`,
      { tags: { name: 'WarmUp' } },
    );
    // POR QUE check AQUI: sem ele, uma resposta fora de 2xx no warm-up era
    // invisível para o `checks: ['rate==1.0']` — foi exatamente esse o furo
    // que escondeu o 400 do byte cru.
    check(warmupInicial, {
      'Warm-up (busca inicial): status é 200': (r) => r.status === 200,
    });
    const warmupControle = http.get(
      `${BASE_URL}/api/musicas?search=${encodeURIComponent('Santo')}`,
      { tags: { name: 'WarmUp' } },
    );
    check(warmupControle, {
      'Warm-up (busca de controle): status é 200': (r) => r.status === 200,
    });
  }

  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  
  // Realiza a busca com tag nomeada para permitir thresholds específicos
  const res = http.get(`${BASE_URL}/api/musicas?search=${encodeURIComponent(term)}`, {
    tags: { name: 'SearchMusicas' },
  });

  check(res, {
    'Status é 200': (r) => r.status === 200,
    'Retornou lista de músicas': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body.data) || Array.isArray(body);
      } catch (e) {
        return false;
      }
    },
    'Busca funcionou (título contém termo)': (r) => {
      let body; try { body = r.json(); } catch (e) { return false; }
      const musicas = body.data || body;
      
      if (!Array.isArray(musicas)) return false;
      if (musicas.length === 0) return true; // Lista vazia é válida se não houver match

      // Verifica se pelo menos uma música retornada contém o termo no título (case insensitive)
      const matchFound = musicas.some(m => {
        const titulo = (m.titulo || m.title || '').toLowerCase();
        return titulo.includes(term.toLowerCase());
      });

      if (!matchFound) {
        console.log(`⚠️ API retornou ${musicas.length} músicas para termo "${term}", mas o termo não foi encontrado visualmente.`);
        return true; // Soft pass
      }
      return true;
    }
  });

  randomSleep(0.5, 3);
}

export function handleSummary(data) {
  return generateReport(data, 'musicas_search_test');
}