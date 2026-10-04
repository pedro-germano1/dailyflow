import { storageError } from '../database/repository';
import { StorageAdapter, STORAGE_KEYS } from '../database/storage';
import { AppError } from '../types/common';
import { INotificationService, ISettingsService } from '../types/services';
import { NotificationSettings, Settings, ThemeMode, User } from '../types/settings';
import { calcSleepDuration, isValidTime, MAX_SLEEP_MINUTES } from '../utils/time';
import { isRecord } from '../utils/validation';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  defaultSleepTime: '23:30',
  defaultWakeTime: '07:00',
  notifications: {
    // Começa DESLIGADO: a permissão só é pedida quando o usuário ativar os lembretes.
    enabled: false,
    studyReminder: true,
    logRoutineReminder: true,
    sleepReminder: true,
    dailyReminderTime: '21:00',
  },
};

/** App 100% local e de um usuário só: o id é fixo. */
export const DEFAULT_USER: User = { id: 'local-user', name: 'Usuário' };

const THEMES: ThemeMode[] = ['light', 'dark', 'system'];
const MAX_NAME_LENGTH = 40;
const MAX_AVATAR_LENGTH = 500;
/** Versão do formato do arquivo exportado (mude se o formato mudar). */
export const EXPORT_VERSION = 1;

const fail = (message: string, field: string) => new AppError('VALIDATION_ERROR', message, field);
const isObject = isRecord;
const isTime = isValidTime;

/**
 * Lê o que veio do armazenamento e completa/corrige o que faltar com os padrões
 * (tolerante: dado antigo, incompleto ou corrompido nunca derruba o app).
 */
export function normalizeSettings(raw: unknown): Settings {
  const r = isObject(raw) ? raw : {};
  const n = isObject(r.notifications) ? r.notifications : {};
  const d = DEFAULT_SETTINGS;
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  return {
    theme: THEMES.includes(r.theme as ThemeMode) ? (r.theme as ThemeMode) : d.theme,
    defaultSleepTime: isTime(r.defaultSleepTime) ? r.defaultSleepTime : d.defaultSleepTime,
    defaultWakeTime: isTime(r.defaultWakeTime) ? r.defaultWakeTime : d.defaultWakeTime,
    notifications: {
      enabled: bool(n.enabled, d.notifications.enabled),
      studyReminder: bool(n.studyReminder, d.notifications.studyReminder),
      logRoutineReminder: bool(n.logRoutineReminder, d.notifications.logRoutineReminder),
      sleepReminder: bool(n.sleepReminder, d.notifications.sleepReminder),
      dailyReminderTime: isTime(n.dailyReminderTime) ? n.dailyReminderTime : d.notifications.dailyReminderTime,
    },
  };
}

function normalizeUser(raw: unknown): User {
  if (!isObject(raw)) return { ...DEFAULT_USER };
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : DEFAULT_USER.name;
  const avatar = typeof raw.avatar === 'string' && raw.avatar ? raw.avatar : undefined;
  return { id: typeof raw.id === 'string' && raw.id ? raw.id : DEFAULT_USER.id, name, avatar };
}

/** Leitura direta das configurações (usada também pelo notificationService). */
export async function readSettings(storage: StorageAdapter): Promise<Settings> {
  try {
    return normalizeSettings(await storage.getItem<unknown>(STORAGE_KEYS.settings));
  } catch {
    throw storageError();
  }
}

/** Aplica o patch sobre as configurações atuais e valida o RESULTADO. Campos desconhecidos são ignorados. */
function applyAndValidate(current: Settings, patch: unknown): Settings {
  if (!isObject(patch)) throw fail('Configurações inválidas.', 'settings');
  if (patch.notifications !== undefined && !isObject(patch.notifications)) {
    throw fail('Configurações de notificação inválidas.', 'notifications');
  }
  const np = (isObject(patch.notifications) ? patch.notifications : {}) as Record<string, unknown>;
  const pick = (value: unknown, fallback: unknown) => (value === undefined ? fallback : value);

  const theme = pick(patch.theme, current.theme);
  if (!THEMES.includes(theme as ThemeMode)) throw fail('Tema inválido.', 'theme');

  const sleepTime = pick(patch.defaultSleepTime, current.defaultSleepTime);
  if (!isTime(sleepTime)) throw fail('Horário padrão de dormir inválido.', 'defaultSleepTime');
  const wakeTime = pick(patch.defaultWakeTime, current.defaultWakeTime);
  if (!isTime(wakeTime)) throw fail('Horário padrão de acordar inválido.', 'defaultWakeTime');
  const duration = calcSleepDuration(sleepTime, wakeTime);
  if (duration === 0) {
    throw fail('Os horários padrão de dormir e acordar não podem ser iguais.', 'defaultWakeTime');
  }
  if (duration > MAX_SLEEP_MINUTES) {
    throw fail('Essa duração de sono parece incorreta. Confira os horários padrão.', 'defaultWakeTime');
  }

  const boolean = (key: keyof NotificationSettings, label: string): boolean => {
    const value = pick(np[key], current.notifications[key]);
    if (typeof value !== 'boolean') throw fail(`Valor inválido para ${label}.`, `notifications.${key}`);
    return value;
  };
  const reminderTime = pick(np.dailyReminderTime, current.notifications.dailyReminderTime);
  if (!isTime(reminderTime)) {
    throw fail('Horário do lembrete diário inválido.', 'notifications.dailyReminderTime');
  }

  return {
    theme: theme as ThemeMode,
    defaultSleepTime: sleepTime,
    defaultWakeTime: wakeTime,
    notifications: {
      enabled: boolean('enabled', 'ativar lembretes'),
      studyReminder: boolean('studyReminder', 'o lembrete de estudo'),
      logRoutineReminder: boolean('logRoutineReminder', 'o lembrete de registrar a rotina'),
      sleepReminder: boolean('sleepReminder', 'o lembrete de dormir'),
      dailyReminderTime: reminderTime,
    },
  };
}

function applyUserPatch(current: User, patch: unknown): User {
  if (!isObject(patch)) throw fail('Dados do perfil inválidos.', 'user');
  const next: User = { ...current };

  if (patch.name !== undefined) {
    const name = typeof patch.name === 'string' ? patch.name.trim() : '';
    if (!name) throw fail('Informe seu nome.', 'name');
    if (name.length > MAX_NAME_LENGTH) throw fail(`O nome pode ter no máximo ${MAX_NAME_LENGTH} caracteres.`, 'name');
    next.name = name;
  }

  if ('avatar' in patch && patch.avatar !== undefined) {
    if (patch.avatar === null || patch.avatar === '') {
      next.avatar = undefined; // remove o avatar
    } else if (typeof patch.avatar !== 'string' || patch.avatar.length > MAX_AVATAR_LENGTH) {
      throw fail('Avatar inválido.', 'avatar');
    } else {
      next.avatar = patch.avatar;
    }
  }
  return next; // o id nunca muda
}

/**
 * Configurações e perfil. Cada um fica em UMA chave (objeto, não coleção).
 * `updateSettings` salva e depois chama `notifications.syncReminders()` (que nunca lança erro):
 * se o agendamento falhar, as configurações já estão salvas.
 */
export function createSettingsService(
  storage: StorageAdapter,
  notifications: Pick<INotificationService, 'syncReminders'>,
): ISettingsService {
  // Escritas em fila: duas atualizações simultâneas não se sobrescrevem.
  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <R>(task: () => Promise<R>): Promise<R> => {
    const next = queue.then(task);
    queue = next.catch(() => undefined);
    return next;
  };

  const write = async (key: string, value: unknown): Promise<void> => {
    try {
      await storage.setItem(key, value);
    } catch {
      throw storageError();
    }
  };

  const readUser = async (): Promise<User> => {
    try {
      return normalizeUser(await storage.getItem<unknown>(STORAGE_KEYS.user));
    } catch {
      throw storageError();
    }
  };

  const readList = async (key: string): Promise<unknown[]> => {
    try {
      const value = await storage.getItem<unknown>(key);
      return Array.isArray(value) ? value : [];
    } catch {
      throw storageError();
    }
  };

  return {
    getSettings: () => readSettings(storage),

    updateSettings(patch: Partial<Settings>): Promise<Settings> {
      return enqueue(async () => {
        const next = applyAndValidate(await readSettings(storage), patch);
        await write(STORAGE_KEYS.settings, next);
        await notifications.syncReminders();
        return next;
      });
    },

    getUser: readUser,

    updateUser(patch: Partial<Omit<User, 'id'>>): Promise<User> {
      return enqueue(async () => {
        const next = applyUserPatch(await readUser(), patch);
        await write(STORAGE_KEYS.user, next);
        return next;
      });
    },

    /** JSON com TODOS os dados do app (lido direto do armazenamento, sem depender de intervalos de data). */
    async exportData(): Promise<string> {
      const [user, settings, activities, sleep, goals, categories] = await Promise.all([
        readUser(),
        readSettings(storage),
        readList(STORAGE_KEYS.activities),
        readList(STORAGE_KEYS.sleep),
        readList(STORAGE_KEYS.goals),
        readList(STORAGE_KEYS.categories), // só as personalizadas (as padrão vêm do código)
      ]);
      return JSON.stringify(
        {
          app: 'dailyflow',
          version: EXPORT_VERSION,
          exportedAt: new Date().toISOString(),
          user,
          settings,
          customCategories: categories,
          activities,
          sleep,
          goals,
        },
        null,
        2,
      );
    },

    /** Apaga tudo e cancela os lembretes (as configurações voltam ao padrão, com lembretes desligados). */
    clearAllData(): Promise<void> {
      return enqueue(async () => {
        try {
          await storage.clear();
        } catch {
          throw storageError();
        }
        await notifications.syncReminders();
      });
    },
  };
}
