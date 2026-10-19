/**
 * Testes de caracterização de `load-tests/helpers/profiles.js`.
 *
 * A auditoria da suíte de carga encontrou perda SILENCIOSA de thresholds: hoje,
 * quando `getProfile` recebe `overrides.thresholds`, os thresholds do perfil
 * base são descartados por inteiro em vez de mesclados. Um script que declara
 * thresholds parciais perde os restantes sem nenhum aviso — o k6 roda com menos
 * restrições do que o código sugere e o run continua verde (item AD de
 * `docs/PENDENCIAS_scripts_testes.md`).
 *
 * Estes testes são de CARACTERIZAÇÃO: afirmam o comportamento REAL de hoje,
 * incluindo o descarte, para travar a implementação atual e registrar o defeito
 * de forma executável. A Fase 1 da pendência adicionará o escape hatch
 * `replaceThresholds: true` e fará `getProfile` mesclar thresholds por padrão —
 * nesse momento os casos que marcamos como "limitação conhecida" terão de ser
 * atualizados de propósito (não serão atualizados por acidente).
 *
 * O módulo alvo é JS puro, sem import de k6, então o jest o importa direto:
 * o `babel.jest.config.js` converte os ES Modules para CommonJS.
 */
import { describe, it, expect } from '@jest/globals';
import { PROFILES, getProfile } from '../../../load-tests/helpers/profiles';

/** Mensagem do erro lançado para nomes inválidos — lista os perfis válidos. */
const FRASE_ERRO = /Perfil desconhecido/;

describe('getProfile — caracterização do comportamento atual', () => {
  it('sem overrides devolve exatamente os thresholds do perfil base', () => {
    const perfil = getProfile('light');

    expect(perfil.thresholds).toEqual(PROFILES.light.thresholds);
    expect(perfil.thresholds).toEqual({
      checks: ['rate==1.0'],
      http_req_duration: ['p(95)<500'],
    });
  });

  it('overrides sem thresholds preservam os thresholds do base', () => {
    // Este é o caminho que já funciona: o spread mantém os thresholds do base
    // quando `overrides.thresholds` é undefined.
    const stages = [{ duration: '5s', target: 2 }, { duration: '5s', target: 0 }];
    const perfil = getProfile('light', { stages });

    expect(perfil.stages).toEqual(stages);
    expect(perfil.thresholds).toEqual(PROFILES.light.thresholds);
  });

  it('overrides COM thresholds descartam os do base — limitação CONHECIDA', () => {
    // LIMITAÇÃO CONHECIDA, não desejo: `hasExplicitThresholds` troca o objeto
    // inteiro em vez de mesclar. A Fase 1 (item AD de
    // docs/PENDENCIAS_scripts_testes.md) substituirá a substituição total por
    // merge com escape hatch explícito `replaceThresholds: true` — quando isso
    // acontecer, este caso terá de ser reescrito de propósito.
    const substitutes = { http_req_failed: ['rate<0.01'] };
    const perfil = getProfile('light', { thresholds: substitutes });

    // O descarte é afirmado explicitamente: nada do perfil base sobrevive.
    expect(perfil.thresholds).toEqual(substitutes);
    expect(perfil.thresholds).not.toHaveProperty('checks');
    expect(perfil.thresholds).not.toHaveProperty('http_req_duration');
  });

  it('sobrescrita parcial troca a chave repetida e PERDE a que só existe no base', () => {
    // Mesma limitação conhecida do caso anterior, no modo mais sutil: quem
    // sobrepõe só `checks` provavelmente quer manter `http_req_duration`, mas o
    // resultado atual o descarta. A Fase 1 mudará este resultado para merge.
    const perfil = getProfile('light', { thresholds: { checks: ['rate==0.99'] } });

    expect(perfil.thresholds.checks).toEqual(['rate==0.99']);
    expect(perfil.thresholds.http_req_duration).toBeUndefined();
    expect(Object.keys(perfil.thresholds)).toEqual(['checks']);
  });

  it('recovery e rateLimit devolvem thresholds vazios — intencional, não bug', () => {
    // Os dois perfis foram desenhados sem threshold nenhum (`thresholds: {}`);
    // `recovery-test.js` declarou o seu próprio depois de o perfil existir.
    // Diferente dos casos acima, aqui o vazio É o comportamento correto.
    expect(getProfile('recovery').thresholds).toEqual({});
    expect(getProfile('rateLimit').thresholds).toEqual({});
  });

  it('nome desconhecido lança Error cuja mensagem lista os perfis válidos', () => {
    expect(() => getProfile('desconhecido')).toThrow(Error);
    expect(() => getProfile('desconhecido')).toThrow(FRASE_ERRO);
    for (const nomeValido of Object.keys(PROFILES)) {
      expect(() => getProfile('desconhecido')).toThrow(nomeValido);
    }
  });
});

describe('PROFILES — invariantes da matriz de perfis', () => {
  /** Chaves que definem como o k6 executa o perfil (uma delas é obrigatória). */
  const CHAVES_EXECUCAO = ['vus', 'iterations', 'stages', 'scenarios'];

  it('todo perfil declara thresholds como objeto, nunca undefined, null ou array', () => {
    for (const [nome, perfil] of Object.entries(PROFILES)) {
      // O envelope com o nome do perfil faz a falha apontar o culpado.
      expect({ perfil: nome, thresholds: perfil.thresholds }).toEqual({
        perfil: nome,
        thresholds: expect.any(Object),
      });
      expect(Array.isArray(perfil.thresholds)).toBe(false);
    }
  });

  it('todo perfil declara ao menos uma chave de execução (vus/iterations/stages/scenarios)', () => {
    for (const [nome, perfil] of Object.entries(PROFILES)) {
      const presentes = CHAVES_EXECUCAO.filter(chave => perfil[chave] !== undefined);
      // `arrayContaining([any(String)])` exige pelo menos uma chave presente;
      // o envelope com o nome aponta o perfil sem chave de execução na falha.
      expect({ perfil: nome, chaves: presentes }).toEqual({
        perfil: nome,
        chaves: expect.arrayContaining([expect.any(String)]),
      });
    }
  });
});

/**
 * Controle negativo: o bloco mais importante deste arquivo. Sem ele, seria
 * possível "passar" estes testes com uma implementação que devolve o objeto do
 * módulo por referência — e aí qualquer teste de merge da Fase 1 passaria a
 * enxergar estado contaminado por outro teste. As asserções abaixo só passam
 * porque `getProfile` constrói um objeto novo a cada chamada.
 */
describe('getProfile — controle negativo (o teste tem força)', () => {
  it('devolve objeto novo a cada chamada e mutar o resultado não altera PROFILES', () => {
    const snapshotOriginal = JSON.parse(JSON.stringify(PROFILES.light.thresholds));

    const primeira = getProfile('light');
    const segunda = getProfile('light');

    expect(primeira).not.toBe(segunda);
    expect(primeira.thresholds).not.toBe(PROFILES.light.thresholds);

    // Mutação de propósito no resultado: se o perfil viesse por referência do
    // módulo, este `delete` limparia `PROFILES.light` para todos os testes que
    // viessem depois — a comparação com o snapshot falharia.
    primeira.thresholds.checks = ['rate==0.5'];
    delete primeira.thresholds.http_req_duration;

    expect(PROFILES.light.thresholds).toEqual(snapshotOriginal);
    expect(getProfile('light').thresholds).toEqual(snapshotOriginal);
  });
});
