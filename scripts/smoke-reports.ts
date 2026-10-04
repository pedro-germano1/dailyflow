/**
 * Teste rápido dos relatórios diário e semanal.
 * Rodar:  npx tsx scripts/smoke-reports.ts
 *
 * Calendário usado: 2026-10-05 é SEGUNDA, 2026-10-07 é QUARTA, 2026-10-11 é DOMINGO.
 */
import { MemoryStorageAdapter } from '../src/database/memoryStorageAdapter';
import { createMockServices } from '../src/mocks/mockServices';
import { createActivityService } from '../src/services/activityService';
import { createCategoryService } from '../src/services/categoryService';
import { createReportService } from '../src/services/reportService';
import { createSleepService } from '../src/services/sleepService';
import { ActivityStatus } from '../src/types/activity';
import { AppError } from '../src/types/common';
import { startOfWeek, toISODate } from '../src/utils/time';

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
  const D = '2026-10-07'; // quarta-feira
  const storage = new MemoryStorageAdapter();
  const activities = createActivityService(storage, createCategoryService(storage));
  const sleep = createSleepService(storage);
  const reports = createReportService(activities, sleep, () => D);

  const add = (date: string, title: string, categoryId: string, startTime: string, endTime: string, status: ActivityStatus) =>
    activities.create({ title, categoryId, date, startTime, endTime, status });

  // Segunda 05: trabalho 8h + estudo 1h (tudo concluído)
  await add('2026-10-05', 'Trabalho', 'cat-work', '09:00', '17:00', 'completed');
  await add('2026-10-05', 'Estudo', 'cat-study', '19:00', '20:00', 'completed');
  // Terça 06: trabalho 8h + exercício 1h + estudo 1h (tudo concluído)
  await add('2026-10-06', 'Trabalho', 'cat-work', '09:00', '17:00', 'completed');
  await add('2026-10-06', 'Academia', 'cat-exercise', '18:00', '19:00', 'completed');
  await add('2026-10-06', 'Estudo', 'cat-study', '19:30', '20:30', 'completed');
  // Quarta 07 (dia analisado): 3 concluídas, 1 pendente, 1 pulada
  await add(D, 'Trabalho', 'cat-work', '09:00', '12:00', 'completed');
  await add(D, 'Trabalho', 'cat-work', '13:00', '17:00', 'completed');
  await add(D, 'Estudo', 'cat-study', '19:00', '21:00', 'completed');
  await add(D, 'Academia', 'cat-exercise', '18:00', '19:00', 'pending');
  await add(D, 'Lazer', 'cat-leisure', '22:00', '23:00', 'skipped');
  await sleep.save({ date: '2026-10-06', sleepTime: '22:00', wakeTime: '06:00' }); // 480
  await sleep.save({ date: D, sleepTime: '23:30', wakeTime: '07:00' }); // 450

  console.log('Início da semana');
  check('domingo 11 -> segunda 05', startOfWeek('2026-10-11') === '2026-10-05');
  check('segunda 05 -> ela mesma', startOfWeek('2026-10-05') === '2026-10-05');
  check('sábado 03 -> segunda 28/09 (vira o mês)', startOfWeek('2026-10-03') === '2026-09-28');

  console.log('Relatório diário');
  const d = await reports.getDaily(D);
  check('trabalho = 420 (7h)', d.workMinutes === 420);
  check('estudo = 120', d.studyMinutes === 120);
  check('exercício pendente NÃO conta', d.exerciseMinutes === 0);
  check('lazer pulado NÃO conta', d.leisureMinutes === 0);
  check('total 5, concluídas 3, não concluídas 2', d.totalActivities === 5 && d.completedActivities === 3 && d.pendingActivities === 2);
  check('percentual de rotina = 60', d.completionRate === 60);
  check('sono 450, acordou 07:00, dormiu 23:30', d.sleepMinutes === 450 && d.wakeTime === '07:00' && d.sleepTime === '23:30');
  check('análise: totais do dia', d.insights.includes('Hoje você concluiu 7h de trabalho e 2h de estudo.'));
  check('análise: percentual', d.insights.includes('Você cumpriu 60% das atividades planejadas (3 de 5).'));
  check('análise: sono', d.insights.includes('Você dormiu 7h 30min.'));
  check('análise: estudo +100% vs média', d.insights.includes('Seu tempo de estudo aumentou 100% em relação à média dos últimos dias.'));
  check('análise: trabalho -13% vs média', d.insights.includes('Seu tempo de trabalho diminuiu 13% em relação à média dos últimos dias.'));
  const past = await reports.getDaily('2026-10-06');
  check('dia passado diz "Neste dia" e lista 3 categorias', past.insights[0] === 'Neste dia você concluiu 8h de trabalho, 1h de estudo e 1h de exercício.');
  check('variação < 10% não gera comentário', !past.insights.some((i) => i.includes('em relação à média')));
  const empty = await reports.getDaily('2026-12-25');
  check('dia vazio: zeros e mensagem honesta', empty.totalActivities === 0 && empty.completionRate === 0 && empty.insights.length === 1 && empty.insights[0] === 'Ainda não há registros neste dia.');
  await expectError('data inválida', 'VALIDATION_ERROR', () => reports.getDaily('2026-02-31'));

  console.log('Relatório semanal');
  const w = await reports.getWeekly(D);
  check('semana de 05/10 a 11/10', w.weekStart === '2026-10-05' && w.weekEnd === '2026-10-11');
  check('7 dias em ordem', w.days.length === 7 && w.days[0].date === '2026-10-05' && w.days[6].date === '2026-10-11');
  check('dia da quarta traz trabalho 420', w.days[2].workMinutes === 420);
  check('dias vêm sem insights', w.days.every((x) => x.insights.length === 0));
  check('mesma semana pedindo pelo domingo', (await reports.getWeekly('2026-10-11')).weekStart === '2026-10-05');
  check('mesma semana pedindo pela segunda', (await reports.getWeekly('2026-10-05')).weekStart === '2026-10-05');
  check('média de sono = 465 (só dias com registro)', w.averageSleepMinutes === 465);
  check('média de atividades/dia = 3.3 (só dias com registro)', w.averageActivitiesPerDay === 3.3);
  check('média de conclusão = 87', w.averageCompletionRate === 87);
  check('exercícios concluídos = 1', w.totalExerciseSessions === 1);
  check('melhor dia = terça (empate em 100%, mais concluídas)', w.bestDay === '2026-10-06');
  check('análise: sono médio', w.insights.includes('Você dormiu em média 7h 45min por noite nesta semana.'));
  check('análise: estudo total', w.insights.includes('Você estudou 4h no total nesta semana.'));
  check('análise: treinos (singular)', w.insights.includes('Você treinou 1 vez.'));
  check('análise: melhor dia', w.insights.includes('Seu melhor dia foi terça-feira (100%).'));
  const nov = await reports.getWeekly('2026-11-01');
  check('semana que vira o mês (26/10 a 01/11)', nov.weekStart === '2026-10-26' && nov.weekEnd === '2026-11-01');
  const emptyWeek = await reports.getWeekly('2026-12-25');
  check('semana vazia: zeros, sem melhor dia, mensagem honesta', emptyWeek.bestDay === null && emptyWeek.averageSleepMinutes === 0 && emptyWeek.insights[0] === 'Ainda não há registros nesta semana.');

  console.log('Via mock services (Dashboard reage às atividades)');
  const services = createMockServices();
  const today = toISODate();
  const before = await services.reports.getDaily(today);
  check('hoje: 7 atividades, 4 concluídas, 57%', before.totalActivities === 7 && before.completedActivities === 4 && before.completionRate === 57);
  check('hoje: sono vem do registro (455)', before.sleepMinutes === 455);
  await services.activities.toggleComplete('a5');
  const after = await services.reports.getDaily(today);
  check('concluir uma atividade atualiza o relatório (5 de 7, 71%)', after.completedActivities === 5 && after.completionRate === 71);
  const mw = await services.reports.getWeekly(today);
  check('semana do mock tem 7 dias e começa na segunda', mw.days.length === 7 && mw.weekStart === startOfWeek(today));
  const mm = await services.reports.getMonthly(today.slice(0, 7));
  check('mensal real sobre os mocks (hoje tem registro)', mm.daysRecorded >= 1 && mm.totalActivities >= 7);

  console.log(`\n${passed} passaram, ${failed} falharam`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
