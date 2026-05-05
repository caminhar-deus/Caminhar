/**
 * Hooks - Índice de Exportações
 * Custom hooks do Design System
 */

export { useTheme } from './useTheme';
export { useAuth, AuthContext, AuthProvider } from './useAuth';
export { useAdminCrud } from './useAdminCrud';
export { default as usePerformanceMetrics, reportWebVitals, detectPerformanceIssues } from './usePerformanceMetrics';

// Re-exportação padrão
export { default as useThemeDefault } from './useTheme';
export { default as useAuthDefault } from './useAuth';