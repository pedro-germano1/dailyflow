/**
 * Teste rápido do sistema de metas.
 * Rodar:  npx tsx scripts/smoke-goals.ts
 *
 * Calendário: 2026-10-05 é SEGUNDA e 2026-10-07 é QUARTA (data de referência dos testes).
 */
import { MemoryStorageAdapter } from '../src/database/memoryStorageAdapter';
import { createMockServices } from '../src/mocks/mockServices';
import { createActivityService } from '../src/services/activityService';
import { createCategoryService } from '../src/services/categoryService';
import { createGoalService } from '../src/services/goalService';
import { createSleepService } from '../src/services/sleepService';
import { ActivityStatus } from '../src/types/activity';
import { AppError } from '../src/types/common';
import { CreateGoalInput } from '../src/types/goal';

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
  const REF = '2026-10-07'; // quarta-feira
  const storage = new MemoryStorageAdapter();
  const categories = createCategoryService(storage);
  const activities = createActivityService(storage, categories);
  const sleep = createSleepService(storage);
  const goals = createGoalService(storage, activities, sleep, categories, () => REF);

  const add = (date: string, title: string, categoryId: string, startTime: string, endTime: string, status: ActivityStatus) =>
    activities.create({ title, categoryId, date, startTime, endTime, status });

  // Estudo concluído: 05 = 1h, 06 = 1h30, 07 = 2h30 (+ 1h pendente que NÃO conta)
  await add('2026-10-05', 'Estudo', 'cat-study', '19:00', '20:00', 'completed');
  await add('2026-10-06', 'Estudo', 'cat-study', '19:00', '20:30', 'completed');
  await add('2026-10-07', 'Estudo', 'cat-study', '19:00', '21:30', 'completed');
  await add('2026-10-07', 'Estudo extra', 'cat-study', '22:00', '23:00', 'pending');
  // Exercício concluído: esta semana 2x; semana anterior 1x; semana de 21/09 4x
  for (const d of ['2026-10-05', '2026-10-07', '2026-09-30', '2026-09-21', '2026-09-22', '2026-09-24', '2026-09-26']) {
    await add(d, 'Academia', 'cat-exercise', '18:00', '19:00', 'completed');
  }
  await sleep.save({ date: '2026-10-06', sleepTime: '22:00', wakeTime: '06:00' }); // 480 = 8h
  await sleep.save({ date: '2026-10-07', sleepTime: '23:30', wakeTime: '07:00' }); // 450 = 7,5h

  const base = { startDate: '2026-10-01' };
  const g1 = await goals.create({ ...base, title: 'Estudar 2 horas por dia', categoryId: 'cat-study', metric: 'hours', target: 2, frequency: 'daily' });
  const g2 = await goals.create({ title: 'Treinar 4 vezes por semana', categoryId: 'cat-exercise', metric: 'count', target: 4, frequency: 'weekly', startDate: '2026-09-14' });
  const g3 = await goals.create({ ...base, title: 'Dormir pelo menos 7 horas', metric: 'sleepHours', target: 7, frequency: 'daily' });
  const g4 = await goals.create({ ...base, title: 'Estudar 10 horas no mês', categoryId: 'cat-study', metric: 'hours', target: 10, frequency: 'monthly' });
  const g5 = await goals.create({ title: 'Estudar 1 hora por dia', categoryId: 'cat-study', metric: 'hours', target: 1, frequency: 'daily', startDate: '2026-09-01' });
  const g6 = await goals.create({ title: 'Média de sono semanal', metric: 'sleepHours', target: 7, frequency: 'weekly', startDate: '2026-09-28' });
  const g7 = await goals.create({ title: 'Meta futura', categoryId: 'cat-study', metric: 'hours', target: 1, frequency: 'daily', startDate: '2026-11-01' });

  console.log('Meta diária de horas (estudar 2h/dia)');
  const p1 = await goals.getProgress(g1.id, REF);
  check('hoje: 2,5h (pendente não conta)', p1.current === 2.5 && p1.target === 2);
  check('percentual 125 e atingida', p1.percent === 125 && p1.achieved === true);
  check('meta diária: 0 dias restantes', p1.daysRemaining === 0);
  check('histórico só desde o início da meta (6 dias: 01 a 06)', p1.history.length === 6 && p1.history[0].periodStart === '2026-10-01' && p1.history[5].periodStart === '2026-10-06');
  check('histórico: 05 = 1h, 06 = 1,5h, nenhum atingido', p1.history[4].value === 1 && p1.history[5].value === 1.5 && p1.history.every((h) => !h.achieved));
  const p5 = await goals.getProgress(g5.id, REF);
  check('histórico limitado a 8 períodos, do mais antigo ao mais recente', p5.history.length === 8 && p5.history[0].periodStart === '2026-09-29' && p5.history[7].periodStart === '2026-10-06');
  check('histórico marca atingidos (05 = 1h e 06 = 1,5h)', p5.history[6].achieved === true && p5.history[7].achieved === true && p5.history[0].achieved === false);

  console.log('Meta semanal de quantidade (treinar 4x/semana)');
  const p2 = await goals.getProgress(g2.id, REF);
  check('semana atual: 2 treinos, 50%', p2.current === 2 && p2.percent === 50 && p2.achieved === false);
  check('quarta -> 4 dias restantes (qui, sex, sáb, dom)', p2.daysRemaining === 4);
  check('histórico: 3 semanas encerradas (14/09, 21/09, 28/09)', p2.history.map((h) => h.periodStart).join() === '2026-09-14,2026-09-21,2026-09-28');
  check('histórico: 0, 4 (atingida), 1', p2.history.map((h) => h.value).join() === '0,4,1' && p2.history.map((h) => h.achieved).join() === 'false,true,false');
  check('domingo: 0 dias restantes', (await goals.getProgress(g2.id, '2026-10-11')).daysRemaining === 0);
  check('segunda: 6 dias restantes', (await goals.getProgress(g2.id, '2026-10-05')).daysRemaining === 6);

  console.log('Meta de sono');
  const p3 = await goals.getProgress(g3.id, REF);
  check('hoje: 7,5h, 107%, atingida', p3.current === 7.5 && p3.percent === 107 && p3.achieved === true);
  check('ontem 8h atingida; dias sem registro = 0', p3.history[5].value === 8 && p3.history[5].achieved === true && p3.history[0].value === 0);
  const p6 = await goals.getProgress(g6.id, REF);
  check('semanal: média por noite = 7,75h (111%)', p6.current === 7.75 && p6.percent === 111);
  check('semanal: histórico tem 1 semana (28/09) sem registros', p6.history.length === 1 && p6.history[0].value === 0);

  console.log('Meta mensal');
  const p4 = await goals.getProgress(g4.id, REF);
  check('mês: 5h de 10h (50%)', p4.current === 5 && p4.percent === 50 && p4.achieved === false);
  check('dias restantes até 31/10 = 24', p4.daysRemaining === 24);
  check('sem mês encerrado depois do início: histórico vazio', p4.history.length === 0);

  console.log('Meta que ainda não começou');
  const p7 = await goals.getProgress(g7.id, REF);
  check('zero, sem histórico', p7.current === 0 && p7.percent === 0 && p7.history.length === 0);

  console.log('Validações e CRUD');
  const valid: CreateGoalInput = { title: 'Nova', categoryId: 'cat-study', metric: 'hours', target: 1, frequency: 'daily', startDate: '2026-10-01' };
  await expectError('título vazio', 'VALIDATION_ERROR', () => goals.create({ ...valid, title: '  ' }));
  await expectError('meta zero', 'VALIDATION_ERROR', () => goals.create({ ...valid, title: 'A', target: 0 }));
  await expectError('meta negativa', 'VALIDATION_ERROR', () => goals.create({ ...valid, title: 'B', target: -2 }));
  await expectError('horas diárias acima de 24', 'VALIDATION_ERROR', () => goals.create({ ...valid, title: 'C', target: 25 }));
  await expectError('quantidade não inteira', 'VALIDATION_ERROR', () => goals.create({ ...valid, title: 'D', metric: 'count', target: 2.5 }));
  await expectError('sono acima de 24h', 'VALIDATION_ERROR', () => goals.create({ title: 'E', metric: 'sleepHours', target: 30, frequency: 'daily', startDate: '2026-10-01' }));
  await expectError('horas sem categoria', 'VALIDATION_ERROR', () => goals.create({ ...valid, title: 'F', categoryId: undefined }));
  await expectError('categoria inexistente', 'VALIDATION_ERROR', () => goals.create({ ...valid, title: 'G', categoryId: 'nao-existe' }));
  await expectError('frequência inválida', 'VALIDATION_ERROR', () => goals.create({ ...valid, title: 'H', frequency: 'yearly' as never }));
  await expectError('data de início inválida', 'VALIDATION_ERROR', () => goals.create({ ...valid, title: 'I', startDate: '2026-02-31' }));
  await expectError('nome duplicado', 'DUPLICATE', () => goals.create({ ...valid, title: 'estudar 2 horas por dia' }));
  check('meta de sono ignora categoria', (await goals.create({ title: 'Sono extra', categoryId: 'cat-work', metric: 'sleepHours', target: 8, frequency: 'daily', startDate: '2026-10-01' })).categoryId === undefined);

  check('lista as metas criadas (8)', (await goals.list()).length === 8);
  const edited = await goals.update(g1.id, { target: 3 });
  check('editar meta recalcula o progresso (2,5h de 3h = 83%)', edited.target === 3 && (await goals.getProgress(g1.id, REF)).percent === 83);
  await expectError('edição inválida é rejeitada', 'VALIDATION_ERROR', () => goals.update(g1.id, { target: 0 }));
  check('desativar meta', (await goals.update(g1.id, { active: false })).active === false);
  check('meta desativada continua com progresso', (await goals.getProgress(g1.id, REF)).goalId === g1.id);
  await goals.remove(g1.id);
  check('exclui', (await goals.list()).length === 7);
  await expectError('excluir inexistente', 'NOT_FOUND', () => goals.remove(g1.id));
  await expectError('progresso de meta inexistente', 'NOT_FOUND', () => goals.getProgress('xxx', REF));
  await expectError('data de referência inválida', 'VALIDATION_ERROR', () => goals.getProgress(g2.id, '2026-02-31'));

  console.log('Via mock services');
  const services = createMockServices();
  const mockGoals = await services.goals.list();
  check('mock traz 3 metas', mockGoals.length === 3);
  const mp = await services.goals.getProgress(mockGoals[0].id);
  check('progresso do mock é calculado de verdade (histórico de 8 dias)', mp.history.length === 8 && mp.target === 2);
  const created = await services.goals.create({ title: 'Casa 3x por semana', categoryId: 'cat-home', metric: 'count', target: 3, frequency: 'weekly', startDate: '2026-10-01' });
  check('criar meta no mock funciona', (await services.goals.list()).length === 4 && created.active);
  await services.settings.clearAllData();
  check('limpar dados no mock apaga atividades e metas', (await services.goals.list()).length === 0 && (await services.activities.list()).length === 0);

  console.log(`\n${passed} passaram, ${failed} falharam`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
