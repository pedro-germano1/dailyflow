import { ID, ISODate, TimeString } from './common';

export interface SleepRecord {
  id: ID;
  /** Dia em que a pessoa ACORDOU */
  date: ISODate;
  sleepTime: TimeString; // pode ser do dia anterior (ex: 23:45)
  wakeTime: TimeString; // ex: 07:20
  durationMinutes: number; // calculado pelo serviço
}

export type NewSleepRecord = Omit<SleepRecord, 'id' | 'durationMinutes'>;

export interface SleepStats {
  avgMinutes: number;
  bestRecord: SleepRecord | null; // maior duração
  shortestRecord: SleepRecord | null;
  /** Variação dos horários de dormir, em minutos (menor = mais regular) */
  regularityMinutes: number;
}