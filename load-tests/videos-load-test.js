import { createLoadTest, generateReport } from './helpers/resource-test-runner.js';

const resourceConfig = {
  endpoint: '/api/videos',
  requireAuth: true,
  useSpoofIP: true,
  resourceName: 'videos',
  profileName: 'medium',
  tags: { name: 'ListVideos_Page1' },
  checkResponse: () => ({
    'retornou objeto com videos': (r) => {
      const body = r.json();
      return typeof body === 'object' && (body?.data?.videos === undefined || Array.isArray(body.data.videos));
    },
    'retornou metadados de paginação': (r) => {
      const body = r.json();
      return body?.data?.pagination !== undefined && typeof body.data.pagination === 'object';
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
          return body?.data?.pagination?.page === 2;
        },
        'limite é 5': (r) => {
          const body = r.json();
          return body?.data?.pagination?.limit === 5;
        },
      },
    },
  ],
};

const loadTest = createLoadTest(resourceConfig);

export const options = loadTest.options;
export { setup } from './helpers/auth.js';

export default loadTest.default;

export function handleSummary(data) {
  return generateReport(data, loadTest.reportName);
}