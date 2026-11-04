import { MoneyPrimitives } from '../../domain/value-objects/Money';

export abstract class ApplicationError extends Error {
  protected constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OrderNotFoundError extends ApplicationError {
  constructor(idOrTrackingNumber: string) {
    super(
      'ORDER_NOT_FOUND',
      `No se encontró el envío "${idOrTrackingNumber}".`,
    );
  }
}

export class DuplicateTrackingNumberError extends ApplicationError {
  constructor(trackingNumber: string) {
    super(
      'DUPLICATE_TRACKING_NUMBER',
      `Ya existe un envío con la guía "${trackingNumber}".`,
    );
  }
}

export class PaidOrderRequiredError extends ApplicationError {
  constructor() {
    super(
      'PAID_ORDER_REQUIRED',
      'La cancelación con nota de crédito requiere un envío con pago procesado (PAID).',
    );
  }
}

export class CreditNoteAmountMismatchError extends ApplicationError {
  constructor(
    public readonly expected: MoneyPrimitives,
    public readonly received: MoneyPrimitives,
  ) {
    super(
      'CREDIT_NOTE_AMOUNT_MISMATCH',
      `El monto de la nota de crédito no coincide con el monto cobrado. Esperado: ${expected.amount} ${expected.currency}; recibido: ${received.amount} ${received.currency}.`,
    );
  }
}
