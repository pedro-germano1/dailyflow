import { Repository } from '../database/repository';
import { StorageAdapter, STORAGE_KEYS } from '../database/storage';
import { AppError, Id, ISODate } from '../types/common';
import { ISleepService } from '../types/services';
import { SaveSleepInput, SleepRecord, SleepStats } from '../types/sleep';
import { generateId } from '../utils/id';
import {
  calcSleepDuration, isValidDate, isValidTime, MAX_SLEEP_MINUTES, sleepTimeScale,
} from '../utils/time';

const fail = (message: string, field: string) => new AppError('VALIDATION_ERROR', message, field);

/** Desvio padrão que zera o score de regularidade (2 horas). */
const IRREGULAR_STD_MINUTES = 120;

function validate(input: SaveSleepInput): number {
  if (!isValidDate(input.date ?? '')) throw fail('Data inválida.', 'date');
  if (!isValidTime(input.sleepTime ?? '')) throw fail('Horário de dormir inválido.', 'sleepTime');
  if (!isValidTime(input.wakeTime ?? '')) throw fail('Horário de acordar inválido.', 'wakeTime');
  const duration = calcSleepDuration(input.sleepTime, input.wakeTime);
  if (duration === 0) throw fail('Os horários de dormir e acordar não podem ser iguais.', 'wakeTime');
  if (duration > MAX_SLEEP_MINUTES) {
    throw fail('Essa duração de sono parece incorreta. Confira os horários.', 'wakeTime');
  }
  return duration;
}

function standardDeviation(values: number[]): number {
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function computeSleepStats(records: SleepRecord[]): SleepStats {
  if (records.length === 0) {
    return {
      averageMinutes: 0, bestDay: null, shortestDay: null,
      sleepTimeVariationMinutes: 0, regularityScore: 0, recordsCount: 0,
    };
  }
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const total = sorted.reduce((sum, r) => sum + r.duration, 0);
  // Empates: vale o primeiro dia (mais antigo).
  const best = sorted.reduce((acc, r) => (r.duration > acc.duration ? r : acc));
  const shortest = sorted.reduce((acc, r) => (r.duration < acc.duration ? r : acc));

  let variation = 0;
  let score = 0;
  if (sorted.length >= 2) {
    variation = Math.round(standardDeviation(sorted.map((r) => sleepTimeScale(r.sleepTime))));
    score = Math.max(0, Math.min(100, Math.round(100 - (variation / IRREGULAR_STD_MINUTES) * 100)));
  }

  return {
    averageMinutes: Math.round(total / sorted.length),
    bestDay: { date: best.date, duration: best.duration },
    shortestDay: { date: shortest.date, duration: shortest.duration },
    sleepTimeVariationMinutes: variation,
    regularityScore: score,
    recordsCount: sorted.length,
  };
}

/** Um registro por data (data = dia em que acordou). Salvar de novo na mesma data substitui. */
export function createSleepService(storage: StorageAdapter): ISleepService {
  const repo = new Repository<SleepRecord>(storage, STORAGE_KEYS.sleep);

  const inRange = (records: SleepRecord[], from: ISODate, to: ISODate) =>
    records.filter((r) => r.date >= from && r.date <= to).sort((a, b) => a.date.localeCompare(b.date));

  return {
    async getByDate(date: ISODate): Promise<SleepRecord | null> {
      return (await repo.getAll()).find((r) => r.date === date) ?? null;
    },

    async list(from: ISODate, to: ISODate): Promise<SleepRecord[]> {
      return inRange(await repo.getAll(), from, to);
    },

    async save(input: SaveSleepInput): Promise<SleepRecord> {
      const duration = validate(input);
      return repo.mutate((items) => {
        const existing = items.find((r) => r.date === input.date);
        const record: SleepRecord = {
          id: existing?.id ?? generateId(),
          date: input.date,
          sleepTime: input.sleepTime,
          wakeTime: input.wakeTime,
          duration,
        };
        const next = existing ? items.map((r) => (r.id === existing.id ? record : r)) : [...items, record];
        return { items: next, result: record };
      });
    },

    async remove(id: Id): Promise<void> {
      await repo.mutate((items) => {
        if (!items.some((r) => r.id === id)) {
          throw new AppError('NOT_FOUND', 'Registro de sono não encontrado.');
        }
        return { items: items.filter((r) => r.id !== id), result: undefined };
      });
    },

    async getStats(from: ISODate, to: ISODate): Promise<SleepStats> {
      return computeSleepStats(inRange(await repo.getAll(), from, to));
    },
  };
}
