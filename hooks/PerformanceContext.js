import { createContext } from 'react';

/**
 * @typedef {Object} PerformanceContextValue
 * @property {function} reportMetric - Reporta uma métrica individual
 * @property {function} getMetrics - Retorna métricas acumuladas
 * @property {Object} metrics - Métricas correntes
 * @property {Object} WEB_VITAL_METRICS - Constantes das métricas suportadas
 * @property {Object} THRESHOLDS - Thresholds de avaliação Google
 * @property {function} getRating - Classifica valor conforme threshold
 * @property {function} formatMetric - Formata valor conforme unidade
 */

/**
 * Contexto de Performance
 * @type {React.Context<PerformanceContextValue|null>}
 */
export const PerformanceContext = createContext(null);