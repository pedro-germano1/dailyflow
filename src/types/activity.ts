import { Id, ISODate, Minutes, TimeString } from './common';

export type ActivityStatus = 'pending' | 'completed' | 'skipped';

export interface Activity {
  id: Id;
  title: string;
  categoryId: Id;
  date: ISODate;
  startTime: TimeString;
  endTime: TimeString;
  /** Calculado pelo service a partir de startTime/endTime. Nunca vem da UI. */
  duration: Minutes;
  status: ActivityStatus;
  notes?: string;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
}

/** O que a UI envia ao criar. */
export type CreateActivityInput = Omit<
  Activity,
  'id' | 'duration' | 'createdAt' | 'updatedAt'
>;

/** O que a UI envia ao editar (parcial). */
export type UpdateActivityInput = Partial<CreateActivityInput>;

export interface ActivityFilter {
  date?: ISODate;
  /** Intervalo inclusivo. */
  from?: ISODate;
  to?: ISODate;
  categoryId?: Id;
  status?: ActivityStatus;
}
