import { createFilterTest, generateReport } from './helpers/resource-test-runner.js';

const resourceConfig = {
  publicEndpoint: '/api/videos',
  searchField: 'search',
  searchValues: ['louvor', 'adoração', 'testemunho', 'pregação', 'estudo'],
  itemsPath: 'data.videos',
  responsePath: 'data',
  resourceName: 'videos',
  profileName: 'light',
};

const filterTest = createFilterTest(resourceConfig);

export const options = filterTest.options;

export default filterTest.default;

export function handleSummary(data) {
  return generateReport(data, filterTest.reportName);
}