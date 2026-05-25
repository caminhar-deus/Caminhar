import { createPaginationTest, generateReport } from '../helpers/resource-test-runner.js';

const resourceConfig = {
  publicEndpoint: '/api/videos',
  itemsPath: 'data',
  resourceName: 'videos',
  limit: 5,
  profileName: 'light',
  optionsOverrides: {
    thresholds: {
      checks: ['rate>0.85'],
    },
  },
};

const paginationTest = createPaginationTest(resourceConfig);

export const options = paginationTest.options;

export default paginationTest.default;

export function handleSummary(data) {
  return generateReport(data, paginationTest.reportName);
}