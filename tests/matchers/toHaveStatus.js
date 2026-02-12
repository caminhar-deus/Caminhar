/**
 * Matcher: toHaveStatus
 * Verifica se uma resposta HTTP tem o status esperado
 * 
 * Uso:
 *   expect(res).toHaveStatus(200);
 *   expect(res).toHaveStatus(404);
 */

expect.extend({
  toHaveStatus(received, expected) {
    // Suporta diferentes formatos de resposta do node-mocks-http
    let status;
    
    if (typeof received._getStatusCode === 'function') {
      // node-mocks-http
      status = received._getStatusCode();
    } else if (typeof received.status === 'number') {
      // fetch Response ou express res
      status = received.status;
    } else if (typeof received.statusCode === 'number') {
      // http.ServerResponse
      status = received.statusCode;
    } else if (received.statusCode !== undefined) {
      status = received.statusCode;
    } else {
      status = undefined;
    }
    
    const pass = status === expected;
    
    return {
      message: () => {
        const receivedStr = this.utils.printReceived(status);
        const expectedStr = this.utils.printExpected(expected);
        
        if (pass) {
          return `expected status not to be ${expectedStr}`;
        }
        return `expected status to be ${expectedStr}, but received ${receivedStr}`;
      },
      pass,
    };
  },
});
