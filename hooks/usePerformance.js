import { useContext } from 'react';
import { PerformanceContext } from './PerformanceContext';

/**
 * Hook para acessar o contexto de performance.
 * Deve ser usado dentro de um PerformanceProvider.
 *
 * @returns {import('./PerformanceContext').PerformanceContextValue} Contexto de performance
 */
export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};