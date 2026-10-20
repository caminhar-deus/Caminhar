/**
 * Testes de `load-tests/helpers/profiles.js`.
 *
 * ESTADO ATUAL (Fase 1 do item AD de `docs/PENDENCIAS_scripts_testes.md`
 * aplicada): `getProfile` MESCLA `thresholds` por padrão, chave a chave — a
 * chave repetida é substituída pelo override e a que só existe no perfil base
 * é preservada. Os thresholds do perfil base deixaram de ser descartados, o
 * que devolve 10 thresholds a 13 scripts que hoje rodam sem eles; o run de
 * cron #17 (20/10/2026, 30/30 passed) mediu todos esses thresholds voltando
 * e aprovando com folga.
 *
 * Para quem precisa da semântica antiga existe o escape hatch EXPLÍCITO
 * `overrides.replaceThresholds: true`, que descarta o base por inteiro — e a
 * chave não pode vazar para o objeto devolvido, porque esse objeto é o
 * `options` do k6, que não admite chaves desconhecidas.
 *
 * O módulo alvo é JS puro, sem import de k6, então o jest o importa direto:
 * o `babel.jest.config.js` converte os ES Modules para CommonJS.
 */
import { describe, it, expect } from '@jest/globals';
import { PROFILES, getProfile } from '../../../load-tests/helpers/profiles';

/** Mensagem do erro lançado para nomes inválidos — lista os perfis válidos. */
const FRASE_ERRO = /Perfil desconhecido/;

describe('getProfile — merge por padrão e escape hatch explícito', () => {
  it('sem overrides devolve exatamente os thresholds do perfil base', () => {
    const perfil = getProfile('light');

    expect(perfil.thresholds).toEqual(PROFILES.light.thresholds);
    expect(perfil.thresholds).toEqual({
      checks: ['rate==1.0'],
      http_req_duration: ['p(95)<500'],
    });
  });

  it('overrides sem thresholds preservam os thresholds do base', () => {
    // O spread mantém os thresholds do base quando `overrides.thresholds`
    // é undefined.
    const stages = [{ duration: '5s', target: 2 }, { duration: '5s', target: 0 }];
    const perfil = getProfile('light', { stages });

    expect(perfil.stages).toEqual(stages);
    expect(perfil.thresholds).toEqual(PROFILES.light.thresholds);
  });

  it('overrides COM thresholds MESCLAM com os do base', () => {
    // Comportamento novo da Fase 1: `hasExplicitThresholds` não substitui
    // mais o objeto inteiro. A chave do base que não está no override
    // SOBREVIVE, e a chave repetida é SUBSTITUÍDA pelo override.
    const substituto = { http_req_failed: ['rate<0.01'] };
    const perfil = getProfile('light', { thresholds: substituto });

    // Chave só do override entra:
    expect(perfil.thresholds.http_req_failed).toEqual(['rate<0.01']);
    // Chaves só do base sobrevivem:
    expect(perfil.thresholds.checks).toEqual(['rate==1.0']);
    expect(perfil.thresholds.http_req_duration).toEqual(['p(95)<500']);
    expect(perfil.thresholds).toEqual({
      checks: ['rate==1.0'],
      http_req_duration: ['p(95)<500'],
      http_req_failed: ['rate<0.01'],
    });
  });

  it('sobrescrita parcial troca a chave repetida e PRESERVA a que só existe no base', () => {
    // Modo mais sutil do merge: quem sobrepõe só `checks` quer o valor novo
    // de `checks`, mas continua querendo `http_req_duration` do base.
    const perfil = getProfile('light', { thresholds: { checks: ['rate==0.99'] } });

    expect(perfil.thresholds.checks).toEqual(['rate==0.99']);
    expect(perfil.thresholds.http_req_duration).toEqual(['p(95)<500']);
    expect(Object.keys(perfil.thresholds).sort()).toEqual(['checks', 'http_req_duration']);
  });

  it('replaceThresholds: true descarta o base por inteiro — só o override sobrevive', () => {
    // Escape hatch explícito: reproduz a substituição total antiga para quem
    // precisa dela (ex.: `ddos-search-test.js`, cuja tolerância de 50% de 5xx
    // seria contradita pelo `http_req_failed` do perfil `heavy`).
    const perfil = getProfile('light', {
      replaceThresholds: true,
      thresholds: { http_req_failed: ['rate<0.01'] },
    });

    expect(perfil.thresholds).toEqual({ http_req_failed: ['rate<0.01'] });
    expect(perfil.thresholds).not.toHaveProperty('checks');
    expect(perfil.thresholds).not.toHaveProperty('http_req_duration');
  });

  it('replaceThresholds não vaza para o objeto devolvido', () => {
    // O resultado é o `options` do k6: uma chave desconhecida lá é lixo.
    const perfil = getProfile('light', {
      replaceThresholds: true,
      thresholds: { checks: ['rate>0.9'] },
    });

    expect(perfil).not.toHaveProperty('replaceThresholds');
    expect(perfil.replaceThresholds).toBeUndefined();
    expect(JSON.stringify(perfil)).not.toContain('replaceThresholds');
  });

  it('recovery e rateLimit devolvem thresholds vazios — intencional, não bug', () => {
    // Os dois perfis foram desenhados sem threshold nenhum (`thresholds: {}`);
    // `recovery-test.js` declarou o seu próprio depois de o perfil existir.
    // Aqui o vazio É o comportamento correto.
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
 * módulo por referência — e aí os testes de merge passariam a enxergar estado
 * contaminado por outro teste. As asserções abaixo só passam porque `getProfile`
 * constrói um objeto novo a cada chamada.
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
