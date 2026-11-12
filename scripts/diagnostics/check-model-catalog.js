#!/usr/bin/env node
/**
 * Preflight do catálogo de modelos do preset `zen` (provedor `opencode`).
 *
 * Por que existe: um id que saiu do catálogo NÃO é classificado como failover
 * pelo slim (`provider.no-route` chega com `failover: false`), então o agente
 * não cai na reserva — ele quebra em silêncio ou cai no default do provider.
 * A única proteção contra esse modo de falha é conferir o catálogo antes.
 *
 * Fonte de verdade do que os agentes vão usar: `opencode debug agents` (config
 * COMPILADA do serviço em execução, já sem comentários JSONC). O catálogo vem
 * de `opencode models`.
 *
 * Limite conhecido: `debug agents` expõe só o PRIMÁRIO de cada agente; a cadeia
 * de reserva (array no preset) não aparece. Um id de reserva morto não é pego
 * aqui — só no dia em que ela for acionada.
 */
import { execFileSync } from 'node:child_process';
import { agentModels, missingModels, parseCatalog } from './model-catalog.js';

function run(args) {
  return execFileSync('opencode', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
}

function main() {
  let agents;
  let catalog;
  try {
    agents = JSON.parse(run(['debug', 'agents']));
    catalog = parseCatalog(run(['models']));
  } catch (error) {
    // Fail-closed: sem catálogo não há como afirmar que os ids existem.
    console.error('models:check — não foi possível ler o catálogo do OpenCode.');
    console.error(`  motivo: ${error.message.split('\n')[0]}`);
    console.error('  conferir: `opencode debug agents` e `opencode models` respondem?');
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
}

main();
