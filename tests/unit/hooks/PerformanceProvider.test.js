import React, { useContext } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { PerformanceProvider } from '../../../hooks/PerformanceProvider.js';
import { usePerformance } from '../../../hooks/usePerformance.js';
import { AuthContext } from '../../../hooks/AuthContext.js';
import { filterConsoleError } from '../../helpers/console.js';

function ConsumerProbe() {
  const ctx = usePerformance();
  return (
    <div>
      <span data-testid="metrics-count">{Object.keys(ctx.metrics || {}).length}</span>
      <span data-testid="has-vitals">{String(Boolean(ctx.WEB_VITAL_METRICS && ctx.THRESHOLDS))}</span>
      <span data-testid="has-fns">
        {String(
          typeof ctx.reportMetric === 'function' &&
            typeof ctx.getMetrics === 'function' &&
            typeof ctx.getRating === 'function' &&
            typeof ctx.formatMetric === 'function'
        )}
      </span>
    </div>
  );
}

function OutsideProbe() {
  usePerformance();
  return null;
}

describe('Hooks — PerformanceProvider, usePerformance e AuthContext', () => {
  it('compartilha métricas e utilitários via PerformanceProvider -> usePerformance', () => {
    render(
      <PerformanceProvider>
        <ConsumerProbe />
      </PerformanceProvider>
    );

    expect(screen.getByTestId('metrics-count')).toHaveTextContent('0');
    expect(screen.getByTestId('has-vitals')).toHaveTextContent('true');
    expect(screen.getByTestId('has-fns')).toHaveTextContent('true');
  });

  it('lança erro quando usePerformance é chamado fora de PerformanceProvider', () => {
    const restoreConsole = filterConsoleError(['usePerformance must be used within a PerformanceProvider', 'The above error occurred']);
    try {
      expect(() => render(<OutsideProbe />)).toThrow(
        'usePerformance must be used within a PerformanceProvider'
      );
    } finally {
      restoreConsole.mockRestore();
    }
  });

  it('expõe valores e callbacks padrão seguros em AuthContext fora do provider', async () => {
    let captured;
    function AuthProbe() {
      captured = useContext(AuthContext);
      return <span>{String(captured.isAuthenticated)}</span>;
    }

    render(<AuthProbe />);
    expect(captured.user).toBeNull();
    expect(captured.isAuthenticated).toBe(false);
    expect(captured.loading).toBe(true);
    expect(captured.loginLoading).toBe(false);
    await expect(captured.login()).resolves.toBeUndefined();
    await expect(captured.logout()).resolves.toBeUndefined();
  });
});
