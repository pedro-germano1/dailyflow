import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageAdapter } from './storage';

const APP_PREFIX = '@dailyflow:';

/** Implementação real de persistência (funciona no Expo Go). */
export class AsyncStorageAdapter implements StorageAdapter {
  async getItem<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  /** Remove só as chaves do app (não apaga dados de outras libs). */
  async clear(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const mine = keys.filter((k) => k.startsWith(APP_PREFIX));
    if (mine.length > 0) await AsyncStorage.multiRemove(mine);
  }
}
