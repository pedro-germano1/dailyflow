import { ISODate, ISOMonth, TimeString } from './common';

export interface DailyReport {
  date: ISODate;
  wakeTime: TimeString | null;
  sleepTime: TimeString | null;
  sleepMinutes: number;
  workMinutes: number;
  studyMinutes: number;
  exerciseMinutes: number;
  leisureMinutes: number;
  totalActivities: number;
  completedActivities: number;
  pendingActivities: number;
  completionRate: number; // 0-100
  /** Frases geradas só a partir dos dados registrados */
  insights: string[];
}

export interface WeeklyReport {
  weekStart: ISODate; // segunda-feira
  weekEnd: ISODate; // domingo
  days: DailyReport[]; // 7 itens, de segunda a domingo
  avgSleepMinutes: number;
  totalWorkMinutes: number;
  totalStudyMinutes: number;
  exerciseSessions: number;
  avgCompletionRate: number;
  avgActivitiesPerDay: number;
  insights: string[];
}

export interface MonthComparison {
  sleepDiffPercent: number;
  workDiffPercent: number;
  studyDiffPercent: number;
  completionRateDiff: number; // em pontos percentuais
}

export interface MonthlyReport {
  month: ISOMonth;
  totalSleepMinutes: number;
  avgSleepMinutes: number;
  totalWorkMinutes: number;
  totalStudyMinutes: number;
  exerciseSessions: number;
  totalActivities: number;
  daysRecorded: number;
  bestStreakDays: number;
  avgCompletionRate: number;
  /** null quando não há dados do mês anterior */
  comparisonWithPreviousMonth: MonthComparison | null;
  insights: string[];
}