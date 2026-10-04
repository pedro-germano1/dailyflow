import { ISODate, ISOMonth, Minutes } from './common';

export interface DailyReport {
  date: ISODate;
  wakeTime?: string;
  sleepTime?: string;
  sleepMinutes: Minutes;
  workMinutes: Minutes;
  studyMinutes: Minutes;
  exerciseMinutes: Minutes;
  leisureMinutes: Minutes;
  totalActivities: number;
  completedActivities: number;
  pendingActivities: number;
  /** 0-100 */
  completionRate: number;
  /** Frases geradas SOMENTE a partir dos dados registrados. */
  insights: string[];
}

export interface WeeklyReport {
  weekStart: ISODate; // segunda-feira
  weekEnd: ISODate; // domingo
  days: DailyReport[]; // 7 itens, na ordem
  averageSleepMinutes: Minutes;
  averageActivitiesPerDay: number;
  averageCompletionRate: number;
  totalExerciseSessions: number;
  bestDay: ISODate | null; // maior completionRate
  insights: string[];
}

export interface MonthlyComparison {
  sleepMinutesDiff: Minutes;
  workMinutesDiff: Minutes;
  studyMinutesDiff: Minutes;
  completionRateDiff: number;
}

export interface MonthlyReport {
  month: ISOMonth;
  totalSleepMinutes: Minutes;
  averageSleepMinutes: Minutes;
  totalWorkMinutes: Minutes;
  totalStudyMinutes: Minutes;
  totalExerciseSessions: number;
  totalActivities: number;
  daysRecorded: number;
  bestStreak: number;
  averageCompletionRate: number;
  /** null quando não há dados do mês anterior. */
  comparisonWithPreviousMonth: MonthlyComparison | null;
  insights: string[];
}
