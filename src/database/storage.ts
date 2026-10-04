/**
 * Abstração de armazenamento. Os services dependem desta interface,
 * não de AsyncStorage/SQLite. Trocar o banco = trocar o adapter.
 */
export interface StorageAdapter {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

/** Chaves versionadas: facilita migrações futuras. */
export const STORAGE_KEYS = {
  activities: '@dailyflow:v1:activities',
  sleep: '@dailyflow:v1:sleep',
  goals: '@dailyflow:v1:goals',
  categories: '@dailyflow:v1:categories',
  settings: '@dailyflow:v1:settings',
  user: '@dailyflow:v1:user',
} as const;
