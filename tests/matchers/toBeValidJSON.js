/**
 * Matcher: toBeValidJSON
 * Verifica se uma resposta contém JSON válido
 * Opcionalmente verifica se contém dados específicos
 * 
 * Uso:
 *   expect(res).toBeValidJSON();
 *   expect(res).toBeValidJSON({ id: 1, name: 'Test' });
 */

expect.extend({
  toBeValidJSON(received, expected) {
    let data;
    
    try {
      // Extrai o corpo da resposta de diferentes formatos
      const body = received.data || 
                   received._getData?.() || 
                   received.body ||
                   received;
      
      // Parse se for string
      data = typeof body === 'string' ? JSON.parse(body) : body;
    } catch (e) {
      return {
        message: () => `expected valid JSON, but parsing failed: ${e.message}`,
        pass: false,
      };
    }

    // Se não há expectation específica, apenas verifica se é JSON válido
    if (expected === undefined) {
      return {
        message: () => `expected invalid JSON, but received valid JSON: ${this.utils.printReceived(data)}`,
        pass: true,
      };
    }

    // Verifica se o JSON contém os dados esperados
    const pass = this.equals(data, expect.objectContaining(expected));
    
    return {
      message: () => {
        if (pass) {
          return `expected JSON not to contain ${this.utils.printExpected(expected)}`;
        }
        return `expected JSON to contain ${this.utils.printExpected(expected)}, but got ${this.utils.printReceived(data)}`;
      },
      pass,
    };
  },
});
