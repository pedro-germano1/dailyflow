import { ISODate, ISOMonth, Minutes } from './common';

/**
 * Regras do relatório diário:
 * - Os totais de minutos (trabalho, estudo, exercício, lazer) contam SÓ atividades concluídas.
 * - pendingActivities = atividades NÃO concluídas (pendentes + puladas).
 * - completionRate = concluídas / total (0 se não houver atividades).
 * - sleepMinutes vem do SleepRecord com `date` = este dia (noite que terminou nele).
 */
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

/**
 * Regras do relatório semanal (segunda a domingo):
 * - `days` traz 7 DailyReport; o `insights` de cada dia vem vazio (use o do getDaily).
 * - Médias consideram só os dias COM registro (um dia em branco não puxa a média para baixo).
 * - averageActivitiesPerDay tem 1 casa decimal.
 */
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

/**
 * Diferenças = mês atual MENOS mês anterior, comparando MÉDIAS (não totais), porque os meses
 * têm tamanhos e quantidades de registro diferentes:
 * - sleepMinutesDiff: média de sono por noite.
 * - workMinutesDiff / studyMinutesDiff: média de minutos por DIA COM ATIVIDADES.
 * - completionRateDiff: diferença em pontos percentuais da taxa média de conclusão.
 * Fica 0 quando um dos meses não tem dado daquela medida.
 */
export interface MonthlyComparison {
  sleepMinutesDiff: Minutes;
  workMinutesDiff: Minutes;
  studyMinutesDiff: Minutes;
  completionRateDiff: number;
}

/**
 * Regras do relatório mensal:
 * - daysRecorded = dias com pelo menos uma atividade OU um registro de sono.
 * - bestStreak = maior sequência de dias seguidos COM registro, dentro do mês.
 * - Totais de tempo contam só atividades concluídas; totalActivities conta todas.
 * - averageSleepMinutes = média por noite registrada; averageCompletionRate = média das taxas diárias.
 */
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
