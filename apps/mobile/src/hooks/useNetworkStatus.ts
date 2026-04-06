/**
 * Network status hook - detects online/offline without extra dependencies
 * Uses Supabase health endpoint as connectivity check
 */
import { useState, useEffect, useRef } from 'react';

const CHECK_INTERVAL = 10000; // Check every 10 seconds

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const checkConnection = async () => {
      try {
        // Use Supabase auth health endpoint as ping
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch('https://iumsxhhafjdldtrpggia.supabase.co/auth/v1/health', {
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

    // Initial check
    checkConnection();

    // Periodic checks
    intervalRef.current = setInterval(checkConnection, CHECK_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return isConnected;
}
