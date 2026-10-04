import { ID, TimeString } from './common';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserProfile {
  id: ID;
  name: string;
  avatarUri?: string;
}

export interface NotificationSettings {
  enabled: boolean;
  studyReminder: boolean;
  dailyLogReminder: boolean;
  sleepReminder: boolean;
}

export interface Settings {
  theme: ThemeMode;
  defaultSleepTime: TimeString;
  defaultWakeTime: TimeString;
  notifications: NotificationSettings;
}