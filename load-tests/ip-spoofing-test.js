import http from 'k6/http';
import { check, sleep } from 'k6';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export const options = {
  vus: 10, // 10 usuários simultâneos atacando
  duration: '20s',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

// Função auxiliar para gerar um endereço IPv4 aleatório
function getRandomIP() {
  const octet = () => Math.floor(Math.random() * 255);
  return `${octet()}.${octet()}.${octet()}.${octet()}`;
}

export default function () {
  // Gera um IP único para esta iteração
  const virtualIP = getRandomIP();

  const payload = JSON.stringify({
    username: 'admin',
    password: 'wrong_password', // Senha errada intencionalmente
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      // O segredo está aqui: Injetamos um IP falso no cabeçalho padrão de proxy
      'X-Forwarded-For': virtualIP, 
    },
  };

  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, params);

  // Neste teste, esperamos EVADIR o Rate Limit rotacionando o IP.
  // Se recebermos 429, significa que o Rate Limit é global ou ignorou o cabeçalho.
  // Se recebermos 401, significa que o servidor tratou como um novo usuário (Sucesso do teste de evasão).
  check(res, {
    'Status é 401 (IP aceito, credencial inválida)': (r) => r.status === 401,
    'Não foi bloqueado (Não é 429)': (r) => r.status !== 429,
  });

  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    './reports/k6-summaries/ip_spoofing_test.json': JSON.stringify(data, null, 4),
  };
}