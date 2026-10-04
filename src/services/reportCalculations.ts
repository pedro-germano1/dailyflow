/**
 * Cálculos puros dos relatórios (sem acesso a storage): fáceis de testar.
 * Toda frase de análise é gerada SOMENTE a partir dos dados recebidos.
 */
import { Activity } from '../types/activity';
import { ISODate, Minutes } from '../types/common';
import { DailyReport, WeeklyReport } from '../types/report';
import { SleepRecord } from '../types/sleep';
import { addDays, formatDuration } from '../utils/time';

export const CATEGORY = {
  work: 'cat-work',
  study: 'cat-study',
  exercise: 'cat-exercise',
  leisure: 'cat-leisure',
} as const;

/** Variação mínima (em %) para a análise comentar uma mudança. */
const MIN_CHANGE_PERCENT = 10;

const WEEKDAYS = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado',
];

export function weekdayName(date: ISODate): string {
  const [y, m, d] = date.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d).getDay()];
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** ['a'] -> "a" | ['a','b'] -> "a e b" | ['a','b','c'] -> "a, b e c" */
function joinList(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`;
}

/** Só atividades CONCLUÍDAS contam como tempo realizado. */
export function sumCompleted(activities: Activity[], categoryId: string): Minutes {
  return activities
    .filter((a) => a.status === 'completed' && a.categoryId === categoryId)
    .reduce((sum, a) => sum + a.duration, 0);
}

/** Compara o dia com a média dos dias anteriores QUE TIVERAM registro. */
function compareWithHistory(
  label: string, current: Minutes, previous: Activity[], categoryId: string,
): string | null {
  const byDay = new Map<ISODate, Activity[]>();
  previous.forEach((a) => byDay.set(a.date, [...(byDay.get(a.date) ?? []), a]));
  if (byDay.size === 0 || current <= 0) return null;

  let total = 0;
  byDay.forEach((acts) => {
    total += sumCompleted(acts, categoryId);
  });
  const average = total / byDay.size;
  if (average <= 0) return null;

  const percent = Math.round((Math.abs(current - average) / average) * 100);
  if (percent < MIN_CHANGE_PERCENT) return null;
  const verb = current > average ? 'aumentou' : 'diminuiu';
  return `Seu tempo de ${label} ${verb} ${percent}% em relação à média dos últimos dias.`;
}

export function computeDailyReport(
  date: ISODate,
  activities: Activity[],
  sleep: SleepRecord | null,
  previousActivities: Activity[],
  today: ISODate,
): DailyReport {
  const workMinutes = sumCompleted(activities, CATEGORY.work);
  const studyMinutes = sumCompleted(activities, CATEGORY.study);
  const exerciseMinutes = sumCompleted(activities, CATEGORY.exercise);
  const leisureMinutes = sumCompleted(activities, CATEGORY.leisure);

  const total = activities.length;
  const completed = activities.filter((a) => a.status === 'completed').length;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  const insights: string[] = [];
  const done = [
    workMinutes > 0 ? `${formatDuration(workMinutes)} de trabalho` : null,
    studyMinutes > 0 ? `${formatDuration(studyMinutes)} de estudo` : null,
    exerciseMinutes > 0 ? `${formatDuration(exerciseMinutes)} de exercício` : null,
    leisureMinutes > 0 ? `${formatDuration(leisureMinutes)} de lazer` : null,
  ].filter((x): x is string => x !== null);
  if (done.length > 0) {
    insights.push(`${date === today ? 'Hoje' : 'Neste dia'} você concluiu ${joinList(done)}.`);
  }
  if (total > 0) {
    insights.push(`Você cumpriu ${completionRate}% das atividades planejadas (${completed} de ${total}).`);
  }
  if (sleep) insights.push(`Você dormiu ${formatDuration(sleep.duration)}.`);
  const studyChange = compareWithHistory('estudo', studyMinutes, previousActivities, CATEGORY.study);
  if (studyChange) insights.push(studyChange);
  const workChange = compareWithHistory('trabalho', workMinutes, previousActivities, CATEGORY.work);
  if (workChange) insights.push(workChange);
  if (insights.length === 0) insights.push('Ainda não há registros neste dia.');

  return {
    date,
    wakeTime: sleep?.wakeTime,
    sleepTime: sleep?.sleepTime,
    sleepMinutes: sleep?.duration ?? 0,
    workMinutes, studyMinutes, exerciseMinutes, leisureMinutes,
    totalActivities: total,
    completedActivities: completed,
    pendingActivities: total - completed,
    completionRate,
    insights,
  };
}

export function computeWeeklyReport(
  weekStart: ISODate, activities: Activity[], sleepRecords: SleepRecord[], today: ISODate,
): WeeklyReport {
  const days: DailyReport[] = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart, i);
    const report = computeDailyReport(
      date,
      activities.filter((a) => a.date === date),
      sleepRecords.find((s) => s.date === date) ?? null,
      [],
      today,
    );
    return { ...report, insights: [] };
  });

  const withActivities = days.filter((d) => d.totalActivities > 0);
  const withSleep = days.filter((d) => d.sleepMinutes > 0);

  const averageSleepMinutes = withSleep.length
    ? Math.round(withSleep.reduce((s, d) => s + d.sleepMinutes, 0) / withSleep.length)
    : 0;
  const averageActivitiesPerDay = withActivities.length
    ? round1(withActivities.reduce((s, d) => s + d.totalActivities, 0) / withActivities.length)
    : 0;
  const averageCompletionRate = withActivities.length
    ? Math.round(withActivities.reduce((s, d) => s + d.completionRate, 0) / withActivities.length)
    : 0;
  const totalExerciseSessions = activities.filter(
    (a) => a.status === 'completed' && a.categoryId === CATEGORY.exercise,
  ).length;

  // Melhor dia: maior % de conclusão; empate -> mais concluídas; empate -> mais antigo.
  const best = withActivities.reduce<DailyReport | null>((acc, d) => {
    if (!acc) return d;
    if (d.completionRate !== acc.completionRate) return d.completionRate > acc.completionRate ? d : acc;
    return d.completedActivities > acc.completedActivities ? d : acc;
  }, null);

  const totalStudy = days.reduce((s, d) => s + d.studyMinutes, 0);
  const insights: string[] = [];
  if (withSleep.length > 0) {
    insights.push(`Você dormiu em média ${formatDuration(averageSleepMinutes)} por noite nesta semana.`);
  }
  if (totalStudy > 0) insights.push(`Você estudou ${formatDuration(totalStudy)} no total nesta semana.`);
  if (totalExerciseSessions > 0) {
    insights.push(`Você treinou ${totalExerciseSessions} ${totalExerciseSessions === 1 ? 'vez' : 'vezes'}.`);
  }
  if (best) insights.push(`Seu melhor dia foi ${weekdayName(best.date)} (${best.completionRate}%).`);
  if (insights.length === 0) insights.push('Ainda não há registros nesta semana.');

  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
    days,
    averageSleepMinutes,
    averageActivitiesPerDay,
    averageCompletionRate,
    totalExerciseSessions,
    bestDay: best?.date ?? null,
    insights,
  };
}
