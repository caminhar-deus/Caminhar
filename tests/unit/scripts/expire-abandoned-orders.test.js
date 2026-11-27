import { describe, it, expect, jest } from '@jest/globals';
import {
  parseExpireArgs,
  runExpireAbandonedOrders,
} from '../../../scripts/maintenance/expire-abandoned-orders.js';

describe('scripts/maintenance/expire-abandoned-orders.js', () => {
  it('interpreta argumentos CLI corretamente', () => {
    expect(parseExpireArgs([])).toEqual({
      dryRun: false,
      pixHours: 24,
      ticketHours: 120,
      limit: 50,
      noReconcile: false,
      json: false,
    });

    expect(
      parseExpireArgs(['--dry-run', '--pix-hours=12', '--ticket-hours=72', '--limit=25', '--no-reconcile', '--json'])
    ).toEqual({
      dryRun: true,
      pixHours: 12,
      ticketHours: 72,
      limit: 25,
      noReconcile: true,
      json: true,
    });
  });

  it('executa expiração convertendo horas para minutos, injeta reconciliador quando MP_ACCESS_TOKEN existe e invalida cache só em expiração real', async () => {
    const expireFn = jest.fn().mockResolvedValueOnce({
      dryRun: false,
      checkedCount: 2,
      expiredCount: 1,
      reconciledToPaidCount: 0,
      skippedCount: 0,
      errorCount: 0,
      expiredOrderIds: [90],
      reconciledOrderIds: [],
      errors: [],
    });
    const invalidateFn = jest.fn().mockResolvedValue(true);
    const reconcileFn = jest.fn();

    const summary = await runExpireAbandonedOrders(
      { pixHours: 12, ticketHours: 48, limit: 20 },
      {
        expireFn,
        invalidateFn,
        reconcileFn,
        env: { MP_ACCESS_TOKEN: 'APP_USR-live' },
      }
    );

    expect(summary.expiredCount).toBe(1);
    expect(expireFn).toHaveBeenCalledWith({
      dryRun: false,
      pixMaxAgeMinutes: 720,
      ticketMaxAgeMinutes: 2880,
      defaultMaxAgeMinutes: 720,
      limit: 20,
      reconcilePayment: reconcileFn,
    });
    expect(invalidateFn).toHaveBeenCalledWith('products:*');

    // Dry-run ou --no-reconcile não invalida cache
    invalidateFn.mockClear();
    expireFn.mockResolvedValueOnce({
      dryRun: true,
      checkedCount: 1,
      expiredCount: 1,
      reconciledToPaidCount: 0,
      skippedCount: 0,
      errorCount: 0,
      expiredOrderIds: [91],
      reconciledOrderIds: [],
      errors: [],
    });
    await runExpireAbandonedOrders(
      { dryRun: true, noReconcile: true },
      { expireFn, invalidateFn, reconcileFn, env: { MP_ACCESS_TOKEN: 'APP_USR-live' } }
    );
    expect(expireFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        dryRun: true,
        reconcilePayment: null,
      })
    );
    expect(invalidateFn).not.toHaveBeenCalled();
  });
});
