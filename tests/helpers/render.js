/**
 * Render Helpers
 * Utilitários para testes de componentes React
 * 
 * Estes helpers configuram providers necessários para renderizar componentes.
 */

import React from 'react';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// =============================================================================
// MOCKS DE MÓDULOS (devem estar no nível do módulo)
// =============================================================================

// Mock do Next.js router - será configurado por teste
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

import { useRouter } from 'next/router';

// =============================================================================
// RENDERIZAÇÃO BÁSICA
// =============================================================================

/**
 * Renderiza um componente com providers básicos
 * @param {React.ReactElement} ui - Componente a renderizar
 * @param {Object} options - Opções de renderização
 * @param {Object} options.providerProps - Props para providers
 * @returns {Object} Objeto de retorno do RTL + userEvent
 */
export const renderWithProviders = (ui, options = {}) => {
  const { providerProps = {}, ...renderOptions } = options;
  
  const Wrapper = ({ children }) => {
    return <>{children}</>;
  };
  
  return {
    user: userEvent.setup(),
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

// =============================================================================
// RENDERIZAÇÃO COM ROUTER
// =============================================================================

/**
 * Renderiza um componente com Router mockado
 * @param {React.ReactElement} ui - Componente a renderizar
 * @param {Object} options - Opções
 * @param {Object} options.router - Configurações do router mock
 * @returns {Object} Objeto de retorno + userEvent
 */
export const renderWithRouter = (ui, options = {}) => {
  const { router = {}, ...renderOptions } = options;
  
  // Configura o mock do useRouter
  const mockRouter = {
    pathname: '/',
    query: {},
    asPath: '/',
    push: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn(),
    beforePopState: jest.fn(),
    events: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn(),
    },
    isFallback: false,
    isLocaleDomain: false,
    isReady: true,
    isPreview: false,
    ...router,
  };
  
  // Configura o mock
  useRouter.mockReturnValue(mockRouter);
  
  return {
    user: userEvent.setup(),
    mockRouter,
    ...renderWithProviders(ui, renderOptions),
  };
};

// =============================================================================
// RENDERIZAÇÃO COM AUTENTICAÇÃO
// =============================================================================

/**
 * Renderiza um componente com autenticação mockada
 * @param {React.ReactElement} ui - Componente a renderizar
 * @param {Object} options - Opções
 * @param {Object} options.user - Dados do usuário autenticado
 * @param {boolean} options.isAuthenticated - Se está autenticado
 * @returns {Object} Objeto de retorno
 */
export const renderWithAuth = (ui, options = {}) => {
  const { user = null, isAuthenticated = false, ...renderOptions } = options;
  
  // Cria o contexto de autenticação
  const authContext = {
    user,
    isAuthenticated,
    login: jest.fn(),
    logout: jest.fn(),
    loading: false,
  };
  
  // Wrapper que injeta o contexto via prop drilling ou Context API
  const Wrapper = ({ children }) => {
    // Se houver um hook useAuth, ele precisa ser mockado no teste
    // ou o componente deve receber os dados via props
    return <>{children}</>;
  };
  
  return {
    authContext,
    user: userEvent.setup(),
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};

// =============================================================================
// RENDERIZAÇÃO COM TOAST
// =============================================================================

/**
 * Renderiza um componente com Toast provider
 * @param {React.ReactElement} ui - Componente a renderizar
 * @param {Object} options - Opções de renderização
 * @returns {Object} Objeto de retorno
 */
export const renderWithToast = (ui, options = {}) => {
  const { Toaster } = require('react-hot-toast');
  
  const Wrapper = ({ children }) => (
    <>
      {children}
      <Toaster />
    </>
  );
  
  return renderWithProviders(ui, { ...options, wrapper: Wrapper });
};

// =============================================================================
// HELPERS DE ESTADO
// =============================================================================

/**
 * Helper para testar estados de loading
 * @param {React.ReactElement} ui - Componente a renderizar
 * @param {string} loadingTestId - TestID do elemento de loading
 * @returns {Object} { isLoadingShown, waitForLoadingToFinish }
 */
export const testLoadingState = (ui, loadingTestId = 'loading') => {
  const { unmount } = renderWithProviders(ui);
  
  return {
    isLoadingShown: () => {
      const loadingElement = screen.queryByTestId(loadingTestId);
      return loadingElement !== null;
    },
    waitForLoadingToFinish: async () => {
      await screen.findByTestId(loadingTestId, { timeout: 5000 });
    },
    unmount,
  };
};

/**
 * Helper para testar estados de erro
 * @param {React.ReactElement} ui - Componente a renderizar
 * @param {string} errorMessage - Mensagem de erro esperada
 * @returns {boolean} Se o erro está sendo mostrado
 */
export const testErrorState = (ui, errorMessage) => {
  renderWithProviders(ui);
  const errorElement = screen.queryByText(errorMessage);
  return errorElement !== null;
};

// =============================================================================
// SIMULAÇÃO DE VIEWPORT
// =============================================================================

/**
 * Simula redimensionamento de tela
 * @param {number} width - Largura em pixels
 * @param {number} height - Altura em pixels
 */
export const resizeWindow = (width, height = 768) => {
  window.innerWidth = width;
  window.innerHeight = height;
  window.dispatchEvent(new Event('resize'));
};

/**
 * Simula um breakpoint de mobile
 */
export const setMobileViewport = () => resizeWindow(375, 667);

/**
 * Simula um breakpoint de tablet
 */
export const setTabletViewport = () => resizeWindow(768, 1024);

/**
 * Simula um breakpoint de desktop
 */
export const setDesktopViewport = () => resizeWindow(1440, 900);

// =============================================================================
// HELPERS DE INTERAÇÃO
// =============================================================================

/**
 * Espera por uma animação/transição terminar
 * @param {number} duration - Duração em ms
 */
export const waitForAnimation = (duration = 300) =>
  new Promise(resolve => setTimeout(resolve, duration));

/**
 * Clica em um elemento e aguarda
 * @param {Object} user - Instância do userEvent
 * @param {Element} element - Elemento a clicar
 */
export const clickAndWait = async (user, element) => {
  await user.click(element);
  await waitForAnimation();
};

/**
 * Preenche um formulário com dados
 * @param {Object} user - Instância do userEvent
 * @param {Object} fields - Mapa de label/testId para valor
 */
export const fillForm = async (user, fields) => {
  for (const [label, value] of Object.entries(fields)) {
    const input = screen.getByLabelText(label) || screen.getByTestId(label);
    await user.clear(input);
    await user.type(input, value);
  }
};

/**
 * Limpa o formulário
 * @param {Object} user - Instância do userEvent
 * @param {string[]} fieldLabels - Labels dos campos
 */
export const clearForm = async (user, fieldLabels) => {
  for (const label of fieldLabels) {
    const input = screen.getByLabelText(label) || screen.getByTestId(label);
    await user.clear(input);
  }
};
