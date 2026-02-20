/**
 * Matcher: toHaveHeader
 * Verifica se uma resposta HTTP tem um header específico
 * 
 * Uso:
 *   expect(res).toHaveHeader('content-type');
 *   expect(res).toHaveHeader('content-type', 'application/json');
 */

expect.extend({
  toHaveHeader(received, headerName, expectedValue) {
    // Extrai headers de diferentes formatos
    const headers = received.headers || 
                    received.getHeaders?.() || 
                    received._getHeaders?.() ||
                    {};
    
    const normalizedName = headerName.toLowerCase();
    const actualValue = headers[headerName] || 
                       headers[normalizedName] ||
                       headers[headerName.toUpperCase()];
    
    // Se não foi especificado valor, apenas verifica existência
    if (expectedValue === undefined) {
      const pass = actualValue !== undefined;
      
      return {
        message: () => {
          if (pass) {
            return `expected header "${headerName}" not to exist, but it was set to "${actualValue}"`;
          }
          return `expected header "${headerName}" to exist, but it was not found in ${this.utils.printReceived(Object.keys(headers))}`;
        },
        pass,
      };
    }

    // Verifica se o valor corresponde
    const pass = actualValue === expectedValue || 
      (Array.isArray(actualValue) && actualValue.includes(expectedValue));
    
    return {
      message: () => {
        const expectedStr = this.utils.printExpected(expectedValue);
        const receivedStr = this.utils.printReceived(actualValue);
        
        if (pass) {
          return `expected header "${headerName}" not to be ${expectedStr}, but it was`;
        }
        return `expected header "${headerName}" to be ${expectedStr}, but got ${receivedStr}`;
      },
      pass,
    };
  },
});
