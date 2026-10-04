/**
 * Services falsos para a UI (Pessoa 1) desenvolver sem depender da lógica real.
 *
 * Tudo usa o service REAL sobre um adapter em MEMÓRIA (os dados somem ao fechar o app):
 * atividades, categorias, sono, relatórios, metas, configurações e notificações.
 * Os lembretes vão para um agendador FALSO (não agenda nada no celular), então dá para
 * ativar/desativar lembretes nas telas sem pedir permissão de verdade.
 *
 * Uso:  const services = createMockServices();
 */
import { MemoryStorageAdapter } from '../database/memoryStorageAdapter';
import { STORAGE_KEYS } from '../database/storage';
import { createServices } from '../services/createServices';
import { Services } from '../types/services';
import { FakeNotificationScheduler } from './fakeNotificationScheduler';
import { mockActivities, mockGoals, mockSettings, mockSleepData, mockUser } from './mockData';

export function createMockServices(): Services {
  const storage = new MemoryStorageAdapter({
    [STORAGE_KEYS.activities]: mockActivities,
    [STORAGE_KEYS.sleep]: mockSleepData,
    [STORAGE_KEYS.goals]: mockGoals,
    [STORAGE_KEYS.settings]: mockSettings,
    [STORAGE_KEYS.user]: mockUser,
  });
  return createServices(storage, new FakeNotificationScheduler());
}
