/**
 * Porta (interface) do agendador de notificações locais.
 * O `notificationService` só conhece esta interface, não o `expo-notifications`:
 * - app: `createExpoNotificationScheduler()` (expoNotificationScheduler.ts)
 * - testes e mocks: `FakeNotificationScheduler` (src/mocks)
 */
export interface ReminderRequest {
  /** Identificador fixo: agendar de novo com o mesmo id substitui o lembrete anterior. */
  id: string;
  title: string;
  body: string;
  /** Lembrete diário, repetido todo dia neste horário (0-23 / 0-59). */
  hour: number;
  minute: number;
}

export interface NotificationScheduler {
  /** Só consulta a permissão atual (não abre nenhum pedido ao usuário). */
  getPermission(): Promise<boolean>;
  /** Pede permissão ao usuário, se ainda for possível. true = concedida. */
  requestPermission(): Promise<boolean>;
  schedule(reminder: ReminderRequest): Promise<void>;
  /** Cancelar um id que não existe NÃO é erro. */
  cancel(id: string): Promise<void>;
}
