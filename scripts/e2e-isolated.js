#!/usr/bin/env node
/**
 * E2E isolado: Cypress contra dados REAIS em um banco DESCARTÁVEL.
 *
 * ## Por que este script existe
 *
 * `npm run cypress:run` depende do banco de desenvolvimento (`.env` →
 * `DATABASE_URL`) para renderizar `/blog`, `/blog/[slug]` e a home. Isso cria
 * dois problemas: (1) os specs só passam se o banco de dev estiver semeado do
 * jeito certo; (2) qualquer sujeira gerada pela execução fica no banco de
 * desenvolvimento.
 *
 * Este orquestrador resolve os dois ao espelhar o padrão que o repo já usa nos
 * testes com banco real (`tests/global-setup.db.js`):
 *
 *   1. Sobe um PostgreSQL efêmero via Testcontainers (`postgres:15`, mesma tag
 *      do serviço `postgres` do CI) — SEM `.withReuse(true)`, então cada run
 *      nasce limpo e morre junto com o script.
 *   2. Aplica as migrations **no container** (`scripts/migrate.js` lê
 *      `process.env.DATABASE_URL`).
 *   3. Semeia posts publicados: o principal (`mulher-virtuosa`, com imagem
 *      fixture servida pelo Next a partir de `public/`) mais 3 de apoio, sem
 *      imagem. Os de apoio existem porque `BlogSection.js:59` só renderiza o
 *      link "ver mais" (`href="/blog"`) quando há mais de `limit` posts, e a
 *      home é montada com `limit={3}` — logo são necessários ao menos 4.
 *      Sem `image_url` eles também exercitam o caminho "post sem imagem"
 *      (`pages/blog/[slug].js:86`).
 *   4. Sobe `next start` como processo filho apontando para o container.
 *   5. Aguarda a app responder em http://localhost:3000.
 *   6. Executa `npx cypress run` e **propaga o exit code** (falha do Cypress é
 *      falha deste script).
 *   7. `finally`: derruba os filhos, para o container e apaga os artefatos
 *      `cypress/videos/` e `cypress/screenshots/`.
 *
 * ## Garantias
 *
 * - O `DATABASE_URL` do banco de desenvolvimento **nunca** é passado às
 *   crianças: `DATABASE_URL` é sempre sobrescrito com a URL do container
 *   (o `dotenv`/`@next/env` não sobrescreve variáveis já presentes no env, então
 *   o valor do container vence o `.env`).
 * - O `.stop()` do container roda **no `finally`**, com `try/catch` próprio que
 *   registra a falha sem abortar as demais etapas de limpeza. (Diferente do
 *   `jest.teardown.js`, onde o `.stop()` está dentro do `try` e o `catch` da
 *   linha 48 engole qualquer exceção anterior — se algo lançar antes, o
 *   container vaza.)
 * - Ctrl+C/SIGTERM disparam a mesma limpeza.
 *
 * ## Uso
 *
 *   node scripts/e2e-isolated.js
 *   npm run test:e2e:isolated
 */

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import testcontainersPostgres from '@testcontainers/postgresql';
import pg from 'pg';

const { PostgreSqlContainer } = testcontainersPostgres;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cwd = (rel) => path.join(ROOT, rel);

/** Mesma tag do CI (`.github/workflows/test-base.yml`) e de `tests/global-setup.db.js`. */
const POSTGRES_IMAGE = 'postgres:15';
const E2E_DATABASE = 'caminhar_e2e';
const E2E_USERNAME = 'e2e';
const E2E_PASSWORD = 'e2e';

/** Mesma base URL do `cypress.config.js:27`. */
const BASE_URL = 'http://localhost:3000';
const PORT = 3000;

const SLUG = 'mulher-virtuosa';
const IMAGE_URL = '/e2e-fixture-mulher-virtuosa.jpg';

/** Espera pela app — mesma ordem de grandeza do `SERVER_WAIT_MAX_MS` de `scripts/warm-routes.js`. */
const SERVER_WAIT_MAX_MS = 120000;
const SERVER_WAIT_INTERVAL_MS = 1000;

/** Margem para o SIGTERM dos filhos antes do SIGKILL. */
const CHILD_STOP_GRACE_MS = 5000;

/** Diretórios de artefato gerados por `cypress run` (config: video + screenshotOnRunFailure). */
const ARTIFACT_DIRS = ['cypress/videos', 'cypress/screenshots'];

/**
 * Env das crianças (app, migrations, seed e Cypress).
 *
 * - `DATABASE_URL`/`DATABASE_SSL`: apontam SÓ para o container. `DATABASE_SSL=false`
 *   garante que um eventual `DATABASE_SSL`/`sslmode` do `.env` de dev não tente
 *   negociar TLS com o Postgres local do container.
 * - `JWT_SECRET`/`SITE_URL`: o build e o runtime exigem valores definidos.
 * - `UPSTASH_*` vazios: desligam o Redis compartilhado, forçando o fallback em
 *   memória que o `lib/infra/redis.js` já suporta. Evita tanto ler cache de
 *   listagem gravado por outra execução quanto gravar resíduo fora do banco.
 */
function buildChildEnv(databaseUrl) {
  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DATABASE_SSL: 'false',
    JWT_SECRET: 'e2e-isolated-jwt-secret',
    SITE_URL: BASE_URL,
    NODE_ENV: 'production',
    UPSTASH_REDIS_REST_URL: '',
    UPSTASH_REDIS_REST_TOKEN: '',
  };
}

function log(message) {
  console.log(`\n▶ [e2e-isolated] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Processos filhos que precisam morrer no teardown (app, Cypress, etc.). */
const children = [];
let container = null;
let cleanupStarted = false;

/**
 * Spawn com grupo de processos próprio (`detached`) para que o teardown possa
 * matar a árvore inteira (`kill(-pid)`), não só o wrapper do `npx`.
 */
function spawnChild(command, args, env) {
  const child = spawn(command, args, {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    detached: true,
  });
  // Sem `unref()`: o handle do filho mantém o event loop vivo enquanto o
  // pai espera o 'close' (sem isso o Node poderia sair com code 0 no meio
  // do `await` do Cypress).
  child.on('error', (error) => {
    console.error(`❌ [e2e-isolated] Erro ao lançar "${command}":`, error.message);
  });
  children.push(child);
  return child;
}

function isAlive(child) {
  return child.pid && child.exitCode === null && child.signalCode === null;
}

function killTree(child, signal) {
  if (!isAlive(child)) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // processo já morreu
    }
  }
}

/** Espera o filho sair; retorna `true` se saiu, `false` se ainda está vivo. */
async function waitForExit(child, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (isAlive(child) && Date.now() < deadline) {
    await sleep(100);
  }
  return !isAlive(child);
}

/**
 * Derruba todos os filhos: SIGTERM na árvore, espera com grace, depois SIGKILL.
 * Nunca lança: teardown tem que completar mesmo com erro em um filho.
 */
async function stopChildren() {
  const alive = children.filter(isAlive);
  if (alive.length === 0) return;

  log(`Encerrando ${alive.length} processo(s) filho(s)...`);
  for (const child of alive) killTree(child, 'SIGTERM');

  await Promise.all(alive.map((child) => waitForExit(child, CHILD_STOP_GRACE_MS)));

  for (const child of alive) {
    if (isAlive(child)) {
      log(`Processo ${child.pid} não respondeu ao SIGTERM — enviando SIGKILL.`);
      killTree(child, 'SIGKILL');
      await waitForExit(child, 2000);
    }
  }
}

/**
 * Arquivos versionados dentro de um diretório, como conjunto de paths relativos
 * à raiz do repo.
 *
 * O cleanup NUNCA pode apagar arquivo rastreado. `cypress/videos/*.mp4` chegou a
 * ser commitado neste repositório (2,8 MB de artefato de execução), então um
 * `rm -rf` da pasta inteira apagaria conteúdo versionado do working tree —
 * foi exatamente o que aconteceu na primeira execução deste script, e o
 * `git status` apareceu com 5 exclusões de `.mp4`.
 *
 * @param {string} dir diretório relativo à raiz do repo
 * @returns {Set<string>}
 */
function trackedFilesIn(dir) {
  const result = spawnSync('git', ['ls-files', '-z', '--', dir], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  // Sem git (ou erro): devolve vazio e o comportamento é o de antes, só que
  // nesse cenário não há repositório para versionar conteúdo.
  if (result.error || result.status !== 0 || !result.stdout) return new Set();
  return new Set(result.stdout.split('\0').filter(Boolean));
}

/**
 * Remove os artefatos do Cypress preservando qualquer arquivo rastreado.
 *
 * Remove arquivo a arquivo em vez de apagar o diretório inteiro: assim o
 * diretório sobrevive se ainda contiver algo versionado, e some de verdade
 * quando a última execução foi totalmente limpa.
 *
 * @param {string} dir diretório relativo à raiz do repo
 * @returns {number} quantos arquivos foram removidos
 */
function removeUntrackedArtifacts(dir) {
  const abs = cwd(dir);
  if (!fs.existsSync(abs)) return 0;

  const tracked = trackedFilesIn(dir);
  let removed = 0;

  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      const rel = path.relative(ROOT, full);

      if (entry.isDirectory()) {
        walk(full);
        // Só remove a pasta se tiver sobrado nada versionado dentro dela.
        if (fs.readdirSync(full).length === 0) fs.rmSync(full, { recursive: true, force: true });
      } else if (!tracked.has(rel)) {
        fs.rmSync(full, { force: true });
        removed += 1;
      }
    }
  };

  walk(abs);
  return removed;
}

/**
 * Teardown. Cada etapa tem `try/catch` próprio: uma falha não pode impedir as
 * próximas (foi exatamente esse o bug do `jest.teardown.js`).
 */
async function cleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;

  // 1. App/Cypress (e qualquer outro filho remanescente)
  try {
    await stopChildren();
  } catch (error) {
    console.error('❌ [e2e-isolated] Falha ao encerrar filhos:', error?.stack || error);
  }

  // 2. Container descartável — SEMPRE, mesmo se algo antes lançou
  if (container) {
    try {
      await container.stop();
      console.log('✅ [e2e-isolated] Container PostgreSQL descartável finalizado.');
    } catch (error) {
      console.error('❌ [e2e-isolated] Falha ao parar o container (possível vazamento):', error?.stack || error);
    } finally {
      container = null;
    }
  }

  // 3. Artefatos de execução do Cypress — só os NÃO rastreados pelo git
  for (const dir of ARTIFACT_DIRS) {
    try {
      const removed = removeUntrackedArtifacts(dir);
      if (removed > 0) {
        console.log(`🧹 [e2e-isolated] Removidos ${removed} artefato(s) não rastreado(s) de ${dir}/`);
      }
    } catch (error) {
      console.error(`❌ [e2e-isolated] Falha ao remover ${dir}/:`, error?.message);
    }
  }
}

/** Roda um comando síncrono (migrations/build) e aborta com mensagem clara se falhar. */
function runStep(label, command, args, env) {
  log(`${label} (${command} ${args.join(' ')})`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    timeout: 300000,
  });
  if (result.error) {
    throw new Error(`${label}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`${label}: exit code ${result.status}`);
  }
}

/**
 * Posts de apoio, necessários apenas para o `navigation.cy.js` passar.
 *
 * POR QUE EXISTEM: `components/Features/Blog/BlogSection.js:59` só renderiza o
 * `<Link href="/blog">` sob a condição `{limit && posts.length > limit && ...}`,
 * e `components/Features/ContentTabs/index.js:22` monta a home com
 * `limit={3}`. O link "ver mais" — único `href="/blog"` exato que a home
 * possui — portanto só aparece com **4 ou mais** posts publicados.
 * `cypress/e2e/navigation.cy.js:4` depende desse link.
 *
 * Isso não é arbitrário: com 1 post o teste é impossível por construção, e ele
 * foi escrito contra um banco de desenvolvimento que já tinha conteúdo. Baixar
 * o seed para 1 faz o teste 24/25 falhar de novo.
 *
 * Os posts de apoio ficam **sem `image_url`**, o que também deixa o caminho
 * "post sem imagem" exercitado — o `<Image>` só é renderizado quando
 * `post.image_url` é truthy (`pages/blog/[slug].js:86`).
 */
const SUPPORT_POSTS = [
  {
    slug: 'semente-da-fe',
    title: 'A Semente da Fé',
    excerpt: 'Como o.seed de uma vida de fé começa pequeno e cresce.',
  },
  {
    slug: 'fruto-do-espirito',
    title: 'O Fruto do Espírito',
    excerpt: 'Os frutos que amadurecem na prática diária da fé.',
  },
  {
    slug: 'caminho-da-serenidade',
    title: 'O Caminho da Serenidade',
    excerpt: 'Paz em meio à correria: um exercício de espera.',
  },
];

/**
 * Semeia os posts usados pelos specs.
 *
 * Todos com `published=true`, que é obrigatório em dois lugares:
 * `pages/blog/[slug].js:191` filtra a página por `published = true`, e
 * `lib/domain/posts.js:18` marca a listagem como `publishedOnly`.
 */
async function seedPosts(databaseUrl) {
  const total = SUPPORT_POSTS.length + 1;
  log(`Semeando ${total} posts publicados no banco descartável`);
  const client = new pg.Client({ connectionString: databaseUrl, ssl: false });
  try {
    await client.connect();

    const rows = [
      {
        slug: SLUG,
        title: 'Mulher Virtuosa',
        excerpt: 'Quem é a mulher virtuosa? Reflexão baseada em Provérbios 31.',
        content:
          'Mulher virtuosa, quem a encontrará?\n\n' +
          'Provérbios 31:10 — "Mulher virtuosa, quem a encontrará? ' +
          'Seu valor muito acima das pedras preciosas."\n\n' +
          'Conteúdo de teste gerado por scripts/e2e-isolated.js para o E2E isolado. ' +
          'Este post existe apenas no banco descartável da execução.',
        imageUrl: IMAGE_URL,
      },
      ...SUPPORT_POSTS.map((post) => ({
        ...post,
        content:
          `${post.title}\n\nConteúdo de teste gerado por scripts/e2e-isolated.js. ` +
          'Este post de apoio existe para que o link "ver mais" da home seja ' +
          'renderizado (BlogSection.js:59 exige mais de 3 posts) e vive apenas ' +
          'no banco descartável da execução.',
        imageUrl: null,
      })),
    ];

    for (const post of rows) {
      await client.query(
        `INSERT INTO posts (title, slug, excerpt, content, image_url, published)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (slug) DO UPDATE
         SET title = EXCLUDED.title,
             excerpt = EXCLUDED.excerpt,
             content = EXCLUDED.content,
             image_url = EXCLUDED.image_url,
             published = true,
             updated_at = CURRENT_TIMESTAMP`,
        [post.title, post.slug, post.excerpt, post.content, post.imageUrl],
      );
    }

    // Valida o que os specs realmente dependem, em vez de confiar no INSERT:
    // o post com imagem precisa existir, e a listagem precisa ter mais de 3.
    const principal = await client.query(
      'SELECT slug, published, image_url FROM posts WHERE slug = $1',
      [SLUG],
    );
    const row = principal.rows[0];
    if (!row || row.published !== true || !row.image_url) {
      throw new Error(`Seed inválido: ${JSON.stringify(row)}`);
    }

    const { rows: contagem } = await client.query(
      'SELECT count(*)::int AS total FROM posts WHERE published = true',
    );
    if (contagem[0].total < 4) {
      throw new Error(
        `Seed insuficiente: ${contagem[0].total} posts publicados, ` +
          'são necessários ao menos 4 para o link "ver mais" da home ' +
          '(BlogSection.js:59 com limit={3}).',
      );
    }

    console.log(
      `✅ [e2e-isolated] ${contagem[0].total} posts semeados ` +
        `(principal: ${row.slug}, image=${row.image_url})`,
    );
  } finally {
    await client.end().catch(() => {});
  }
}

/** Espera a app responder HTTP 200 em `/`; falha cedo se o processo morrer. */
async function waitForServer(appChild) {
  const startedAt = Date.now();
  log(`Aguardando a app em ${BASE_URL} (máx. ${SERVER_WAIT_MAX_MS / 1000}s)`);
  while (Date.now() - startedAt < SERVER_WAIT_MAX_MS) {
    if (!isAlive(appChild)) {
      throw new Error(`O processo "next start" saiu antes de ficar pronto (exit=${appChild.exitCode}).`);
    }
    try {
      const response = await fetch(`${BASE_URL}/`, {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'Caminhar-E2E-Isolated/1.0' },
      });
      if (response.status === 200) {
        console.log(`✅ [e2e-isolated] App disponível em ${BASE_URL} após ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
        return;
      }
    } catch {
      // ECONNREFUSED embrulhado como "fetch failed" — normal durante o boot
    }
    await sleep(SERVER_WAIT_INTERVAL_MS);
  }
  throw new Error(`App não respondeu em ${BASE_URL} após ${SERVER_WAIT_MAX_MS / 1000}s.`);
}

/** Diagnóstico de pré-voo da rota crítica do spec — NÃO é contorno de bug.
 *
 * O bug de compilação preguiçosa de rota dinâmica (Turbopack) só existe em
 * `next dev`: em `next build` todas as rotas são compiladas antes do boot, então
 * não há nada a "aquecer" aqui. O fetch serve para confirmar que a app está
 * servindo o post semeado ANTES de disparar o Cypress — é o que dá um erro
 * claro e único quando o seed está errado, em vez de 25 falhas espalhadas do
 * Cypress. Não substitui o `cypress run`. */
async function warmCriticalRoute() {
  try {
    const response = await fetch(`${BASE_URL}/blog/${SLUG}`, {
      signal: AbortSignal.timeout(30000),
      headers: { 'User-Agent': 'Caminhar-E2E-Isolated/1.0' },
    });
    if (response.status === 200) {
      console.log(`✅ [e2e-isolated] HTTP 200 (warm-up): /blog/${SLUG}`);
    } else {
      console.warn(`⚠️ [e2e-isolated] HTTP ${response.status} (warm-up): /blog/${SLUG} — o Cypress decidirá.`);
    }
  } catch (error) {
    console.warn(`⚠️ [e2e-isolated] Warm-up de /blog/${SLUG} falhou: ${error.message}`);
  }
}

/** Executa o Cypress e devolve o exit code (nunca engole a falha). */
async function runCypress(env) {
  log('Executando: npx cypress run');
  const cypress = spawnChild('npx', ['cypress', 'run'], env);

  const code = await new Promise((resolve) => {
    cypress.on('error', (error) => {
      console.error('❌ [e2e-isolated] Falha ao lançar o Cypress:', error.message);
      resolve(1);
    });
    cypress.on('close', (exitCode, signal) => {
      resolve(exitCode ?? (signal ? 1 : 0));
    });
  });

  console.log(`\n▶ [e2e-isolated] cypress run finalizou com exit code ${code}`);
  return code;
}

async function main() {
  let cypressCode;
  let databaseUrl;
  let clientEnv;

  try {
    // ── 1. Banco descartável ────────────────────────────────────────────────
    log(`Subindo ${POSTGRES_IMAGE} (Testcontainers, sem reuse)`);
    container = await new PostgreSqlContainer(POSTGRES_IMAGE)
      .withDatabase(E2E_DATABASE)
      .withUsername(E2E_USERNAME)
      .withPassword(E2E_PASSWORD)
      .start();

    databaseUrl = container.getConnectionUri();
    clientEnv = buildChildEnv(databaseUrl);
    console.log(`✅ [e2e-isolated] Container PostgreSQL: ${databaseUrl}`);

    // ── 2. Migrations no container (NUNCA no banco de dev) ─────────────────
    runStep('Aplicando migrations no banco descartável', process.execPath, ['scripts/migrate.js'], clientEnv);

    // ── 3. Seed de 1 post publicado com imagem ─────────────────────────────
    await seedPosts(databaseUrl);

    // ── 4. Build (só se não houver .next) + `next start` ───────────────────
    if (!fs.existsSync(cwd('.next/BUILD_ID'))) {
      log('.next/BUILD_ID ausente — compilando com o banco descartável');
      runStep('Build de produção', 'npx', ['next', 'build'], clientEnv);
    } else {
      log('Reaproveitando o build existente em .next/');
    }

    log('Subindo next start na porta 3000');
    const app = spawnChild('npx', ['next', 'start', '-p', String(PORT)], clientEnv);

    // ── 5. Aguarda a app ───────────────────────────────────────────────────
    await waitForServer(app);
    await warmCriticalRoute();

    // ── 6. Cypress (exit code propagado) ───────────────────────────────────
    cypressCode = await runCypress(clientEnv);
  } finally {
    // ── 7. Teardown incondicional ─────────────────────────────────────────
    await cleanup();
  }

  return cypressCode;
}

for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
  process.on(signal, () => {
    console.warn(`\n⚠️ [e2e-isolated] ${signal} recebido — limpando antes de sair.`);
    cleanup()
      .catch((error) => {
        console.error('❌ [e2e-isolated] Falha na limpeza por sinal:', error?.stack || error);
      })
      .finally(() => process.exit(code));
  });
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch(async (error) => {
    console.error('\n❌ [e2e-isolated] Falha crítica:', error?.stack || error);
    // `cleanup()` é idempotente: se o `finally` já rodou, não repete.
    try {
      await cleanup();
    } catch {
      // já registrado acima
    }
    process.exit(1);
  });
