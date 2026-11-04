import { CreditNote } from '../../domain/entities/CreditNote';

export interface FinanceNotifierPort {
  notifyCreditNoteIssued(creditNote: CreditNote): Promise<void>;
}
