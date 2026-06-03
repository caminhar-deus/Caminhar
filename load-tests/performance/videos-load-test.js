import { createLoadTest, generateReport } from '../helpers/resource-test-runner.js';

const resourceConfig = {
  endpoint: '/api/videos',
  requireAuth: true,
  useSpoofIP: false,
  resourceName: 'videos',
  profileName: 'medium',
  tags: { name: 'ListVideos_Page1' },
  checkResponse: () => ({
    // Schema real da API: { success: true, data: [...], pagination: { page, limit, total, totalPages } }
    'retornou objeto com videos': (r) => {
      try {
        const body = r.json();
        if (!body || typeof body !== 'object') return false;
        // Aceita tanto { data: [...] } quanto { success: true, data: [...] } ou body.videos diretamente
        const hasDataArray = Array.isArray(body?.data);
        const hasDirectVideos = Array.isArray(body?.videos);
        const isArray = Array.isArray(body);
        return hasDataArray || hasDirectVideos || isArray;
      } catch (e) {
        return false;
      }
    },
    'retornou metadados de paginação': (r) => {
      try {
        const body = r.json();
        return body?.pagination !== undefined;
      } catch (e) {
        return false;
      }
    },
    'página 1 tempo < 300ms': (r) => r.timings.duration < 300,
  }),
  extraRequests: [
    {
      endpoint: '/api/videos?page=2&limit=5',
      tagName: 'ListVideos_Page2',
      checks: {
        'página 2 status é 200': (r) => r.status === 200,
        'está na página 2': (r) => {
          const body = r.json();
          return body?.pagination?.page === 2;
        },
        'limite é 5': (r) => {
          const body = r.json();
          return body?.pagination?.limit === 5;
        },
      },
    },
  ],
  optionsOverrides: {
    thresholds: {
      'http_req_duration{name:ListVideos_Page1}': ['p(95)<500'],
      'http_req_duration{name:ListVideos_Page2}': ['p(95)<500'],
    },
  },
};

const loadTest = createLoadTest(resourceConfig);

export const options = loadTest.options;

export default loadTest.default;

export function handleSummary(data) {
  return generateReport(data, loadTest.reportName);
}