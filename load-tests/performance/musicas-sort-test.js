import { createSortTest, generateReport } from '../helpers/resource-test-runner.js';

const resourceConfig = {
  publicEndpoint: '/api/musicas',
  sortMode: 'recent',
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