import { Id } from './common';

export interface Category {
  id: Id;
  name: string;
  emoji: string;
  /** Cor em hex, ex.: "#6C63FF" */
  color: string;
  /** true = categoria padrão do app (não pode ser excluída). */
  isDefault: boolean;
}

export type CreateCategoryInput = Omit<Category, 'id' | 'isDefault'>;
