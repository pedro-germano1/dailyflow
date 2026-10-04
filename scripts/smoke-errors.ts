/**
 * Revisão de validações e tratamento de erros (Semana 6).
 * REGRA: nenhum método de nenhum service pode lançar algo que não seja AppError
 * (TypeError, "undefined is not a function"...) nem travar, seja qual for a entrada ou o estado do disco.
 *
 * Rodar:  npx tsx scripts/smoke-errors.ts
 */
import { MemoryStorageAdapter } from '../src/database/memoryStorageAdapter';
import { StorageAdapter, STORAGE_KEYS } from '../src/database/storage';
import { FakeNotificationScheduler } from '../src/mocks/fakeNotificationScheduler';
import { mockActivities, mockGoals, mockSettings, mockSleepData, mockUser } from '../src/mocks/mockData';
import { createServices } from '../src/services/createServices';
import { AppError } from '../src/types/common';
import { Services } from '../src/types/services';

let passed = 0;
let failed = 0;
const problems: string[] = [];

function check(name: string, condition: boolean, detail = '') {
  if (condition) {
    passed++;
  } else {
    failed++;
    problems.push(`${name}${detail ? ` -> ${detail}` : ''}`);
    console.log(`  ✗ ${name}${detail ? ` -> ${detail}` : ''}`);
  }
}

/** Entradas ruins, de todo tipo. */
const GARBAGE: unknown[] = [
  undefined, null, 0, -1, 1.5, NaN, Infinity, 123, '', ' ', 'abc', '2026-02-31', '2026-13-01', '99:99',
  true, false, [], [1, 2], {}, { title: 123 }, { date: 5, startTime: [], endTime: {} },
  { name: {}, emoji: 1, color: null }, { target: 'muito', metric: 'x', frequency: 5 }, () => 1, Symbol.for('x'),
];

const label = (v: unknown): string => {
  try {
    return typeof v === 'symbol' ? 'Symbol' : typeof v === 'function' ? 'fn' : JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
};

/** Roda e aprova se terminar normalmente OU com AppError. Qualquer outra coisa é defeito. */
async function probe(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(name, true);
  } catch (e) {
    check(name, e instanceof AppError, e instanceof Error ? `${e.name}: ${e.message}` : String(e));
  }
}

function seeded(): Services {
  const storage = new MemoryStorageAdapter({
    [STORAGE_KEYS.activities]: mockActivities,
    [STORAGE_KEYS.sleep]: mockSleepData,
    [STORAGE_KEYS.goals]: mockGoals,
    [STORAGE_KEYS.settings]: mockSettings,
    [STORAGE_KEYS.user]: mockUser,
  });
  return createServices(storage, new FakeNotificationScheduler());
}

/** Cada entrada: nome + função que chama o método com os argumentos dados. */
type Call = [string, (s: Services, ...a: any[]) => Promise<unknown>, number /* aridade */];
const CALLS: Call[] = [
  ['activities.list', (s, a) => s.activities.list(a), 1],
  ['activities.getById', (s, a) => s.activities.getById(a), 1],
  ['activities.create', (s, a) => s.activities.create(a), 1],
  ['activities.update(id real)', async (s, a) => s.activities.update((await s.activities.list())[0].id, a), 1],
  ['activities.update(id ruim)', (s, a, b) => s.activities.update(a, b), 2],
  ['activities.remove', (s, a) => s.activities.remove(a), 1],
  ['activities.toggleComplete', (s, a) => s.activities.toggleComplete(a), 1],
  ['activities.getDatesWithRecords', (s, a, b) => s.activities.getDatesWithRecords(a, b), 2],
  ['sleep.getByDate', (s, a) => s.sleep.getByDate(a), 1],
  ['sleep.list', (s, a, b) => s.sleep.list(a, b), 2],
  ['sleep.save', (s, a) => s.sleep.save(a), 1],
  ['sleep.remove', (s, a) => s.sleep.remove(a), 1],
  ['sleep.getStats', (s, a, b) => s.sleep.getStats(a, b), 2],
  ['reports.getDaily', (s, a) => s.reports.getDaily(a), 1],
  ['reports.getWeekly', (s, a) => s.reports.getWeekly(a), 1],
  ['reports.getMonthly', (s, a) => s.reports.getMonthly(a), 1],
  ['goals.create', (s, a) => s.goals.create(a), 1],
  ['goals.update(id real)', async (s, a) => s.goals.update((await s.goals.list())[0].id, a), 1],
  ['goals.update(id ruim)', (s, a, b) => s.goals.update(a, b), 2],
  ['goals.remove', (s, a) => s.goals.remove(a), 1],
  ['goals.getProgress(id real)', async (s, a) => s.goals.getProgress((await s.goals.list())[0].id, a), 1],
  ['goals.getProgress(id ruim)', (s, a, b) => s.goals.getProgress(a, b), 2],
  ['categories.create', (s, a) => s.categories.create(a), 1],
  ['categories.remove', (s, a) => s.categories.remove(a), 1],
  ['settings.updateSettings', (s, a) => s.settings.updateSettings(a), 1],
  ['settings.updateUser', (s, a) => s.settings.updateUser(a), 1],
];

/** Operações de leitura e escrita para testar armazenamento quebrado/corrompido. */
const STORAGE_CALLS: [string, (s: Services) => Promise<unknown>][] = [
  ['activities.list', (s) => s.activities.list()],
  ['activities.create', (s) => s.activities.create({ title: 'X', categoryId: 'cat-work', date: '2026-10-05', startTime: '10:00', endTime: '11:00', status: 'pending' })],
  ['activities.getDatesWithRecords', (s) => s.activities.getDatesWithRecords('2026-10-01', '2026-10-31')],
  ['sleep.list', (s) => s.sleep.list('2026-10-01', '2026-10-31')],
  ['sleep.getByDate', (s) => s.sleep.getByDate('2026-10-05')],
  ['sleep.save', (s) => s.sleep.save({ date: '2026-10-05', sleepTime: '23:00', wakeTime: '07:00' })],
  ['sleep.getStats', (s) => s.sleep.getStats('2026-10-01', '2026-10-31')],
  ['reports.getDaily', (s) => s.reports.getDaily('2026-10-05')],
  ['reports.getWeekly', (s) => s.reports.getWeekly('2026-10-05')],
  ['reports.getMonthly', (s) => s.reports.getMonthly('2026-10')],
  ['goals.list', (s) => s.goals.list()],
  ['goals.create', (s) => s.goals.create({ title: 'Meta', categoryId: 'cat-study', metric: 'hours', target: 1, frequency: 'daily', startDate: '2026-10-01' })],
  ['goals.getProgress', (s) => s.goals.getProgress('g1', '2026-10-05')],
  ['categories.list', (s) => s.categories.list()],
  ['categories.create', (s) => s.categories.create({ name: 'Nova', emoji: '⭐', color: '#112233' })],
  ['settings.getSettings', (s) => s.settings.getSettings()],
  ['settings.updateSettings', (s) => s.settings.updateSettings({ theme: 'dark' })],
  ['settings.getUser', (s) => s.settings.getUser()],
  ['settings.updateUser', (s) => s.settings.updateUser({ name: 'Ana' })],
  ['settings.exportData', (s) => s.settings.exportData()],
  ['settings.clearAllData', (s) => s.settings.clearAllData()],
];

class BrokenStorage implements StorageAdapter {
  async getItem<T>(): Promise<T | null> { throw new Error('disco falhou'); }
  async setItem(): Promise<void> { throw new Error('disco falhou'); }
  async removeItem(): Promise<void> { throw new Error('disco falhou'); }
  async clear(): Promise<void> { throw new Error('disco falhou'); }
}

/** Lê normalmente, mas NÃO consegue gravar (disco cheio). */
class ReadOnlyStorage extends MemoryStorageAdapter {
  async setItem(): Promise<void> { throw new Error('disco cheio'); }
}

async function main() {
  const warn = console.warn;
  console.warn = () => undefined; // falhas de agendamento são esperadas aqui

  console.log('1) entradas ruins em todos os métodos (só AppError é aceito)');
  for (const [name, call, arity] of CALLS) {
    for (const a of GARBAGE) {
      if (arity === 1) {
        await probe(`${name}(${label(a)})`, () => call(seeded(), a));
      } else {
        // 2 argumentos: ruim em um e válido/ruim no outro, para pegar combinações.
        await probe(`${name}(${label(a)}, ${label(a)})`, () => call(seeded(), a, a));
        await probe(`${name}(${label(a)}, '2026-10-05')`, () => call(seeded(), a, '2026-10-05'));
        await probe(`${name}('2026-10-05', ${label(a)})`, () => call(seeded(), '2026-10-05', a));
      }
    }
  }
  console.log(`   ${CALLS.length} métodos x ${GARBAGE.length} entradas ruins verificados`);

  console.log('2) armazenamento quebrado (leitura e escrita falham): sempre STORAGE_ERROR');
  for (const [name, call] of STORAGE_CALLS) {
    const s = createServices(new BrokenStorage(), new FakeNotificationScheduler());
    try {
      await call(s);
      check(`${name} com disco quebrado (esperava erro)`, false);
    } catch (e) {
      check(`${name} com disco quebrado`, e instanceof AppError && e.code === 'STORAGE_ERROR', e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    }
  }

  console.log('3) disco cheio (lê, mas não grava): escritas dão STORAGE_ERROR, leituras funcionam');
  {
    const seed = { [STORAGE_KEYS.activities]: mockActivities, [STORAGE_KEYS.sleep]: mockSleepData, [STORAGE_KEYS.goals]: mockGoals };
    const s = createServices(new ReadOnlyStorage(seed), new FakeNotificationScheduler());
    const writes: [string, () => Promise<unknown>][] = [
      ['activities.create', () => s.activities.create({ title: 'Nova', categoryId: 'cat-work', date: '2026-10-05', startTime: '10:00', endTime: '11:00', status: 'pending' })],
      ['activities.toggleComplete', async () => s.activities.toggleComplete((await s.activities.list())[0].id)],
      ['sleep.save', () => s.sleep.save({ date: '2026-10-05', sleepTime: '23:00', wakeTime: '07:00' })],
      ['goals.create', () => s.goals.create({ title: 'Meta nova', categoryId: 'cat-study', metric: 'hours', target: 1, frequency: 'daily', startDate: '2026-10-01' })],
      ['categories.create', () => s.categories.create({ name: 'Nova', emoji: '⭐', color: '#112233' })],
      ['settings.updateSettings', () => s.settings.updateSettings({ theme: 'dark' })],
      ['settings.updateUser', () => s.settings.updateUser({ name: 'Ana' })],
    ];
    for (const [name, fn] of writes) {
      try {
        await fn();
        check(`${name} com disco cheio (esperava erro)`, false);
      } catch (e) {
        check(`${name} com disco cheio`, e instanceof AppError && e.code === 'STORAGE_ERROR', e instanceof Error ? `${e.name}: ${e.message}` : String(e));
      }
    }
    await probe('leituras continuam funcionando', async () => {
      check('activities.list lê com disco cheio', (await s.activities.list()).length === mockActivities.length);
      await s.reports.getMonthly('2026-10');
    });
  }

  console.log('4) dados corrompidos no disco (não são lista / têm itens estranhos)');
  const CORRUPT: unknown[] = ['lixo', 42, {}, { a: 1 }, true, [null, 5, 'x'], [{}], [{ id: 'a' }], [[]]];
  const READS: [string, (s: Services) => Promise<unknown>][] = [
    ['activities.list', (s) => s.activities.list()],
    ['activities.getDatesWithRecords', (s) => s.activities.getDatesWithRecords('2026-10-01', '2026-10-31')],
    ['activities.create', (s) => s.activities.create({ title: 'X', categoryId: 'cat-work', date: '2026-10-05', startTime: '10:00', endTime: '11:00', status: 'pending' })],
    ['sleep.list', (s) => s.sleep.list('2026-10-01', '2026-10-31')],
    ['sleep.getByDate', (s) => s.sleep.getByDate('2026-10-05')],
    ['sleep.save', (s) => s.sleep.save({ date: '2026-10-05', sleepTime: '23:00', wakeTime: '07:00' })],
    ['sleep.getStats', (s) => s.sleep.getStats('2026-10-01', '2026-10-31')],
    ['reports.getDaily', (s) => s.reports.getDaily('2026-10-05')],
    ['reports.getWeekly', (s) => s.reports.getWeekly('2026-10-05')],
    ['reports.getMonthly', (s) => s.reports.getMonthly('2026-10')],
    ['goals.list', (s) => s.goals.list()],
    ['goals.getProgress', (s) => s.goals.getProgress('g1', '2026-10-05')],
    ['goals.create', (s) => s.goals.create({ title: 'Meta', categoryId: 'cat-study', metric: 'hours', target: 1, frequency: 'daily', startDate: '2026-10-01' })],
    ['categories.list', (s) => s.categories.list()],
    ['categories.create', (s) => s.categories.create({ name: 'Nova', emoji: '⭐', color: '#112233' })],
    ['settings.exportData', (s) => s.settings.exportData()],
  ];
  for (const key of [STORAGE_KEYS.activities, STORAGE_KEYS.sleep, STORAGE_KEYS.goals, STORAGE_KEYS.categories]) {
    for (const bad of CORRUPT) {
      for (const [name, call] of READS) {
        const s = createServices(new MemoryStorageAdapter({ [key]: bad }), new FakeNotificationScheduler());
        await probe(`${name} com ${key.split(':').pop()}=${label(bad)}`, () => call(s));
      }
    }
  }

  console.log('5) todos os services aceitam o app recém-instalado (tudo vazio)');
  {
    const s = createServices(new MemoryStorageAdapter(), new FakeNotificationScheduler());
    for (const [name, call] of READS) await probe(`vazio: ${name}`, () => call(s));
  }

  console.log('6) mensagens de erro de validação: sempre em português, com campo');
  {
    const s = seeded();
    const cases: [string, () => Promise<unknown>][] = [
      ['activities.create vazio', () => s.activities.create({} as never)],
      ['sleep.save vazio', () => s.sleep.save({} as never)],
      ['goals.create vazio', () => s.goals.create({} as never)],
      ['categories.create vazio', () => s.categories.create({} as never)],
      ['reports.getDaily lixo', () => s.reports.getDaily('lixo')],
      ['reports.getMonthly lixo', () => s.reports.getMonthly('lixo')],
    ];
    for (const [name, fn] of cases) {
      try {
        await fn();
        check(`${name} (esperava erro)`, false);
      } catch (e) {
        const ok = e instanceof AppError && e.code === 'VALIDATION_ERROR' && !!e.field && /[a-zçãéíóú]/i.test(e.message) && !/undefined|null|\[object/.test(e.message);
        check(`${name}: AppError com campo e mensagem limpa`, ok, e instanceof Error ? e.message : String(e));
      }
    }
  }

  console.warn = warn;
  console.log(`\n${passed} passaram, ${failed} falharam`);
  if (failed > 0) {
    const sample = problems.slice(0, 40);
    console.log(`\nPrimeiros ${sample.length} problemas de ${problems.length}:`);
    sample.forEach((p) => console.log(`  - ${p}`));
    process.exit(1);
  }
}

main();
