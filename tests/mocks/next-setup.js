/**
 * Setup Automático de Mocks do Next.js
 * 
 * Centraliza os jest.mock() para módulos do Next.js, eliminando duplicação
 * em dezenas de arquivos de teste.
 * 
 * Basta importar este arquivo no início de qualquer arquivo de teste:
 *   import '../../mocks/next-setup.js';
 * 
 * Para sobrescrever um mock específico, declare jest.mock() local APÓS o import.
 * 
 * @see tests/mocks/next.js para implementações individuais dos mocks
 */

import {
  mockNextImage,
  mockNextLink,
  mockNextHead,
  mockNextScript,
  mockNextDynamic,
} from './next.js';

// =============================================================================
// next/router (Pages Router)
// =============================================================================
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn().mockResolvedValue(true),
    replace: jest.fn().mockResolvedValue(true),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    events: { on: jest.fn(), off: jest.fn(), emit: jest.fn() },
    isFallback: false,
    isLocaleDomain: false,
    isReady: true,
    isPreview: false,
    basePath: '',
    locale: 'pt-BR',
    locales: ['pt-BR', 'en'],
    defaultLocale: 'pt-BR',
    domainLocales: [],
  })),
}));

// =============================================================================
// next/navigation (App Router)
// =============================================================================
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn().mockResolvedValue(undefined),
    replace: jest.fn().mockResolvedValue(undefined),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
  redirect: jest.fn(),
  notFound: jest.fn(),
  permanentRedirect: jest.fn(),
}));

// =============================================================================
// next/image
// =============================================================================
jest.mock('next/image', () => ({
  __esModule: true,
  default: mockNextImage,
}));

// =============================================================================
// next/link
// =============================================================================
jest.mock('next/link', () => ({
  __esModule: true,
  default: mockNextLink,
}));

// =============================================================================
// next/head
// =============================================================================
jest.mock('next/head', () => ({
  __esModule: true,
  default: mockNextHead,
}));

// =============================================================================
// next/script
// =============================================================================
jest.mock('next/script', () => ({
  __esModule: true,
  default: mockNextScript,
}));

// =============================================================================
// next/dynamic
// =============================================================================
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: mockNextDynamic,
}));

// =============================================================================
// next/headers (App Router)
// =============================================================================
jest.mock('next/headers', () => ({
  headers: jest.fn(() => Promise.resolve({
    get: jest.fn(() => null),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(() => false),
    forEach: jest.fn(),
    entries: jest.fn(() => []),
    keys: jest.fn(() => []),
    values: jest.fn(() => []),
  })),
  cookies: jest.fn(() => Promise.resolve({
    get: jest.fn(() => undefined),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(() => false),
    getAll: jest.fn(() => []),
  })),
}));

// =============================================================================
// next/server
// =============================================================================
jest.mock('next/server', () => {
  const originalModule = jest.requireActual('next/server');
  return {
    ...originalModule,
    NextResponse: {
      ...originalModule.NextResponse,
      json: jest.fn(originalModule.NextResponse.json),
      redirect: jest.fn(originalModule.NextResponse.redirect),
      next: jest.fn(originalModule.NextResponse.next),
    },
  };
});