/**
 * Network status hook - detects online/offline without extra dependencies
 * Uses Supabase health endpoint as connectivity check
 */
import { useState, useEffect, useRef } from 'react';

const CHECK_INTERVAL = 10000;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkConnection = async () => {
      if (!SUPABASE_URL) return;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!cancelled) {
          setIsConnected(response.ok);
        }
      } catch {
        if (!cancelled) {
          setIsConnected(false);
        }
      }
    };

    checkConnection();

    intervalRef.current = setInterval(checkConnection, CHECK_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return isConnected;
}
