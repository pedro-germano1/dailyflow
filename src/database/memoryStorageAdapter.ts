import { StorageAdapter } from './storage';

/**
 * Adapter em memória: usado em testes e nos mocks da UI.
 * Guarda JSON string (como o AsyncStorage) para evitar mutação por referência.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>();

  constructor(initial?: Record<string, unknown>) {
    if (initial) {
      Object.entries(initial).forEach(([k, v]) => this.store.set(k, JSON.stringify(v)));
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    const raw = this.store.get(key);
    return raw === undefined ? null : (JSON.parse(raw) as T);
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    this.store.set(key, JSON.stringify(value));
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
