import { useMemo } from 'react';
import { PerformanceContext } from './PerformanceContext';
import { usePerformanceMetrics } from './usePerformanceMetrics';

/**
 * Provider de Performance
 * Instancia o usePerformanceMetrics uma única vez e compartilha
 * as métricas via contexto, evitando múltiplos PerformanceObserver.
 */
export const PerformanceProvider = ({ children }) => {
  const performanceData = usePerformanceMetrics();

  const value = useMemo(() => ({
    reportMetric: performanceData.reportMetric,
    getMetrics: performanceData.getMetrics,
    metrics: performanceData.metrics,
    WEB_VITAL_METRICS: performanceData.WEB_VITAL_METRICS,
    THRESHOLDS: performanceData.THRESHOLDS,
    getRating: performanceData.getRating,
    formatMetric: performanceData.formatMetric,
  }), [performanceData.reportMetric, performanceData.getMetrics, performanceData.metrics, performanceData.WEB_VITAL_METRICS, performanceData.THRESHOLDS, performanceData.getRating, performanceData.formatMetric]);

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};