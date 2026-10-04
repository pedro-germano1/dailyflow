import { NotificationScheduler, ReminderRequest } from '../services/notificationScheduler';

/**
 * Agendador falso: guarda os lembretes em memória em vez de agendar no celular.
 * Usado nos testes e nos mocks da UI (Expo Go no PC/web não agenda nada de verdade).
 */
export class FakeNotificationScheduler implements NotificationScheduler {
  /** Lembretes "agendados" no momento, por id. */
  scheduled = new Map<string, ReminderRequest>();
  /** Quantas vezes o sistema "pediu" permissão ao usuário. */
  permissionRequests = 0;

  constructor(
    public permission = true,
    /** Resposta do usuário quando a permissão é pedida. */
    public userGrantsPermission = true,
  ) {}

  async getPermission(): Promise<boolean> {
    return this.permission;
  }

  async requestPermission(): Promise<boolean> {
    this.permissionRequests++;
    if (!this.permission && this.userGrantsPermission) this.permission = true;
    return this.permission;
  }

  async schedule(reminder: ReminderRequest): Promise<void> {
    this.scheduled.set(reminder.id, reminder);
  }

  async cancel(id: string): Promise<void> {
    this.scheduled.delete(id);
  }
}
