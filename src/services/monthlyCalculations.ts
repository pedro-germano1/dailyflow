/** Cálculos puros do relatório mensal (sem storage). */
import { Activity } from '../types/activity';
import { ISODate, ISOMonth, Minutes } from '../types/common';
import { MonthlyComparison, MonthlyReport } from '../types/report';
import { SleepRecord } from '../types/sleep';
import { addDays, formatDuration } from '../utils/time';
import { CATEGORY, sumCompleted } from './reportCalculations';

const MIN_CHANGE_PERCENT = 10;

export interface MonthStats {
  daysWithActivities: number;
  daysRecorded: number;
  bestStreak: number;
  totalActivities: number;
  totalWork: Minutes;
  totalStudy: Minutes;
  exerciseSessions: number;
  totalSleep: Minutes;
  sleepNights: number;
  averageSleep: Minutes;
  averageCompletion: number;
  workPerDay: Minutes;
  studyPerDay: Minutes;
}

function longestStreak(sortedDates: ISODate[]): number {
  let best = 0;
  let run = 0;
  sortedDates.forEach((date, i) => {
    run = i > 0 && addDays(sortedDates[i - 1], 1) === date ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export function computeMonthStats(activities: Activity[], sleepRecords: SleepRecord[]): MonthStats {
  const byDay = new Map<ISODate, Activity[]>();
  activities.forEach((a) => byDay.set(a.date, [...(byDay.get(a.date) ?? []), a]));

  const recorded = new Set<ISODate>([...byDay.keys(), ...sleepRecords.map((s) => s.date)]);
  const dailyRates = [...byDay.values()].map(
    (acts) => (acts.filter((a) => a.status === 'completed').length / acts.length) * 100,
  );

  const totalWork = sumCompleted(activities, CATEGORY.work);
  const totalStudy = sumCompleted(activities, CATEGORY.study);
  const totalSleep = sleepRecords.reduce((sum, s) => sum + s.duration, 0);
  const days = byDay.size;

  return {
    daysWithActivities: days,
    daysRecorded: recorded.size,
    bestStreak: longestStreak([...recorded].sort()),
    totalActivities: activities.length,
    totalWork,
    totalStudy,
    exerciseSessions: activities.filter((a) => a.status === 'completed' && a.categoryId === CATEGORY.exercise).length,
    totalSleep,
    sleepNights: sleepRecords.length,
    averageSleep: sleepRecords.length ? Math.round(totalSleep / sleepRecords.length) : 0,
    averageCompletion: days ? Math.round(dailyRates.reduce((s, r) => s + r, 0) / days) : 0,
    workPerDay: days ? Math.round(totalWork / days) : 0,
    studyPerDay: days ? Math.round(totalStudy / days) : 0,
  };
}

function compareText(label: string, current: number, previous: number): string | null {
  if (current <= 0 || previous <= 0) return null;
  const percent = Math.round((Math.abs(current - previous) / previous) * 100);
  if (percent < MIN_CHANGE_PERCENT) return null;
  const verb = current > previous ? 'aumentou' : 'diminuiu';
  return `Seu tempo de ${label} por dia ${verb} ${percent}% em relação ao mês anterior.`;
}

export function computeMonthlyReport(
  month: ISOMonth, current: MonthStats, previous: MonthStats | null,
): MonthlyReport {
  const hasPrevious = previous !== null && previous.daysRecorded > 0;

  let comparison: MonthlyComparison | null = null;
  if (hasPrevious && previous) {
    const both = (a: number, b: number) => a > 0 && b > 0;
    comparison = {
      sleepMinutesDiff: both(current.sleepNights, previous.sleepNights) ? current.averageSleep - previous.averageSleep : 0,
      workMinutesDiff: both(current.daysWithActivities, previous.daysWithActivities) ? current.workPerDay - previous.workPerDay : 0,
      studyMinutesDiff: both(current.daysWithActivities, previous.daysWithActivities) ? current.studyPerDay - previous.studyPerDay : 0,
      completionRateDiff: both(current.daysWithActivities, previous.daysWithActivities) ? current.averageCompletion - previous.averageCompletion : 0,
    };
  }

  const insights: string[] = [];
  if (current.daysRecorded > 0) {
    const days = `${current.daysRecorded} ${current.daysRecorded === 1 ? 'dia' : 'dias'}`;
    const streak = `${current.bestStreak} ${current.bestStreak === 1 ? 'dia' : 'dias'}`;
    insights.push(`Você registrou ${days} neste mês, com sequência máxima de ${streak}.`);
  }
  if (current.sleepNights > 0) insights.push(`Você dormiu em média ${formatDuration(current.averageSleep)} por noite.`);
  if (current.daysWithActivities > 0) insights.push(`Taxa média de conclusão: ${current.averageCompletion}%.`);
  if (hasPrevious && previous) {
    const study = compareText('estudo', current.studyPerDay, previous.studyPerDay);
    const work = compareText('trabalho', current.workPerDay, previous.workPerDay);
    if (study) insights.push(study);
    if (work) insights.push(work);
  }
  if (insights.length === 0) insights.push('Ainda não há registros neste mês.');

  return {
    month,
    totalSleepMinutes: current.totalSleep,
    averageSleepMinutes: current.averageSleep,
    totalWorkMinutes: current.totalWork,
    totalStudyMinutes: current.totalStudy,
    totalExerciseSessions: current.exerciseSessions,
    totalActivities: current.totalActivities,
    daysRecorded: current.daysRecorded,
    bestStreak: current.bestStreak,
    averageCompletionRate: current.averageCompletion,
    comparisonWithPreviousMonth: comparison,
    insights,
  };
}
