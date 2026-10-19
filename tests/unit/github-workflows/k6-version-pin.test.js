/**
 * Testes do pin de versão do k6 em `.github/workflows/*.yml`.
 *
 * A action `grafana/setup-k6-action` monta a URL de download do release como
 * `releases/download/v<k6-version>/k6-v<k6-version>-linux-amd64.tar.gz` — ou
 * seja, o prefixo `v` é acrescentado PELA ACTION. Escrever `k6-version: 'v2.3.0'`
 * produz `vv2.3.0` e um 404: foi exatamente o que derrubou o run #15 (18/10/2026).
 * Sem `k6-version`, a action instala a latest a cada semana, e uma mudança de
 * versão pode alterar métricas e comportamento do k6 sem que nada no
 * repositório mude — a comparação entre artifacts de runs diferentes deixa de
 * ser válida.
 *
 * Os testes PERCORREM todos os `.yml` de `.github/workflows/` em vez de fixar
 * `test-base.yml`: se alguém criar outro workflow com a action, ele passa a ser
 * verificado automaticamente. O YAML é lido do disco (fonte única de verdade),
 * como no teste do `test-coverage.yml`.
 */
import fs from 'fs';
import path from 'path';
import { describe, it, expect } from '@jest/globals';
import YAML from 'yaml';

const DIR_WORKFLOWS = path.resolve(process.cwd(), '.github/workflows');

/** Trecho do `uses` que identifica a action do k6, em qualquer versão do ref. */
const ACAO_K6 = 'setup-k6-action';

/**
 * Valor aceito para `k6-version`: só dígitos e pontos, SEM o prefixo `v`.
 * A action acrescenta o `v` sozinha ao montar a URL do release.
 */
const SEM_PREFIXO_V = /^\d+\.\d+\.\d+$/;

/**
 * Forma da URL de download que a action monta a partir do valor pinado.
 * Segura o contrato `releases/download/v<versão>/k6-v<versão>-linux-amd64.tar.gz`.
 */
const FORMA_URL_RELEASE =
  /releases\/download\/v\d+\.\d+\.\d+\/k6-v\d+\.\d+\.\d+-linux-amd64\.tar\.gz$/;

/** Nomes dos arquivos de workflow no disco (`.yml` e `.yaml`). */
function arquivosWorkflow() {
  return fs
    .readdirSync(DIR_WORKFLOWS)
    .filter(nome => /\.ya?ml$/.test(nome))
    .sort();
}

/** Workflow parseado do disco. */
function carregarWorkflow(nome) {
  return YAML.parse(fs.readFileSync(path.join(DIR_WORKFLOWS, nome), 'utf8'));
}

/**
 * Descobre TODOS os usos de `setup-k6-action` varrendo todos os workflows,
 * qualquer job e qualquer step. Cada uso devolve arquivo, job, `uses` e `with`.
 */
function usosDaAcao() {
  const usos = [];
  for (const nome of arquivosWorkflow()) {
    const workflow = carregarWorkflow(nome);
    for (const [jobNome, job] of Object.entries(workflow.jobs || {})) {
      for (const step of job.steps || []) {
        if (typeof step.uses === 'string' && step.uses.includes(ACAO_K6)) {
          usos.push({ arquivo: nome, job: jobNome, uses: step.uses, with: step.with || {} });
        }
      }
    }
  }
  return usos;
}

/**
 * Helper que monta a URL de download a partir do valor lido no workflow. Ele
 * NÃO é código da action: é a nossa tradução testável da regra de formação de
 * URL documentada (e comprovada no run #15, quando `v2.3.0` virou `vv2.3.0`).
 * Existe só para tornar explícito o motivo de o valor não poder levar `v`.
 */
function montarUrlDownload(versao) {
  return `https://github.com/grafana/k6/releases/download/v${versao}/k6-v${versao}-linux-amd64.tar.gz`;
}

describe('setup-k6-action — pin de versão do k6 nos workflows', () => {
  const usos = usosDaAcao();

  it('existe pelo menos um uso de setup-k6-action no repositório', () => {
    // Guarda dos demais testes: se a action sumir de todos os workflows, os
    // testes por uso ficariam verdes sem verificar nada (loop vazio).
    expect(usos.length).toBeGreaterThanOrEqual(1);
  });

  // Um teste por uso descoberto: se um novo workflow ganhar a action, ele é
  // coberto automaticamente, sem mexer neste arquivo.
  for (const uso of usos) {
    const rotulo = `${uso.arquivo} › job "${uso.job}"`;

    it(`${rotulo} fixa k6-version explicitamente`, () => {
      // Sem pin, a action instala a latest a cada semana e a comparação entre
      // artifacts de runs diferentes deixa de ser válida.
      expect(uso.with['k6-version']).toBeDefined();
      expect(typeof uso.with['k6-version']).toBe('string');
    });

    it(`${rotulo} usa k6-version SEM prefixo v (regressão do run #15)`, () => {
      // Esta é a asserção que teria reprovado o run #15: o valor `v2.3.0`
      // produziria `vv2.3.0` na URL da action e um 404 no download.
      expect(uso.with['k6-version']).toMatch(SEM_PREFIXO_V);
    });

    it(`${rotulo} produz a URL de release no formato esperado`, () => {
      const url = montarUrlDownload(uso.with['k6-version']);

      expect(url).toMatch(FORMA_URL_RELEASE);
      expect(url).not.toContain('vv');
    });
  }

  /**
   * Controle negativo: prova que as regras acima têm dentes. O primeiro caso
   * simula a regressão do run #15 (valor com `v`) e mostra que a URL e a regex
   * a rejeitariam; o segundo aplica a URL a todos os valores reais lidos.
   */
  describe('controle negativo — a regra do prefixo v tem dentes', () => {
    it('um valor com v produziria vv na URL e reprovaria na regex', () => {
      const urlRuim = montarUrlDownload('v2.3.0');

      expect(urlRuim).toContain('releases/download/vv2.3.0/');
      expect(urlRuim).toContain('k6-vv2.3.0-linux-amd64.tar.gz');
      expect('v2.3.0').not.toMatch(SEM_PREFIXO_V);
      expect(urlRuim).not.toMatch(FORMA_URL_RELEASE);
    });

    it('todos os valores pinados hoje geram URL no formato correto, sem vv', () => {
      for (const uso of usos) {
        const url = montarUrlDownload(uso.with['k6-version']);

        expect(url).toMatch(FORMA_URL_RELEASE);
        expect(url).not.toContain('vv');
      }
    });
  });
});
