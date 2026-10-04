/**
 * Teste rápido do relatório mensal.
 * Rodar:  npx tsx scripts/smoke-monthly.ts
 */
import { MemoryStorageAdapter } from '../src/database/memoryStorageAdapter';
import { createActivityService } from '../src/services/activityService';
import { createCategoryService } from '../src/services/categoryService';
import { createReportService } from '../src/services/reportService';
import { createSleepService } from '../src/services/sleepService';
import { ActivityStatus } from '../src/types/activity';
import { AppError } from '../src/types/common';
import { daysBetween, isValidMonth, monthRange, previousMonth } from '../src/utils/time';

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

async function main() {
  console.log('Utilitários de mês');
  check('mês válido / inválido', isValidMonth('2026-10') && !isValidMonth('2026-13') && !isValidMonth('2026-1') && !isValidMonth('abc'));
  check('fevereiro comum termina no dia 28', monthRange('2026-02').to === '2026-02-28');
  check('fevereiro bissexto termina no dia 29', monthRange('2028-02').to === '2028-02-29');
  check('outubro: 01 a 31', monthRange('2026-10').from === '2026-10-01' && monthRange('2026-10').to === '2026-10-31');
  check('mês anterior vira o ano (2027-01 -> 2026-12)', previousMonth('2027-01') === '2026-12');
  check('mês anterior comum (2026-10 -> 2026-09)', previousMonth('2026-10') === '2026-09');
  check('daysBetween', daysBetween('2026-10-07', '2026-10-31') === 24 && daysBetween('2026-10-07', '2026-10-07') === 0);

  const storage = new MemoryStorageAdapter();
  const activities = createActivityService(storage, createCategoryService(storage));
  const sleep = createSleepService(storage);
  const reports = createReportService(activities, sleep);
  const add = (date: string, title: string, categoryId: string, startTime: string, endTime: string, status: ActivityStatus) =>
    activities.create({ title, categoryId, date, startTime, endTime, status });

  // Setembro (mês anterior): 2 dias com atividade
  await add('2026-09-29', 'Trabalho', 'cat-work', '09:00', '15:00', 'completed'); // 360
  await add('2026-09-30', 'Trabalho', 'cat-work', '09:00', '17:00', 'completed'); // 480
  await add('2026-09-30', 'Estudo', 'cat-study', '19:00', '19:30', 'completed'); // 30
  await sleep.save({ date: '2026-09-30', sleepTime: '22:00', wakeTime: '06:00' }); // 480

  // Outubro
  await add('2026-10-01', 'Trabalho', 'cat-work', '09:00', '17:00', 'completed');
  await add('2026-10-01', 'Estudo', 'cat-study', '19:00', '20:00', 'completed');
  await add('2026-10-02', 'Trabalho', 'cat-work', '09:00', '17:00', 'completed');
  await add('2026-10-02', 'Academia', 'cat-exercise', '18:00', '19:00', 'completed');
  await add('2026-10-03', 'Estudo', 'cat-study', '19:00', '21:00', 'completed');
  await add('2026-10-03', 'Lazer', 'cat-leisure', '22:00', '23:00', 'skipped');
  await add('2026-10-05', 'Trabalho', 'cat-work', '09:00', '17:00', 'completed');
  await add('2026-10-05', 'Estudo', 'cat-study', '19:00', '20:00', 'pending');
  await add('2026-10-07', 'Trabalho', 'cat-work', '09:00', '13:00', 'completed');
  await sleep.save({ date: '2026-10-01', sleepTime: '23:30', wakeTime: '07:00' }); // 450
  await sleep.save({ date: '2026-10-02', sleepTime: '22:00', wakeTime: '06:00' }); // 480
  await sleep.save({ date: '2026-10-04', sleepTime: '00:00', wakeTime: '07:00' }); // 420 (dia só com sono)
  await sleep.save({ date: '2026-10-07', sleepTime: '23:30', wakeTime: '07:00' }); // 450

  console.log('Relatório mensal');
  const m = await reports.getMonthly('2026-10');
  check('mês e totais de atividades (9)', m.month === '2026-10' && m.totalActivities === 9);
  check('dias registrados = 6 (inclui dia só com sono)', m.daysRecorded === 6);
  check('melhor sequência = 5 (01 a 05; não conta 30/09)', m.bestStreak === 5);
  check('trabalho total = 1680', m.totalWorkMinutes === 1680);
  check('estudo total = 180 (pendente não conta)', m.totalStudyMinutes === 180);
  check('exercícios concluídos = 1', m.totalExerciseSessions === 1);
  check('sono total 1800 e média 450', m.totalSleepMinutes === 1800 && m.averageSleepMinutes === 450);
  check('taxa média de conclusão = 80', m.averageCompletionRate === 80);
  const c = m.comparisonWithPreviousMonth;
  check('comparação existe (setembro tem dados)', c !== null);
  check('sono: 450 - 480 = -30', c?.sleepMinutesDiff === -30);
  check('trabalho por dia: 336 - 420 = -84', c?.workMinutesDiff === -84);
  check('estudo por dia: 36 - 15 = +21', c?.studyMinutesDiff === 21);
  check('conclusão: 80 - 100 = -20', c?.completionRateDiff === -20);
  check('análise: dias e sequência', m.insights.includes('Você registrou 6 dias neste mês, com sequência máxima de 5 dias.'));
  check('análise: sono', m.insights.includes('Você dormiu em média 7h 30min por noite.'));
  check('análise: conclusão', m.insights.includes('Taxa média de conclusão: 80%.'));
  check('análise: estudo +140% vs mês anterior', m.insights.includes('Seu tempo de estudo por dia aumentou 140% em relação ao mês anterior.'));
  check('análise: trabalho -20% vs mês anterior', m.insights.includes('Seu tempo de trabalho por dia diminuiu 20% em relação ao mês anterior.'));
  check('sono -6% (<10%) não gera comentário', !m.insights.some((i) => i.includes('sono por dia')));

  const sep = await reports.getMonthly('2026-09');
  check('setembro: 2 dias, sequência 2', sep.daysRecorded === 2 && sep.bestStreak === 2);
  check('setembro sem agosto: comparação null', sep.comparisonWithPreviousMonth === null);
  const empty = await reports.getMonthly('2026-12');
  check('mês vazio: zeros, sem comparação, mensagem honesta', empty.daysRecorded === 0 && empty.bestStreak === 0 && empty.comparisonWithPreviousMonth === null && empty.insights[0] === 'Ainda não há registros neste mês.');
  await expectError('mês inválido', 'VALIDATION_ERROR', () => reports.getMonthly('2026-13'));
  await expectError('formato inválido', 'VALIDATION_ERROR', () => reports.getMonthly('outubro'));

  console.log(`\n${passed} passaram, ${failed} falharam`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
