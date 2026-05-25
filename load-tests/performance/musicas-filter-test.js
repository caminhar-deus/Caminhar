import { createFilterTest, generateReport } from '../helpers/resource-test-runner.js';

const resourceConfig = {
  publicEndpoint: '/api/musicas',
  searchField: 'search',
  searchValues: ['Aline Barros', 'Fernandinho', 'Gabriela Rocha', 'Diante do Trono', 'Preto no Branco'],
  responsePath: 'data.musicas',
  resourceName: 'musicas',
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