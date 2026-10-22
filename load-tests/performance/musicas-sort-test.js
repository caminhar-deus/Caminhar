import { createSortTest, generateReport } from '../helpers/resource-test-runner.js';

const resourceConfig = {
  publicEndpoint: '/api/musicas',
  // O contrato de `sort` de /api/musicas é `default | positioned | oldest |
  // alpha | alpha_desc` (ADR-0014, 21/10/2026) e a rota REJEITA com 400
  // qualquer valor fora desse conjunto. O valor antigo `recent` saiu do
  // contrato: mandar `?sort=recent` devolveu 400 no cron #19 (22/10/2026),
  // reprovou 2 dos 3 checks deste script e derrubou o job inteiro.
  // `default` é "Mais recentes" (created_at DESC) — a mesma ordenação que o
  // check "Ordenação correta (Decrescente)" valida.
  sortMode: 'default',
  dateField: 'created_at',
  responsePath: 'data',
  resourceName: 'musicas',
  profileName: 'light',
};

const sortTest = createSortTest(resourceConfig);

export const options = sortTest.options;

export default sortTest.default;

export function handleSummary(data) {
  return generateReport(data, sortTest.reportName);
}