import { describe, it, expect } from '@jest/globals';
import { validateMercadoPagoEnv, validateGoogleEnv } from '../../../scripts/check-env.js';

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

  it('alerta em NODE_ENV=production se credenciais TEST- estiverem em uso ou se flags de débito divergirem', () => {
    const testCredsWarnings = validateMercadoPagoEnv({
      NODE_ENV: 'production',
      MP_ACCESS_TOKEN: 'TEST-token-sandbox',
      NEXT_PUBLIC_MP_PUBLIC_KEY: 'TEST-public-sandbox',
      MP_WEBHOOK_SECRET: 'prod-webhook-key',
    });
    expect(testCredsWarnings).toHaveLength(1);
    expect(testCredsWarnings[0]).toMatch(/Credenciais sandbox \(TEST-\)/i);

    const debitMismatchWarnings = validateMercadoPagoEnv({
      NODE_ENV: 'development',
      MP_ENABLE_DEBIT_CARD: 'false',
      NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD: 'true',
    });
    expect(debitMismatchWarnings).toHaveLength(1);
    expect(debitMismatchWarnings[0]).toMatch(/MP_ENABLE_DEBIT_CARD e NEXT_PUBLIC_MP_ENABLE_DEBIT_CARD estão divergentes/);
  });
});

describe('validateGoogleEnv() — scripts/check-env.js', () => {
  it('retorna lista vazia quando variáveis Google estão ausentes ou idênticas', () => {
    expect(validateGoogleEnv({ NODE_ENV: 'production' })).toEqual([]);
    expect(
      validateGoogleEnv({
        NODE_ENV: 'production',
        GOOGLE_CLIENT_ID: '123-abc.apps.googleusercontent.com',
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: '123-abc.apps.googleusercontent.com',
      })
    ).toEqual([]);
  });

  it('alerta quando GOOGLE_CLIENT_ID e NEXT_PUBLIC_GOOGLE_CLIENT_ID divergem sem expor seus valores', () => {
    const serverSecretId = '999-server-only.apps.googleusercontent.com';
    const publicId = '111-public-other.apps.googleusercontent.com';
    const warnings = validateGoogleEnv({
      NODE_ENV: 'production',
      GOOGLE_CLIENT_ID: serverSecretId,
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: publicId,
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/GOOGLE_AUDIENCE_MISMATCH/);
    expect(warnings[0]).not.toContain(serverSecretId);
    expect(warnings[0]).not.toContain(publicId);
  });

  it('alerta quando apenas uma das variáveis do Google OAuth está configurada', () => {
    const serverOnly = validateGoogleEnv({
      GOOGLE_CLIENT_ID: '123.apps.googleusercontent.com',
    });
    expect(serverOnly).toHaveLength(1);
    expect(serverOnly[0]).toMatch(/NEXT_PUBLIC_GOOGLE_CLIENT_ID/);

    const publicOnly = validateGoogleEnv({
      NEXT_PUBLIC_GOOGLE_CLIENT_ID: '123.apps.googleusercontent.com',
    });
    expect(publicOnly).toHaveLength(1);
    expect(publicOnly[0]).toMatch(/GOOGLE_NOT_CONFIGURED/);
  });

  it('alerta quando ALLOW_GOOGLE_DEV_BYPASS=true está definido em NODE_ENV=production', () => {
    const warnings = validateGoogleEnv({
      NODE_ENV: 'production',
      ALLOW_GOOGLE_DEV_BYPASS: 'true',
    });

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/ALLOW_GOOGLE_DEV_BYPASS/);
    expect(warnings[0]).toMatch(/NODE_ENV=production/);
  });
});
