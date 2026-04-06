/**
 * Error handling utilities for the mobile app
 * Provides consistent error handling pattern across all operations
 */
import { Alert } from 'react-native';

/**
 * Wraps an async operation with loading state and error handling
 */
export async function withErrorHandling(
  operation: () => Promise<void>,
  errorMsg: string,
  setLoading: (loading: boolean) => void
): Promise<void> {
  try {
    setLoading(true);
    await operation();
  } catch (e) {
    const message = e instanceof Error ? e.message : errorMsg;
    Alert.alert('Error', message);
    console.error(`[AFT Error] ${errorMsg}:`, e);
  } finally {
    setLoading(false);
  }
}

/**
 * Safe wrapper for operations that shouldn't crash the app
 */
export function safeExecute<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch (e) {
    console.error('[AFT Safe Execute] Error:', e);
    return fallback;
  }
}
