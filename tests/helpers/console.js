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
 *
 * Comportamento:
 *   (a) Suprime APENAS as mensagens que casam com algum padrão de suppressList;
 *   (b) REPASSA as demais mensagens ao console.error original (não silencia);
 *   (c) Todas as chamadas — suprimidas ou repassadas — ficam registradas no
 *       spy, permitindo assertar spy.mock.calls ANTES do mockRestore().
 *
 * @param {string[]} suppressList - Lista de padrões de mensagens a SUPRIMIR
 * @returns {jest.SpyInstance}
 *
 * @example
 *   const spy = filterConsoleError(['ReactDOM.render']);
 *   // Apenas warnings que contêm 'ReactDOM.render' são silenciados
 *   spy.mockRestore();
 */
export const filterConsoleError = (suppressList = []) => {
  // Captura a implementação ANTES de instalar o mock: jest.spyOn substitui
  // console.error pelo próprio mock, então chamadas a console.error DENTRO do
  // mockImplementation re-entrariam nele mesmo → RangeError (call stack).
  // Capturar fora do callback garante que o log não casado chegue ao original.
  const originalError = console.error;
  return jest.spyOn(console, 'error').mockImplementation((...args) => {
    const msg = args.join(' ');
    if (suppressList.some(pattern => msg.includes(pattern))) {
      return;
    }
    originalError.call(console, ...args);
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