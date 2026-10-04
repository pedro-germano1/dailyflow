import { ID, ISODate, TimeString } from './common';

export type ActivityStatus = 'planned' | 'completed' | 'skipped';

export interface Activity {
  id: ID;
  title: string;
  categoryId: ID;
  date: ISODate;
  startTime: TimeString;
  endTime: TimeString;
  durationMinutes: number; // calculado pelo serviço
  status: ActivityStatus;
  notes?: string;
}

/** O que a UI envia ao criar: id e duração são gerados pelo serviço */
export type NewActivity = Omit<Activity, 'id' | 'durationMinutes'>;

export type UpdateActivity = Partial<NewActivity>;

export interface ActivityFilter {
  date?: ISODate;
  categoryId?: ID;
}