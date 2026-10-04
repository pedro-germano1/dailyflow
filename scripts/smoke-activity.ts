/**
 * Teste rápido do CRUD de atividades (sem celular, sem Jest).
 * Rodar:  npx tsx scripts/smoke-activity.ts
 */
import { MemoryStorageAdapter } from '../src/database/memoryStorageAdapter';
import { createActivityService } from '../src/services/activityService';
import { createCategoryService } from '../src/services/categoryService';
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

async function expectError(name: string, code: string, fn: () => Promise<unknown>) {
  try {
    await fn();
    check(`${name} (esperava erro ${code})`, false);
  } catch (e) {
    check(name, e instanceof AppError && e.code === code);
  }
}

async function main() {
  const storage = new MemoryStorageAdapter();
  const categories = createCategoryService(storage);
  const activities = createActivityService(storage, categories);
  const base = { categoryId: 'cat-work', date: '2026-10-03', status: 'pending' as const };

  console.log('Criar');
  const a = await activities.create({ ...base, title: '  Trabalho  ', startTime: '09:00', endTime: '12:30' });
  check('calcula duração (210 min)', a.duration === 210);
  check('faz trim no título', a.title === 'Trabalho');
  await expectError('horário final antes do inicial', 'VALIDATION_ERROR', () =>
    activities.create({ ...base, title: 'X', startTime: '10:00', endTime: '09:00' }));
  await expectError('horário final igual ao inicial', 'VALIDATION_ERROR', () =>
    activities.create({ ...base, title: 'X', startTime: '10:00', endTime: '10:00' }));
  await expectError('título vazio', 'VALIDATION_ERROR', () =>
    activities.create({ ...base, title: '   ', startTime: '10:00', endTime: '11:00' }));
  await expectError('data inexistente (31/02)', 'VALIDATION_ERROR', () =>
    activities.create({ ...base, date: '2026-02-31', title: 'X', startTime: '10:00', endTime: '11:00' }));
  await expectError('hora inválida (25:00)', 'VALIDATION_ERROR', () =>
    activities.create({ ...base, title: 'X', startTime: '25:00', endTime: '26:00' }));
  await expectError('categoria inexistente', 'VALIDATION_ERROR', () =>
    activities.create({ ...base, categoryId: 'nao-existe', title: 'X', startTime: '10:00', endTime: '11:00' }));
  await expectError('atividade duplicada', 'DUPLICATE', () =>
    activities.create({ ...base, title: 'trabalho', startTime: '09:00', endTime: '12:30' }));

  console.log('Listar / filtrar');
  await activities.create({ ...base, categoryId: 'cat-study', title: 'Estudo', startTime: '08:00', endTime: '09:00' });
  await activities.create({ ...base, date: '2026-10-04', title: 'Treino', categoryId: 'cat-exercise', startTime: '18:00', endTime: '19:00' });
  const all = await activities.list();
  check('lista 3 atividades', all.length === 3);
  check('ordena por data e horário', all[0].title === 'Estudo' && all[2].title === 'Treino');
  check('filtra por data', (await activities.list({ date: '2026-10-03' })).length === 2);
  check('filtra por categoria', (await activities.list({ categoryId: 'cat-study' })).length === 1);
  check('filtra por intervalo', (await activities.list({ from: '2026-10-04', to: '2026-10-10' })).length === 1);
  const dates = await activities.getDatesWithRecords('2026-10-01', '2026-10-31');
  check('datas com registro', dates.length === 2 && dates[0] === '2026-10-03');

  console.log('Editar / concluir / excluir');
  const edited = await activities.update(a.id, { endTime: '13:00' });
  check('edição recalcula duração (240)', edited.duration === 240);
  await expectError('edição inválida é rejeitada', 'VALIDATION_ERROR', () =>
    activities.update(a.id, { endTime: '08:00' }));
  check('edição inválida não altera o dado', (await activities.getById(a.id)).endTime === '13:00');
  check('marcar concluída', (await activities.toggleComplete(a.id)).status === 'completed');
  check('desmarcar concluída', (await activities.toggleComplete(a.id)).status === 'pending');
  await activities.remove(a.id);
  check('exclui', (await activities.list()).length === 2);
  await expectError('excluir inexistente', 'NOT_FOUND', () => activities.remove(a.id));
  await expectError('buscar inexistente', 'NOT_FOUND', () => activities.getById('xxx'));

  console.log('Concorrência');
  await Promise.all(
    [0, 1, 2, 3, 4].map((i) =>
      activities.create({ ...base, title: `Paralela ${i}`, startTime: `1${i}:00`, endTime: `1${i}:30` })),
  );
  check('5 gravações simultâneas, nenhuma perdida', (await activities.list()).length === 7);

  console.log('Categorias');
  const custom = await categories.create({ name: 'Leitura', emoji: '📖', color: '#112233' });
  check('cria categoria personalizada', !custom.isDefault && (await categories.list()).length === 10);
  await expectError('categoria duplicada', 'DUPLICATE', () =>
    categories.create({ name: 'leitura', emoji: '📖', color: '#112233' }));
  await expectError('cor inválida', 'VALIDATION_ERROR', () =>
    categories.create({ name: 'Outra', emoji: '🎵', color: 'azul' }));
  await expectError('não exclui categoria padrão', 'VALIDATION_ERROR', () => categories.remove('cat-work'));
  await categories.remove(custom.id);
  check('exclui categoria personalizada', (await categories.list()).length === 9);

  console.log(`\n${passed} passaram, ${failed} falharam`);
  process.exit(failed === 0 ? 0 : 1);
}

main();
