import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** 462 -> "7h 42min" | 480 -> "8h" | 45 -> "45min" */
export function formatDuration(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function toTimeString(date: Date): string {
  return format(date, 'HH:mm');
}

export function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/** "domingo, 4 de outubro" com a primeira letra maiúscula */
export function formatLongDate(date: Date): string {
  const text = format(date, "EEEE, d 'de' MMMM", { locale: ptBR });
  return text.charAt(0).toUpperCase() + text.slice(1);
}


/** "09:30" -> Date de hoje às 09:30 */
export function timeToDate(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(h ?? 0, m ?? 0, 0, 0);
  return date;
}

/** "2026-10-04" -> Date local (sem deslocamento de fuso) */
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}