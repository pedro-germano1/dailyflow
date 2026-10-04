/**
 * Services falsos para a UI (Pessoa 1) desenvolver sem depender da lógica real.
 *
 * - Atividades e categorias usam o CRUD REAL sobre um adapter em MEMÓRIA
 *   (criar/editar/excluir funcionam nas telas; os dados somem ao fechar o app).
 * - Sono também usa o service REAL (cálculo de duração e estatísticas funcionam).
 * - Relatórios, metas e configurações devolvem dados fixos/simples.
 *
 * Uso:  const services = createMockServices();
 */
import { MemoryStorageAdapter } from '../database/memoryStorageAdapter';
import { STORAGE_KEYS } from '../database/storage';
import { createActivityService } from '../services/activityService';
import { createCategoryService } from '../services/categoryService';
import { createSleepService } from '../services/sleepService';
import { AppError } from '../types/common';
import { Goal } from '../types/goal';
import { Services } from '../types/services';
import { Settings, User } from '../types/settings';
import { generateId } from '../utils/id';
import {
  buildMockMonthlyReport, buildMockWeeklyReport, mockActivities, mockDailyReport,
  mockGoals, mockSettings, mockSleepData, mockUser,
} from './mockData';

export function createMockServices(): Services {
  const storage = new MemoryStorageAdapter({
    [STORAGE_KEYS.activities]: mockActivities,
    [STORAGE_KEYS.sleep]: mockSleepData,
  });
  const categories = createCategoryService(storage);
  const activities = createActivityService(storage, categories);
  const sleep = createSleepService(storage);

  let goals: Goal[] = [...mockGoals];
  let settings: Settings = { ...mockSettings };
  let user: User = { ...mockUser };

  return {
    categories,
    activities,

    sleep,

    reports: {
      async getDaily(date) {
        return { ...mockDailyReport, date };
      },
      async getWeekly(weekStart) {
        return buildMockWeeklyReport(weekStart);
      },
      async getMonthly(month) {
        return buildMockMonthlyReport(month);
      },
    },

    goals: {
      async list() {
        return goals;
      },
      async create(input) {
        const goal: Goal = { ...input, id: generateId(), active: true };
        goals = [...goals, goal];
        return goal;
      },
      async update(id, input) {
        const current = goals.find((g) => g.id === id);
        if (!current) throw new AppError('NOT_FOUND', 'Meta não encontrada.');
        const updated = { ...current, ...input };
        goals = goals.map((g) => (g.id === id ? updated : g));
        return updated;
      },
      async remove(id) {
        goals = goals.filter((g) => g.id !== id);
      },
      async getProgress(id) {
        const goal = goals.find((g) => g.id === id);
        if (!goal) throw new AppError('NOT_FOUND', 'Meta não encontrada.');
        const current = goal.target * 0.6;
        return {
          goalId: id, current, target: goal.target, percent: 60,
          daysRemaining: 4, achieved: false, history: [],
        };
      },
    },

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
        await storage.removeItem(STORAGE_KEYS.sleep);
        goals = [];
      },
    },
  };
}
