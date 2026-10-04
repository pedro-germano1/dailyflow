/**
 * Services falsos para a UI (Pessoa 1) desenvolver sem depender da lógica real.
 *
 * Tudo usa o service REAL sobre um adapter em MEMÓRIA (os dados somem ao fechar o app):
 * atividades, categorias, sono, relatórios (diário, semanal e mensal) e metas.
 * Só configurações e notificações são simples/fixas.
 *
 * Uso:  const services = createMockServices();
 */
import { MemoryStorageAdapter } from '../database/memoryStorageAdapter';
import { STORAGE_KEYS } from '../database/storage';
import { createActivityService } from '../services/activityService';
import { createCategoryService } from '../services/categoryService';
import { createGoalService } from '../services/goalService';
import { createReportService } from '../services/reportService';
import { createSleepService } from '../services/sleepService';
import { Services } from '../types/services';
import { Settings, User } from '../types/settings';
import { mockActivities, mockGoals, mockSettings, mockSleepData, mockUser } from './mockData';

export function createMockServices(): Services {
  const storage = new MemoryStorageAdapter({
    [STORAGE_KEYS.activities]: mockActivities,
    [STORAGE_KEYS.sleep]: mockSleepData,
    [STORAGE_KEYS.goals]: mockGoals,
  });
  const categories = createCategoryService(storage);
  const activities = createActivityService(storage, categories);
  const sleep = createSleepService(storage);
  const reports = createReportService(activities, sleep);
  const goals = createGoalService(storage, activities, sleep, categories);

  let settings: Settings = { ...mockSettings };
  let user: User = { ...mockUser };

  return {
    categories,
    activities,
    sleep,
    reports,
    goals,

    notifications: {
      async requestPermission() {
        return true;
      },
      async syncReminders() {},
    },

    settings: {
      async getSettings() {
        return settings;
      },
      async updateSettings(patch) {
        settings = { ...settings, ...patch };
        return settings;
      },
      async getUser() {
        return user;
      },
      async updateUser(patch) {
        user = { ...user, ...patch };
        return user;
      },
      async exportData() {
        return JSON.stringify({ user, settings, activities: await activities.list() }, null, 2);
      },
      async clearAllData() {
        await storage.clear(); // apaga atividades, sono, metas e categorias personalizadas
      },
    },
  };
}
