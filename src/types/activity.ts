import { Id, ISODate, Minutes, TimeString } from './common';

export type ActivityStatus = 'pending' | 'completed' | 'skipped';

/**
 * Uma atividade fica SEMPRE dentro de um único dia: endTime deve ser maior que startTime.
 * Não atravessa a meia-noite (isso gera VALIDATION_ERROR). Para 23:00-01:00, a UI cria duas
 * atividades (23:00-23:59 no dia e 00:00-01:00 no dia seguinte). O sono é a exceção: veja SleepRecord.
 */
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
