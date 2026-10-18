import { describe, test, expect, beforeAll } from '@jest/globals';

import nextConfig from '../../next.config.js';

/**
 * Hardening de `/uploads/*` vive em `headers()` do `next.config.js`, e não em
 * `res.setHeader` da rota `pages/api/uploads/[...path].js`.
 *
 * A ordem de execução do Next 16.4.1 é `headers` (1) → … → filesystem `public/`
 * (5) → `afterFiles` rewrites (6), e o `rewrites()` do projeto não tem chave de
 * fase. Consequências que estes testes travam:
 *
 * - Um `setHeader` na rota cobriria **só** o diretório ativo. O arquivo legado em
 *   `public/uploads/` é servido estaticamente, no passo 5, **antes** do rewrite
 *   que leva `/uploads/*` à rota — ele nunca veria o header.
 * - O CSP da aplicação é `<meta http-equiv>` (`pages/_document.js`) e, por
 *   definição, não vale para uma resposta servida como documento próprio. Sem
 *   este header, um `.svg` colocado no diretório executaria script em navegação
 *   direta, na origem do site.
 */
describe('next.config.js — hardening de /uploads/*', () => {
  let headers;

  beforeAll(async () => {
    headers = await nextConfig.headers();
  });

  const ruleFor = (source) => headers.find((r) => r.source === source);

  test('existe uma regra de headers() para /uploads/:path*', () => {
    expect(ruleFor('/uploads/:path*')).toBeDefined();
  });

  test('a regra aplica Content-Security-Policy com sandbox', () => {
    // `sandbox` é o que neutraliza execução de script; `default-src 'none'`
    // impede que a resposta carregue qualquer subrecurso. Vale para qualquer
    // arquivo que apareça no diretório, inclusive os que não são imagem.
    const csp = ruleFor('/uploads/:path*').headers.find((h) => h.key === 'Content-Security-Policy');
    expect(csp).toBeDefined();
    expect(csp.value).toBe("default-src 'none'; sandbox");
  });

  test('a regra global aplica X-Content-Type-Options: nosniff', () => {
    // Vem da regra `/(.*)`, que cobre também o caminho legado servido
    // estaticamente — por isso a rota não o repete.
    const global = ruleFor('/(.*)');
    expect(global).toBeDefined();
    const nosniff = global.headers.find((h) => h.key === 'X-Content-Type-Options');
    expect(nosniff?.value).toBe('nosniff');
  });

  test('o rewrite de /uploads/* é afterFiles (sem chave de fase)', () => {
    // Se algum dia ganhar `beforeFiles` ou `fallback`, passaria a rodar antes do
    // filesystem e a análise acima mudaria de válida para obsoleta.
    return expect(nextConfig.rewrites()).resolves.toEqual([
      { source: '/uploads/:path*', destination: '/api/uploads/:path*' },
    ]);
  });
});