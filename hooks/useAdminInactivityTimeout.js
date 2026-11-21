import { useEffect, useRef, useCallback } from 'react';
import {
  ADMIN_INACTIVITY_TIMEOUT_MS,
  ADMIN_SESSION_REFRESH_INTERVAL_MS,
  ADMIN_ACTIVITY_STORAGE_KEY,
  ADMIN_REFRESH_STORAGE_KEY,
  ADMIN_LOGOUT_STORAGE_KEY,
  touchAdminActivity,
  readAdminLastActivity,
  touchAdminRefresh,
  readAdminLastRefresh,
  tryAcquireAdminRefreshLock,
  releaseAdminRefreshLock,
} from '../utils/adminSession';

const ACTIVITY_THROTTLE_MS = 5000;
const ACTIVITY_EVENTS = [
  'pointerdown',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'mousemove',
];

/**
 * Monitora inatividade real do operador no painel administrativo.
 *
 * - Encerra a sessão via `onTimeout` após `timeoutMs` (padrão: 1 hora) sem interação real.
 * - Renova a sessão via `onSessionRefresh` antes do vencimento do JWT apenas quando
 *   houve atividade real após a última renovação.
 * - Detecta hibernação/throttling de timers ao retornar à aba, ao focar a janela ou
 *   no próximo evento de usuário, bem como via `checkNow()`.
 * - Sincroniza atividade e logout entre múltiplas abas do painel via `storage`.
 *
 * @param {Object} options
 * @param {boolean} options.enabled
 * @param {number} [options.timeoutMs=ADMIN_INACTIVITY_TIMEOUT_MS]
 * @param {number} [options.refreshIntervalMs=ADMIN_SESSION_REFRESH_INTERVAL_MS]
 * @param {() => void} [options.onTimeout]
 * @param {() => void} [options.onExternalLogout]
 * @param {() => Promise<boolean>|boolean} [options.onSessionRefresh]
 * @returns {{ checkNow: () => boolean }}
 */
export function useAdminInactivityTimeout({
  enabled,
  timeoutMs = ADMIN_INACTIVITY_TIMEOUT_MS,
  refreshIntervalMs = ADMIN_SESSION_REFRESH_INTERVAL_MS,
  onTimeout,
  onExternalLogout,
  onSessionRefresh,
}) {
  const onTimeoutRef = useRef(onTimeout);
  const onExternalLogoutRef = useRef(onExternalLogout);
  const onSessionRefreshRef = useRef(onSessionRefresh);

  onTimeoutRef.current = onTimeout;
  onExternalLogoutRef.current = onExternalLogout;
  onSessionRefreshRef.current = onSessionRefresh;

  const checkNowRef = useRef(() => false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      checkNowRef.current = () => false;
      return undefined;
    }

    let active = true;
    const initialNow = Date.now();
    const storedRefresh = readAdminLastRefresh();
    const hasRecentStoredRefresh =
      storedRefresh &&
      storedRefresh <= initialNow &&
      initialNow - storedRefresh >= ACTIVITY_THROTTLE_MS &&
      initialNow - storedRefresh < timeoutMs;
    let timeoutTimer = null;
    let heartbeatTimer = null;
    let lastActivity = initialNow;
    let lastRefresh = hasRecentStoredRefresh ? storedRefresh : initialNow;
    let lastWrittenStorage = initialNow;
    let timedOut = false;
    let refreshing = false;

    touchAdminActivity(initialNow);
    if (!hasRecentStoredRefresh) {
      touchAdminRefresh(initialNow);
    }

    const clearTimers = () => {
      if (timeoutTimer !== null) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
      if (heartbeatTimer !== null) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    };

    const getEffectiveLastActivity = () => {
      const stored = readAdminLastActivity();
      return Math.max(lastActivity, stored || 0);
    };

    const triggerTimeout = () => {
      if (timedOut) return;
      timedOut = true;
      clearTimers();
      onTimeoutRef.current?.();
    };

    const maybeRefreshSession = (now) => {
      if (timedOut || refreshing || typeof onSessionRefreshRef.current !== 'function') {
        return;
      }
      const latestStoredRefresh = readAdminLastRefresh();
      if (latestStoredRefresh && latestStoredRefresh > lastRefresh) {
        lastRefresh = latestStoredRefresh;
      }
      const effectiveLastActivity = getEffectiveLastActivity();
      if (
        now - effectiveLastActivity < timeoutMs &&
        effectiveLastActivity > lastRefresh &&
        now - lastRefresh >= refreshIntervalMs
      ) {
        if (!tryAcquireAdminRefreshLock(now)) {
          return;
        }
        refreshing = true;
        Promise.resolve(onSessionRefreshRef.current())
          .then((ok) => {
            if (active && ok && !timedOut) {
              const refreshedAt = Date.now();
              lastRefresh = refreshedAt;
              touchAdminRefresh(refreshedAt);
            }
          })
          .catch(() => {
            // Tratamento de falha fica a cargo do callback
          })
          .finally(() => {
            refreshing = false;
            releaseAdminRefreshLock();
          });
      }
    };

    let checkInactivity;

    const scheduleTimeout = () => {
      if (timedOut) return;
      if (timeoutTimer !== null) {
        clearTimeout(timeoutTimer);
        timeoutTimer = null;
      }
      const remaining = timeoutMs - (Date.now() - getEffectiveLastActivity());
      if (remaining <= 0) {
        triggerTimeout();
        return;
      }
      timeoutTimer = setTimeout(checkInactivity, remaining);
    };

    checkInactivity = () => {
      if (!active) return false;
      if (timedOut) return true;
      const now = Date.now();
      if (now - getEffectiveLastActivity() >= timeoutMs) {
        triggerTimeout();
        return true;
      }
      scheduleTimeout();
      maybeRefreshSession(now);
      return false;
    };

    checkNowRef.current = checkInactivity;

    const handleUserActivity = () => {
      if (!active || timedOut) return;
      const now = Date.now();
      if (now - getEffectiveLastActivity() >= timeoutMs) {
        triggerTimeout();
        return;
      }

      lastActivity = now;
      if (now - lastWrittenStorage >= ACTIVITY_THROTTLE_MS) {
        lastWrittenStorage = now;
        touchAdminActivity(now);
        scheduleTimeout();
      }
      maybeRefreshSession(now);
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        checkInactivity();
      }
    };

    const handleFocus = () => {
      checkInactivity();
    };

    const handleStorage = (event) => {
      if (!active) return;
      if (event.key === ADMIN_LOGOUT_STORAGE_KEY && event.newValue) {
        if (!timedOut) {
          timedOut = true;
          clearTimers();
          onExternalLogoutRef.current?.();
        }
        return;
      }

      if (event.key === ADMIN_ACTIVITY_STORAGE_KEY && event.newValue && !timedOut) {
        const parsed = Number(event.newValue);
        if (Number.isFinite(parsed) && parsed > lastActivity && Date.now() - parsed < timeoutMs) {
          lastActivity = parsed;
          scheduleTimeout();
        }
        return;
      }

      if (event.key === ADMIN_REFRESH_STORAGE_KEY && event.newValue && !timedOut) {
        const parsed = Number(event.newValue);
        if (Number.isFinite(parsed) && parsed > lastRefresh) {
          lastRefresh = parsed;
        }
      }
    };

    const activityListenerOptions = { capture: true, passive: true };
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleUserActivity, activityListenerOptions);
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);

    scheduleTimeout();
    const heartbeatMs = Math.min(60000, Math.max(1000, Math.floor(timeoutMs / 2)));
    heartbeatTimer = setInterval(checkInactivity, heartbeatMs);
    maybeRefreshSession(initialNow);

    return () => {
      active = false;
      checkNowRef.current = () => false;
      clearTimers();
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleUserActivity, activityListenerOptions);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, [enabled, timeoutMs, refreshIntervalMs]);

  const checkNow = useCallback(() => checkNowRef.current(), []);

  return { checkNow };
}
