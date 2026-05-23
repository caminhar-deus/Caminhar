import { createPaginationTest, generateReport } from './helpers/resource-test-runner.js';

const resourceConfig = {
  publicEndpoint: '/api/musicas',
  responsePath: 'data',
  resourceName: 'musicas',
  limit: 5,
  profileName: 'light',
};

const paginationTest = createPaginationTest(resourceConfig);

export const options = paginationTest.options;

export default paginationTest.default;

export function handleSummary(data) {
  return generateReport(data, paginationTest.reportName);
}