import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { useAdminInactivityTimeout } from '../../../hooks/useAdminInactivityTimeout.js';
import {
  ADMIN_ACTIVITY_STORAGE_KEY,
  ADMIN_REFRESH_STORAGE_KEY,
  ADMIN_LOGOUT_STORAGE_KEY,
  readAdminLastActivity,
  tryAcquireAdminRefreshLock,
} from '../../../utils/adminSession.js';

const ONE_HOUR_MS = 60 * 60 * 1000;
const FORTY_FIVE_MINUTES_MS = 45 * 60 * 1000;

describe('Hook - useAdminInactivityTimeout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  it('dispara onTimeout automaticamente após 1 hora sem interação do usuário', () => {
    jest.useFakeTimers();
    const onTimeout = jest.fn();

    const { unmount } = renderHook(() =>
      useAdminInactivityTimeout({
        enabled: true,
        onTimeout,
      })
    );

    try {
      act(() => {
        jest.advanceTimersByTime(ONE_HOUR_MS - 1000);
      });
      expect(onTimeout).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(onTimeout).toHaveBeenCalledTimes(1);
    } finally {
      unmount();
    }
  });

  it('reinicia o prazo de 1 hora quando há interação real do usuário', () => {
    jest.useFakeTimers();
    const onTimeout = jest.fn();

    const { unmount } = renderHook(() =>
      useAdminInactivityTimeout({
        enabled: true,
        onTimeout,
      })
    );

    try {
      // Aos 40 min o usuário interage
      act(() => {
        jest.advanceTimersByTime(40 * 60 * 1000);
        window.dispatchEvent(new Event('pointerdown'));
      });

      // Aos 60 min (20 min após a última interação) NÃO deve expirar
      act(() => {
        jest.advanceTimersByTime(20 * 60 * 1000);
      });
      expect(onTimeout).not.toHaveBeenCalled();

      // Mais 39 min (59 min após última interação): ainda ativo
      act(() => {
        jest.advanceTimersByTime(39 * 60 * 1000);
      });
      expect(onTimeout).not.toHaveBeenCalled();

      // Completa 1 hora desde a última interação (40 + 60 = 100 min)
      act(() => {
        jest.advanceTimersByTime(1 * 60 * 1000);
      });
      expect(onTimeout).toHaveBeenCalledTimes(1);
    } finally {
      unmount();
    }
  });

  it('chama onSessionRefresh aos 45 min apenas se houve atividade real após a última renovação', async () => {
    jest.useFakeTimers();
    const onTimeout = jest.fn();
    const onSessionRefresh = jest.fn().mockResolvedValue(true);

    const { unmount } = renderHook(() =>
      useAdminInactivityTimeout({
        enabled: true,
        onTimeout,
        onSessionRefresh,
      })
    );

    try {
      // Usuário permanece ocioso por 45 min -> NÃO renova
      await act(async () => {
        jest.advanceTimersByTime(FORTY_FIVE_MINUTES_MS);
        await Promise.resolve();
      });
      expect(onSessionRefresh).not.toHaveBeenCalled();

      // Usuário interage aos 46 min -> agora lastActivity > lastRefresh e >= 45 min: renova
      await act(async () => {
        jest.advanceTimersByTime(60 * 1000);
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
        await Promise.resolve();
      });
      expect(onSessionRefresh).toHaveBeenCalledTimes(1);
      expect(onTimeout).not.toHaveBeenCalled();
    } finally {
      unmount();
    }
  });

  it('detecta hibernação/throttling imediatamente ao voltar à aba, interagir ou via checkNow()', () => {
    jest.useFakeTimers();
    const onTimeout = jest.fn();

    const { result, unmount } = renderHook(() =>
      useAdminInactivityTimeout({
        enabled: true,
        onTimeout,
      })
    );

    try {
      const start = Date.now();
      // Avança o relógio do sistema em 2 horas sem disparar timers (hibernação)
      jest.setSystemTime(start + 2 * ONE_HOUR_MS);

      let expired = false;
      act(() => {
        expired = result.current.checkNow();
      });

      expect(expired).toBe(true);
      expect(onTimeout).toHaveBeenCalledTimes(1);

      // Novo evento de usuário após expiração não reinicia nem duplica callback
      act(() => {
        window.dispatchEvent(new Event('pointerdown'));
      });
      expect(onTimeout).toHaveBeenCalledTimes(1);
    } finally {
      unmount();
    }
  });

  it('também detecta hibernação no evento pointerdown sem resetar atividade', () => {
    jest.useFakeTimers();
    const onTimeout = jest.fn();

    const { unmount } = renderHook(() =>
      useAdminInactivityTimeout({
        enabled: true,
        onTimeout,
      })
    );

    try {
      const start = Date.now();
      jest.setSystemTime(start + ONE_HOUR_MS + 5000);

      act(() => {
        window.dispatchEvent(new Event('pointerdown'));
      });

      expect(onTimeout).toHaveBeenCalledTimes(1);
      expect(readAdminLastActivity()).toBe(start);
    } finally {
      unmount();
    }
  });

  it('também detecta hibernação no evento visibilitychange sem resetar atividade', () => {
    jest.useFakeTimers();
    const onTimeout = jest.fn();
    const originalDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');

    const { unmount } = renderHook(() =>
      useAdminInactivityTimeout({
        enabled: true,
        onTimeout,
      })
    );

    try {
      const start = Date.now();
      jest.setSystemTime(start + ONE_HOUR_MS + 5000);

      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });

      act(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(onTimeout).toHaveBeenCalledTimes(1);
      expect(readAdminLastActivity()).toBe(start);
    } finally {
      unmount();
      if (originalDescriptor) {
        Object.defineProperty(document, 'visibilityState', originalDescriptor);
      } else {
        delete document.visibilityState;
      }
    }
  });

  it('também detecta hibernação no evento focus sem resetar atividade', () => {
    jest.useFakeTimers();
    const onTimeout = jest.fn();

    const { unmount } = renderHook(() =>
      useAdminInactivityTimeout({
        enabled: true,
        onTimeout,
      })
    );

    try {
      const start = Date.now();
      jest.setSystemTime(start + ONE_HOUR_MS + 5000);

      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      expect(onTimeout).toHaveBeenCalledTimes(1);
      expect(readAdminLastActivity()).toBe(start);
    } finally {
      unmount();
    }
  });

  it('renova imediatamente após F5 perto de 1 hora quando já passou o intervalo de refresh', async () => {
    jest.useFakeTimers();
    const baseTime = 1700000000000;
    jest.setSystemTime(baseTime);
    const fiftyMinutesAgo = baseTime - 50 * 60 * 1000;
    localStorage.setItem(ADMIN_REFRESH_STORAGE_KEY, String(fiftyMinutesAgo));

    const onSessionRefresh = jest.fn().mockResolvedValue(true);

    const { unmount } = renderHook(() =>
      useAdminInactivityTimeout({
        enabled: true,
        onTimeout: jest.fn(),
        onSessionRefresh,
      })
    );

    try {
      await act(async () => {
        await Promise.resolve();
      });

      expect(onSessionRefresh).toHaveBeenCalledTimes(1);
      expect(Number(localStorage.getItem(ADMIN_REFRESH_STORAGE_KEY))).toBeGreaterThanOrEqual(baseTime);
    } finally {
      unmount();
    }
  });

  it('sincroniza refresh entre abas via StorageEvent e respeita a trava concorrente', async () => {
    jest.useFakeTimers();
    const baseTime = 1700000000000;
    jest.setSystemTime(baseTime);

    const onSessionRefresh = jest.fn().mockResolvedValue(true);
    const { unmount } = renderHook(() =>
      useAdminInactivityTimeout({
        enabled: true,
        onTimeout: jest.fn(),
        onSessionRefresh,
      })
    );

    try {
      // Outra aba renovou a sessão aos 30 min -> atualiza lastRefresh via StorageEvent
      act(() => {
        jest.advanceTimersByTime(30 * 60 * 1000);
        const refreshedAt = Date.now();
        localStorage.setItem(ADMIN_REFRESH_STORAGE_KEY, String(refreshedAt));
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: ADMIN_REFRESH_STORAGE_KEY,
            newValue: String(refreshedAt),
          })
        );
      });

      // Aos 46 min totais (16 min desde o refresh da outra aba), interação NÃO duplica refresh
      await act(async () => {
        jest.advanceTimersByTime(16 * 60 * 1000);
        window.dispatchEvent(new Event('pointerdown'));
        await Promise.resolve();
      });
      expect(onSessionRefresh).not.toHaveBeenCalled();

      // Avança até 44m55s após o refresh da outra aba, adquire a trava como outra aba e cruza 45m
      await act(async () => {
        jest.advanceTimersByTime(28 * 60 * 1000 + 55 * 1000);
        tryAcquireAdminRefreshLock(Date.now());
        jest.advanceTimersByTime(6 * 1000);
        window.dispatchEvent(new Event('pointerdown'));
        await Promise.resolve();
      });
      expect(onSessionRefresh).not.toHaveBeenCalled();
    } finally {
      unmount();
    }
  });

  it('sincroniza atividade e logout entre abas via StorageEvent', () => {
    jest.useFakeTimers();
    const onTimeout = jest.fn();
    const onExternalLogout = jest.fn();

    const { unmount } = renderHook(() =>
      useAdminInactivityTimeout({
        enabled: true,
        onTimeout,
        onExternalLogout,
      })
    );

    try {
      // Outra aba registrou atividade aos 45 min
      act(() => {
        jest.advanceTimersByTime(45 * 60 * 1000);
        const now = Date.now();
        localStorage.setItem(ADMIN_ACTIVITY_STORAGE_KEY, String(now));
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: ADMIN_ACTIVITY_STORAGE_KEY,
            newValue: String(now),
          })
        );
      });

      // Aos 60 min originais (15 min após atividade na outra aba) ainda não expira
      act(() => {
        jest.advanceTimersByTime(15 * 60 * 1000);
      });
      expect(onTimeout).not.toHaveBeenCalled();

      // Outra aba disparou logout
      act(() => {
        const logoutTs = String(Date.now());
        window.dispatchEvent(
          new StorageEvent('storage', {
            key: ADMIN_LOGOUT_STORAGE_KEY,
            newValue: logoutTs,
          })
        );
      });

      expect(onExternalLogout).toHaveBeenCalledTimes(1);
      expect(onTimeout).not.toHaveBeenCalled();
    } finally {
      unmount();
    }
  });

  it('não registra timers quando enabled é false e limpa listeners ao desmontar', () => {
    jest.useFakeTimers();
    const onTimeout = jest.fn();

    const { result, rerender, unmount } = renderHook(
      ({ enabled }) =>
        useAdminInactivityTimeout({
          enabled,
          onTimeout,
        }),
      { initialProps: { enabled: false } }
    );

    try {
      act(() => {
        jest.advanceTimersByTime(2 * ONE_HOUR_MS);
      });
      expect(result.current.checkNow()).toBe(false);
      expect(onTimeout).not.toHaveBeenCalled();

      rerender({ enabled: true });
      unmount();

      act(() => {
        jest.advanceTimersByTime(2 * ONE_HOUR_MS);
      });
      expect(onTimeout).not.toHaveBeenCalled();
    } finally {
      unmount();
    }
  });
});
