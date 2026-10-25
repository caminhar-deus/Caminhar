/**
 * Paridade orquestrador × disco — `scripts/run-all-load-tests-sequentially.js`
 * × `load-tests/{functional,performance,security}/*.js`.
 *
 * Motivo: `error-gate-coverage.test.js` tem um tripwire que conta ARQUIVOS NO
 * DISCO (30), mas nada garante que os 30 estejam REGISTRADOS no orquestrador.
 * Se alguém apagar uma entrada de `CATEGORIES` mantendo o arquivo, o cron fecha
 * verde com 29/29 e nenhum teste reprova — o arquivo órfão nunca roda.
 *
 * O orquestrador é lido como TEXTO (não importado): no topo ele executa efeitos
 * (checa servidor, k6, `process.exit`), que matariam o worker do Jest.
 *
 * Antes de casar, comentários (`/* *\/` e `//`) são REMOVIDOS — há `cmd:`
 * citado em comentário no arquivo, que geraria falso positivo.
 *
 * Este arquivo NÃO reafirma a contagem 30 (já existe tripwire em
 * `error-gate-coverage.test.js`); o alvo aqui é a paridade entre o registro e
 * o disco, com mensagens que citam o caminho divergente.
 */
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from '@jest/globals';

const DIR_ORQUESTRADOR = path.resolve(process.cwd(), 'scripts/run-all-load-tests-sequentially.js');
const DIR_LOAD_TESTS = path.resolve(process.cwd(), 'load-tests');

/** Subdiretórios que contêm scripts de teste (o `helpers/` fica de fora) —
 * mesma varredura de `todosOsScripts()` em `error-gate-coverage.test.js`. */
const DIRS_SCRIPTS = ['functional', 'performance', 'security'];

/** Remove comentários de bloco e de linha antes de casar (stripper textual). */
function removerComentarios(texto) {
  return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * Extrai os caminhos registrados em `cmd: 'k6 run ...'` do orquestrador.
 *
 * Regex tolerante a flags intermediárias: nem toda entrada é
 * `k6 run <path>` — `login-negative-test` é
 * `k6 run -e ADMIN_USERNAME= -e ADMIN_PASSWORD= load-tests/security/login-negative-test.js`.
 * O caminho é o primeiro token que começa com `load-tests/`.
 */
function caminhosRegistrados() {
  const texto = removerComentarios(fs.readFileSync(DIR_ORQUESTRADOR, 'utf8'));
  const caminhos = [];
  const regex = /cmd:\s*'([^']+)'/g;
  let m;
  while ((m = regex.exec(texto)) !== null) {
    const caminho = m[1].match(/\b(load-tests\/[^\s']+)/);
    if (caminho) {
      caminhos.push(caminho[1]);
    } else {
      // Registro sem caminho reconhecível entra na comparação como-is: ele
      // aponta para "algo" que o teste de paridade não consegue achar no disco.
      caminhos.push(`(sem caminho): ${m[1]}`);
    }
  }
  return caminhos;
}

/** Caminhos no disco, relativos à raiz do projeto, como `load-tests/<dir>/<nome>`. */
function caminhosNoDisco() {
  const caminhos = [];
  for (const dir of DIRS_SCRIPTS) {
    const absoluto = path.join(DIR_LOAD_TESTS, dir);
    for (const nome of fs.readdirSync(absoluto).sort()) {
      if (nome.endsWith('.js')) {
        caminhos.push(`load-tests/${dir}/${nome}`);
      }
    }
  }
  return caminhos;
}

describe('orquestrador × disco — paridade dos scripts k6 registrados', () => {
  const registrados = caminhosRegistrados();
  const noDisco = caminhosNoDisco();

  it('extraiu registros do orquestrador (sanidade do parser textual)', () => {
    // Tripwire do próprio teste: se o formato de `cmd:` mudar e o regex não
    // casar mais, "nenhum registro aponta para arquivo inexistente" passaria
    // por vazio — aqui a extração vazia reprova.
    expect(registrados.length).toBeGreaterThan(0);
    expect(registrados.every((c) => !c.startsWith('(sem caminho)'))).toBe(true);
  });

  it('nenhum arquivo do disco ficou sem registro no orquestrador', () => {
    const conjuntoRegistrados = new Set(registrados);
    const orfaos = noDisco.filter((c) => !conjuntoRegistrados.has(c));

    // Envelope com a lista: a falha cita exatamente qual caminho está órfão
    // (arquivo existe mas nunca roda — o cron ficaria verde com menos testes).
    expect({ arquivosSemRegistro: orfaos }).toEqual({ arquivosSemRegistro: [] });
  });

  it('nenhum registro aponta para arquivo inexistente no disco', () => {
    const conjuntoDisco = new Set(noDisco);
    const inexistentes = registrados.filter((c) => !conjuntoDisco.has(c));

    // Envelope com a lista: a falha cita o caminho registrado cujo arquivo
    // sumiu (o orquestrador quebraria em runtime com "no such file").
    expect({ registrosSemArquivo: inexistentes }).toEqual({ registrosSemArquivo: [] });
  });

  it('nenhum caminho registrado aparece duas vezes', () => {
    const contagem = new Map();
    for (const caminho of registrados) {
      contagem.set(caminho, (contagem.get(caminho) ?? 0) + 1);
    }
    const duplicados = [...contagem.entries()].filter(([, n]) => n > 1).map(([c]) => c);

    // Envelope com a lista: a falha cita o caminho duplicado (duas entradas
    // executam o mesmo script e inflam passed/total).
    expect({ caminhosDuplicados: duplicados }).toEqual({ caminhosDuplicados: [] });
  });
});
