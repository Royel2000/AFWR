import { CreditNote } from '../../domain/entities/CreditNote';
import { FinanceNotifierPort } from '../../application/ports/FinanceNotifierPort';

export class ConsoleFinanceNotifier implements FinanceNotifierPort {
  async notifyCreditNoteIssued(creditNote: CreditNote): Promise<void> {
    const payload = creditNote.toPrimitives();

    console.info(
      '[Finanzas] Nota de crédito emitida:',
      JSON.stringify(payload),
    );
  }
}
