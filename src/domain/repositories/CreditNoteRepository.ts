import { CreditNote } from '../entities/CreditNote';

export interface CreditNoteRepository {
  findByOrderId(orderId: string): Promise<CreditNote | null>;
  findAll(): Promise<CreditNote[]>;
  save(creditNote: CreditNote): Promise<void>;
}
