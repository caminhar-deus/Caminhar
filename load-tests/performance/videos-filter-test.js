import { createFilterTest, generateReport } from '../helpers/resource-test-runner.js';

const resourceConfig = {
  publicEndpoint: '/api/videos',
  searchField: 'search',
  searchValues: ['louvor', 'adoração', 'testemunho', 'pregação', 'estudo'],
  responsePath: 'data',
  resourceName: 'videos',
  profileName: 'light',
  optionsOverrides: {
    thresholds: {
      checks: ['rate>0.85'],
    },
  },
};

const filterTest = createFilterTest(resourceConfig);

export const options = filterTest.options;

export default filterTest.default;

export function handleSummary(data) {
  return generateReport(data, filterTest.reportName);
}