import { useRef, useCallback } from 'react';

/**
 * Hook de throttle reutilizável.
 * Limita a frequência de chamada de uma função, ignorando chamadas
 * que ocorrerem dentro do intervalo especificado.
 *
 * Diferente de debounce: debounce atrasa a execução, throttle ignora
 * chamadas rápidas consecutivas.
 *
 * @param {function} fn - Função a ser throttled
 * @param {number} [delay=300] - Intervalo mínimo entre execuções em ms
 * @returns {function} Função com throttle aplicado
 *
 * @example
 * const handleClick = useThrottle(() => {
 *   console.log('Clicou!');
 * }, 500);
 */
export function useThrottle(fn, delay = 300) {
  const lastCallRef = useRef(0);

  return useCallback((...args) => {
    const now = Date.now();
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      fn(...args);
    }
  }, [fn, delay]);
}

export default useThrottle;