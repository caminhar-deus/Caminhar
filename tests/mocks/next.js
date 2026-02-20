/**
 * Next.js Mocks
 * Mocks para componentes e hooks do Next.js
 */

import React from 'react';

/**
 * Mock do useRouter do Next.js
 * @param {Object} options - Configurações do router
 * @returns {Object} Router mockado
 */
export const mockUseRouter = (options = {}) => {
  const router = {
    pathname: options.pathname || '/',
    query: options.query || {},
    asPath: options.asPath || '/',
    push: jest.fn().mockResolvedValue(true),
    replace: jest.fn().mockResolvedValue(true),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: options.isFallback || false,
    isLocaleDomain: false,
    isReady: options.isReady !== false,
    isPreview: false,
    basePath: '',
    locale: options.locale || 'pt-BR',
    locales: options.locales || ['pt-BR', 'en'],
    defaultLocale: 'pt-BR',
    domainLocales: [],
    ...options,
  };
  
  return router;
};

/**
 * Mock do Image component do Next.js
 * @param {Object} props - Props do componente
 * @returns {React.ReactElement}
 */
export const mockNextImage = ({ src, alt, width, height, ...props }) => {
  return React.createElement('img', {
    src,
    alt,
    width,
    height,
    ...props,
  });
};

/**
 * Mock do Link component do Next.js
 * @param {Object} props - Props do componente
 * @returns {React.ReactElement}
 */
export const mockNextLink = ({ href, children, ...props }) => {
  return React.createElement('a', { href, ...props }, children);
};

/**
 * Mock do Head component do Next.js
 * @param {Object} props - Props do componente
 * @returns {React.ReactElement}
 */
export const mockNextHead = ({ children }) => {
  return React.createElement(React.Fragment, null, children);
};

/**
 * Mock do Script component do Next.js
 * @param {Object} props - Props do componente
 * @returns {React.ReactElement}
 */
export const mockNextScript = ({ src, strategy, ...props }) => {
  return React.createElement('script', { src, ...props });
};

/**
 * Mock do dynamic import do Next.js
 * @param {Function} importFunc - Função de importação
 * @param {Object} options - Opções do dynamic
 * @returns {Object} Componente dinâmico mockado
 */
export const mockNextDynamic = (importFunc, options = {}) => {
  const Component = () => {
    const [loadedComponent, setLoadedComponent] = React.useState(null);
    
    React.useEffect(() => {
      importFunc().then(mod => {
        setLoadedComponent(() => mod.default || mod);
      });
    }, []);
    
    if (!loadedComponent && options.loading) {
      return options.loading;
    }
    
    return loadedComponent ? React.createElement(loadedComponent) : null;
  };
  
  return Component;
};

/**
 * Mock do getServerSideProps
 * @param {Object} data - Dados para retornar
 * @param {number} status - Status HTTP
 * @returns {Object} Resultado mockado
 */
export const mockGetServerSideProps = (data = {}, status = 200) => {
  return {
    props: {
      ...data,
    },
  };
};

/**
 * Mock do getStaticProps
 * @param {Object} data - Dados para retornar
 * @returns {Object} Resultado mockado
 */
export const mockGetStaticProps = (data = {}) => {
  return {
    props: {
      ...data,
    },
    revalidate: 60,
  };
};

/**
 * Mock do getStaticPaths
 * @param {Array} paths - Lista de paths
 * @returns {Object} Resultado mockado
 */
export const mockGetStaticPaths = (paths = []) => {
  return {
    paths: paths.map(path => ({ params: path })),
    fallback: false,
  };
};

/**
 * Mock do next/headers (App Router)
 * @param {Object} headers - Headers para retornar
 * @returns {Object} Headers mockados
 */
export const mockNextHeaders = (headers = {}) => {
  return {
    get: (name) => headers[name.toLowerCase()] || null,
    set: jest.fn(),
    delete: jest.fn(),
    has: (name) => name.toLowerCase() in headers,
    forEach: (callback) => {
      Object.entries(headers).forEach(([key, value]) => callback(value, key));
    },
    entries: () => Object.entries(headers),
    keys: () => Object.keys(headers),
    values: () => Object.values(headers),
    [Symbol.iterator]: function* () {
      yield* Object.entries(headers);
    },
  };
};

/**
 * Mock do next/cookies (App Router)
 * @param {Object} cookies - Cookies para retornar
 * @returns {Object} Cookies mockados
 */
export const mockNextCookies = (cookies = {}) => {
  return {
    get: (name) => cookies[name] ? { name, value: cookies[name] } : undefined,
    set: jest.fn(),
    delete: jest.fn(),
    has: (name) => name in cookies,
    getAll: () => Object.entries(cookies).map(([name, value]) => ({ name, value })),
    [Symbol.iterator]: function* () {
      yield* Object.entries(cookies).map(([name, value]) => ({ name, value }));
    },
  };
};

/**
 * Configura todos os mocks do Next.js
 * Deve ser chamado no setup ou beforeAll
 */
export const setupNextMocks = () => {
  jest.mock('next/router', () => ({
    useRouter: () => mockUseRouter(),
  }));
  
  jest.mock('next/image', () => ({
    __esModule: true,
    default: mockNextImage,
  }));
  
  jest.mock('next/link', () => ({
    __esModule: true,
    default: mockNextLink,
  }));
  
  jest.mock('next/head', () => ({
    __esModule: true,
    default: mockNextHead,
  }));
  
  jest.mock('next/script', () => ({
    __esModule: true,
    default: mockNextScript,
  }));
  
  jest.mock('next/dynamic', () => ({
    __esModule: true,
    default: mockNextDynamic,
  }));
};
