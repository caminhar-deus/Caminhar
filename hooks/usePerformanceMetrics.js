import { useEffect, useCallback } from 'react';

/**
 * usePerformanceMetrics - Hook para monitorar Core Web Vitals e métricas de performance
 * 
 * Retorna um objeto com funções para reportar métricas e o estado atual.
 * 
 * Uso:
 * const { reportMetrics, metrics } = usePerformanceMetrics({
 *   onReport: (metrics) => console.log(metrics),
 *   reportToAnalytics: true,
 * });
 */

// Métricas suportadas (Core Web Vitals + extras)
const WEB_VITAL_METRICS = {
  // Core Web Vitals
  LCP: 'LCP',        // Largest Contentful Paint
  FID: 'FID',        // First Input Delay  
  CLS: 'CLS',        // Cumulative Layout Shift
  INP: 'INP',        // Interaction to Next Paint (novo, substitui FID)
  
  // Outras métricas importantes
  FCP: 'FCP',        // First Contentful Paint
  TTFB: 'TTFB',      // Time to First Byte
  TBT: 'TBT',        // Total Blocking Time
  MPFID: 'MPFID',    // Max Potential First Input Delay
};

// Thresholds de avaliação (Google Web Vitals)
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000, unit: 'ms' },
  FID: { good: 100, poor: 300, unit: 'ms' },
  INP: { good: 200, poor: 500, unit: 'ms' },
  CLS: { good: 0.1, poor: 0.25, unit: '' },
  FCP: { good: 1800, poor: 3000, unit: 'ms' },
  TTFB: { good: 800, poor: 1800, unit: 'ms' },
  TBT: { good: 200, poor: 600, unit: 'ms' },
  MPFID: { good: 130, poor: 250, unit: 'ms' },
};

// Utils
function getRating(name, value) {
  const threshold = THRESHOLDS[name];
  if (!threshold) return 'unknown';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

function formatMetric(name, value) {
  const threshold = THRESHOLDS[name];
  if (!threshold) return value;
  
  if (threshold.unit === 'ms') {
    return Math.round(value);
  }
  return Number(value.toFixed(3));
}

export default function usePerformanceMetrics(options = {}) {
  const {
    onReport,
    reportToAnalytics = false,
    analyticsEndpoint = '/api/analytics/web-vitals',
    debug = process.env.NODE_ENV === 'development',
  } = options;

  // Store for accumulated metrics
  const metricsStore = {
    current: {},
    history: [],
  };

  // Report individual metric
  const reportMetric = useCallback((metric) => {
    const { name, value, rating, delta, entries, navigationType } = metric;
    
    const reportData = {
      name,
      value: formatMetric(name, value),
      rating,
      delta,
      navigationType,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      // Additional context
      connection: typeof navigator !== 'undefined' && navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        saveData: navigator.connection.saveData,
      } : null,
      deviceMemory: typeof navigator !== 'undefined' ? navigator.deviceMemory : null,
    };

    // Store in local store
    metricsStore.current[name] = reportData;
    metricsStore.history.push(reportData);

    // Debug logging
    if (debug) {
      console.log(`[Web Vitals] ${name}: ${reportData.value}${THRESHOLDS[name]?.unit || ''} (${rating})`);
    }

    // Call callback
    onReport?.(reportData);

    // Send to analytics
    if (reportToAnalytics && typeof window !== 'undefined') {
      // Use sendBeacon if available (non-blocking)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(analyticsEndpoint, JSON.stringify(reportData));
      } else {
        fetch(analyticsEndpoint, {
          method: 'POST',
          body: JSON.stringify(reportData),
          keepalive: true,
        }).catch(() => {
          // Silently fail - analytics não é crítico
        });
      }
    }

    return reportData;
  }, [onReport, reportToAnalytics, analyticsEndpoint, debug, metricsStore]);

  // Get all accumulated metrics
  const getMetrics = useCallback(() => ({
    current: { ...metricsStore.current },
    summary: metricsStore.history.reduce((acc, m) => {
      acc[m.name] = m;
      return acc;
    }, {}),
  }), [metricsStore]);

  // Force report all current metrics
  const reportAllMetrics = useCallback(() => {
    return getMetrics();
  }, [getMetrics]);

  // Effect para observar métricas
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Dynamically import web-vitals (lightweight library)
    const initWebVitals = async () => {
      try {
        const { 
          onLCP, 
          onFID, 
          onCLS, 
          onINP,
          onFCP, 
          onTTFB 
        } = await import('web-vitals');

        // Register all Core Web Vitals
        onLCP((metric) => reportMetric({
          ...metric,
          rating: getRating('LCP', metric.value),
        }), { reportAllChanges: true });

        onFID((metric) => reportMetric({
          ...metric,
          rating: getRating('FID', metric.value),
        }));

        onCLS((metric) => reportMetric({
          ...metric,
          rating: getRating('CLS', metric.value),
        }), { reportAllChanges: true });

        // INP substitui FID gradualmente
        if (onINP) {
          onINP((metric) => reportMetric({
            ...metric,
            rating: getRating('INP', metric.value),
          }), { reportAllChanges: true });
        }

        onFCP((metric) => reportMetric({
          ...metric,
          rating: getRating('FCP', metric.value),
        }));

        onTTFB((metric) => reportMetric({
          ...metric,
          rating: getRating('TTFB', metric.value),
        }));

      } catch (error) {
        if (debug) {
          console.warn('[Web Vitals] Failed to load web-vitals library:', error);
        }
      }
    };

    initWebVitals();

    // Performance Observer para métricas adicionais
    if ('PerformanceObserver' in window) {
      // Long tasks (TBT)
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const longTasks = list.getEntries();
          let totalBlockingTime = 0;
          
          longTasks.forEach((task) => {
            if (task.duration > 50) {
              totalBlockingTime += task.duration - 50;
            }
          });

          reportMetric({
            name: 'TBT',
            value: totalBlockingTime,
            rating: getRating('TBT', totalBlockingTime),
            entries: longTasks,
          });
        });

        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        // Long tasks não suportado
      }

      // Resource loading times
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            // Report slow resources
            if (entry.duration > 1000) {
              if (debug) {
                console.warn(`[Performance] Slow resource: ${entry.name} (${Math.round(entry.duration)}ms)`);
              }
            }
          });
        });

        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (e) {
        // Resource timing não suportado
      }
    }

    // Cleanup
    return () => {
      // Observers são automaticamente limpos quando o componente desmonta
    };
  }, [reportMetric, debug]);

  return {
    reportMetric,
    getMetrics,
    reportAllMetrics,
    metrics: metricsStore.current,
    WEB_VITAL_METRICS,
    THRESHOLDS,
    getRating,
    formatMetric,
  };
}

// Standalone function para uso fora de componentes React
export function reportWebVitals(metric) {
  if (process.env.NODE_ENV === 'development') {
    const { id, name, value, rating, delta } = metric;
    console.log(`[Web Vitals] ${name}: ${value} (${rating}) [${id}]`);
  }

  // Enviar para analytics em produção
  if (process.env.NODE_ENV === 'production') {
    const body = JSON.stringify(metric);
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/web-vitals', body);
    }
  }
}

// Helper para detectar problemas de performance
export function detectPerformanceIssues() {
  if (typeof window === 'undefined') return null;

  const issues = [];

  // Detecta memory pressure
  if (performance && performance.memory) {
    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
    const memoryUsage = usedJSHeapSize / jsHeapSizeLimit;
    
    if (memoryUsage > 0.8) {
      issues.push({
        type: 'memory',
        severity: 'high',
        message: `High memory usage: ${(memoryUsage * 100).toFixed(1)}%`,
      });
    }
  }

  // Detecta long tasks
  if (window.LongTasks?.length > 10) {
    issues.push({
      type: 'longtasks',
      severity: 'medium',
      message: `${window.LongTasks.length} long tasks detected`,
    });
  }

  // Detecta slow connection
  if (navigator.connection) {
    const { effectiveType, saveData } = navigator.connection;
    if (effectiveType === '2g' || saveData) {
      issues.push({
        type: 'connection',
        severity: 'low',
        message: `Slow connection: ${effectiveType}${saveData ? ' (save data on)' : ''}`,
      });
    }
  }

  return issues.length > 0 ? issues : null;
}
