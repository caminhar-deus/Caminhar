/**
 * Ground truth do disco (scripts/bench/ground-truth.js) e preflight da regressão
 * do S1 (scripts/bench/papeis/regressao-s1.js).
 *
 * Duas camadas:
 * 1. funções puras contra uma fixture temporária — inventário, linhas, parser;
 * 2. canário no repositório real — os cinco instrumentos têm de continuar `ok`
 *    contra o disco (o designer foi recalibrado em 06/11/2026 e reconferido nas
 *    linhas em 07/11/2026).
 */
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  inventarioApi,
  linhasDe,
  linhaUnica,
  fatosOrchestrator,
  extrairCitacoesDeInstrumento,
  verificarInstrumento,
  exigirInstrumentoValido,
} from '../../../scripts/bench/ground-truth.js';
import { aplicarRegressao, verificarRegressao } from '../../../scripts/bench/papeis/regressao-s1.js';

const RAIZ_REPO = process.cwd();
const CALIBRADOS = ['orchestrator', 'explorer', 'oracle', 'fixer', 'designer'];

let fixture;

beforeAll(() => {
  fixture = mkdtempSync(path.join(os.tmpdir(), 'bench-ground-truth-'));
  mkdirSync(path.join(fixture, 'pages', 'api', 'nested'), { recursive: true });
  mkdirSync(path.join(fixture, 'lib'), { recursive: true });
  writeFileSync(path.join(fixture, 'pages', 'api', 'a.js'), 'export default function handler() {}\n');
  writeFileSync(path.join(fixture, 'pages', 'api', 'nested', 'b.js'), 'export const config = {};\n');
  writeFileSync(path.join(fixture, 'pages', 'api', '.oculto.js'), 'export default 1;\n');
  writeFileSync(path.join(fixture, 'lib', 'foo.js'), [
    'const a = 1;',
    'const marcador = true;',
    'const b = 2;',
    'const marcador = true;',
  ].join('\n'));
});

afterAll(() => {
  rmSync(fixture, { recursive: true, force: true });
});

describe('inventário e linhas', () => {
  it('conta arquivos e rotas de pages/api e ignora entradas ocultas', () => {
    const inv = inventarioApi(fixture);
    expect(inv.arquivos).toEqual(['pages/api/a.js', 'pages/api/nested/b.js']);
    expect(inv.totalArquivos).toBe(2);
    expect(inv.totalRotas).toBe(1);
  });

  it('linhasDe devolve todas as ocorrências e [] quando o arquivo não existe', () => {
    expect(linhasDe(fixture, 'lib/foo.js', 'const marcador = true;')).toEqual([2, 4]);
    expect(linhasDe(fixture, 'lib/inexistente.js', 'qualquer')).toEqual([]);
  });

  it('linhaUnica devolve a linha e falha alto em zero ou duas ocorrências', () => {
    expect(linhaUnica(fixture, 'lib/foo.js', 'const b = 2;')).toBe(3);
    expect(() => linhaUnica(fixture, 'lib/foo.js', 'const marcador = true;')).toThrow(/2 ocorrências/);
    expect(() => linhaUnica(fixture, 'lib/foo.js', 'não existe')).toThrow(/nenhuma ocorrência/);
  });
});

describe('fatosOrchestrator', () => {
  it('deriva contagem de rotas e âncoras contra o repositório', () => {
    const fatos = fatosOrchestrator(RAIZ_REPO);
    expect(fatos.arquivos).toBeGreaterThan(0);
    expect(fatos.rotas).toBeGreaterThan(0);
    expect(fatos.withAuthHandler).toBeGreaterThan(0);
    expect(fatos.ipDiagnostico).toBeGreaterThan(0);
    expect(fatos.settingsPost).toBeGreaterThan(0);
    expect(fatos.settingsPut).toBeGreaterThan(0);
    expect(fatos.productsRequireAuth).toBeGreaterThan(0);
    expect(Array.isArray(fatos.productsRequireAuthUsos)).toBe(true);
    expect(fatos.productsRequireAuthUsos.length).toBeGreaterThan(0);
  });
});

describe('parser de citações do instrumento', () => {
  it('associa linhas ao último arquivo, mantém o contexto entre linhas e ignora proporções', () => {
    const texto = [
      'Prefixo `pages/api/a.js:2` e `lib/foo.js`',
      '(:4-6) e (:9).',
      'Contraste 1,36:1 não vira linha.',
      '`fantasma.js`',
      ':1',
    ].join('\n');
    const mapa = extrairCitacoesDeInstrumento(texto);

    expect(mapa.get('pages/api/a.js')).toEqual([{ inicio: 2, fim: 2 }]);
    expect(mapa.get('lib/foo.js')).toEqual([{ inicio: 4, fim: 6 }, { inicio: 9, fim: 9 }]);
    expect(mapa.get('fantasma.js')).toEqual([{ inicio: 1, fim: 1 }]);
  });
});

describe('verificarInstrumento', () => {
  it('exige raiz e agente conhecido', () => {
    expect(() => verificarInstrumento('orchestrator', {})).toThrow(/raiz/);
    expect(() => verificarInstrumento('inexistente', { raiz: fixture })).toThrow(/agente desconhecido/);
  });
});

describe('instrumentos contra o repositório real (canário)', () => {
  it.each(CALIBRADOS)('%s está calibrado contra o disco', (agente) => {
    const resultado = verificarInstrumento(agente, { raiz: RAIZ_REPO });
    expect(resultado.problemas).toEqual([]);
    expect(resultado.ok).toBe(true);
  });

  it('exigirInstrumentoValido lista os problemas e diz como recalibrar', () => {
    // A fixture não tem os documentos de `scripts/bench/`: o verificador
    // encontra problema e o fail-fast precisa transformá-lo em erro acionável.
    expect(() => exigirInstrumentoValido('designer', { raiz: fixture }))
      .toThrow(/Instrumento do papel "designer" divergiu do disco[\s\S]*não existe no disco/);
  });

  it('exigirInstrumentoValido devolve ok quando o instrumento confere', () => {
    const resultado = exigirInstrumentoValido('designer', { raiz: RAIZ_REPO });
    expect(resultado.ok).toBe(true);
  });
});

describe('regressão do S1', () => {
  it('distingue corrigido, regredido, desconhecido e ausente', async () => {
    await expect(verificarRegressao(RAIZ_REPO)).resolves.toMatchObject({ estado: 'corrigido' });

    const copia = mkdtempSync(path.join(os.tmpdir(), 'bench-regressao-'));
    try {
      mkdirSync(path.join(copia, 'pages', 'api'), { recursive: true });
      writeFileSync(
        path.join(copia, 'pages', 'api', 'status.js'),
        readFileSync(path.join(RAIZ_REPO, 'pages', 'api', 'status.js'))
      );
      expect((await verificarRegressao(copia)).estado).toBe('corrigido');
      await aplicarRegressao(copia);
      expect((await verificarRegressao(copia)).estado).toBe('regredido');
    } finally {
      rmSync(copia, { recursive: true, force: true });
    }

    const semBlocos = mkdtempSync(path.join(os.tmpdir(), 'bench-sem-blocos-'));
    try {
      mkdirSync(path.join(semBlocos, 'pages', 'api'), { recursive: true });
      writeFileSync(path.join(semBlocos, 'pages', 'api', 'status.js'), 'conteúdo sem os blocos\n');
      expect((await verificarRegressao(semBlocos)).estado).toBe('desconhecido');
      expect((await verificarRegressao(path.join(semBlocos, 'raiz-inexistente'))).estado).toBe('ausente');
    } finally {
      rmSync(semBlocos, { recursive: true, force: true });
    }
  });
});
