import { CreditNote } from '../../../domain/entities/CreditNote';
import { CreditNoteRepository } from '../../../domain/repositories/CreditNoteRepository';

export class InMemoryCreditNoteRepository implements CreditNoteRepository {
  private readonly creditNotesByOrderId = new Map<string, CreditNote>();

  async findByOrderId(orderId: string): Promise<CreditNote | null> {
    return this.creditNotesByOrderId.get(orderId) ?? null;
  }

  async findAll(): Promise<CreditNote[]> {
    return Array.from(this.creditNotesByOrderId.values());
  }

  async save(creditNote: CreditNote): Promise<void> {
    this.creditNotesByOrderId.set(creditNote.orderId, creditNote);
  }

  clear(): void {
    this.creditNotesByOrderId.clear();
  }
}
