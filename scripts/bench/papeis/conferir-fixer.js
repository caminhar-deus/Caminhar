#!/usr/bin/env node
/**
 * Confere, **fora do modelo**, se a correção de cada execução do bench de papel do
 * `fixer` realmente faz o que a tarefa pedia.
 *
 * O bench restaura o repo entre execuções, então a correção já não está no disco. Aqui
 * ela é **reaplicada** a partir do que o modelo gravou, e a suíte é rodada de verdade.
 * O que o modelo **disse** não vale; o que o código faz, vale.
 *
 * Três verificações:
 * 1. o teste novo **falha** no código original (prova que ele testa o defeito);
 * 2. o teste novo **passa** no código corrigido (prova que a correção funciona);
 * 3. a suíte existente continua verde (prova que nada quebrou).
 */
import { spawn } from 'node:child_process';
import { readFile, writeFile, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { aplicarRegressao } from './regressao-s1.js';

const RAIZ = path.resolve(import.meta.dirname, '..', '..', '..');
const DIR = path.join(RAIZ, 'scripts', 'bench', 'papeis');
const SAIDA = path.join(DIR, 'resultados');

const ALVO_PRODUCAO = 'pages/api/status.js';

const STDIO = ['ignore', 'pipe', 'pipe'];

function executar(comando, args, opcoes = {}) {
  return new Promise((resolve, reject) => {
    const filho = spawn(comando, args, { cwd: RAIZ, stdio: STDIO, ...opcoes });
    let stdout = '';
    let stderr = '';
    filho.stdout?.on('data', (d) => { stdout += d; });
    filho.stderr?.on('data', (d) => { stderr += d; });
    filho.on('error', reject);
    filho.on('close', (codigo) => resolve({ codigo, stdout, stderr }));
  });
}

/** Aplica as edições do modelo a partir do .ndjson da execução. */
function extrairEdicoes(ndjson) {
  const escritas = [];
  const edicoes = [];
  for (const linha of ndjson.split('\n')) {
    if (!linha.trim()) continue;
    let evento;
    try { evento = JSON.parse(linha); } catch { continue; }
    const parte = evento?.part;
    if (!parte || parte.type !== 'tool') continue;
    const entrada = parte.state?.input || {};
    const alvo = (entrada.filePath || entrada.path || '').replace(`${RAIZ}/`, '');
    if (parte.tool === 'write' && typeof entrada.content === 'string') {
      escritas.push({ alvo, conteudo: entrada.content });
    } else if (parte.tool === 'edit' && typeof entrada.oldString === 'string') {
      edicoes.push({ alvo, antigo: entrada.oldString, novo: entrada.newString });
    }
  }
  return { escritas, edicoes };
}

async function aplicarEscritas(escritas) {
  for (const e of escritas) {
    const caminho = path.join(RAIZ, e.alvo);
    await rm(caminho, { force: true });
    await writeFile(caminho, e.conteudo, 'utf8');
  }
}

async function aplicarEdicoes(edicoes) {
  for (const e of edicoes) {
    const caminho = path.join(RAIZ, e.alvo);
    let atual;
    try { atual = await readFile(caminho, 'utf8'); } catch { continue; }
    if (!atual.includes(e.antigo)) continue;
    await writeFile(caminho, atual.replace(e.antigo, e.novo), 'utf8');
  }
}

/** Roda o jest e devolve se passou. */
async function rodarJest(alvos) {
  const args = ['jest', ...alvos, '--silent', '--no-coverage'];
  const r = await executar('npx', args);
  const texto = `${r.stdout}${r.stderr}`;
  const passou = !/Tests:\s+\d+ failed/i.test(texto) && !/\d+ failed, \d+ passed/i.test(texto);
  const resumo = (texto.match(/Tests:.*$/m) || texto.match(/Suites:.*$/m) || [''])[0];
  return { passou, resumo: resumo.trim(), codigo: r.codigo };
}

/** Deixa o repo como estava antes da verificação. */
async function restaurar() {
  const r = await executar('git', ['status', '--porcelain']);
  for (const linha of r.stdout.split('\n').filter((l) => l.trim())) {
    const codigo = linha.slice(0, 2);
    const caminho = linha.slice(3);
    if (caminho.startsWith('scripts/bench')) continue;
    if (codigo.trim() === '??') await executar('rm', ['-rf', caminho]);
    else await executar('git', ['checkout', '--', caminho]);
  }
}

async function main() {
  const arquivos = (await readdir(SAIDA)).filter((f) => f.startsWith('fixer-') && f.endsWith('.ndjson')).sort();
  if (arquivos.length === 0) {
    console.error('Nenhuma execução do bench de papel do fixer.');
    process.exitCode = 1;
    return;
  }

  const linhas = [];
  for (const arquivo of arquivos) {
    const ndjson = await readFile(path.join(SAIDA, arquivo), 'utf8');
    const { escritas, edicoes } = extrairEdicoes(ndjson);
    const testesNovos = escritas.filter((e) => e.alvo.startsWith('tests/')).map((e) => e.alvo);
    const mexeuNoTesteExistente = edicoes.some((e) => e.alvo === 'tests/integration/api/status.test.js')
      || escritas.some((e) => e.alvo === 'tests/integration/api/status.test.js');
    const mexeuNaProducao = edicoes.some((e) => e.alvo === ALVO_PRODUCAO);

    // 1. o teste novo, no código ORIGINAL, tem de falhar
    await restaurar();
    // Desde 21/10 o S1 está corrigido no HEAD: o "código original" da tarefa é
    // o disco com a regressão plantada (o mesmo que a execução viu).
    await aplicarRegressao(RAIZ);
    await aplicarEscritas(escritas);
    const noOriginal = await rodarJest(testesNovos);

    // 2. o teste novo, no código CORRIGIDO, tem de passar
    await restaurar();
    await aplicarRegressao(RAIZ);
    await aplicarEscritas(escritas);
    await aplicarEdicoes(edicoes);
    const noCorrigido = await rodarJest(testesNovos);

    // 3. a suíte inteira, com a correção aplicada
    const suíte = await rodarJest([]);

    await restaurar();

    linhas.push({
      arquivo,
      testesNovos,
      mexeuNoTesteExistente,
      mexeuNaProducao,
      falhaNoOriginal: !noOriginal.passou,
      passaNoCorrigido: noCorrigido.passou,
      suiteVerde: suíte.passou,
      resumoOriginal: noOriginal.resumo,
      resumoCorrigido: noCorrigido.resumo,
      resumoSuite: suíte.resumo,
    });
  }

  console.log('Verificação fora do modelo — o código corrigido, de verdade\n');
  console.log('| execução | corrigiu produção | teste novo | falha no original | passa no corrigido | suíte verde |');
  console.log('|---|---|---|---|---|---|');
  for (const l of linhas) {
    console.log(`| ${l.arquivo} | ${l.mexeuNaProducao ? 'sim' : '**NÃO**'} | ${l.testesNovos.length ? l.testesNovos.map((t) => `\`${t}\``).join(', ') : '**nenhum**'} | ${l.falhaNoOriginal ? 'sim' : '**não**'} | ${l.passaNoCorrigido ? 'sim' : '**não**'} | ${l.suiteVerde ? 'sim' : '**não**'} |`);
  }
  console.log('\nDetalhe:');
  for (const l of linhas) {
    console.log(`\n### ${l.arquivo}`);
    console.log(`- editou teste existente (regra 1 da tarefa): ${l.mexeuNoTesteExistente ? 'SIM' : 'não'}`);
    console.log(`- teste novo falha no código original: ${l.falhaNoOriginal ? 'sim' : 'NÃO (não prova o defeito)'}`);
    console.log(`- teste novo passa no código corrigido: ${l.passaNoCorrigido ? 'sim' : 'NÃO'}`);
    console.log(`- suíte inteira verde: ${l.suiteVerde ? 'sim' : 'NÃO'}`);
    if (l.resumoSuite) console.log(`- suíte: ${l.resumoSuite}`);
  }
}

main().catch((erro) => {
  console.error(`ERRO: ${erro.message}`);
  process.exitCode = 1;
});
