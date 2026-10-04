import { DEFAULT_CATEGORIES } from '../constants/categories';
import { Repository } from '../database/repository';
import { StorageAdapter, STORAGE_KEYS } from '../database/storage';
import { AppError } from '../types/common';
import { Category, CreateCategoryInput } from '../types/category';
import { ICategoryService } from '../types/services';
import { generateId } from '../utils/id';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * Só as categorias PERSONALIZADAS são gravadas. As padrão vêm do código,
 * então podem evoluir em novas versões do app sem migração.
 */
export function createCategoryService(storage: StorageAdapter): ICategoryService {
  const repo = new Repository<Category>(storage, STORAGE_KEYS.categories);

  const list = async (): Promise<Category[]> => [...DEFAULT_CATEGORIES, ...(await repo.getAll())];

  return {
    list,

    async create(input: CreateCategoryInput): Promise<Category> {
      const name = input.name?.trim() ?? '';
      const emoji = input.emoji?.trim() ?? '';
      if (!name) throw new AppError('VALIDATION_ERROR', 'Informe o nome da categoria.', 'name');
      if (name.length > 30) throw new AppError('VALIDATION_ERROR', 'O nome pode ter no máximo 30 caracteres.', 'name');
      if (!emoji) throw new AppError('VALIDATION_ERROR', 'Escolha um emoji para a categoria.', 'emoji');
      if (!HEX_COLOR.test(input.color ?? '')) {
        throw new AppError('VALIDATION_ERROR', 'Cor inválida. Use o formato #RRGGBB.', 'color');
      }
      const all = await list();
      if (all.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        throw new AppError('DUPLICATE', 'Já existe uma categoria com esse nome.', 'name');
      }
      const category: Category = {
        id: `cat-custom-${generateId()}`,
        name,
        emoji,
        color: input.color,
        isDefault: false,
      };
      return repo.mutate((items) => ({ items: [...items, category], result: category }));
    },

    async remove(id: string): Promise<void> {
      if (DEFAULT_CATEGORIES.some((c) => c.id === id)) {
        throw new AppError('VALIDATION_ERROR', 'As categorias padrão não podem ser excluídas.');
      }
      await repo.mutate((items) => {
        if (!items.some((c) => c.id === id)) {
          throw new AppError('NOT_FOUND', 'Categoria não encontrada.');
        }
        return { items: items.filter((c) => c.id !== id), result: undefined };
      });
    },
  };
}
