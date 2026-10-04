/**
 * Monta TODOS os services a partir de um armazenamento e de um agendador de notificações.
 * É o único lugar que liga as peças (a ordem importa: notificações antes de configurações).
 *
 *  - app:    createServices(new AsyncStorageAdapter(), createExpoNotificationScheduler())
 *  - mocks:  createServices(new MemoryStorageAdapter(seed), new FakeNotificationScheduler())
 *  - testes: createServices(new MemoryStorageAdapter(), new FakeNotificationScheduler())
 */
import { StorageAdapter } from '../database/storage';
import { Services } from '../types/services';
import { createActivityService } from './activityService';
import { createCategoryService } from './categoryService';
import { createGoalService } from './goalService';
import { NotificationScheduler } from './notificationScheduler';
import { createNotificationService } from './notificationService';
import { createReportService } from './reportService';
import { createSettingsService, readSettings } from './settingsService';
import { createSleepService } from './sleepService';

export function createServices(storage: StorageAdapter, scheduler: NotificationScheduler): Services {
  const categories = createCategoryService(storage);
  const activities = createActivityService(storage, categories);
  const sleep = createSleepService(storage);
  const reports = createReportService(activities, sleep);
  const goals = createGoalService(storage, activities, sleep, categories);
  const notifications = createNotificationService(() => readSettings(storage), scheduler);
  const settings = createSettingsService(storage, notifications);

  return { categories, activities, sleep, reports, goals, notifications, settings };
}
