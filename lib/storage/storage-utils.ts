// Generic localStorage utilities
// Provides type-safe localStorage operations with error handling

export interface StorageOptions<T> {
  key: string;

  defaultValue?: T;

  serialize?: (value: T) => string;

  deserialize?: (value: string) => T;
}

export function createLocalStorageStore<T>(options: StorageOptions<T>) {
  const {
    key,
    defaultValue,
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  } = options;

  return {
    get(): T | null {
      if (typeof window === 'undefined') {
        return defaultValue ?? null;
      }

      try {
        const stored = localStorage.getItem(key);
        if (!stored) {
          return defaultValue ?? null;
        }

        return deserialize(stored) as T;
      } catch (error) {
        console.error(`[Storage] Failed to get ${key}:`, error);
        return defaultValue ?? null;
      }
    },

    set(value: T): boolean {
      if (typeof window === 'undefined') {
        return false;
      }

      try {
        localStorage.setItem(key, serialize(value));
        return true;
      } catch (error) {
        console.error(`[Storage] Failed to set ${key}:`, error);
        return false;
      }
    },

    remove(): void {
      if (typeof window === 'undefined') {
        return;
      }

      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.error(`[Storage] Failed to remove ${key}:`, error);
      }
    },

    has(): boolean {
      if (typeof window === 'undefined') {
        return false;
      }

      try {
        return localStorage.getItem(key) !== null;
      } catch (error) {
        console.error(`[Storage] Failed to check ${key}:`, error);
        return false;
      }
    },
  };
}
