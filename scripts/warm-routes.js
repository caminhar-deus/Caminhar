#!/usr/bin/env node
/**
 * Script de pré-aquecimento (warm-up) de rotas dinâmicas do Next.js.
 *
 * ## Problema
 *
 * O Next.js 16 com Turbopack (--turbo) apresenta um bug onde rotas dinâmicas
 * como /blog/[slug].js podem falhar com o erro:
 *
 *   "PageNotFoundError: Cannot find module for page: /blog/{slug}"
 *   code: 'ENOENT'
 *
 * Isso ocorre porque o Turbopack não compila o módulo da rota dinâmica até
 * que ela seja solicitada pela primeira vez. A página HTML retorna um 404
 * genérico do Next.js ("This page could not be found"), mesmo que:
 *   - O post exista no banco de dados
 *   - A rota de dados SSR (_next/data) funcione perfeitamente
 *   - Após compilada, a rota continue funcionando normalmente
 *
 * ## Solução
 *
 * Este script força a compilação prévia de todas as rotas dinâmicas usadas
 * nos testes, com múltiplas tentativas e diferentes estratégias de requisição.
 *
 * ## Uso
 *
 *   node scripts/warm-routes.js                              # Aquece rotas padrão dos testes
 *   node scripts/warm-routes.js --slugs a,b,c                # Aquece slugs específicos
 *   node scripts/warm-routes.js --base-url http://localhost:3000  # URL customizada
 *   node scripts/warm-routes.js --retries 5                  # Número de tentativas (padrão: 3)
 *
 * ## Integração com Cypress
 *
 *   npm run warm-routes              # Apenas pré-aquecimento
 *   npm run test:e2e                 # Pré-aquece e executa testes
 *   npm run test:e2e:record          # Pré-aquece e executa com gravação
 *   npm run cypress:run              # Apenas executa testes (sem pré-aquecimento)
 */

const BASE_URL = (process.argv
  .find(a => a.startsWith('--base-url='))
  ?.split('=')[1] || 'http://localhost:3000').replace(/\/+$/, '');

const customSlugs = process.argv
  .find(a => a.startsWith('--slugs='))
  ?.split('=')[1];

const MAX_RETRIES = parseInt(
  process.argv.find(a => a.startsWith('--retries='))?.split('=')[1] || '3',
  10
);

/**
 * Slugs usados nos testes E2E do Cypress.
 * Extraídos de: cypress/e2e/post.cy.js e cypress/e2e/image_zoom.cy.js
 */
const TEST_SLUGS = customSlugs
  ? customSlugs.split(',').map(s => s.trim())
  : ['mulher-virtuosa', 'post-inexistente'];

/**
 * Slugs dos seeds oficiais (para pré-aquecer TODAS as rotas de blog).
 */
const SEED_SLUGS = [
  'bem-vindo-ao-caminhar-com-deus',
  'a-importancia-da-oracao',
  'fe-em-tempos-dificeis',
  'o-poder-da-gratidao',
  'versiculos-para-meditar',
  'proposito-e-vocacao',
];

const PAGES_ROUTES = ['/', '/blog', '/admin'];

function log(type, message) {
  const icons = { info: 'ℹ️', success: '✅', warn: '⚠️', error: '❌', skip: '⏭️', retry: '🔄' };
  const icon = icons[type] || '•';
  console.log(`${icon} [WarmRoutes] ${message}`);
}

/**
 * Detecta se um 404 é do Next.js padrão (Turbopack ENOENT) ou do SSR (notFound: true).
 * - Next.js 404 page: retorna HTML completo com "<title>404: This page could not be found</title>"
 * - SSR notFound: retorna JSON com {"notFound": true}
 * - SSR notFound (navegação): retorna HTML contendo "_next/data" + JSON com notFound
 */
function isNextJsDefault404(text) {
  return text.includes('404: This page could not be found') ||
         text.includes('"statusCode":404') ||
         text.includes('This page could not be found');
}

function isSsrNotFound(text) {
  return text.includes('"notFound":true') ||
         text.includes('"notFound": true') ||
         text.includes('_notFound');
}

async function warmRoute(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}${url}`, {
        signal: AbortSignal.timeout(30000),
        headers: {
          'User-Agent': 'Caminhar-Warmup/1.0',
          'Accept': 'text/html,application/json,*/*',
        },
      });

      if (response.status === 200) {
        log('success', `HTTP 200 (attempt ${attempt}/${retries}): ${url}`);
        return true;
      }

      if (response.status === 404) {
        const text = await response.text();

        // 404 legítimo do SSR (post não existe no banco)
        if (isSsrNotFound(text)) {
          log('skip', `HTTP 404 SSR notFound (attempt ${attempt}/${retries}): ${url}`);
          return true;
        }

        // 404 falso do Turbopack (módulo não compilado)
        if (isNextJsDefault404(text)) {
          if (attempt < retries) {
            log('retry', `Turbopack ENOENT (attempt ${attempt}/${retries}): ${url} — recompilando...`);
            // Pausa maior entre tentativas para dar tempo ao Turbopack
            await new Promise(resolve => setTimeout(resolve, 200 * attempt));
            continue;
          }
          log('warn', `Turbopack ENOENT persistiu após ${retries} tentativas: ${url}`);
          return false;
        }

        // Outro tipo de 404
        log('warn', `HTTP 404 desconhecido (attempt ${attempt}/${retries}): ${url}`);
        return false;
      }

      log('warn', `HTTP ${response.status} (attempt ${attempt}/${retries}): ${url}`);
      return false;

    } catch (error) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        log('warn', `Timeout (attempt ${attempt}/${retries}): ${url}`);
      } else if (error.code === 'ECONNREFUSED') {
        log('error', `Conexão recusada em ${BASE_URL}. Servidor Next.js está rodando?`);
        throw error;
      } else {
        log('error', `${error.message} (attempt ${attempt}/${retries}): ${url}`);
      }
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
  return false;
}

async function warmRoutes() {
  const allSlugs = [...new Set([...TEST_SLUGS, ...SEED_SLUGS])];

  log('info', `Iniciando pré-aquecimento de rotas em ${BASE_URL}`);
  log('info', `Slugs de teste: ${TEST_SLUGS.join(', ')}`);
  log('info', `Slugs de seed: ${SEED_SLUGS.join(', ')}`);
  log('info', `Tentativas por rota: ${MAX_RETRIES}`);

  let hasErrors = false;

  // Fase 1: Páginas estáticas
  log('info', '\n📄 Fase 1: Páginas estáticas');
  for (const route of PAGES_ROUTES) {
    const ok = await warmRoute(route);
    if (!ok) hasErrors = true;
  }

  // Fase 2: Rotas de dados SSR primeiro (mais leves, forçam compilação do módulo)
  log('info', '\n⚙️  Fase 2: Rotas de dados SSR (forçam compilação do [slug].js)');
  for (const slug of allSlugs) {
    await warmRoute(`/_next/data/development/blog/${slug}.json?slug=${slug}`);
  }

  // Fase 3: Rotas dinâmicas /blog/[slug] via SSR data (caminho alternativo)
  log('info', '\n🌐 Fase 3: Rotas dinâmicas /blog/[slug] via SSR data');
  for (const slug of allSlugs) {
    await warmRoute(`/_next/data/development/blog/${slug}.json?slug=${slug}`, 1);
  }

  // Fase 4: Rotas HTML completas /blog/[slug]
  log('info', '\n🏗️  Fase 4: Rotas HTML completas /blog/[slug]');
  for (const slug of allSlugs) {
    const ok = await warmRoute(`/blog/${slug}`);
    if (!ok) hasErrors = true;
  }

  // Fase 5: Verificação dos slugs críticos dos testes
  log('info', '\n🔍 Fase 5: Verificação final dos slugs de teste');
  let allOk = true;
  for (const slug of TEST_SLUGS) {
    const response = await fetch(`${BASE_URL}/blog/${slug}`, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'Caminhar-Verify/1.0' },
    });

    if (response.status === 200) {
      log('success', `HTTP 200 (verificação): /blog/${slug}`);
    } else {
      const text = await response.text();
      const isSsr = isSsrNotFound(text);
      const isDefault404 = isNextJsDefault404(text);

      if (isSsr) {
        log('skip', `HTTP 404 SSR notFound (verificação): /blog/${slug} — esperado para slug inexistente`);
      } else if (isDefault404) {
        log('error', `HTTP 404 Turbopack ENOENT (verificação): /blog/${slug} — falha no pré-aquecimento`);
        allOk = false;
        hasErrors = true;
      } else {
        log('warn', `HTTP 404 (verificação): /blog/${slug} — tipo de 404 não identificado`);
        allOk = false;
        hasErrors = true;
      }
    }
  }

  if (allOk) {
    log('success', '\n✅ Todas as rotas dinâmicas estão compiladas e funcionando!\n');
  } else {
    log('warn', '\n⚠️  Algumas rotas ainda podem falhar no Cypress.\n');
  }

  if (hasErrors) {
    process.exit(1);
  }
}

warmRoutes().catch((error) => {
  log('error', `Falha crítica: ${error.message}`);
  process.exit(1);
});