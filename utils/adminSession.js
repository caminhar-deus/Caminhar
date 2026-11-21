/**
 * Utilitários de gerenciamento de sessão administrativa no cliente.
 *
 * Mantém constantes de expiração por inatividade (1 hora), sincronização entre
 * abas via localStorage e um barramento leve de eventos HTTP 401 sem acoplar
 * utils às camadas de hooks/components/pages.
 *
 * @module utils/adminSession
 */

export const ADMIN_INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora
export const ADMIN_SESSION_REFRESH_INTERVAL_MS = 45 * 60 * 1000; // 45 minutos
export const ADMIN_ACTIVITY_STORAGE_KEY = 'admin_last_activity_at';
export const ADMIN_REFRESH_STORAGE_KEY = 'admin_last_refresh_at';
export const ADMIN_LOGOUT_STORAGE_KEY = 'admin_session_logout_at';

const ADMIN_UNAUTHORIZED_EVENT = 'caminhar:admin-unauthorized';
const ADMIN_SESSION_CACHE_KEYS = ['admin_dashboard_stats', 'admin-roles-cache'];
const ADMIN_REFRESH_LOCK_KEY = 'admin_session_refresh_lock_at';
const ADMIN_REFRESH_LOCK_TTL_MS = 15 * 1000;

let activeUnauthorizedListeners = 0;

/**
 * Monta a URL canônica da tela de login do admin preservando o motivo do encerramento.
 *
 * @param {'inactivity'|'expired'|null|undefined} [reason]
 * @returns {string}
 */
export function buildAdminLoginUrl(reason) {
  if (reason === 'inactivity') {
    return '/login?next=/admin&reason=inactivity';
  }
  if (reason === 'expired') {
    return '/login?next=/admin&reason=expired';
  }
  return '/login?next=/admin';
}

/**
 * Registra o instante da última atividade real do operador no painel.
 *
 * @param {number} [now=Date.now()]
 */
export function touchAdminActivity(now = Date.now()) {
  if (typeof window === 'undefined' || !Number.isFinite(now)) return;
  try {
    window.localStorage.setItem(ADMIN_ACTIVITY_STORAGE_KEY, String(now));
  } catch {
    // Ignora falhas de localStorage (modo privado/quota)
  }
}

/**
 * Lê o timestamp da última atividade gravado no localStorage.
 *
 * @returns {number|null}
 */
export function readAdminLastActivity() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_ACTIVITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Registra o instante da última emissão/renovação de JWT administrativo.
 *
 * @param {number} [now=Date.now()]
 */
export function touchAdminRefresh(now = Date.now()) {
  if (typeof window === 'undefined' || !Number.isFinite(now)) return;
  try {
    window.localStorage.setItem(ADMIN_REFRESH_STORAGE_KEY, String(now));
  } catch {
    // Ignora falhas de localStorage (modo privado/quota)
  }
}

/**
 * Lê o timestamp da última emissão/renovação de JWT gravado no localStorage.
 *
 * @returns {number|null}
 */
export function readAdminLastRefresh() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_REFRESH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Adquire uma trava curta em localStorage para evitar rotação concorrente
 * do refresh token entre múltiplas abas do painel.
 *
 * @param {number} [now=Date.now()]
 * @param {number} [ttlMs=ADMIN_REFRESH_LOCK_TTL_MS]
 * @returns {boolean}
 */
export function tryAcquireAdminRefreshLock(now = Date.now(), ttlMs = ADMIN_REFRESH_LOCK_TTL_MS) {
  if (typeof window === 'undefined') return true;
  const currentNow = Number.isFinite(now) ? now : Date.now();
  try {
    const raw = window.localStorage.getItem(ADMIN_REFRESH_LOCK_KEY);
    if (raw) {
      const existing = Number(raw);
      if (
        Number.isFinite(existing) &&
        currentNow - existing < ttlMs &&
        existing <= currentNow + ttlMs
      ) {
        return false;
      }
    }
    window.localStorage.setItem(ADMIN_REFRESH_LOCK_KEY, String(currentNow));
    return true;
  } catch {
    return true;
  }
}

/**
 * Libera a trava de renovação do refresh token em localStorage.
 */
export function releaseAdminRefreshLock() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(ADMIN_REFRESH_LOCK_KEY);
  } catch {
    // Ignora falhas de localStorage
  }
}

/**
 * Limpa caches locais da sessão administrativa e opcionalmente notifica outras abas.
 *
 * @param {Object} [options={}]
 * @param {boolean} [options.broadcastLogout=false]
 */
export function clearAdminSessionStorage({ broadcastLogout = false } = {}) {
  if (typeof window === 'undefined') return;

  try {
    for (const key of ADMIN_SESSION_CACHE_KEYS) {
      window.sessionStorage.removeItem(key);
    }
  } catch {
    // Ignora falhas de sessionStorage
  }

  try {
    window.localStorage.removeItem(ADMIN_ACTIVITY_STORAGE_KEY);
    window.localStorage.removeItem(ADMIN_REFRESH_STORAGE_KEY);
    window.localStorage.removeItem(ADMIN_REFRESH_LOCK_KEY);
    if (broadcastLogout) {
      window.localStorage.setItem(ADMIN_LOGOUT_STORAGE_KEY, String(Date.now()));
    }
  } catch {
    // Ignora falhas de localStorage
  }
}

/**
 * Registra um assinante para eventos de sessão não autorizada (HTTP 401) no painel.
 *
 * @param {(reason: string) => void} handler
 * @returns {() => void} Função de limpeza
 */
export function subscribeAdminUnauthorized(handler) {
  if (typeof window === 'undefined' || typeof handler !== 'function') {
    return () => {};
  }

  let active = true;
  activeUnauthorizedListeners += 1;

  const listener = (event) => {
    handler(event?.detail?.reason || 'expired');
  };

  window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, listener);

  return () => {
    if (!active) return;
    active = false;
    activeUnauthorizedListeners = Math.max(0, activeUnauthorizedListeners - 1);
    window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, listener);
  };
}

/**
 * Notifica o controlador do painel que uma requisição recebeu HTTP 401.
 * Retorna `true` apenas quando há pelo menos um assinante ativo (ou seja,
 * dentro de `/admin` montado e autenticado), permitindo suprimir erros espúrios.
 *
 * @param {'expired'|'inactivity'} [reason='expired']
 * @returns {boolean}
 */
export function notifyAdminUnauthorized(reason = 'expired') {
  if (typeof window === 'undefined') return false;

  const handled = activeUnauthorizedListeners > 0;
  window.dispatchEvent(new CustomEvent(ADMIN_UNAUTHORIZED_EVENT, { detail: { reason } }));
  return handled;
}
