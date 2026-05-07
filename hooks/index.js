/**
 * Hooks - Índice de Exportações
 * Custom hooks do Design System
 */

export { useTheme } from './useTheme';
export { useAuth, AuthContext, AuthProvider } from './useAuth';
export { useAdminCrud } from './useAdminCrud';
export { default as usePerformanceMetrics, reportWebVitals, detectPerformanceIssues } from './usePerformanceMetrics';
export { useApiFetch } from './useApiFetch';
export { useDebounce } from './useDebounce';
export { useAdminAuth } from './useAdminAuth';

// Re-exportação padrão
export { default as useThemeDefault } from './useTheme';
export { default as useAuthDefault } from './useAuth';
export { default as useApiFetchDefault } from './useApiFetch';
export { default as useDebounceDefault } from './useDebounce';
export { default as useAdminAuthDefault } from './useAdminAuth';
