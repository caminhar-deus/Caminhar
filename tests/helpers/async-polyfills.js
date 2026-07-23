/**
 * Polyfills assíncronos para ambiente Node.js/JSDOM.
 * 
 * Separado de tests/setup.js para que possa ser importado
 * tanto pelo setup quanto pelo teardown sem depender de jest.
 */

let polyfillsPromise = null;

/**
 * Aplica polyfills assíncronos necessários para o ambiente de teste.
 * Exportada para que o teardown possa aguardar a resolução completa.
 * É idempotente: na segunda chamada, retorna a mesma promise da primeira.
 */
export async function setupAsyncPolyfills() {
  if (!polyfillsPromise) {
    polyfillsPromise = (async () => {
      // Polyfill ReadableStream (necessário para undici funcionar corretamente)
      if (typeof globalThis.ReadableStream === 'undefined') {
        try {
          const { ReadableStream } = await import('node:stream/web');
          globalThis.ReadableStream = ReadableStream;
        } catch (e) {
          console.warn(`⚠️ Polyfill ReadableStream failed: ${e.message}`);
        }
      }

      // Polyfill MessageChannel/MessagePort (necessário para undici em alguns ambientes)
      if (typeof globalThis.MessageChannel === 'undefined') {
        try {
          const { MessageChannel, MessagePort } = await import('node:worker_threads');
          globalThis.MessageChannel = MessageChannel;
          globalThis.MessagePort = MessagePort;
        } catch (e) {
          console.warn(`⚠️ Polyfill MessageChannel failed: ${e.message}`);
        }
      }
    })();
  }

  return polyfillsPromise;
}