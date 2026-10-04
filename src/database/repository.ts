import { AppError, Id } from '../types/common';
import { StorageAdapter } from './storage';

export const storageError = () =>
  new AppError('STORAGE_ERROR', 'Não foi possível acessar os dados do aplicativo. Tente novamente.');

/**
 * Coleção persistida sob uma única chave.
 * Escritas são serializadas em fila para evitar condição de corrida
 * (duas gravações simultâneas sobrescrevendo uma à outra).
 */
export class Repository<T extends { id: Id }> {
  private queue: Promise<unknown> = Promise.resolve();

  /**
   * `isValid` (opcional) descarta itens corrompidos ao LER. Dado que não é uma lista vira lista vazia.
   * Assim um dado quebrado no disco nunca derruba o app; na próxima gravação a lista sai limpa.
   */
  constructor(
    private storage: StorageAdapter,
    private key: string,
    private isValid: (item: unknown) => item is T = (item): item is T =>
      typeof item === 'object' && item !== null && typeof (item as { id?: unknown }).id === 'string',
  ) {}

  async getAll(): Promise<T[]> {
    let raw: unknown;
    try {
      raw = await this.storage.getItem<unknown>(this.key);
    } catch {
      throw storageError();
    }
    return Array.isArray(raw) ? raw.filter(this.isValid) : [];
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
