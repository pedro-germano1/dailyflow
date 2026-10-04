/**
 * Teste rápido das configurações, perfil, exportação e limpeza de dados.
 * Rodar:  npx tsx scripts/smoke-settings.ts
 */
import { MemoryStorageAdapter } from '../src/database/memoryStorageAdapter';
import { StorageAdapter, STORAGE_KEYS } from '../src/database/storage';
import { FakeNotificationScheduler } from '../src/mocks/fakeNotificationScheduler';
import { createMockServices } from '../src/mocks/mockServices';
import { createServices } from '../src/services/createServices';
import { REMINDER_IDS } from '../src/services/notificationService';
import { DEFAULT_SETTINGS, DEFAULT_USER, normalizeSettings } from '../src/services/settingsService';
import { AppError } from '../src/types/common';

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}`);
  }
}

async function expectError(name: string, code: string, field: string | undefined, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(`${name} (esperava erro ${code})`, false);
  } catch (e) {
    check(name, e instanceof AppError && e.code === code && (field === undefined || e.field === field));
  }
}

/** Armazenamento que sempre falha (disco cheio, permissão negada...). */
class BrokenStorage implements StorageAdapter {
  async getItem<T>(): Promise<T | null> { throw new Error('falha'); }
  async setItem(): Promise<void> { throw new Error('falha'); }
  async removeItem(): Promise<void> { throw new Error('falha'); }
  async clear(): Promise<void> { throw new Error('falha'); }
}

const fresh = (permission = true, userGrants = permission) => {
  const storage = new MemoryStorageAdapter();
  const scheduler = new FakeNotificationScheduler(permission, userGrants);
  return { storage, scheduler, services: createServices(storage, scheduler) };
};

async function main() {
  console.log('padrões');
  {
    const { services } = fresh();
    const s = await services.settings.getSettings();
    check('configurações padrão (tema do sistema, 23:30/07:00)', s.theme === 'system' && s.defaultSleepTime === '23:30' && s.defaultWakeTime === '07:00');
    check('lembretes começam DESLIGADOS', s.notifications.enabled === false);
    check('lembrete diário padrão 21:00', s.notifications.dailyReminderTime === '21:00');
    const u = await services.settings.getUser();
    check('usuário padrão', u.id === DEFAULT_USER.id && u.name === 'Usuário' && u.avatar === undefined);
  }

  console.log('updateSettings');
  {
    const { storage, services } = fresh();
    const s = await services.settings.updateSettings({ theme: 'dark' });
    check('muda o tema e devolve o resultado', s.theme === 'dark');
    check('mantém o resto', s.defaultSleepTime === '23:30' && s.notifications.dailyReminderTime === '21:00');
    const again = createServices(storage, new FakeNotificationScheduler()); // "reabre o app"
    check('persiste (novo service no mesmo storage)', (await again.settings.getSettings()).theme === 'dark');

    const t = await services.settings.updateSettings({ defaultSleepTime: '00:15', defaultWakeTime: '08:00' });
    check('muda os horários padrão', t.defaultSleepTime === '00:15' && t.defaultWakeTime === '08:00');

    const n = await services.settings.updateSettings({ notifications: { studyReminder: false } as never });
    check('patch parcial de notifications faz merge', n.notifications.studyReminder === false && n.notifications.logRoutineReminder === true && n.notifications.dailyReminderTime === '21:00');

    const empty = await services.settings.updateSettings({});
    check('patch vazio não muda nada', empty.theme === 'dark' && empty.defaultSleepTime === '00:15');

    const ignored = await services.settings.updateSettings({ theme: 'light', hack: 'x' } as never);
    check('campo desconhecido é ignorado e não é salvo', ignored.theme === 'light' && !('hack' in ignored) && !(await services.settings.exportData()).includes('hack'));
  }

  console.log('validações de configurações (e nada é salvo quando falha)');
  {
    const { services } = fresh();
    const before = JSON.stringify(await services.settings.getSettings());
    await expectError('tema inválido', 'VALIDATION_ERROR', 'theme', () => services.settings.updateSettings({ theme: 'rosa' as never }));
    await expectError('horário de dormir inválido', 'VALIDATION_ERROR', 'defaultSleepTime', () => services.settings.updateSettings({ defaultSleepTime: '25:00' }));
    await expectError('horário de acordar inválido', 'VALIDATION_ERROR', 'defaultWakeTime', () => services.settings.updateSettings({ defaultWakeTime: '7:00' }));
    await expectError('dormir e acordar iguais', 'VALIDATION_ERROR', 'defaultWakeTime', () => services.settings.updateSettings({ defaultSleepTime: '07:00', defaultWakeTime: '07:00' }));
    await expectError('duração de sono absurda (23h)', 'VALIDATION_ERROR', 'defaultWakeTime', () => services.settings.updateSettings({ defaultSleepTime: '08:00', defaultWakeTime: '07:00' }));
    await expectError('só trocar o acordar para igual ao dormir (usa o valor atual)', 'VALIDATION_ERROR', 'defaultWakeTime', () => services.settings.updateSettings({ defaultWakeTime: '23:30' }));
    await expectError('lembrete diário inválido', 'VALIDATION_ERROR', 'notifications.dailyReminderTime', () => services.settings.updateSettings({ notifications: { dailyReminderTime: '9h' } as never }));
    await expectError('enabled não booleano', 'VALIDATION_ERROR', 'notifications.enabled', () => services.settings.updateSettings({ notifications: { enabled: 'sim' } as never }));
    await expectError('studyReminder nulo', 'VALIDATION_ERROR', 'notifications.studyReminder', () => services.settings.updateSettings({ notifications: { studyReminder: null } as never }));
    await expectError('notifications não é objeto', 'VALIDATION_ERROR', 'notifications', () => services.settings.updateSettings({ notifications: 'sim' } as never));
    await expectError('patch nulo', 'VALIDATION_ERROR', 'settings', () => services.settings.updateSettings(null as never));
    await expectError('patch é lista', 'VALIDATION_ERROR', 'settings', () => services.settings.updateSettings([] as never));
    await expectError('tema nulo', 'VALIDATION_ERROR', 'theme', () => services.settings.updateSettings({ theme: null } as never));
    check('nada foi salvo pelas tentativas inválidas', JSON.stringify(await services.settings.getSettings()) === before);
  }

  console.log('lembretes ligados às configurações');
  {
    const { services, scheduler } = fresh(true);
    await services.settings.updateSettings({ notifications: { enabled: true } as never });
    check('ativar lembretes agenda os 3', scheduler.scheduled.size === 3);
    await services.settings.updateSettings({ notifications: { dailyReminderTime: '08:30' } as never });
    check('mudar o horário reagenda', scheduler.scheduled.get(REMINDER_IDS.logRoutine)?.hour === 8 && scheduler.scheduled.get(REMINDER_IDS.logRoutine)?.minute === 30);
    await services.settings.updateSettings({ defaultSleepTime: '00:10', defaultWakeTime: '07:30' });
    check('mudar o horário de dormir reagenda o lembrete de dormir (23:40)', scheduler.scheduled.get(REMINDER_IDS.sleep)?.hour === 23 && scheduler.scheduled.get(REMINDER_IDS.sleep)?.minute === 40);
    await services.settings.updateSettings({ notifications: { enabled: false } as never });
    check('desativar cancela tudo', scheduler.scheduled.size === 0);
  }
  {
    const { services, scheduler } = fresh(false, true); // sem permissão ainda; o usuário vai aceitar quando pedirem
    const s = await services.settings.updateSettings({ notifications: { enabled: true } as never });
    check('sem permissão: salva as configurações mesmo assim', s.notifications.enabled === true);
    check('sem permissão: não agenda e não pede permissão sozinho', scheduler.scheduled.size === 0 && scheduler.permissionRequests === 0);
    check('a UI pede a permissão e depois sincroniza', (await services.notifications.requestPermission()) === true);
    await services.notifications.syncReminders();
    check('depois da permissão, agenda os 3', scheduler.scheduled.size === 3);
  }
  {
    const { services, scheduler } = fresh(true);
    scheduler.schedule = async () => { throw new Error('falha nativa'); };
    const origWarn = console.warn;
    console.warn = () => undefined;
    const s = await services.settings.updateSettings({ notifications: { enabled: true } as never });
    console.warn = origWarn;
    check('falha ao agendar não impede de salvar', s.notifications.enabled === true && (await services.settings.getSettings()).notifications.enabled === true);
  }

  console.log('concorrência');
  {
    const { services } = fresh();
    await Promise.all([
      services.settings.updateSettings({ theme: 'dark' }),
      services.settings.updateSettings({ defaultSleepTime: '22:00' }),
      services.settings.updateSettings({ notifications: { dailyReminderTime: '20:00' } as never }),
      services.settings.updateSettings({ defaultWakeTime: '06:00' }),
      services.settings.updateSettings({ notifications: { studyReminder: false } as never }),
    ]);
    const s = await services.settings.getSettings();
    check(
      '5 atualizações simultâneas: nenhuma se perde',
      s.theme === 'dark' && s.defaultSleepTime === '22:00' && s.defaultWakeTime === '06:00' && s.notifications.dailyReminderTime === '20:00' && s.notifications.studyReminder === false,
    );
  }

  console.log('perfil (updateUser)');
  {
    const { storage, services } = fresh();
    const u = await services.settings.updateUser({ name: '  Pedro  ' });
    check('nome é aparado (trim)', u.name === 'Pedro');
    check('persiste', (await createServices(storage, new FakeNotificationScheduler()).settings.getUser()).name === 'Pedro');
    const a = await services.settings.updateUser({ avatar: '🙂' });
    check('define o avatar (emoji)', a.avatar === '🙂' && a.name === 'Pedro');
    const uri = await services.settings.updateUser({ avatar: 'file:///data/user/0/app/avatar.jpg' });
    check('aceita avatar por URI', uri.avatar === 'file:///data/user/0/app/avatar.jpg');
    const cleared = await services.settings.updateUser({ avatar: '' });
    check('avatar vazio remove o avatar', cleared.avatar === undefined && (await services.settings.getUser()).avatar === undefined);
    const idTry = await services.settings.updateUser({ id: 'outro', name: 'Ana' } as never);
    check('o id nunca muda', idTry.id === DEFAULT_USER.id && idTry.name === 'Ana');
    const same = await services.settings.updateUser({});
    check('patch vazio não muda nada', same.name === 'Ana');
    await expectError('nome vazio', 'VALIDATION_ERROR', 'name', () => services.settings.updateUser({ name: '   ' }));
    await expectError('nome com 41 caracteres', 'VALIDATION_ERROR', 'name', () => services.settings.updateUser({ name: 'a'.repeat(41) }));
    check('nome com 40 caracteres é aceito', (await services.settings.updateUser({ name: 'a'.repeat(40) })).name.length === 40);
    await expectError('nome que não é texto', 'VALIDATION_ERROR', 'name', () => services.settings.updateUser({ name: 123 } as never));
    await expectError('avatar gigante', 'VALIDATION_ERROR', 'avatar', () => services.settings.updateUser({ avatar: 'x'.repeat(501) }));
    await expectError('avatar que não é texto', 'VALIDATION_ERROR', 'avatar', () => services.settings.updateUser({ avatar: 5 } as never));
    await expectError('patch nulo', 'VALIDATION_ERROR', 'user', () => services.settings.updateUser(null as never));
  }

  console.log('exportData');
  {
    const services = createMockServices();
    await services.categories.create({ name: 'Meditação', emoji: '🧘', color: '#8844AA' });
    const json = await services.settings.exportData();
    let data: any;
    try { data = JSON.parse(json); } catch { data = null; }
    check('é um JSON válido', data !== null);
    check('identifica o app e a versão do formato', data?.app === 'dailyflow' && data?.version === 1);
    check('tem data de exportação ISO', !Number.isNaN(Date.parse(data?.exportedAt)));
    check('inclui atividades, sono e metas', data?.activities.length > 0 && data?.sleep.length === 7 && data?.goals.length === 3);
    check('inclui perfil e configurações', data?.user.id === 'user-1' && data?.settings.theme === 'system');
    check('inclui só as categorias PERSONALIZADAS', data?.customCategories.length === 1 && data?.customCategories[0].name === 'Meditação');
    const all = await services.activities.list();
    check('exporta todas as atividades (sem filtro de data)', data?.activities.length === all.length);
    const empty = JSON.parse(await fresh().services.settings.exportData());
    check('app vazio exporta listas vazias', empty.activities.length === 0 && empty.sleep.length === 0 && empty.goals.length === 0 && empty.customCategories.length === 0);
  }

  console.log('clearAllData');
  {
    const services = createMockServices();
    await services.categories.create({ name: 'Meditação', emoji: '🧘', color: '#8844AA' });
    await services.settings.updateSettings({ theme: 'dark', notifications: { enabled: true } as never });
    await services.settings.updateUser({ name: 'Maria' });
    await services.settings.clearAllData();
    check('apaga atividades', (await services.activities.list()).length === 0);
    check('apaga sono', (await services.sleep.list('2000-01-01', '2100-01-01')).length === 0);
    check('apaga metas', (await services.goals.list()).length === 0);
    check('apaga categorias personalizadas', (await services.categories.list()).every((c) => c.isDefault));
    const s = await services.settings.getSettings();
    check('configurações voltam ao padrão (lembretes desligados)', s.theme === 'system' && s.notifications.enabled === false);
    check('perfil volta ao padrão', (await services.settings.getUser()).name === 'Usuário');
  }
  {
    const { services, scheduler } = fresh(true);
    await services.settings.updateSettings({ notifications: { enabled: true } as never });
    check('(antes) há 3 lembretes agendados', scheduler.scheduled.size === 3);
    await services.settings.clearAllData();
    check('limpar dados cancela os lembretes', scheduler.scheduled.size === 0);
  }

  console.log('falhas de armazenamento (STORAGE_ERROR, sem quebrar)');
  {
    const services = createServices(new BrokenStorage(), new FakeNotificationScheduler());
    await expectError('getSettings', 'STORAGE_ERROR', undefined, () => services.settings.getSettings());
    await expectError('getUser', 'STORAGE_ERROR', undefined, () => services.settings.getUser());
    await expectError('updateSettings', 'STORAGE_ERROR', undefined, () => services.settings.updateSettings({ theme: 'dark' }));
    await expectError('updateUser', 'STORAGE_ERROR', undefined, () => services.settings.updateUser({ name: 'X' }));
    await expectError('exportData', 'STORAGE_ERROR', undefined, () => services.settings.exportData());
    await expectError('clearAllData', 'STORAGE_ERROR', undefined, () => services.settings.clearAllData());
    const origWarn = console.warn;
    console.warn = () => undefined;
    let ok = true;
    try { await services.notifications.syncReminders(); } catch { ok = false; }
    console.warn = origWarn;
    check('syncReminders com armazenamento quebrado não lança', ok);
  }

  console.log('dado salvo antigo/corrompido (tolerância)');
  {
    const bad = normalizeSettings({ theme: 'rosa', defaultSleepTime: 'abc', notifications: 'x' });
    check('valores inválidos viram o padrão', bad.theme === 'system' && bad.defaultSleepTime === '23:30' && bad.notifications.dailyReminderTime === '21:00');
    const partial = normalizeSettings({ theme: 'dark', notifications: { enabled: true } });
    check('campos que faltam são completados', partial.theme === 'dark' && partial.notifications.enabled === true && partial.notifications.studyReminder === true && partial.defaultWakeTime === '07:00');
    check('null/undefined/lista viram o padrão', JSON.stringify(normalizeSettings(null)) === JSON.stringify(DEFAULT_SETTINGS) && JSON.stringify(normalizeSettings([])) === JSON.stringify(DEFAULT_SETTINGS));
    const storage = new MemoryStorageAdapter({ [STORAGE_KEYS.settings]: 'lixo', [STORAGE_KEYS.user]: 42 });
    const services = createServices(storage, new FakeNotificationScheduler());
    check('configurações corrompidas no disco não derrubam o app', (await services.settings.getSettings()).theme === 'system');
    check('perfil corrompido no disco não derruba o app', (await services.settings.getUser()).name === 'Usuário');
  }

  console.log(`\n${passed} passaram, ${failed} falharam`);
  if (failed > 0) process.exit(1);
}

main();
