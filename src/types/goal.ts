import { Id, ISODate } from './common';

export type GoalFrequency = 'daily' | 'weekly' | 'monthly';

/**
 * hours      -> soma de horas de uma categoria (ex.: estudar 2h/dia)
 * count      -> nº de atividades concluídas (ex.: treinar 4x/semana)
 * sleepHours -> horas de sono (ex.: dormir >= 7h)
 */
export type GoalMetric = 'hours' | 'count' | 'sleepHours';

export interface Goal {
  id: Id;
  title: string;
  /** Obrigatório quando metric = 'hours' ou 'count'. */
  categoryId?: Id;
  metric: GoalMetric;
  /** Valor alvo por período (horas ou quantidade). */
  target: number;
  frequency: GoalFrequency;
  startDate: ISODate;
  active: boolean;
}

export type CreateGoalInput = Omit<Goal, 'id' | 'active'>;
export type UpdateGoalInput = Partial<CreateGoalInput & { active: boolean }>;

/** Progresso é DERIVADO dos registros; não é salvo no banco. */
export interface GoalProgress {
  goalId: Id;
  current: number;
  target: number;
  /** 0-100+ (pode passar de 100). */
  percent: number;
  daysRemaining: number;
  achieved: boolean;
  /**
   * Até 8 períodos já ENCERRADOS (o atual NÃO entra: ele está em current/percent),
   * do mais ANTIGO ao mais recente (pronto para gráfico). Só períodos a partir de startDate.
   */
  history: { periodStart: ISODate; value: number; achieved: boolean }[];
}
