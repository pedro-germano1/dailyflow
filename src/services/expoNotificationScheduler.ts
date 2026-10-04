import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotificationScheduler, ReminderRequest } from './notificationScheduler';

/** Canal do Android (obrigatório no Android 8+; o aviso de permissão do Android 13 só aparece depois que existe um canal). */
const CHANNEL_ID = 'lembretes';

let handlerConfigured = false;

/** Sem isso, a notificação NÃO aparece quando o app está aberto. */
function configureForegroundHandler(): void {
  if (handlerConfigured) return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Lembretes',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** No iOS use `ios.status`: o campo `granted` raiz não distingue a permissão provisória. */
function isGranted(status: Notifications.NotificationPermissionsStatus): boolean {
  return status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

/**
 * Implementação real (Expo Go: notificações LOCAIS funcionam; push remoto não é usado).
 * No navegador (web) o expo-notifications não agenda nada, então tudo vira no-op e a permissão é false.
 */
export function createExpoNotificationScheduler(): NotificationScheduler {
  const supported = Platform.OS === 'ios' || Platform.OS === 'android';
  if (supported) configureForegroundHandler();

  return {
    async getPermission(): Promise<boolean> {
      if (!supported) return false;
      return isGranted(await Notifications.getPermissionsAsync());
    },

    async requestPermission(): Promise<boolean> {
      if (!supported) return false;
      await ensureAndroidChannel();
      const current = await Notifications.getPermissionsAsync();
      if (isGranted(current)) return true;
      if (!current.canAskAgain) return false; // o usuário já negou: só nas configurações do sistema
      return isGranted(await Notifications.requestPermissionsAsync());
    },

    async schedule(reminder: ReminderRequest): Promise<void> {
      if (!supported) return;
      await ensureAndroidChannel();
      await Notifications.scheduleNotificationAsync({
        identifier: reminder.id,
        content: { title: reminder.title, body: reminder.body, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: reminder.hour,
          minute: reminder.minute,
          channelId: CHANNEL_ID,
        },
      });
    },

    async cancel(id: string): Promise<void> {
      if (!supported) return;
      await Notifications.cancelScheduledNotificationAsync(id);
    },
  };
}
