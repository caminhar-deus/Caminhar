/**
 * Console Helpers
 * Utilitários para supressão controlada de console durante testes
 *
 * Uso:
 *   import { suppressConsoleError, createFetchSpy } from '../helpers';
 */

/**
 * Cria um spy silencioso para console.error
 * Use no beforeEach e restaure no afterEach
 * @returns {jest.SpyInstance}
 *
 * @example
 *   let consoleErrorSpy;
 *   beforeEach(() => { consoleErrorSpy = suppressConsoleError(); });
 *   afterEach(() => { consoleErrorSpy?.mockRestore(); });
 */
export const suppressConsoleError = () => {
  return jest.spyOn(console, 'error').mockImplementation(() => {});
};

/**
 * Cria um spy para console.error que SUPRIME apenas warnings conhecidos
 * (comportamento inverso do allowList — os padrões listados são SILENCIADOS)
 * @param {string[]} suppressList - Lista de padrões de mensagens a SUPRIMIR
 * @returns {jest.SpyInstance}
 *
 * @example
 *   const spy = filterConsoleError(['ReactDOM.render']);
 *   // Apenas warnings que contêm 'ReactDOM.render' são silenciados
 *   spy.mockRestore();
 */
export const filterConsoleError = (suppressList = []) => {
  return jest.spyOn(console, 'error').mockImplementation((...args) => {
    const msg = args.join(' ');
    if (suppressList.some(pattern => msg.includes(pattern))) {
      return;
    }
    console.error(...args);
  });
};

/**
 * Cria um mock para global.fetch via atribuição direta
 * NOTA: jest.spyOn(global, 'fetch') NÃO funciona em JSDOM porque
 * fetch não é uma propriedade própria de global.
 * Esta função encapsula a atribuição direta para padronização,
 * E retorna um método .mockRestore() para restaurar o fetch original.
 *
 * @returns {jest.Mock & { mockRestore: () => void }}
 *
 * @example
 *   let fetchMock;
 *   beforeEach(() => { fetchMock = mockGlobalFetch(); });
 *   afterEach(() => { fetchMock.mockRestore(); });
 */
export const mockGlobalFetch = () => {
  const originalFetch = global.fetch;
  const mock = jest.fn();
  mock.mockRestore = () => {
    global.fetch = originalFetch;
  };
  global.fetch = mock;
  return mock;
};

/**
 * Cria um spy para window.confirm com retorno padrão
 * @param {boolean} defaultValue - Valor de retorno padrão
 * @returns {jest.SpyInstance}
 *
 * @example
 *   let confirmSpy;
 *   beforeEach(() => { confirmSpy = createConfirmSpy(false); });
 *   afterEach(() => { confirmSpy?.mockRestore(); });
 */
export const createConfirmSpy = (defaultValue = false) => {
  return jest.spyOn(window, 'confirm').mockReturnValue(defaultValue);
};