/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure runtime settings to avoid Edge Runtime warnings
  serverExternalPackages: ['bcryptjs', 'jsonwebtoken'],

  // Turbopack is the default builder since Next 16, so the `webpack()` block
  // that used to sit here (`resolve.fallback` silencing `fs`, `path`, `url` and
  // `crypto` for the client bundle) was being SILENTLY IGNORED: Turbopack never
  // reads a `webpack` config, and the build only succeeded because the npm
  // scripts passed `--turbo`. Drop the flag with the config still present and
  // `next build` aborts with:
  //   ERROR: This build is using Turbopack, with a 'webpack' config and no 'turbopack' config.
  // So the config was removed and replaced by the Turbopack-native equivalent
  // below, following `node_modules/next/dist/docs/.../upgrading/version-16.md`.
  //
  // READ THIS HONESTLY: this is defense in depth, NOT load-bearing. The guide
  // itself says "it is preferable to refactor your modules so that client code
  // doesn't ever import from modules using Node.js native modules" — and that
  // is already the case here: the build passes without any of these aliases
  // ever being applied, i.e. nothing in the client bundle needs them today.
  // They exist only so a FUTURE client-side import of one of these built-ins
  // degrades to an empty module instead of failing the bundle with
  // "Module not found". If a real need ever appears, fix the import first.
  //
  // Only the `browser` condition is supported by Turbopack conditional aliasing
  // (see `turbopack.md`), so server-side resolution keeps hitting the real
  // built-ins — same intent as the old `if (!isServer)`.
  turbopack: {
    resolveAlias: {
      fs: { browser: './utils/empty-browser-module.js' },
      path: { browser: './utils/empty-browser-module.js' },
      url: { browser: './utils/empty-browser-module.js' },
      crypto: { browser: './utils/empty-browser-module.js' },
    },
  },

  // `images.qualities` defaults to `[75]` since Next 16: `/_next/image` accepts
  // ONLY the listed qualities and answers 400 for anything else.
  // `components/Performance/ImageOptimized.js` ships `quality = 75`, i.e. it
  // worked by coincidence with the default, not by design. Declaring it here
  // makes the contract explicit — any new `quality` must be appended to this
  // array, otherwise the image optimizer rejects it with 400.
  images: {
    qualities: [75],
  },

  // `/uploads/*` era servido estaticamente de `public/`, mas `next start`
  // tira um snapshot de `public/` no início do processo: imagem enviada em
  // runtime recebia URL de sucesso que respondia 404 até o restart. Os
  // uploads agora vivem FORA de `public/` e são servidos por
  // `pages/api/uploads/[...path].js`.
  //
  // Como `rewrites()` padrão roda DEPOIS da checagem do filesystem
  // (afterFiles), o comportamento fica:
  //   - arquivo já conhecido em `public/uploads` (legado) -> servido pelo
  //     próprio Next, sem passar pela rota;
  //   - qualquer outro `/uploads/...` (novo ou gravação em runtime) -> rewrite
  //     -> rota, que lê o disco a cada request (sem snapshot) e ainda faz
  //     fallback para `public/uploads`.
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ];
  },

  // Configure headers for CORS and security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' }
        ]
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGINS || '',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-API-Key',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
      {
        source: '/api/admin/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',')[0] : '',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-API-Key',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
      {
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',')[0] : '',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-API-Key',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
      {
        source: '/api/helper/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',')[0] : '',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-API-Key',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
