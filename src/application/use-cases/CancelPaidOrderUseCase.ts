import { CreditNote } from '../../domain/entities/CreditNote';
import { CreditNoteStatus } from '../../domain/enums/CreditNoteStatus';
import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { CreditNoteRepository } from '../../domain/repositories/CreditNoteRepository';
import { Money } from '../../domain/value-objects/Money';
import { CancelOrderInput, CancelOrderOutput } from '../dtos/OrderDtos';
import {
  CreditNoteAmountMismatchError,
  OrderNotFoundError,
  PaidOrderRequiredError,
} from '../errors/ApplicationError';
import { ClockPort } from '../ports/ClockPort';
import { FinanceNotifierPort } from '../ports/FinanceNotifierPort';
import { IdGeneratorPort } from '../ports/IdGeneratorPort';

export class CancelPaidOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly creditNotes: CreditNoteRepository,
    private readonly financeNotifier: FinanceNotifierPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CancelOrderInput): Promise<CancelOrderOutput> {
    const order = await this.orders.findByIdOrTrackingNumber(input.orderId);

    if (!order) {
      throw new OrderNotFoundError(input.orderId);
    }

    if (!order.isPaid()) {
      throw new PaidOrderRequiredError();
    }

    this.assertCreditNoteAmount(input, order.cardChargedAmount);

    const now = this.clock.now();
    const cancellation = order.cancel(
      input.reason,
      input.requestedBy,
      this.idGenerator.generate(),
      now,
    );

    await this.orders.save(order);

    const existingCreditNote = await this.creditNotes.findByOrderId(order.id);

    if (existingCreditNote) {
      return {
        order,
        cancellation,
        creditNote: existingCreditNote,
        idempotent: cancellation === null,
      };
    }

    const creditNote = CreditNote.issue({
      id: this.idGenerator.generate(),
      orderId: order.id,
      amount: order.cardChargedAmount,
      reason: input.reason,
      issuedAt: now,
      status: CreditNoteStatus.ISSUED,
    });

    await this.creditNotes.save(creditNote);
    await this.financeNotifier.notifyCreditNoteIssued(creditNote);

    return {
      order,
      cancellation,
      creditNote,
      idempotent: cancellation === null,
    };
  }

  private assertCreditNoteAmount(
    input: CancelOrderInput,
    chargedAmount: Money,
  ): void {
    if (input.creditNoteAmount === undefined) {
      return;
    }

    const requestedAmount = Money.create(
      input.creditNoteAmount,
      input.currency ?? chargedAmount.currency,
    );

    if (!chargedAmount.equals(requestedAmount)) {
      throw new CreditNoteAmountMismatchError(
        chargedAmount.toPrimitives(),
        requestedAmount.toPrimitives(),
      );
    }
  }
}
