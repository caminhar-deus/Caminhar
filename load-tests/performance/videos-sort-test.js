import { createSortTest, generateReport } from '../helpers/resource-test-runner.js';

// Lição do cron #19 (22/10/2026): o contrato de `sort` de /api/videos é o
// ENUM `recent | oldest | alpha | alpha_desc` — não existe `order` nem
// `sort=created_at`. Enviar `?sort=created_at&order=desc` caía no fallback
// `recent` da rota e o teste validava o default, não o parâmetro.
//
// `limit: 12` casa com o limite real do componente `VideoGallery.js`
// (que envia `limit=12`): a chave de cache pública é
// `public_videos:<page>:<limit>[:<search>]:<sort>`, então um limit diferente
// mediria OUTRA entrada de cache, não a que o usuário de fato usa.
const resourceConfig = {
  publicEndpoint: '/api/videos',
  sortMode: 'recent',
  limit: 12,
  itemsPath: 'data',
  resourceName: 'videos',
  profileName: 'light',
};

const sortTest = createSortTest(resourceConfig);

export const options = sortTest.options;

export default sortTest.default;

export function handleSummary(data) {
  return generateReport(data, sortTest.reportName);
}
