#!/usr/bin/env node
/**
 * Pontuação do **Camada B** do bench do orchestrator, conferida fora do modelo.
 *
 * O gabarito (`gabarito.md`) é a verdade. Este script confere, para cada execução, se
 * cada item do gabarito foi acertado na resposta — a contagem de arquivos e rotas, o
 * ponto de aplicação da autenticação, a proteção externa, e o `405`.
 *
 * É o mesmo critério de "erro verificável" das outras baterias: uma afirmação que
 * contradiz o gabarito conta como erro, e é o que separa os modelos.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const RAIZ = path.resolve(import.meta.dirname, '..', '..', '..');
const SAIDA = path.join(RAIZ, 'scripts', 'bench', 'orchestrator', 'resultados');

function texto(ndjson) {
  const partes = [];
  for (const linha of ndjson.split('\n')) {
    if (!linha.trim()) continue;
    let evento;
    try { evento = JSON.parse(linha); } catch { continue; }
    const parte = evento?.part;
    if (parte && parte.type === 'text' && typeof parte.text === 'string') partes.push(parte.text);
  }
  return partes.join('\n');
}

// Cada item: [rótulo, teste]. A verdade está conferida no código em 21/10/2026:
// 31 arquivos em pages/api/, **todos** com `export default` (o helper de paginação
// saiu de pages/api/ em 21/10/2026); o Next registra 31 rotas (30 em staticRoutes
// + `uploads/[...path].js`, que é catch-all) e nenhuma delas responde 500.
const ITENS = [
  ['31 arquivos', (r) => /\b31\b/.test(r) && /arquivo/i.test(r)],
  ['31 rotas/handler', (r) => /\b31\b/.test(r) && /(rota|handler)/i.test(r)],
  ['todos são rota', (r) => !/não (é|e uma) rota|não-rota|não é handler/i.test(r)],
  ['ponto de aplicação :305', (r) => r.includes('adminCrudHandler.js:305')],
  ['ip-diagnostico :186', (r) => r.includes('ip-diagnostico.js:186')],
  ['cita o 405', (r) => r.includes('405')],
  ['uploads + next.config', (r) => r.includes('uploads') && r.includes('next.config.js')],
  ['proxy.js', (r) => r.includes('proxy.js')],
];

async function main() {
  const arquivos = (await readdir(SAIDA)).filter((f) => f.endsWith('.t2.ndjson')).sort();
  if (arquivos.length === 0) {
    console.error('Nenhuma execução de turno 2.');
    process.exitCode = 1;
    return;
  }

  const porModelo = new Map();
  for (const arquivo of arquivos) {
    const base = arquivo.replace('.t2.ndjson', '');
    const modelo = base.replace(/-\d+$/, '');
    const r = texto(await readFile(path.join(SAIDA, arquivo), 'utf8'));
    const acertos = ITENS.map(([, fn]) => fn(r));
    if (!porModelo.has(modelo)) porModelo.set(modelo, []);
    porModelo.get(modelo).push({ base, acertos });
  }
  console.log('Camada B — gabarito conferido fora do modelo\n');
  const cab = ITENS.map(([rotulo]) => rotulo.padEnd(22).slice(0, 21));
  console.log(`| ${'modelo'.padEnd(26)} | ${cab.join(' | ')} | erros |`);
  console.log(`|${'-'.repeat(28)}|${ITENS.map(() => '-'.repeat(23)).join('|')}|-------|`);
  for (const execs of porModelo.values()) {
    for (const e of execs) {
      const erros = e.acertos.filter((a) => !a).length;
      const celulas = e.acertos.map((a) => (a ? 'ok' : '**ERRO**').padEnd(21).slice(0, 21));
      console.log(`| ${e.base.padEnd(26)} | ${celulas.join(' | ')} | ${erros} |`);
    }
  }

  console.log('\nTotais por modelo (itens acertados / total de execuções × itens):');
  for (const [modelo, execs] of porModelo) {
    const total = execs.length * ITENS.length;
    const ok = execs.reduce((t, e) => t + e.acertos.filter(Boolean).length, 0);
    const comErro = execs.filter((e) => e.acertos.some((a) => !a)).length;
    console.log(`  ${modelo.padEnd(28)} ${ok}/${total} itens   execuções com ≥1 erro: ${comErro}/${execs.length}`);
  }
}

main().catch((erro) => {
  console.error(`ERRO: ${erro.message}`);
  process.exitCode = 1;
});
