/**
 * Services falsos para a UI (Pessoa 1) desenvolver sem depender da lógica real.
 *
 * - Atividades e categorias usam o CRUD REAL sobre um adapter em MEMÓRIA
 *   (criar/editar/excluir funcionam nas telas; os dados somem ao fechar o app).
 * - Sono, relatórios, metas e configurações devolvem dados fixos/simples.
 *
 * Uso:  const services = createMockServices();
 */
import { MemoryStorageAdapter } from '../database/memoryStorageAdapter';
import { STORAGE_KEYS } from '../database/storage';
import { createActivityService } from '../services/activityService';
import { createCategoryService } from '../services/categoryService';
import { AppError } from '../types/common';
import { Goal } from '../types/goal';
import { Services } from '../types/services';
import { Settings, User } from '../types/settings';
import { SleepRecord } from '../types/sleep';
import { generateId } from '../utils/id';
import {
  buildMockMonthlyReport, buildMockWeeklyReport, mockActivities, mockDailyReport,
  mockGoals, mockSettings, mockSleepData, mockUser,
} from './mockData';

export function createMockServices(): Services {
  const storage = new MemoryStorageAdapter({ [STORAGE_KEYS.activities]: mockActivities });
  const categories = createCategoryService(storage);
  const activities = createActivityService(storage, categories);

  let sleepRecords: SleepRecord[] = [...mockSleepData];
  let goals: Goal[] = [...mockGoals];
  let settings: Settings = { ...mockSettings };
  let user: User = { ...mockUser };

  return {
    categories,
    activities,

    sleep: {
      async getByDate(date) {
        return sleepRecords.find((s) => s.date === date) ?? null;
      },
      async list(from, to) {
        return sleepRecords.filter((s) => s.date >= from && s.date <= to);
      },
      async save(input) {
        // Duração simplificada: a lógica real (Semana 3) fica no sleepService.
        const [sh, sm] = input.sleepTime.split(':').map(Number);
        const [wh, wm] = input.wakeTime.split(':').map(Number);
        let duration = wh * 60 + wm - (sh * 60 + sm);
        if (duration <= 0) duration += 24 * 60;
        const record: SleepRecord = { id: generateId(), ...input, duration };
        sleepRecords = [...sleepRecords.filter((s) => s.date !== input.date), record];
        return record;
      },
      async remove(id) {
        sleepRecords = sleepRecords.filter((s) => s.id !== id);
      },
      async getStats() {
        const sorted = [...sleepRecords].sort((a, b) => b.duration - a.duration);
        return {
          averageMinutes: 454,
          bestDay: sorted[0] ? { date: sorted[0].date, duration: sorted[0].duration } : null,
          shortestDay: sorted.length ? { date: sorted[sorted.length - 1].date, duration: sorted[sorted.length - 1].duration } : null,
          sleepTimeVariationMinutes: 48,
          regularityScore: 78,
          recordsCount: sleepRecords.length,
        };
      },
    },

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
        sleepRecords = [];
        goals = [];
      },
    },
  };
}
