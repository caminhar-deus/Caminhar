import { useEffect, useCallback, useRef } from 'react';

/**
 * @typedef {Object} PerformanceMetricsConfig
 * @property {function} [onReport] - Callback chamado a cada métrica reportada
 * @property {boolean} [reportToAnalytics=false] - Envia métricas para analytics via sendBeacon/fetch
 * @property {string} [analyticsEndpoint='/api/analytics/web-vitals'] - Endpoint de analytics
 * @property {boolean} [debug] - Habilita logs de debug (default: true em desenvolvimento)
 */

/**
 * @typedef {Object} PerformanceMetricsReturn
 * @property {function} reportMetric - Reporta uma métrica individual
 * @property {function} getMetrics - Retorna métricas acumuladas
 * @property {Object} metrics - Métricas correntes
 * @property {Object} WEB_VITAL_METRICS - Constantes das métricas suportadas
 * @property {Object} THRESHOLDS - Thresholds de avaliação Google
 * @property {function} getRating - Classifica valor conforme threshold
 * @property {function} formatMetric - Formata valor conforme unidade
 */

/**
 * usePerformanceMetrics - Hook para monitorar Core Web Vitals e métricas de performance
 * 
 * @param {PerformanceMetricsConfig} options - Opções de configuração
 * @returns {PerformanceMetricsReturn} Objeto com funções para reportar e acessar métricas
 * 
 * Uso:
 * const { reportMetrics, metrics } = usePerformanceMetrics({
 *   onReport: (metrics) => console.log(metrics),
 *   reportToAnalytics: true,
 * });
 */

// Cache da promessa do import dinâmico para evitar imports repetidos
const webVitalsPromise = typeof window !== 'undefined' ? import('web-vitals') : null;

// Métricas suportadas (Core Web Vitals + extras)
const WEB_VITAL_METRICS = {
  // Core Web Vitals
  LCP: 'LCP',        // Largest Contentful Paint
  CLS: 'CLS',        // Cumulative Layout Shift
  INP: 'INP',        // Interaction to Next Paint (novo, substitui FID)
  
  // Outras métricas importantes
  FCP: 'FCP',        // First Contentful Paint
  TTFB: 'TTFB',      // Time to First Byte
  TBT: 'TBT',        // Total Blocking Time
};

// Thresholds de avaliação (Google Web Vitals)
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000, unit: 'ms' },
  INP: { good: 200, poor: 500, unit: 'ms' },
  CLS: { good: 0.1, poor: 0.25, unit: '' },
  FCP: { good: 1800, poor: 3000, unit: 'ms' },
  TTFB: { good: 800, poor: 1800, unit: 'ms' },
  TBT: { good: 200, poor: 600, unit: 'ms' },
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

const MAX_HISTORY_SIZE = 50;
const METRICS_CACHE_MS = 60_000; // 1 minuto de cache para evitar reports duplicados

/**
 * Hook para monitoramento de Core Web Vitals e métricas de performance.
 * @todo Integrar este hook nos componentes da aplicação. Atualmente exportado
 *       via hooks/index.js mas sem consumidores diretos.
 */
export function usePerformanceMetrics(options = {}) {
  const {
    onReport,
    reportToAnalytics = false,
    analyticsEndpoint = '/api/analytics/web-vitals',
    debug = process.env.NODE_ENV === 'development',
  } = options;

  // Store for accumulated metrics (useRef para evitar recriação e não causar re-render)
  const metricsStoreRef = useRef({ current: {}, history: [] });
  const metricsStore = metricsStoreRef.current;

  // Cache de timestamps por nome de métrica para evitar reports duplicados
  const lastReportedRef = useRef({});

  // Report individual metric
  const reportMetric = useCallback((metric) => {
    const { name, value, rating, delta, navigationType } = metric;

    // Cache check: ignora se mesma métrica foi reportada há menos de 1 minuto
    const formattedValue = formatMetric(name, value);
    const lastReported = lastReportedRef.current[name];
    if (lastReported && (Date.now() - lastReported.timestamp < METRICS_CACHE_MS) && lastReported.value === formattedValue) {
      if (debug) {
        console.log(`[Web Vitals] Cache hit for ${name}: ${formattedValue}${THRESHOLDS[name]?.unit || ''} — skipped`);
      }
      return null;
    }

    // Atualiza cache
    lastReportedRef.current[name] = { timestamp: Date.now(), value: formattedValue };

    // Histórico leve: apenas campos essenciais para análise temporal
    const historyEntry = {
      name,
      value: formattedValue,
      rating,
      delta,
      timestamp: Date.now(),
    };

    // Métrica atual: com contexto completo para a entrada mais recente
    const currentMetric = {
      ...historyEntry,
      navigationType,
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
    metricsStore.current[name] = currentMetric;
    metricsStore.history.push(historyEntry);

    // Limitar histórico para evitar memory leak
    if (metricsStore.history.length > MAX_HISTORY_SIZE) {
      metricsStore.history.shift();
    }

    // Debug logging
    if (debug) {
      console.log(`[Web Vitals] ${name}: ${currentMetric.value}${THRESHOLDS[name]?.unit || ''} (${rating})`);
    }

    // Call callback
    onReport?.(currentMetric);

    // Send to analytics
    if (reportToAnalytics && typeof window !== 'undefined') {
      // Use sendBeacon if available (non-blocking)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(analyticsEndpoint, JSON.stringify(currentMetric));
      } else {
        const analyticsAbort = new AbortController();
        fetch(analyticsEndpoint, {
          method: 'POST',
          body: JSON.stringify(currentMetric),
          keepalive: true,
          signal: analyticsAbort.signal,
        }).catch(() => {
          // Silently fail - analytics não é crítico
        });
      }
    }

    return currentMetric;
  }, [onReport, reportToAnalytics, analyticsEndpoint, debug]);

  // Get all accumulated metrics
  const getMetrics = useCallback(() => ({
    current: { ...metricsStore.current },
    summary: metricsStore.history.reduce((acc, m) => {
      acc[m.name] = m;
      return acc;
    }, {}),
  }));

  // Effect para observar métricas
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Dynamically import web-vitals (promessa cacheada em nível de módulo)
    const initWebVitals = async () => {
      try {
        if (!webVitalsPromise) return;

        const { 
          onLCP, 
          onCLS, 
          onINP,
          onFCP, 
          onTTFB 
        } = await webVitalsPromise;

        // Register all Core Web Vitals
        onLCP((metric) => reportMetric({
          ...metric,
          rating: getRating('LCP', metric.value),
        }), { reportAllChanges: true });

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

    const observers = [];

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
        observers.push(longTaskObserver);
      } catch {
        // Long tasks não suportado
      }

      // Resource loading times
      try {
        // Domínios de terceiros que são naturalmente lentos (cross-origin iframes, CDNs externas)
        // e não indicam problema real de performance na aplicação
        const THIRD_PARTY_DOMAINS = [
          'youtube.com',
          'ytimg.com',
          'spotify.com',
          'scdn.co',
          'googleusercontent.com',
          'googleapis.com',
          'gstatic.com',
          'facebook.com',
          'instagram.com',
        ];

        const isThirdPartyResource = (url) => {
          try {
            const parsed = new URL(url);
            return THIRD_PARTY_DOMAINS.some((domain) => parsed.hostname.includes(domain));
          } catch {
            return false;
          }
        };

        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            // Report slow resources — ignora recursos de terceiros
            if (entry.duration > 1000 && !isThirdPartyResource(entry.name)) {
              if (debug) {
                console.warn(`[Performance] Slow resource: ${entry.name} (${Math.round(entry.duration)}ms)`);
              }
            }
          });
        });

        resourceObserver.observe({ entryTypes: ['resource'] });
        observers.push(resourceObserver);
      } catch {
        // Resource timing não suportado
      }
    }

    // Cleanup: desconecta observers explicitamente para evitar vazamentos
    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [reportMetric, debug]);

  return {
    reportMetric,
    getMetrics,
    metrics: metricsStore.current,
    WEB_VITAL_METRICS,
    THRESHOLDS,
    getRating,
    formatMetric,
  };
}

