import { AppError, Id } from '../types/common';
import { StorageAdapter } from './storage';

const storageError = () =>
  new AppError('STORAGE_ERROR', 'Não foi possível acessar os dados do aplicativo. Tente novamente.');

/**
 * Coleção persistida sob uma única chave.
 * Escritas são serializadas em fila para evitar condição de corrida
 * (duas gravações simultâneas sobrescrevendo uma à outra).
 */
export class Repository<T extends { id: Id }> {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    private storage: StorageAdapter,
    private key: string,
  ) {}

  async getAll(): Promise<T[]> {
    try {
      return (await this.storage.getItem<T[]>(this.key)) ?? [];
    } catch {
      throw storageError();
    }
  }

  /**
   * Lê, aplica `change` e grava. `change` é síncrona e pode lançar AppError
   * (validação/duplicidade): nesse caso nada é gravado.
   */
  mutate<R>(change: (items: T[]) => { items: T[]; result: R }): Promise<R> {
    const run = async (): Promise<R> => {
      const current = await this.getAll();
      const { items, result } = change(current);
      try {
        await this.storage.setItem(this.key, items);
      } catch {
        throw storageError();
      }
      return result;
    };
    const next = this.queue.then(run);
    this.queue = next.catch(() => undefined);
    return next;
  }
}
