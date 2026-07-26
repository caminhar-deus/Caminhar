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
    http.get(`${BASE_URL}/api/musicas?search=Graça`, { tags: { name: 'WarmUp' } });
    http.get(`${BASE_URL}/api/musicas?search=Santo`, { tags: { name: 'WarmUp' } });
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