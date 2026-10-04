import { Repository } from '../database/repository';
import { StorageAdapter, STORAGE_KEYS } from '../database/storage';
import { AppError, Id, ISODate } from '../types/common';
import {
  CreateGoalInput, Goal, GoalFrequency, GoalMetric, GoalProgress, UpdateGoalInput,
} from '../types/goal';
import { IActivityService, ICategoryService, IGoalService, ISleepService } from '../types/services';
import { generateId } from '../utils/id';
import { isValidDate, toISODate } from '../utils/time';
import { buildProgress, progressRange } from './goalCalculations';

const FREQUENCIES: GoalFrequency[] = ['daily', 'weekly', 'monthly'];
const METRICS: GoalMetric[] = ['hours', 'count', 'sleepHours'];
/** Limite máximo de horas que cabem em cada período. */
const MAX_HOURS: Record<GoalFrequency, number> = { daily: 24, weekly: 168, monthly: 744 };

const fail = (message: string, field: string) => new AppError('VALIDATION_ERROR', message, field);

function validate(input: CreateGoalInput, categoryIds: Set<Id>): CreateGoalInput {
  const title = input.title?.trim() ?? '';
  if (!title) throw fail('Informe o nome da meta.', 'title');
  if (title.length > 60) throw fail('O nome pode ter no máximo 60 caracteres.', 'title');
  if (!METRICS.includes(input.metric)) throw fail('Tipo de meta inválido.', 'metric');
  if (!FREQUENCIES.includes(input.frequency)) throw fail('Frequência inválida.', 'frequency');
  if (!Number.isFinite(input.target) || input.target <= 0) throw fail('A meta precisa ser maior que zero.', 'target');
  if (input.metric === 'count' && !Number.isInteger(input.target)) {
    throw fail('A quantidade deve ser um número inteiro.', 'target');
  }
  if (input.metric === 'hours' && input.target > MAX_HOURS[input.frequency]) {
    throw fail(`Essa meta passa do total de horas do período (${MAX_HOURS[input.frequency]}h).`, 'target');
  }
  if (input.metric === 'sleepHours' && input.target > 24) {
    throw fail('A meta de sono não pode passar de 24 horas por noite.', 'target');
  }
  if (!isValidDate(input.startDate ?? '')) throw fail('Data de início inválida.', 'startDate');

  // Sono não usa categoria; horas e quantidade precisam de uma categoria existente.
  if (input.metric === 'sleepHours') return { ...input, title, categoryId: undefined };
  if (!input.categoryId || !categoryIds.has(input.categoryId)) {
    throw fail('Escolha uma categoria válida para a meta.', 'categoryId');
  }
  return { ...input, title };
}

function assertNotDuplicate(goals: Goal[], title: string, ignoreId?: Id): void {
  if (goals.some((g) => g.id !== ignoreId && g.title.toLowerCase() === title.toLowerCase())) {
    throw new AppError('DUPLICATE', 'Já existe uma meta com esse nome.', 'title');
  }
}

export function createGoalService(
  storage: StorageAdapter,
  activities: IActivityService,
  sleep: ISleepService,
  categories: ICategoryService,
  today: () => ISODate = () => toISODate(),
): IGoalService {
  const repo = new Repository<Goal>(storage, STORAGE_KEYS.goals);
  const loadCategoryIds = async () => new Set((await categories.list()).map((c) => c.id));

  return {
    async list(): Promise<Goal[]> {
      return repo.getAll();
    },

    async create(input: CreateGoalInput): Promise<Goal> {
      const data = validate(input, await loadCategoryIds());
      return repo.mutate((items) => {
        assertNotDuplicate(items, data.title);
        const goal: Goal = { ...data, id: generateId(), active: true };
        return { items: [...items, goal], result: goal };
      });
    },

    async update(id: Id, input: UpdateGoalInput): Promise<Goal> {
      const categoryIds = await loadCategoryIds();
      return repo.mutate((items) => {
        const current = items.find((g) => g.id === id);
        if (!current) throw new AppError('NOT_FOUND', 'Meta não encontrada.');
        const { active, ...rest } = { ...current, ...input };
        const data = validate(rest, categoryIds);
        assertNotDuplicate(items, data.title, id);
        const updated: Goal = { ...data, id, active };
        return { items: items.map((g) => (g.id === id ? updated : g)), result: updated };
      });
    },

    async remove(id: Id): Promise<void> {
      await repo.mutate((items) => {
        if (!items.some((g) => g.id === id)) throw new AppError('NOT_FOUND', 'Meta não encontrada.');
        return { items: items.filter((g) => g.id !== id), result: undefined };
      });
    },

    async getProgress(id: Id, referenceDate: ISODate = today()): Promise<GoalProgress> {
      if (!isValidDate(referenceDate)) throw fail('Data inválida.', 'referenceDate');
      const goal = (await repo.getAll()).find((g) => g.id === id);
      if (!goal) throw new AppError('NOT_FOUND', 'Meta não encontrada.');

      const range = progressRange(goal, referenceDate);
      if (!range) return buildProgress(goal, referenceDate, [], []);

      const isSleep = goal.metric === 'sleepHours';
      const [acts, sleeps] = await Promise.all([
        isSleep
          ? Promise.resolve([])
          : activities.list({ categoryId: goal.categoryId, status: 'completed', from: range.from, to: range.to }),
        isSleep ? sleep.list(range.from, range.to) : Promise.resolve([]),
      ]);
      return buildProgress(goal, referenceDate, acts, sleeps);
    },
  };
}
