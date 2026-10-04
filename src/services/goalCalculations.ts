/**
 * Cálculos puros das metas (sem storage).
 *
 * Período: daily = o dia; weekly = segunda a domingo; monthly = mês do calendário.
 * Valor do período:
 *  - hours:      horas concluídas na categoria (soma)
 *  - count:      nº de atividades concluídas na categoria
 *  - sleepHours: média de horas de sono POR NOITE no período
 * Só conta a partir de `startDate` (o primeiro período pode ser parcial).
 */
import { Activity } from '../types/activity';
import { ISODate } from '../types/common';
import { Goal, GoalFrequency, GoalProgress } from '../types/goal';
import { SleepRecord } from '../types/sleep';
import { addDays, daysBetween, monthRange, previousMonth, startOfWeek } from '../utils/time';

export const HISTORY_PERIODS = 8;

export interface Period {
  start: ISODate;
  end: ISODate;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function periodOf(frequency: GoalFrequency, date: ISODate): Period {
  if (frequency === 'daily') return { start: date, end: date };
  if (frequency === 'weekly') {
    const start = startOfWeek(date);
    return { start, end: addDays(start, 6) };
  }
  const { from, to } = monthRange(date.slice(0, 7));
  return { start: from, end: to };
}

function previousPeriod(frequency: GoalFrequency, current: Period): Period {
  if (frequency === 'daily') return periodOf('daily', addDays(current.start, -1));
  if (frequency === 'weekly') return periodOf('weekly', addDays(current.start, -7));
  return periodOf('monthly', `${previousMonth(current.start.slice(0, 7))}-01`);
}

/** Períodos ENCERRADOS que terminam em/depois de startDate, do mais antigo ao mais recente. */
export function pastPeriods(goal: Goal, current: Period): Period[] {
  const result: Period[] = [];
  let period = previousPeriod(goal.frequency, current);
  while (result.length < HISTORY_PERIODS && period.end >= goal.startDate) {
    result.push(period);
    period = previousPeriod(goal.frequency, period);
  }
  return result.reverse();
}

/** Intervalo de datas que o service precisa buscar (null = meta ainda não começou). */
export function progressRange(goal: Goal, referenceDate: ISODate): { from: ISODate; to: ISODate } | null {
  const current = periodOf(goal.frequency, referenceDate);
  const oldest = pastPeriods(goal, current)[0]?.start ?? current.start;
  const from = oldest < goal.startDate ? goal.startDate : oldest;
  return from > current.end ? null : { from, to: current.end };
}

function periodValue(goal: Goal, period: Period, activities: Activity[], sleeps: SleepRecord[]): number {
  const from = period.start < goal.startDate ? goal.startDate : period.start;
  if (from > period.end) return 0;

  if (goal.metric === 'sleepHours') {
    const records = sleeps.filter((s) => s.date >= from && s.date <= period.end);
    if (records.length === 0) return 0;
    return round2(records.reduce((sum, r) => sum + r.duration, 0) / records.length / 60);
  }

  const matching = activities.filter(
    (a) => a.status === 'completed' && a.categoryId === goal.categoryId && a.date >= from && a.date <= period.end,
  );
  if (goal.metric === 'count') return matching.length;
  return round2(matching.reduce((sum, a) => sum + a.duration, 0) / 60);
}

export function buildProgress(
  goal: Goal, referenceDate: ISODate, activities: Activity[], sleeps: SleepRecord[],
): GoalProgress {
  const period = periodOf(goal.frequency, referenceDate);
  const current = periodValue(goal, period, activities, sleeps);

  const history = pastPeriods(goal, period).map((p) => {
    const value = periodValue(goal, p, activities, sleeps);
    return { periodStart: p.start, value, achieved: value >= goal.target };
  });

  return {
    goalId: goal.id,
    current,
    target: goal.target,
    percent: Math.round((current / goal.target) * 100),
    daysRemaining: Math.max(0, daysBetween(referenceDate, period.end)),
    achieved: current >= goal.target,
    history,
  };
}
