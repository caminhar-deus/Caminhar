#!/usr/bin/env node

import { expireAbandonedOrders } from '../../lib/domain/orders.js';
import { fetchMercadoPagoPaymentDetails } from '../../lib/payment/mercadopago.js';
import { invalidateCache } from '../../lib/cache/cache.js';

/**
 * Interpreta os argumentos CLI do job de expiração de pedidos `awaiting_payment`.
 */
export function parseExpireArgs(argv = []) {
  const args = {
    dryRun: false,
    pixHours: 24,
    ticketHours: 120,
    limit: 50,
    noReconcile: false,
    json: false,
  };

  for (const token of argv) {
    if (token === '--dry-run') {
      args.dryRun = true;
    } else if (token === '--no-reconcile') {
      args.noReconcile = true;
    } else if (token === '--json') {
      args.json = true;
    } else if (token.startsWith('--pix-hours=')) {
      const val = Number(token.slice('--pix-hours='.length));
      if (Number.isFinite(val) && val > 0) args.pixHours = val;
    } else if (token.startsWith('--ticket-hours=')) {
      const val = Number(token.slice('--ticket-hours='.length));
      if (Number.isFinite(val) && val > 0) args.ticketHours = val;
    } else if (token.startsWith('--limit=')) {
      const val = Number(token.slice('--limit='.length));
      if (Number.isFinite(val) && val > 0) args.limit = Math.trunc(val);
    }
  }

  return args;
}

/**
 * Executa a expiração controlada de pedidos abandonados e invalida o cache da vitrine se necessário.
 */
export async function runExpireAbandonedOrders(
  options = {},
  {
    expireFn = expireAbandonedOrders,
    invalidateFn = invalidateCache,
    reconcileFn = fetchMercadoPagoPaymentDetails,
    env = process.env,
  } = {}
) {
  const dryRun = Boolean(options.dryRun);
  const pixMaxAgeMinutes = Math.round((Number(options.pixHours) || 24) * 60);
  const ticketMaxAgeMinutes = Math.round((Number(options.ticketHours) || 120) * 60);
  const limit = Number(options.limit) || 50;
  const shouldReconcile = !options.noReconcile && Boolean(String(env.MP_ACCESS_TOKEN || '').trim());

  const summary = await expireFn({
    dryRun,
    pixMaxAgeMinutes,
    ticketMaxAgeMinutes,
    defaultMaxAgeMinutes: pixMaxAgeMinutes,
    limit,
    reconcilePayment: shouldReconcile ? reconcileFn : null,
  });

  if (!summary.dryRun && summary.expiredCount > 0) {
    await invalidateFn('products:*').catch(() => {});
  }

  return summary;
}

const isDirectExecution =
  Boolean(process.argv[1]) && process.argv[1].endsWith('expire-abandoned-orders.js');

async function main() {
  const nextEnv = await import('@next/env');
  const loadEnvConfig = nextEnv.default?.loadEnvConfig || nextEnv.loadEnvConfig;
  loadEnvConfig(process.cwd());

  const args = parseExpireArgs(process.argv.slice(2));
  const { closeDatabase } = await import('../../lib/infra/db.js');

  try {
    const summary = await runExpireAbandonedOrders(args);
    if (args.json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log('=== Expiração de Pedidos Abandonados (awaiting_payment) ===');
      console.log(`Modo:                      ${summary.dryRun ? 'DRY-RUN (sem alterações)' : 'EXECUÇÃO REAL'}`);
      console.log(`Pedidos analisados:        ${summary.checkedCount}`);
      console.log(`Pedidos expirados:         ${summary.expiredCount}`);
      console.log(`Reconciliados para pago:   ${summary.reconciledToPaidCount}`);
      console.log(`Ignorados por concorrência:${summary.skippedCount}`);
      console.log(`Falhas ao consultar MP:    ${summary.errorCount}`);
      if (summary.expiredOrderIds.length > 0) {
        console.log(`IDs expirados:             ${summary.expiredOrderIds.join(', ')}`);
      }
      if (summary.reconciledOrderIds.length > 0) {
        console.log(`IDs promovidos para pago:  ${summary.reconciledOrderIds.join(', ')}`);
      }
    }

    process.exitCode = summary.errorCount > 0 && summary.expiredCount === 0 ? 1 : 0;
  } catch (err) {
    console.error('❌ Erro ao expirar pedidos abandonados:', err.message);
    process.exitCode = 1;
  } finally {
    await closeDatabase().catch(() => {});
  }
}

if (isDirectExecution) {
  main();
}
