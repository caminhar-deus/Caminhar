import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 20 },  // Ramp up para 20 usuários
    { duration: '10s', target: 20 }, // Mantém 20 usuários
    { duration: '5s', target: 0 },   // Ramp down para 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95% das requisições devem ser mais rápidas que 100ms
    http_req_failed: ['rate<0.01'],   // Menos de 1% de falhas
  },
};

export default function () {
  const res = http.get('http://localhost:3000/api/v1/health');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response body is ok': (r) => r.json('status') === 'ok',
  });
  
  sleep(1);
}