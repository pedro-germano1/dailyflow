/** Identificador único (uuid ou timestamp+random). */
export type Id = string;

/** Data no formato "YYYY-MM-DD" (sempre data local do usuário). */
export type ISODate = string;

/** Horário no formato "HH:mm" (24h). */
export type TimeString = string;

/** Mês no formato "YYYY-MM". */
export type ISOMonth = string;

/** Duração sempre em MINUTOS (inteiro). Formatação é responsabilidade da UI. */
export type Minutes = number;

export type AppErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'DUPLICATE'
  | 'STORAGE_ERROR';

/** Erro padrão lançado pelos services. A UI exibe `message` ao usuário. */
export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public field?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
