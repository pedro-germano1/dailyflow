import { Repository } from '../database/repository';
import { StorageAdapter, STORAGE_KEYS } from '../database/storage';
import {
  Activity,
  ActivityFilter,
  ActivityStatus,
  CreateActivityInput,
  UpdateActivityInput,
} from '../types/activity';
import { AppError, Id, ISODate } from '../types/common';
import { IActivityService, ICategoryService } from '../types/services';
import { generateId } from '../utils/id';
import { calcDuration, isValidDate, isValidTime } from '../utils/time';

const STATUSES: ActivityStatus[] = ['pending', 'completed', 'skipped'];
const fail = (message: string, field: string) => new AppError('VALIDATION_ERROR', message, field);

type ActivityFields = CreateActivityInput;

/** Valida e normaliza (trim) os campos. Lança AppError com mensagem amigável. */
function validate(input: ActivityFields, categoryIds: Set<Id>): ActivityFields {
  const title = input.title?.trim() ?? '';
  if (!title) throw fail('Informe o nome da atividade.', 'title');
  if (title.length > 60) throw fail('O nome pode ter no máximo 60 caracteres.', 'title');

  if (!categoryIds.has(input.categoryId)) throw fail('Escolha uma categoria válida.', 'categoryId');
  if (!isValidDate(input.date ?? '')) throw fail('Data inválida.', 'date');
  if (!isValidTime(input.startTime ?? '')) throw fail('Horário inicial inválido.', 'startTime');
  if (!isValidTime(input.endTime ?? '')) throw fail('Horário final inválido.', 'endTime');
  if (calcDuration(input.startTime, input.endTime) <= 0) {
    throw fail('O horário final deve ser depois do horário inicial.', 'endTime');
  }
  if (!STATUSES.includes(input.status)) throw fail('Status inválido.', 'status');

  const notes = input.notes?.trim();
  if (notes && notes.length > 300) throw fail('A observação pode ter no máximo 300 caracteres.', 'notes');

  return { ...input, title, notes: notes || undefined };
}

/** Mesma data + mesmo título + mesmo horário = duplicada. */
function assertNotDuplicate(items: Activity[], data: ActivityFields, ignoreId?: Id): void {
  const dup = items.some(
    (a) =>
      a.id !== ignoreId &&
      a.date === data.date &&
      a.startTime === data.startTime &&
      a.endTime === data.endTime &&
      a.title.toLowerCase() === data.title.toLowerCase(),
  );
  if (dup) throw new AppError('DUPLICATE', 'Você já registrou essa atividade nesse horário.');
}

function matches(a: Activity, f: ActivityFilter): boolean {
  if (f.date && a.date !== f.date) return false;
  if (f.from && a.date < f.from) return false; // datas ISO comparam como string
  if (f.to && a.date > f.to) return false;
  if (f.categoryId && a.categoryId !== f.categoryId) return false;
  if (f.status && a.status !== f.status) return false;
  return true;
}

const byDateAndTime = (a: Activity, b: Activity) =>
  a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);

export function createActivityService(
  storage: StorageAdapter,
  categories: ICategoryService,
): IActivityService {
  const repo = new Repository<Activity>(storage, STORAGE_KEYS.activities);
  const loadCategoryIds = async () => new Set((await categories.list()).map((c) => c.id));

  return {
    async list(filter: ActivityFilter = {}): Promise<Activity[]> {
      return (await repo.getAll()).filter((a) => matches(a, filter)).sort(byDateAndTime);
    },

    async getById(id: Id): Promise<Activity> {
      const found = (await repo.getAll()).find((a) => a.id === id);
      if (!found) throw new AppError('NOT_FOUND', 'Atividade não encontrada.');
      return found;
    },

    async create(input: CreateActivityInput): Promise<Activity> {
      const data = validate(input, await loadCategoryIds());
      return repo.mutate((items) => {
        assertNotDuplicate(items, data);
        const now = new Date().toISOString();
        const activity: Activity = {
          ...data,
          id: generateId(),
          duration: calcDuration(data.startTime, data.endTime),
          createdAt: now,
          updatedAt: now,
        };
        return { items: [...items, activity], result: activity };
      });
    },

    async update(id: Id, input: UpdateActivityInput): Promise<Activity> {
      const categoryIds = await loadCategoryIds();
      return repo.mutate((items) => {
        const current = items.find((a) => a.id === id);
        if (!current) throw new AppError('NOT_FOUND', 'Atividade não encontrada.');
        const data = validate({ ...current, ...input }, categoryIds);
        assertNotDuplicate(items, data, id);
        const updated: Activity = {
          ...current,
          ...data,
          duration: calcDuration(data.startTime, data.endTime),
          updatedAt: new Date().toISOString(),
        };
        return { items: items.map((a) => (a.id === id ? updated : a)), result: updated };
      });
    },

    async remove(id: Id): Promise<void> {
      await repo.mutate((items) => {
        if (!items.some((a) => a.id === id)) {
          throw new AppError('NOT_FOUND', 'Atividade não encontrada.');
        }
        return { items: items.filter((a) => a.id !== id), result: undefined };
      });
    },

    /** Concluída -> pendente; qualquer outro status -> concluída. */
    async toggleComplete(id: Id): Promise<Activity> {
      return repo.mutate((items) => {
        const current = items.find((a) => a.id === id);
        if (!current) throw new AppError('NOT_FOUND', 'Atividade não encontrada.');
        const updated: Activity = {
          ...current,
          status: current.status === 'completed' ? 'pending' : 'completed',
          updatedAt: new Date().toISOString(),
        };
        return { items: items.map((a) => (a.id === id ? updated : a)), result: updated };
      });
    },

    async getDatesWithRecords(from: ISODate, to: ISODate): Promise<ISODate[]> {
      const dates = (await repo.getAll())
        .filter((a) => a.date >= from && a.date <= to)
        .map((a) => a.date);
      return [...new Set(dates)].sort();
    },
  };
}
