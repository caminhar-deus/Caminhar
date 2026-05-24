import { createSortTest, generateReport } from '../helpers/resource-test-runner.js';

const resourceConfig = {
  publicEndpoint: '/api/videos',
  sortField: 'created_at',
  sortOrder: 'desc',
  itemsPath: 'data.videos',
  resourceName: 'videos',
  useExplicitSort: false,
  profileName: 'light',
};

const sortTest = createSortTest(resourceConfig);

export const options = sortTest.options;

export default sortTest.default;

export function handleSummary(data) {
  return generateReport(data, sortTest.reportName);
}