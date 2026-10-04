/**
 * Teste rápido do sono e dos cálculos de duração.
 * Rodar:  npx tsx scripts/smoke-sleep.ts
 */
import { MemoryStorageAdapter } from '../src/database/memoryStorageAdapter';
import { mockSleepData } from '../src/mocks/mockData';
import { createMockServices } from '../src/mocks/mockServices';
import { computeSleepStats, createSleepService } from '../src/services/sleepService';
import { AppError } from '../src/types/common';
import { calcSleepDuration, formatDuration, sleepTimeScale } from '../src/utils/time';

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

async function expectError(name: string, code: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(`${name} (esperava erro ${code})`, false);
  } catch (e) {
    check(name, e instanceof AppError && e.code === code);
  }
}

const rec = (date: string, sleepTime: string, wakeTime: string) => ({
  id: date, date, sleepTime, wakeTime, duration: calcSleepDuration(sleepTime, wakeTime),
});

async function main() {
  console.log('Cálculo de duração');
  check('23:45 -> 07:20 = 455 (atravessa meia-noite)', calcSleepDuration('23:45', '07:20') === 455);
  check('00:10 -> 07:40 = 450 (sem atravessar)', calcSleepDuration('00:10', '07:40') === 450);
  check('22:00 -> 06:00 = 480', calcSleepDuration('22:00', '06:00') === 480);
  check('23:59 -> 00:01 = 2', calcSleepDuration('23:59', '00:01') === 2);
  check('horários iguais = 0', calcSleepDuration('07:00', '07:00') === 0);
  check('escala: 23:45 -> 1425, 00:30 -> 1470', sleepTimeScale('23:45') === 1425 && sleepTimeScale('00:30') === 1470);
  check('formatDuration 455 = "7h 35min"', formatDuration(455) === '7h 35min');
  check('formatDuration 480 = "8h"', formatDuration(480) === '8h');
  check('formatDuration 45 = "45min"', formatDuration(45) === '45min');
  check('formatDuration 0 = "0min"', formatDuration(0) === '0min');
  check('mocks têm durações coerentes com o cálculo', mockSleepData.every((r) => calcSleepDuration(r.sleepTime, r.wakeTime) === r.duration));

  console.log('Registro de sono');
  const sleep = createSleepService(new MemoryStorageAdapter());
  const r1 = await sleep.save({ date: '2026-10-04', sleepTime: '23:45', wakeTime: '07:20' });
  check('salva e calcula duração (455)', r1.duration === 455);
  check('getByDate encontra', (await sleep.getByDate('2026-10-04'))?.id === r1.id);
  check('getByDate sem registro = null', (await sleep.getByDate('2026-10-05')) === null);
  const r2 = await sleep.save({ date: '2026-10-04', sleepTime: '00:00', wakeTime: '08:00' });
  check('salvar na mesma data substitui (mesmo id)', r2.id === r1.id && r2.duration === 480);
  check('continua com 1 registro', (await sleep.list('2026-10-01', '2026-10-31')).length === 1);
  await expectError('horários iguais', 'VALIDATION_ERROR', () => sleep.save({ date: '2026-10-05', sleepTime: '07:00', wakeTime: '07:00' }));
  await expectError('hora inválida (24:30)', 'VALIDATION_ERROR', () => sleep.save({ date: '2026-10-05', sleepTime: '24:30', wakeTime: '07:00' }));
  await expectError('data inexistente', 'VALIDATION_ERROR', () => sleep.save({ date: '2026-02-30', sleepTime: '23:00', wakeTime: '07:00' }));
  await expectError('duração absurda (>18h)', 'VALIDATION_ERROR', () => sleep.save({ date: '2026-10-05', sleepTime: '08:00', wakeTime: '07:00' }));
  await sleep.save({ date: '2026-10-02', sleepTime: '23:00', wakeTime: '07:00' });
  const listed = await sleep.list('2026-10-01', '2026-10-31');
  check('list ordena por data', listed.length === 2 && listed[0].date === '2026-10-02');
  check('list respeita o intervalo', (await sleep.list('2026-10-03', '2026-10-31')).length === 1);
  await sleep.remove(r1.id);
  check('remove', (await sleep.list('2026-10-01', '2026-10-31')).length === 1);
  await expectError('remover inexistente', 'NOT_FOUND', () => sleep.remove(r1.id));

  console.log('Estatísticas');
  const empty = computeSleepStats([]);
  check('sem registros: zeros e null', empty.averageMinutes === 0 && empty.bestDay === null && empty.recordsCount === 0);
  const one = computeSleepStats([rec('2026-10-01', '23:00', '07:00')]);
  check('1 registro: sem regularidade (0)', one.regularityScore === 0 && one.recordsCount === 1);
  const regular = computeSleepStats([1, 2, 3, 4, 5].map((d) => rec(`2026-10-0${d}`, '23:00', '07:00')));
  check('horários idênticos: variação 0, score 100', regular.sleepTimeVariationMinutes === 0 && regular.regularityScore === 100);
  const wrap = computeSleepStats([rec('2026-10-01', '23:50', '07:00'), rec('2026-10-02', '00:10', '07:00')]);
  check('23:50 e 00:10 contam como 20 min de diferença (variação 10)', wrap.sleepTimeVariationMinutes === 10);
  const bad = computeSleepStats([rec('2026-10-01', '21:00', '05:00'), rec('2026-10-02', '02:00', '10:00')]);
  check('horários muito diferentes: score 0', bad.regularityScore === 0);

  const stats = computeSleepStats(mockSleepData);
  check('média dos mocks = 454', stats.averageMinutes === 454);
  check('melhor dia = 480 min', stats.bestDay?.duration === 480);
  check('menor sono = 440 min', stats.shortestDay?.duration === 440);
  check('variação dos mocks ~40 min', stats.sleepTimeVariationMinutes >= 39 && stats.sleepTimeVariationMinutes <= 41);
  check('score dos mocks ~67', stats.regularityScore >= 66 && stats.regularityScore <= 68);

  console.log('Via mock services');
  const services = createMockServices();
  const all = await services.sleep.list('2000-01-01', '2999-12-31');
  check('mock traz 7 noites', all.length === 7);
  const viaStats = await services.sleep.getStats('2000-01-01', '2999-12-31');
  check('getStats do mock usa o cálculo real', viaStats.averageMinutes === 454 && viaStats.recordsCount === 7);
  const saved = await services.sleep.save({ date: '2030-01-01', sleepTime: '22:30', wakeTime: '06:15' });
  check('save pelo mock calcula 465', saved.duration === 465);

  console.log(`\n${passed} passaram, ${failed} falharam`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
