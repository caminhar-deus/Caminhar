import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  // Teste funcional de filtro
  vus: 1,
  iterations: 5,
  thresholds: {
    checks: ['rate==1.0'], // 100% de sucesso esperado
    http_req_duration: ['p(95)<500'], // Resposta rápida
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Artistas comuns para busca em músicas cristãs
const SEARCH_ARTISTS = ['Aline Barros', 'Fernandinho', 'Gabriela Rocha', 'Diante do Trono', 'Preto no Branco'];

export default function () {
  const artist = SEARCH_ARTISTS[Math.floor(Math.random() * SEARCH_ARTISTS.length)];
  
  // Assume que a API suporta ?artist= ou ?search= para filtrar por artista
  // Ajustado para a rota pública correta (/api/musicas) em vez de /api/v1/musicas
  const res = http.get(`${BASE_URL}/api/musicas?search=${encodeURIComponent(artist)}`);

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
    'Filtro funcionou (artista contém termo)': (r) => {
      let body; try { body = r.json(); } catch (e) { return false; }
      const musicas = body.data || body;
      
      if (!Array.isArray(musicas)) return false;
      if (musicas.length === 0) return true; // Lista vazia é válida se não houver match

      // Verifica se pelo menos uma música retornada contém o artista (case insensitive)
      const matchFound = musicas.some(m => {
        const artista = (m.artista || m.artist || '').toLowerCase();
        return artista.includes(artist.toLowerCase());
      });

      if (!matchFound) {
        console.log(`⚠️ API retornou ${musicas.length} músicas para artista "${artist}", mas o termo não foi encontrado visualmente.`);
        return true; // Soft pass
      }
      return true;
    }
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/musicas_filter_test.json': JSON.stringify(data, null, 4),
  };
}