import { createLoadTest, generateReport } from './helpers/resource-test-runner.js';

const resourceConfig = {
  endpoint: '/api/admin/musicas',
  requireAuth: true,
  useSpoofIP: true,
  healthCheck: false,
  resourceName: 'musicas',
  profileName: 'medium',
  checkResponse: () => ({
    'retornou lista (array)': (r) => {
      const isJson = r.headers['Content-Type'] && r.headers['Content-Type'].includes('application/json');
      return isJson && r.json('musicas') && Array.isArray(r.json('musicas'));
    },
    'tempo de resposta < 300ms': (r) => r.timings.duration < 300,
  }),
};

const loadTest = createLoadTest(resourceConfig);

export const options = loadTest.options;

// Setup customizado: health check + login com validação de Content-Type
export function setup() {
  return loadTest.setup();
}

export default loadTest.default;

export function handleSummary(data) {
  return generateReport(data, loadTest.reportName);
}