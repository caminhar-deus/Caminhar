import { useState, useEffect } from 'react';

/**
 * Hook de debounce reutilizável.
 * Aguarda o usuário parar de digitar antes de atualizar o valor.
 *
 * @param {*} value - Valor a ser "debounced"
 * @param {number} [delay=300] - Tempo em ms de espera
 * @returns {*} Valor atualizado após o delay
 *
 * @example
 * const debouncedSearch = useDebounce(searchTerm, 500);
 */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;