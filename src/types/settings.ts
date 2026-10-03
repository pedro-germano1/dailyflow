import { Id, TimeString } from './common';

export interface User {
  id: Id;
  name: string;
  /** URI local da imagem ou emoji. */
  avatar?: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface NotificationSettings {
  enabled: boolean;
  studyReminder: boolean;
  logRoutineReminder: boolean;
  sleepReminder: boolean;
  /** Horário do lembrete diário de registro. */
  dailyReminderTime: TimeString;
}

export interface Settings {
  theme: ThemeMode;
  defaultSleepTime: TimeString;
  defaultWakeTime: TimeString;
  notifications: NotificationSettings;
}
