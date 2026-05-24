import { createSortTest, generateReport } from '../helpers/resource-test-runner.js';

const resourceConfig = {
  publicEndpoint: '/api/musicas',
  sortField: 'created_at',
  sortOrder: 'desc',
  responsePath: 'data',
  resourceName: 'musicas',
  useExplicitSort: true,
  profileName: 'light',
};

const sortTest = createSortTest(resourceConfig);

export const options = sortTest.options;

export default sortTest.default;

export function handleSummary(data) {
  return generateReport(data, sortTest.reportName);
}