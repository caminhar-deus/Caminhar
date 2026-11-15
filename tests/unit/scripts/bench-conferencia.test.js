/** @jest-environment node */
/**
 * Funções puras da conferência do orchestrator (`scripts/bench/orchestrator/conferencia.js`).
 *
 * O caminho que importa é o negativo: o turno 2 não pode ser contado como
 * "não orquestrou", resposta vazia com timeout não pode ser atribuída a
 * delegação em background, e citação ambígua não pode ser declarada válida com
 * um arquivo escolhido ao acaso.
 */
import { describe, it, expect } from '@jest/globals';
import {
  avaliarCitacao,
  rotuloDelegacao,
  rotuloTimeout,
  turnoDaExecucao,
} from '../../../scripts/bench/orchestrator/conferencia.js';

describe('turnoDaExecucao', () => {
  it('reconhece o turno 2 pelo sufixo da saída', () => {
    expect(turnoDaExecucao('deepseek-v4.1-flash-free-1.ndjson')).toBe(1);
    expect(turnoDaExecucao('deepseek-v4.1-flash-free-1.t2.ndjson')).toBe(2);
  });
});

describe('rotuloDelegacao', () => {
  it('cobra delegação no turno 1', () => {
    expect(rotuloDelegacao(1, 0)).toBe('**não**');
    expect(rotuloDelegacao(1, 2)).toBe('sim (2)');
  });

  it('não trata o turno 2 como falha de orquestração', () => {
    expect(rotuloDelegacao(2, 0)).toBe('n/a (turno 2)');
    expect(rotuloDelegacao(2, 1)).toBe('n/a — t2 (1)');
  });
});

describe('rotuloTimeout', () => {
  it('só marca quando o .meta.json registrou timeout', () => {
    expect(rotuloTimeout(true)).toMatch(/timeout/);
    expect(rotuloTimeout(false)).toBeNull();
    expect(rotuloTimeout(undefined)).toBeNull();
  });
});

describe('avaliarCitacao', () => {
  const rota = { caminho: 'pages/api/admin/orders.js', linhas: 120 };
  const outraRota = { caminho: 'pages/api/orders.js', linhas: 100 };
  const dominio = { caminho: 'lib/domain/orders.js', linhas: 80 };

  it('aceita a linha quando só um candidato a tem', () => {
    expect(avaliarCitacao('orders.js', [10], {
      escritos: [rota],
      porNome: [rota, { caminho: 'x.js', linhas: 5 }],
    })).toEqual({ invalidas: [], ambiguas: [], alvoReal: rota.caminho });
  });

  it('aceita a linha pelo caminho escrito, mesmo com homônimo que também a tem', () => {
    // Regressão de 14/11/2026: `pages/api/dicas.js:3` era acusada de ambígua porque
    // `pages/api/admin/dicas.js` também tem a linha 3. O caminho escrito responde.
    const avaliacao = avaliarCitacao('pages/api/dicas.js', [3], {
      escritos: [{ caminho: 'pages/api/dicas.js', linhas: 40 }],
      porNome: [{ caminho: 'pages/api/dicas.js', linhas: 40 }, { caminho: 'pages/api/admin/dicas.js', linhas: 90 }],
    });
    expect(avaliacao).toEqual({ invalidas: [], ambiguas: [], alvoReal: 'pages/api/dicas.js' });
  });

  it('não desce para o homônimo quando o caminho escrito já tem a linha', () => {
    const avaliacao = avaliarCitacao('orders.js', [64], {
      escritos: [outraRota],
      porNome: [outraRota, rota, dominio],
    });
    expect(avaliacao).toEqual({ invalidas: [], ambiguas: [], alvoReal: outraRota.caminho });
  });

  it('desce para o nome-base quando o caminho escrito não tem a linha', () => {
    // `dicas.js:97`: `pages/api/dicas.js` tem 53 linhas, o alvo é `admin/dicas.js`.
    const avaliacao = avaliarCitacao('dicas.js', [97], {
      escritos: [{ caminho: 'pages/api/dicas.js', linhas: 53 }],
      porNome: [{ caminho: 'pages/api/dicas.js', linhas: 53 }, { caminho: 'pages/api/admin/dicas.js', linhas: 140 }],
    });
    expect(avaliacao).toEqual({ invalidas: [], ambiguas: [], alvoReal: 'pages/api/admin/dicas.js' });
  });

  it('marca ambígua quando a camada de nome-base tem mais de um candidato', () => {
    const avaliacao = avaliarCitacao('orders.js', [64], {
      escritos: [],
      porNome: [rota, outraRota, dominio],
    });
    expect(avaliacao.invalidas).toEqual([]);
    expect(avaliacao.ambiguas).toEqual([
      'orders.js:64 (cabe em pages/api/admin/orders.js, pages/api/orders.js, lib/domain/orders.js)',
    ]);
    expect(avaliacao.alvoReal).toBeNull();
  });

  it('reprova linha que nenhum candidato tem', () => {
    const avaliacao = avaliarCitacao('orders.js', [130], {
      escritos: [outraRota],
      porNome: [rota, outraRota, dominio],
    });
    expect(avaliacao.ambiguas).toEqual([]);
    expect(avaliacao.alvoReal).toBeNull();
    expect(avaliacao.invalidas).toEqual([
      'orders.js:130 (nenhum candidato tem a linha: pages/api/orders.js (100 linhas) ou pages/api/admin/orders.js (120 linhas) ou lib/domain/orders.js (80 linhas))',
    ]);
  });

  it('não desce para o homônimo quando o caminho escrito existe e a linha não cabe nele', () => {
    // `posts.js:152` no `pages/api/posts.js` (85 linhas) é erro do modelo, não
    // ambiguidade: o ADR-0008 registrou a versão em que isso saía como "válida".
    const avaliacao = avaliarCitacao('pages/api/posts.js', [152], {
      escritos: [{ caminho: 'pages/api/posts.js', linhas: 85 }],
      porNome: [{ caminho: 'pages/api/admin/posts.js', linhas: 171 }, { caminho: 'lib/domain/posts.js', linhas: 181 }],
    });
    expect(avaliacao).toEqual({
      invalidas: ['pages/api/posts.js:152 (o arquivo escrito tem 85 linha(s))'],
      ambiguas: [],
      alvoReal: null,
    });
  });

  it('separa o que é inequívoco do que é ambíguo na mesma citação', () => {
    // `posts.js` escrito sem diretório: a linha 20 cabe na rota auditada (inequívoca);
    // a 152 não cabe nela e cabe em dois homônimos (ambígua, como em 11–13/11).
    const avaliacao = avaliarCitacao('posts.js', [20, 152], {
      escritos: [{ caminho: 'pages/api/posts.js', linhas: 85 }],
      porNome: [{ caminho: 'pages/api/admin/posts.js', linhas: 171 }, { caminho: 'lib/domain/posts.js', linhas: 181 }],
    });
    expect(avaliacao.alvoReal).toBe('pages/api/posts.js');
    expect(avaliacao.ambiguas).toEqual([
      'posts.js:152 (cabe em pages/api/admin/posts.js, lib/domain/posts.js)',
    ]);
    expect(avaliacao.invalidas).toEqual([]);
  });

  it('sem candidato algum, toda linha é inválida', () => {
    expect(avaliarCitacao('inexistente.js', [1])).toEqual({
      invalidas: ['inexistente.js:1 (nenhum arquivo do repositório tem esse nome)'],
      ambiguas: [],
      alvoReal: null,
    });
  });
});
