import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

// Métrica personalizada para rastrear especificamente erros do servidor (5xx)
const ErrorRate500 = new Rate('errors_500');

export const options = {
  // Configuração para simular um pico repentino de tráfego (Flash Crowd / DDoS)
  stages: [
    { duration: '10s', target: 100 }, // Ramp-up agressivo para 100 usuários simultâneos
    { duration: '30s', target: 500 }, // Aumenta para 500 usuários (carga muito alta para dev/local)
    { duration: '10s', target: 0 },   // Encerra
  ],
  thresholds: {
    // Em um teste de DDoS, monitoramos principalmente a estabilidade.
    // Se o servidor começar a retornar 500 ou demorar muito, o ataque teve "sucesso" em degradar o serviço.
    http_req_failed: ['rate<0.5'], // Alerta apenas se mais de 50% das requisições falharem
    
    // Configuração para ABORTAR o teste se erros 500 passarem de 10%
    'errors_500': [{ threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '5s' }],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Lista de termos para variar a busca e evitar cache de query exata
const SEARCH_TERMS = ['amor', 'paz', 'fé', 'luz', 'vida', 'caminho', 'verdade', 'esperança', 'coração', 'espírito'];

export default function () {
  // Seleciona um termo aleatório
  const term = SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
  
  // Adiciona um timestamp para "cache busting" (forçar o servidor a processar a requisição)
  // Isso simula atacantes tentando evitar respostas cacheadas por CDNs ou proxies
  const uniqueParam = Date.now(); 

  // Dispara a requisição GET contra a rota de posts (busca)
  const res = http.get(`${BASE_URL}/api/posts?search=${encodeURIComponent(term)}&_t=${uniqueParam}`, {
    tags: { type: 'ddos_search', name: 'DDoS_Search' },
  });

  // Alimenta a métrica: true se for erro 5xx, false caso contrário
  ErrorRate500.add(res.status >= 500);

  check(res, {
    'status 200 (Servidor Resistiu)': (r) => r.status === 200,
    'status 429 (Rate Limit Atuou)': (r) => r.status === 429,
    'status 5xx (Servidor Caiu)': (r) => r.status >= 500,
  });

  // NOTA: Não usamos sleep() aqui intencionalmente.
  // O objetivo é fazer cada VU disparar requisições o mais rápido possível (loop infinito sem pausa).
}

export function handleSummary(data) {
  // Salva o relatório sem expor dados sensíveis (neste teste não há token, mas mantemos o padrão)
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/ddos_search_test.json': JSON.stringify(data, null, 4),
  };
}