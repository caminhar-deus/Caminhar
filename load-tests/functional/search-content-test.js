import http from 'k6/http';
import { check } from 'k6';
import { randomSleep } from '../helpers/sleep.js';
import { BASE_URL } from '../helpers/config.js';
import { getProfile } from '../helpers/profiles.js';
import { generateReport } from '../helpers/report.js';

export const options = getProfile('light', {
  iterations: 10,
});

// Termos comuns que provavelmente existem no banco de dados
const SEARCH_TERMS = ['Deus', 'Jesus', 'amor', 'fé', 'vida', 'caminho', 'luz'];

export default function () {
  // Seleciona um termo aleatório
  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  
  // Realiza a busca
  const res = http.get(`${BASE_URL}/api/posts?search=${encodeURIComponent(term)}&page=1&limit=10`);

  const success = check(res, {
    'Status é 200': (r) => r.status === 200,
    'Retornou estrutura válida (Array)': (r) => {
      try {
        const body = r.json();
        return Array.isArray(body.data) || Array.isArray(body);
      } catch (e) {
        return false;
      }
    },
    'Resultados contêm o termo (se houver)': (r) => {
      if (r.status !== 200) return false;

      let body;
      try { body = r.json(); } catch (e) { return false; }

      const posts = body.data || body;
      
      if (!Array.isArray(posts)) return false;
      if (posts.length === 0) return true;

      // Verifica se pelo menos um dos posts retornados contém o termo (case insensitive)
      const matchFound = posts.some(post => {
        const title = (post.title || '').toLowerCase();
        const content = (post.content || post.excerpt || post.description || '').toLowerCase();
        const tags = Array.isArray(post.tags) ? post.tags.join(' ') : (typeof post.tags === 'string' ? post.tags : '');
        
        const searchTerm = term.toLowerCase();
        return title.includes(searchTerm) || content.includes(searchTerm) || tags.toLowerCase().includes(searchTerm);
      });

      if (!matchFound) {
        const titles = posts.map(p => p.title).slice(0, 3).join(', ');
        console.error(`❌ Busca retornou resultados (${titles}...), mas termo "${term}" não foi encontrado nos campos title, content ou tags. Verifique o mecanismo de busca.`);
      }
      
      return matchFound;
    }
  });

  if (!success && __ITER === 0) {
    console.log(`❌ Falha na busca. Status: ${res.status}. Response: ${res.body}`);
  }

  randomSleep(0.5, 3);
}

export function handleSummary(data) {
  return generateReport(data, 'search_content_test');
}