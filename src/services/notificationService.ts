import { INotificationService } from '../types/services';
import { Settings } from '../types/settings';
import { addMinutesToTime } from '../utils/time';
import { NotificationScheduler, ReminderRequest } from './notificationScheduler';

/** Ids fixos: o app só mexe nos PRÓPRIOS lembretes, nunca em outras notificações. */
export const REMINDER_IDS = {
  study: 'dailyflow-reminder-study',
  logRoutine: 'dailyflow-reminder-log-routine',
  sleep: 'dailyflow-reminder-sleep',
} as const;

const ALL_REMINDER_IDS: string[] = Object.values(REMINDER_IDS);

/** O contrato não tem horário de estudo, então o lembrete de estudar usa este horário fixo. */
export const STUDY_REMINDER_TIME = '19:00';
/** O lembrete de dormir chega esta quantidade de minutos ANTES do horário de dormir padrão. */
export const SLEEP_REMINDER_OFFSET_MINUTES = 30;

function at(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

/**
 * FUNÇÃO PURA: dado as configurações, devolve os lembretes que devem existir.
 * - `notifications.enabled = false` desliga tudo.
 * - estudar: horário fixo (STUDY_REMINDER_TIME).
 * - registrar rotina: `dailyReminderTime`.
 * - dormir: 30 min antes de `defaultSleepTime` (00:10 -> 23:40, dá a volta na meia-noite).
 */
export function buildReminderPlan(settings: Settings): ReminderRequest[] {
  const n = settings.notifications;
  if (!n.enabled) return [];

  const plan: ReminderRequest[] = [];
  if (n.studyReminder) {
    plan.push({
      id: REMINDER_IDS.study,
      title: 'Hora de estudar 📚',
      body: 'Reserve um tempinho para estudar hoje.',
      ...at(STUDY_REMINDER_TIME),
    });
  }
  if (n.logRoutineReminder) {
    plan.push({
      id: REMINDER_IDS.logRoutine,
      title: 'Registre sua rotina 📝',
      body: 'Anote o que você fez hoje no DailyFlow.',
      ...at(n.dailyReminderTime),
    });
  }
  if (n.sleepReminder) {
    plan.push({
      id: REMINDER_IDS.sleep,
      title: 'Hora de se preparar para dormir 😴',
      body: `Seu horário de dormir é às ${settings.defaultSleepTime}.`,
      ...at(addMinutesToTime(settings.defaultSleepTime, -SLEEP_REMINDER_OFFSET_MINUTES)),
    });
  }
  return plan;
}

/**
 * `loadSettings` é injetado (em vez de depender do settingsService) para não haver
 * dependência circular: settingsService chama syncReminders(), e syncReminders lê as configurações.
 *
 * Regras:
 * - `syncReminders` NUNCA lança erro: se falhar, o app continua funcionando e o problema vai
 *   para `onError` (padrão: console.warn). Os lembretes são reagendados na próxima chamada.
 * - Sem permissão, não agenda nada e NÃO abre pedido de permissão (quem pede é a UI via requestPermission).
 * - Chamadas simultâneas são executadas uma de cada vez (sem cancelar/agendar embaralhado).
 */
export function createNotificationService(
  loadSettings: () => Promise<Settings>,
  scheduler: NotificationScheduler,
  onError: (error: unknown) => void = (e) => console.warn('[DailyFlow] Falha ao agendar lembretes:', e),
): INotificationService {
  let queue: Promise<unknown> = Promise.resolve();

  const sync = async (): Promise<void> => {
    try {
      const plan = buildReminderPlan(await loadSettings());
      // Sempre cancela os 3 lembretes primeiro; depois agenda só os que continuam ligados.
      await Promise.all(ALL_REMINDER_IDS.map((id) => scheduler.cancel(id)));
      if (plan.length === 0) return;
      if (!(await scheduler.getPermission())) return;
      for (const reminder of plan) await scheduler.schedule(reminder);
    } catch (error) {
      onError(error);
    }
  };

  return {
    async requestPermission(): Promise<boolean> {
      try {
        return await scheduler.requestPermission();
      } catch (error) {
        onError(error);
        return false;
      }
    },

    syncReminders(): Promise<void> {
      const next = queue.then(sync);
      queue = next;
      return next;
    },
  };
}
