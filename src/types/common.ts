export type ID = string;

/** Data no formato 'YYYY-MM-DD' */
export type ISODate = string;

/** Hora no formato 'HH:mm' (24h) */
export type TimeString = string;

/** Mês no formato 'YYYY-MM' */
export type ISOMonth = string;

export interface DateRange {
  start: ISODate;
  end: ISODate;
}