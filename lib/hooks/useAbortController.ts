/**
 * Centralized hook for managing AbortControllers
 * Automatically aborts all pending requests when component unmounts
 */

import { useEffect, useRef } from 'react';

export function useAbortController() {
  const controllersRef = useRef<Map<string, AbortController>>(new Map());

  /**
   * Create or get an AbortController for a specific operation
   * @param key Unique identifier for this operation (e.g., 'fetch-pr', 'chat-stream')
   * @returns AbortSignal to pass to fetch
   */
  const getSignal = (key: string): AbortSignal => {
    // Abort existing controller if present
    const existing = controllersRef.current.get(key);
    if (existing) {
      existing.abort();
    }

    // Create new controller
    const controller = new AbortController();
    controllersRef.current.set(key, controller);

    return controller.signal;
  };

  /**
   * Manually abort a specific operation
   * @param key Unique identifier for the operation to abort
   */
  const abort = (key: string) => {
    const controller = controllersRef.current.get(key);
    if (controller) {
      console.log(`[AbortController] Aborting operation: ${key}`);
      controller.abort();
      controllersRef.current.delete(key);
    }
  };

  /**
   * Abort all pending operations
   */
  const abortAll = () => {
    console.log(`[AbortController] Aborting all operations (${controllersRef.current.size} active)`);
    controllersRef.current.forEach((controller) => {
      controller.abort();
    });
    controllersRef.current.clear();
  };

  /**
   * Check if an error is an AbortError
   */
  const isAbortError = (error: unknown): boolean => {
    return error instanceof Error && error.name === 'AbortError';
  };

  // Cleanup: abort all operations on unmount
  useEffect(() => {
    return () => {
      abortAll();
    };
  }, []);

  return {
    getSignal,
    abort,
    abortAll,
    isAbortError,
  };
}
