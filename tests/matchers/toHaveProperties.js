/**
 * Matcher: toHaveProperties
 * Verifica se um objeto possui todas as propriedades listadas
 * 
 * Uso:
 *   expect(obj).toHaveProperties(['id', 'name', 'createdAt']);
 *   expect(obj).toHaveProperties('email');
 */

expect.extend({
  toHaveProperties(received, properties) {
    const propertiesArray = Array.isArray(properties) ? properties : [properties];
    
    const receivedKeys = typeof received === 'object' && received !== null 
      ? Object.keys(received) 
      : [];
    const missing = propertiesArray.filter(prop => !receivedKeys.includes(prop));
    const pass = missing.length === 0;
    
    return {
      message: () => {
        if (pass) {
          return `expected object not to have properties ${this.utils.printExpected(propertiesArray)}`;
        }
        return `expected object to have all properties, but missing: ${this.utils.printExpected(missing)}`;
      },
      pass,
    };
  },
});