import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSessionTimeoutOptions {
  timeoutMinutes?: number; // Inactivity timeout in minutes (default 2)
  warningSeconds?: number; // Warning threshold in seconds (default 30)
  onTimeout?: () => void;  // Callback when timeout occurs
}

export const useSessionTimeout = ({
  timeoutMinutes = 2,
  warningSeconds = 30,
  onTimeout,
}: UseSessionTimeoutOptions = {}) => {
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const [timeLeft, setTimeLeft] = useState<number>(timeoutMinutes * 60);
  const [isWarning, setIsWarning] = useState<boolean>(false);
  
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const throttledActivityRef = useRef<number>(0);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Function to manually or automatically reset inactivity timer
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setTimeLeft(timeoutMinutes * 60);
    setIsWarning(false);
    
    // Sync with localStorage so cross-tab activity is shared
    try {
      localStorage.setItem('tenantstack_last_active', String(Date.now()));
    } catch {
      // Ignore if localStorage unavailable
    }
  }, [timeoutMinutes]);

  // Throttled activity handler so high-frequency events (mousemove) don't burden performance
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    // Only process activity at most once every 1000ms
    if (now - throttledActivityRef.current > 1000) {
      throttledActivityRef.current = now;
      resetTimer();
    }
  }, [resetTimer]);

  useEffect(() => {
    // Activity event listeners
    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Listen to storage events for cross-tab activity sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tenantstack_last_active' && e.newValue) {
        const remoteTime = Number(e.newValue);
        if (!isNaN(remoteTime)) {
          lastActivityRef.current = remoteTime;
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    // Initial check
    lastActivityRef.current = Date.now();

    // 1-second interval to accurately compute elapsed time
    timerRef.current = setInterval(() => {
      const elapsedMs = Date.now() - lastActivityRef.current;
      const remainingMs = timeoutMs - elapsedMs;
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      setTimeLeft(remainingSec);

      if (remainingSec <= warningSeconds && remainingSec > 0) {
        setIsWarning(true);
      } else if (remainingSec > warningSeconds) {
        setIsWarning(false);
      }

      if (remainingSec <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        if (onTimeoutRef.current) {
          onTimeoutRef.current();
        }
      }
    }, 1000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      window.removeEventListener('storage', handleStorage);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [handleUserActivity, timeoutMs, warningSeconds]);

  // Format MM:SS
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    timeLeft,
    formattedTime,
    isWarning,
    resetTimer,
  };
};
