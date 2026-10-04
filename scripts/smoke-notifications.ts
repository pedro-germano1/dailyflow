/**
 * Teste rápido das notificações (plano de lembretes + agendamento com agendador falso).
 * Rodar:  npx tsx scripts/smoke-notifications.ts
 */
import { FakeNotificationScheduler } from '../src/mocks/fakeNotificationScheduler';
import {
  buildReminderPlan, createNotificationService, REMINDER_IDS, STUDY_REMINDER_TIME,
} from '../src/services/notificationService';
import { DEFAULT_SETTINGS } from '../src/services/settingsService';
import { Settings } from '../src/types/settings';
import { addMinutesToTime } from '../src/utils/time';

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

/** Configurações com lembretes ligados (o padrão do app começa desligado). */
const on = (patch: Partial<Settings['notifications']> = {}, rest: Partial<Settings> = {}): Settings => ({
  ...DEFAULT_SETTINGS,
  ...rest,
  notifications: { ...DEFAULT_SETTINGS.notifications, enabled: true, ...patch },
});

async function main() {
  console.log('addMinutesToTime');
  check('23:50 + 20 = 00:10', addMinutesToTime('23:50', 20) === '00:10');
  check('00:10 - 30 = 23:40 (volta a meia-noite)', addMinutesToTime('00:10', -30) === '23:40');
  check('23:30 - 30 = 23:00', addMinutesToTime('23:30', -30) === '23:00');
  check('12:00 + 1440 = 12:00', addMinutesToTime('12:00', 1440) === '12:00');

  console.log('buildReminderPlan (função pura)');
  check('enabled = false desliga tudo', buildReminderPlan(DEFAULT_SETTINGS).length === 0);
  check(
    'enabled = false desliga mesmo com os 3 tipos ligados',
    buildReminderPlan({ ...on(), notifications: { ...on().notifications, enabled: false } }).length === 0,
  );
  const all = buildReminderPlan(on());
  check('3 lembretes quando tudo está ligado', all.length === 3);
  check('ids fixos e distintos', new Set(all.map((r) => r.id)).size === 3);
  const study = all.find((r) => r.id === REMINDER_IDS.study)!;
  check('estudar usa o horário fixo 19:00', STUDY_REMINDER_TIME === '19:00' && study.hour === 19 && study.minute === 0);
  const log = all.find((r) => r.id === REMINDER_IDS.logRoutine)!;
  check('registrar rotina usa dailyReminderTime (21:00)', log.hour === 21 && log.minute === 0);
  const sleep = all.find((r) => r.id === REMINDER_IDS.sleep)!;
  check('dormir = 30 min antes de 23:30 -> 23:00', sleep.hour === 23 && sleep.minute === 0);
  check('texto do lembrete de dormir cita o horário padrão', sleep.body.includes('23:30'));
  const custom = buildReminderPlan(on({ dailyReminderTime: '08:15' }, { defaultSleepTime: '00:10' }));
  const c1 = custom.find((r) => r.id === REMINDER_IDS.logRoutine)!;
  const c2 = custom.find((r) => r.id === REMINDER_IDS.sleep)!;
  check('dailyReminderTime personalizado (08:15)', c1.hour === 8 && c1.minute === 15);
  check('dormir 00:10 -> lembrete 23:40 (meia-noite)', c2.hour === 23 && c2.minute === 40);
  const only = buildReminderPlan(on({ studyReminder: false, sleepReminder: false }));
  check('só registrar rotina ligado -> 1 lembrete', only.length === 1 && only[0].id === REMINDER_IDS.logRoutine);
  check(
    'tudo desligado individualmente -> 0',
    buildReminderPlan(on({ studyReminder: false, logRoutineReminder: false, sleepReminder: false })).length === 0,
  );

  console.log('syncReminders');
  {
    const scheduler = new FakeNotificationScheduler(true);
    let settings = on();
    const service = createNotificationService(async () => settings, scheduler);
    await service.syncReminders();
    check('agenda os 3 lembretes', scheduler.scheduled.size === 3);
    check('agenda com o horário certo', scheduler.scheduled.get(REMINDER_IDS.sleep)?.hour === 23);
    await service.syncReminders();
    await service.syncReminders();
    check('chamar de novo NÃO duplica', scheduler.scheduled.size === 3);

    settings = on({ studyReminder: false });
    await service.syncReminders();
    check('desligar um tipo cancela só ele', scheduler.scheduled.size === 2 && !scheduler.scheduled.has(REMINDER_IDS.study));

    settings = on({ dailyReminderTime: '07:45' });
    await service.syncReminders();
    check('mudar o horário reagenda no novo horário', scheduler.scheduled.get(REMINDER_IDS.logRoutine)?.hour === 7);

    settings = DEFAULT_SETTINGS; // enabled = false
    await service.syncReminders();
    check('desativar os lembretes cancela todos', scheduler.scheduled.size === 0);
    check('nunca pediu permissão sozinho', scheduler.permissionRequests === 0);
  }
  {
    const scheduler = new FakeNotificationScheduler(true);
    scheduler.scheduled.set('outra-notificacao', { id: 'outra-notificacao', title: 'x', body: 'y', hour: 1, minute: 1 });
    const service = createNotificationService(async () => DEFAULT_SETTINGS, scheduler);
    await service.syncReminders();
    check('não mexe em notificações que não são do app', scheduler.scheduled.has('outra-notificacao'));
  }
  {
    const scheduler = new FakeNotificationScheduler(false, false); // sem permissão
    const service = createNotificationService(async () => on(), scheduler);
    await service.syncReminders();
    check('sem permissão: não agenda nada', scheduler.scheduled.size === 0);
    check('sem permissão: não abre pedido de permissão sozinho', scheduler.permissionRequests === 0);
  }
  {
    const scheduler = new FakeNotificationScheduler(false, true);
    const service = createNotificationService(async () => on(), scheduler);
    check('requestPermission devolve true quando o usuário aceita', (await service.requestPermission()) === true);
    await service.syncReminders();
    check('depois de aceitar, agenda os 3', scheduler.scheduled.size === 3);
  }
  {
    const scheduler = new FakeNotificationScheduler(false, false);
    const service = createNotificationService(async () => on(), scheduler);
    check('requestPermission devolve false quando o usuário nega', (await service.requestPermission()) === false);
  }

  console.log('concorrência');
  {
    const scheduler = new FakeNotificationScheduler(true);
    let settings = on();
    const service = createNotificationService(async () => settings, scheduler);
    const runs: Promise<void>[] = [];
    for (let i = 0; i < 6; i++) {
      settings = i % 2 === 0 ? on() : DEFAULT_SETTINGS;
      runs.push(service.syncReminders());
    }
    settings = on({ studyReminder: false }); // estado final desejado
    runs.push(service.syncReminders());
    await Promise.all(runs);
    check(
      'chamadas simultâneas terminam no estado da última configuração',
      scheduler.scheduled.size === 2 && !scheduler.scheduled.has(REMINDER_IDS.study),
    );
  }

  console.log('falhas (o app não pode quebrar)');
  {
    const errors: unknown[] = [];
    const scheduler = new FakeNotificationScheduler(true);
    scheduler.schedule = async () => {
      throw new Error('falha nativa');
    };
    const service = createNotificationService(async () => on(), scheduler, (e) => errors.push(e));
    let threw = false;
    try {
      await service.syncReminders();
    } catch {
      threw = true;
    }
    check('erro ao agendar NÃO é lançado', !threw);
    check('erro ao agendar é reportado em onError', errors.length === 1);
  }
  {
    const errors: unknown[] = [];
    const service = createNotificationService(
      async () => {
        throw new Error('storage');
      },
      new FakeNotificationScheduler(true),
      (e) => errors.push(e),
    );
    let threw = false;
    try {
      await service.syncReminders();
    } catch {
      threw = true;
    }
    check('erro ao ler configurações NÃO é lançado', !threw && errors.length === 1);
  }
  {
    const scheduler = new FakeNotificationScheduler(true);
    scheduler.requestPermission = async () => {
      throw new Error('falha nativa');
    };
    const service = createNotificationService(async () => on(), scheduler, () => undefined);
    check('erro em requestPermission vira false', (await service.requestPermission()) === false);
  }
  {
    const scheduler = new FakeNotificationScheduler(true);
    let calls = 0;
    scheduler.schedule = async (r) => {
      calls++;
      if (calls === 1) throw new Error('falha só na primeira vez');
      scheduler.scheduled.set(r.id, r);
    };
    const service = createNotificationService(async () => on(), scheduler, () => undefined);
    await service.syncReminders(); // falha
    await service.syncReminders(); // a fila continua funcionando
    check('depois de uma falha, a próxima sincronização funciona', scheduler.scheduled.size === 3);
  }

  console.log(`\n${passed} passaram, ${failed} falharam`);
  if (failed > 0) process.exit(1);
}

main();
