import { Id, ISODate, Minutes, TimeString } from './common';

/**
 * Convenção: `date` = dia em que a pessoa ACORDOU.
 * Ex.: dormiu 23:45 do dia 10 e acordou 07:20 do dia 11 -> date = dia 11.
 * Se wakeTime < sleepTime, o service entende que atravessou a meia-noite.
 */
export interface SleepRecord {
  id: Id;
  date: ISODate;
  sleepTime: TimeString;
  wakeTime: TimeString;
  /** Calculado pelo service. */
  duration: Minutes;
}

export type SaveSleepInput = Pick<SleepRecord, 'date' | 'sleepTime' | 'wakeTime'>;

/**
 * Estatísticas de sono de um intervalo de datas (use semana ou mês para as médias).
 * Sem registros: médias 0 e bestDay/shortestDay null.
 * Com menos de 2 registros não dá para medir regularidade: variação e score vêm 0
 * (a UI deve mostrar "—" quando recordsCount < 2).
 */
export interface SleepStats {
  averageMinutes: Minutes;
  bestDay: { date: ISODate; duration: Minutes } | null;
  shortestDay: { date: ISODate; duration: Minutes } | null;
  /** Desvio padrão (em minutos) do horário de dormir. Menor = mais regular. */
  sleepTimeVariationMinutes: Minutes;
  /** 0-100: 100 = horários idênticos; 0 = variação de 2h ou mais (desvio padrão). */
  regularityScore: number;
  recordsCount: number;
}
