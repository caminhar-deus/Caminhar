#!/usr/bin/env node
/**
 * Preflight do catálogo de modelos do preset `zen` (provedor `opencode`).
 *
 * Por que existe: um id que saiu do catálogo NÃO é classificado como failover
 * pelo slim (`provider.no-route` chega com `failover: false`), então o agente
 * não cai na reserva — ele quebra em silêncio ou cai no default do provider.
 * A única proteção contra esse modo de falha é conferir o catálogo antes.
 *
 * Duas fontes, de propósito:
 * - `opencode debug agents` (config COMPILADA do serviço em execução, já sem
 *   comentários JSONC) diz o que o host vai usar como PRIMÁRIO de cada agente;
 * - o preset `.opencode/oh-my-opencode-slim.json` é a única fonte da CADEIA DE
 *   RESERVA (`"model": [primário, reserva]`), que não aparece em `debug agents`
 *   nem em `debug config`. Antes de 15/11/2026 um id de reserva morto passava
 *   despercebido por aqui; o custo desse buraco é justamente o modo de falha que
 *   este script existe para pegar.
 *
 * O catálogo vem de `opencode models`.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import {
  agentModels,
  formatCatalogReadError,
  missingModels,
  parseCatalog,
  parseJsonc,
  presetModels,
} from './model-catalog.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..');
const PRESET = path.join(RAIZ, '.opencode', 'oh-my-opencode-slim.json');

function run(args) {
  return execFileSync('opencode', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
}

function readLocalPreset() {
  try {
    return { presets: presetModels(parseJsonc(readFileSync(PRESET, 'utf8'))), presetError: null };
  } catch (error) {
    return { presets: null, presetError: error };
  }
}

function main() {
  const { presets, presetError } = readLocalPreset();

  let agents;
  let catalog;
  try {
    agents = JSON.parse(run(['debug', 'agents']));
    catalog = parseCatalog(run(['models']));
  } catch (error) {
    // Fail-closed: sem catálogo não há como afirmar que os ids existem.
    const presetSummary = presetError
      ? { error: presetError.message.split('\n')[0] }
      : {
          preset: presets?.preset ?? null,
          total: presets?.agentes?.length ?? 0,
          reservas: presets?.agentes?.filter(({ posicao }) => posicao > 0).length ?? 0,
        };
    const { lines } = formatCatalogReadError(error, presetSummary);
    for (const line of lines) console.error(line);
    process.exit(1);
  }

  const models = agentModels(agents);
  if (models.length === 0 || catalog.size === 0) {
    console.error('models:check — nenhum modelo compilado ou catálogo vazio; nada a conferir.');
    process.exit(1);
  }

  console.log(`catálogo: ${catalog.size} ids (\`opencode models\`)`);
  for (const { agent, id } of models) {
    console.log(`  ${agent.padEnd(13)} ${id.padEnd(38)} ${catalog.has(id) ? 'ok' : 'FORA DO CATÁLOGO'}`);
  }

  const missing = missingModels(models, catalog);
  if (missing.length > 0) {
    console.error(`\n${missing.length} id(s) fora do catálogo:`);
    for (const { agent, id } of missing) console.error(`  - ${agent}: ${id}`);
    console.error('\nTrocar o id no preset antes de reiniciar — id morto não cai na reserva.');
    process.exit(1);
  }

  console.log('\ntodos os primários estão no catálogo.');

  // A cadeia de reserva vem do preset: é a única fonte dela.
  if (presetError) {
    console.error('\nmodels:check — não foi possível ler a cadeia de reserva do preset.');
    console.error(`  arquivo: ${path.relative(RAIZ, PRESET)}`);
    console.error(`  motivo: ${presetError.message.split('\n')[0]}`);
    process.exit(1);
  }

  if (presets.agentes.length === 0) {
    console.error('\nmodels:check — o preset não declara modelo nenhum; nada a conferir na cadeia.');
    process.exit(1);
  }

  console.log(`\ncadeia de reserva (preset \`${presets.preset}\`):`);
  const reservas = presets.agentes.filter(({ posicao }) => posicao > 0);
  for (const { agent, id, posicao } of reservas) {
    const rotulo = posicao === 1 ? 'reserva' : `reserva #${posicao}`;
    console.log(`  ${agent.padEnd(13)} ${id.padEnd(38)} ${catalog.has(id) ? 'ok' : 'FORA DO CATÁLOGO'} (${rotulo})`);
  }
  if (reservas.length === 0) {
    console.log('  (nenhuma — o preset declara só primários)');
  }

  const reservasMortas = missingModels(reservas, catalog);
  if (reservasMortas.length > 0) {
    console.error(`\n${reservasMortas.length} id(s) de RESERVA fora do catálogo:`);
    for (const { agent, id } of reservasMortas) console.error(`  - ${agent}: ${id}`);
    console.error('\nA cadeia não cobre id morto (`provider.no-route` não é failover):');
    console.error('trocar a reserva no preset, ou removê-la e assumir o default do provider.');
    process.exit(1);
  }
}

main();
