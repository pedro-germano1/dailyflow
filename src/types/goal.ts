import { ID, ISODate } from './common';

export type GoalFrequency = 'daily' | 'weekly' | 'monthly';
export type GoalUnit = 'minutes' | 'times';

export interface Goal {
  id: ID;
  title: string;
  categoryId: ID | null;
  target: number;
  unit: GoalUnit;
  frequency: GoalFrequency;
  createdAt: ISODate;
}

export type NewGoal = Omit<Goal, 'id' | 'createdAt'>;

export interface GoalProgress {
  goal: Goal;
  current: number;
  percent: number; // 0-100
  daysLeft: number;
}

export interface GoalHistoryEntry {
  periodStart: ISODate;
  periodEnd: ISODate;
  achieved: number;
  target: number;
  completed: boolean;
}