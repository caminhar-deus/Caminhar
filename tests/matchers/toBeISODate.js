/**
 * Matcher: toBeISODate
 * Verifica se uma string está em formato ISO 8601
 * 
 * Uso:
 *   expect(dateString).toBeISODate();
 */

expect.extend({
  toBeISODate(received) {
    // Padrão ISO 8601 completo: 2024-01-15T10:30:00.000Z ou 2024-01-15T10:30:00Z
    const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    
    // Verifica se é uma string
    if (typeof received !== 'string') {
      return {
        message: () => `expected ISO date string, but received ${this.utils.printReceived(typeof received)}`,
        pass: false,
      };
    }
    
    // Verifica o formato
    const isValidFormat = isoDateRegex.test(received);
    
    // Verifica se é uma data válida
    const date = new Date(received);
    const isValidDate = !isNaN(date.getTime());
    
    const pass = isValidFormat && isValidDate;
    
    return {
      message: () => {
        if (pass) {
          return `expected "${received}" not to be a valid ISO date`;
        }
        if (!isValidFormat) {
          return `expected "${received}" to match ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)`;
        }
        return `expected "${received}" to be a valid date, but got Invalid Date`;
      },
      pass,
    };
  },
});

/**
 * Matcher: toBeValidDate
 * Verifica se é uma data válida (aceita Date object ou string)
 * 
 * Uso:
 *   expect(date).toBeValidDate();
 */
expect.extend({
  toBeValidDate(received) {
    let date;
    
    if (received instanceof Date) {
      date = received;
    } else if (typeof received === 'string') {
      date = new Date(received);
    } else if (typeof received === 'number') {
      date = new Date(received);
    } else {
      return {
        message: () => `expected Date, string, or number, but received ${this.utils.printReceived(typeof received)}`,
        pass: false,
      };
    }
    
    const pass = !isNaN(date.getTime());
    
    return {
      message: () => {
        if (pass) {
          return `expected ${this.utils.printReceived(received)} not to be a valid date`;
        }
        return `expected ${this.utils.printReceived(received)} to be a valid date`;
      },
      pass,
    };
  },
});
