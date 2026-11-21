import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import {
  ADMIN_INACTIVITY_TIMEOUT_MS,
  ADMIN_SESSION_REFRESH_INTERVAL_MS,
  ADMIN_ACTIVITY_STORAGE_KEY,
  ADMIN_REFRESH_STORAGE_KEY,
  ADMIN_LOGOUT_STORAGE_KEY,
  buildAdminLoginUrl,
  touchAdminActivity,
  readAdminLastActivity,
  touchAdminRefresh,
  readAdminLastRefresh,
  tryAcquireAdminRefreshLock,
  releaseAdminRefreshLock,
  clearAdminSessionStorage,
  subscribeAdminUnauthorized,
  notifyAdminUnauthorized,
} from '../../../utils/adminSession.js';

describe('utils/adminSession', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('expõe constantes padrão de 1 hora (inatividade) e 45 minutos (refresh)', () => {
    expect(ADMIN_INACTIVITY_TIMEOUT_MS).toBe(60 * 60 * 1000);
    expect(ADMIN_SESSION_REFRESH_INTERVAL_MS).toBe(45 * 60 * 1000);
  });

  it('buildAdminLoginUrl preserva o motivo quando informado', () => {
    expect(buildAdminLoginUrl('inactivity')).toBe('/login?next=/admin&reason=inactivity');
    expect(buildAdminLoginUrl('expired')).toBe('/login?next=/admin&reason=expired');
    expect(buildAdminLoginUrl(null)).toBe('/login?next=/admin');
    expect(buildAdminLoginUrl(undefined)).toBe('/login?next=/admin');
    expect(buildAdminLoginUrl('outro')).toBe('/login?next=/admin');
  });

  it('touchAdminActivity e readAdminLastActivity gravam e leem o timestamp em localStorage', () => {
    expect(readAdminLastActivity()).toBeNull();

    touchAdminActivity(1700000000000);
    expect(localStorage.getItem(ADMIN_ACTIVITY_STORAGE_KEY)).toBe('1700000000000');
    expect(readAdminLastActivity()).toBe(1700000000000);

    localStorage.setItem(ADMIN_ACTIVITY_STORAGE_KEY, 'invalido');
    expect(readAdminLastActivity()).toBeNull();
  });

  it('clearAdminSessionStorage limpa caches da sessão e só faz broadcast quando solicitado', () => {
    sessionStorage.setItem('admin_dashboard_stats', '{}');
    sessionStorage.setItem('admin-roles-cache', '[]');
    localStorage.setItem(ADMIN_ACTIVITY_STORAGE_KEY, '123456');
    localStorage.setItem(ADMIN_REFRESH_STORAGE_KEY, '123400');
    expect(tryAcquireAdminRefreshLock(124000)).toBe(true);
    expect(tryAcquireAdminRefreshLock(125000)).toBe(false);

    clearAdminSessionStorage({ broadcastLogout: false });
    expect(sessionStorage.getItem('admin_dashboard_stats')).toBeNull();
    expect(sessionStorage.getItem('admin-roles-cache')).toBeNull();
    expect(localStorage.getItem(ADMIN_ACTIVITY_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ADMIN_REFRESH_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(ADMIN_LOGOUT_STORAGE_KEY)).toBeNull();
    expect(tryAcquireAdminRefreshLock(125500)).toBe(true);

    clearAdminSessionStorage({ broadcastLogout: true });
    expect(localStorage.getItem(ADMIN_LOGOUT_STORAGE_KEY)).toMatch(/^\d+$/);
  });

  it('touchAdminRefresh e readAdminLastRefresh gravam e validam o timestamp de renovação', () => {
    expect(readAdminLastRefresh()).toBeNull();

    touchAdminRefresh(1700000001000);
    expect(localStorage.getItem(ADMIN_REFRESH_STORAGE_KEY)).toBe('1700000001000');
    expect(readAdminLastRefresh()).toBe(1700000001000);

    localStorage.setItem(ADMIN_REFRESH_STORAGE_KEY, 'nan');
    expect(readAdminLastRefresh()).toBeNull();
    localStorage.setItem(ADMIN_REFRESH_STORAGE_KEY, '-10');
    expect(readAdminLastRefresh()).toBeNull();
  });

  it('tryAcquireAdminRefreshLock e releaseAdminRefreshLock coordenam trava com TTL', () => {
    const t0 = 1700000000000;
    expect(tryAcquireAdminRefreshLock(t0, 15000)).toBe(true);
    // Outra aba dentro do TTL não adquire
    expect(tryAcquireAdminRefreshLock(t0 + 5000, 15000)).toBe(false);
    // Após expirar o TTL pode readquirir
    expect(tryAcquireAdminRefreshLock(t0 + 15000, 15000)).toBe(true);
    // Após release explícito pode readquirir imediatamente
    releaseAdminRefreshLock();
    expect(tryAcquireAdminRefreshLock(t0 + 15500, 15000)).toBe(true);
  });

  it('subscribeAdminUnauthorized e notifyAdminUnauthorized coordenam assinantes ativos', () => {
    // Sem assinantes: retorna false
    expect(notifyAdminUnauthorized('expired')).toBe(false);

    const handler = jest.fn();
    const unsubscribe = subscribeAdminUnauthorized(handler);

    // Com assinante: retorna true e entrega o motivo
    expect(notifyAdminUnauthorized('inactivity')).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('inactivity');

    // Após cancelar inscrição (chamada dupla segura): volta a retornar false
    unsubscribe();
    unsubscribe();
    expect(notifyAdminUnauthorized('expired')).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
