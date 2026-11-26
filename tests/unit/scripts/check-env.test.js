import { describe, it, expect } from '@jest/globals';
import { validateMercadoPagoEnv } from '../../../scripts/check-env.js';

describe('validateMercadoPagoEnv() — scripts/check-env.js', () => {
  it('retorna lista vazia quando credenciais estão consistentes ou ausentes fora de produção', () => {
    expect(validateMercadoPagoEnv({ NODE_ENV: 'development' })).toEqual([]);
    expect(
      validateMercadoPagoEnv({
        NODE_ENV: 'production',
        MP_ACCESS_TOKEN: 'APP_USR-prod-token',
        NEXT_PUBLIC_MP_PUBLIC_KEY: 'APP_USR-prod-public-key',
        MP_WEBHOOK_SECRET: 'prod-webhook-secret',
      })
    ).toEqual([]);
  });

  it('alerta quando apenas uma das chaves (server ou public) do Mercado Pago estiver definida', () => {
    const onlyToken = validateMercadoPagoEnv({
      NODE_ENV: 'development',
      MP_ACCESS_TOKEN: 'APP_USR-123',
    });
    expect(onlyToken).toHaveLength(1);
    expect(onlyToken[0]).toMatch(/MP_ACCESS_TOKEN está definida sem NEXT_PUBLIC_MP_PUBLIC_KEY/);

    const onlyPublic = validateMercadoPagoEnv({
      NODE_ENV: 'development',
      NEXT_PUBLIC_MP_PUBLIC_KEY: 'APP_USR-pub',
    });
    expect(onlyPublic).toHaveLength(1);
    expect(onlyPublic[0]).toMatch(/NEXT_PUBLIC_MP_PUBLIC_KEY está definida sem MP_ACCESS_TOKEN/);
  });

  it('alerta quando há mistura de prefixos TEST- e APP_USR- entre token e public key', () => {
    const warnings = validateMercadoPagoEnv({
      NODE_ENV: 'development',
      MP_ACCESS_TOKEN: 'TEST-secret',
      NEXT_PUBLIC_MP_PUBLIC_KEY: 'APP_USR-public',
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/prefixos incompatíveis/);

    const reverseWarnings = validateMercadoPagoEnv({
      NODE_ENV: 'development',
      MP_ACCESS_TOKEN: 'APP_USR-secret',
      NEXT_PUBLIC_MP_PUBLIC_KEY: 'TEST-public',
    });
    expect(reverseWarnings).toHaveLength(1);
    expect(reverseWarnings[0]).toMatch(/prefixos incompatíveis/);
  });

  it('alerta em NODE_ENV=production quando faltam variáveis obrigatórias de pagamento/webhook', () => {
    const warnings = validateMercadoPagoEnv({ NODE_ENV: 'production' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/MP_ACCESS_TOKEN/);
    expect(warnings[0]).toMatch(/NEXT_PUBLIC_MP_PUBLIC_KEY/);
    expect(warnings[0]).toMatch(/MP_WEBHOOK_SECRET/);
  });
});
