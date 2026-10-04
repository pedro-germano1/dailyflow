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

/** Limite de sanidade: acima disso o registro provavelmente está errado (ex.: AM/PM trocado). */
export const MAX_SLEEP_MINUTES = 18 * 60;

/**
 * Duração do sono, que pode atravessar a meia-noite.
 * 23:45 -> 07:20 = 455 min. Horários iguais retornam 0 (inválido).
 */
export function calcSleepDuration(sleepTime: TimeString, wakeTime: TimeString): Minutes {
  const sleep = timeToMinutes(sleepTime);
  const wake = timeToMinutes(wakeTime);
  if (sleep === wake) return 0;
  return wake > sleep ? wake - sleep : wake + 24 * 60 - sleep;
}

/**
 * Horário de dormir em minutos numa escala contínua que atravessa a meia-noite:
 * 23:45 -> 1425 e 00:30 -> 1470 (antes do meio-dia conta como "madrugada do dia seguinte").
 * Serve para medir regularidade sem tratar 23:50 e 00:10 como horários distantes.
 */
export function sleepTimeScale(sleepTime: TimeString): Minutes {
  const m = timeToMinutes(sleepTime);
  return m < 12 * 60 ? m + 24 * 60 : m;
}

/** 455 -> "7h 35min" | 480 -> "8h" | 45 -> "45min" | 0 -> "0min" */
export function formatDuration(totalMinutes: Minutes): string {
  const safe = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(safe / 60);
  const m = safe % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}

/** Segunda-feira da semana de uma data (semana = segunda a domingo). */
export function startOfWeek(date: ISODate): ISODate {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).getDay(); // 0 = domingo
  return addDays(date, -((weekday + 6) % 7));
}
