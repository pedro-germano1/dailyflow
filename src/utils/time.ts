import { ISODate, Minutes, TimeString } from '../types/common';

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

/** Valida formato E existência real da data (rejeita 2026-02-31). */
export function isValidDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** "07:20" -> 440 */
export function timeToMinutes(time: TimeString): Minutes {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Duração de uma atividade no mesmo dia. Pode ser <= 0 se os horários forem inválidos. */
export function calcDuration(startTime: TimeString, endTime: TimeString): Minutes {
  return timeToMinutes(endTime) - timeToMinutes(startTime);
}

/** Date -> "YYYY-MM-DD" usando a data LOCAL (não UTC). */
export function toISODate(date: Date = new Date()): ISODate {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/** Soma dias a uma data ISO. addDays("2026-10-03", -1) -> "2026-10-02" */
export function addDays(date: ISODate, amount: number): ISODate {
  const [y, m, d] = date.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + amount));
}
