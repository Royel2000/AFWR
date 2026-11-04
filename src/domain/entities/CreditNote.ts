import { CreditNoteStatus } from '../enums/CreditNoteStatus';
import { ValidationError } from '../errors/DomainError';
import { Money, MoneyPrimitives } from '../value-objects/Money';

export interface CreditNoteProps {
  id: string;
  orderId: string;
  amount: Money;
  reason: string;
  issuedAt: Date;
  status: CreditNoteStatus;
}

export interface CreditNotePrimitives {
  id: string;
  order_id: string;
  amount: MoneyPrimitives;
  reason: string;
  status: CreditNoteStatus;
  issued_at: string;
}

export class CreditNote {
  private constructor(private readonly props: CreditNoteProps) {}

  static issue(props: CreditNoteProps): CreditNote {
    if (!props.id || !props.id.trim()) {
      throw new ValidationError('El identificador de la nota de crédito es obligatorio.');
    }

    if (!props.orderId || !props.orderId.trim()) {
      throw new ValidationError('El identificador del envío es obligatorio.');
    }

    if (props.amount.amount <= 0) {
      throw new ValidationError('El monto de la nota de crédito debe ser mayor a cero.');
    }

    const reason = typeof props.reason === 'string' ? props.reason.trim() : '';

    if (!reason) {
      throw new ValidationError('El motivo de la nota de crédito es obligatorio.');
    }

    if (!(props.issuedAt instanceof Date) || Number.isNaN(props.issuedAt.getTime())) {
      throw new ValidationError('La fecha de emisión de la nota de crédito no es válida.');
    }

    return new CreditNote({
      id: props.id,
      orderId: props.orderId,
      amount: props.amount,
      reason,
      issuedAt: new Date(props.issuedAt.getTime()),
      status: props.status,
    });
  }

  get id(): string {
    return this.props.id;
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get amount(): Money {
    return this.props.amount;
  }

  get status(): CreditNoteStatus {
    return this.props.status;
  }

  get issuedAt(): Date {
    return new Date(this.props.issuedAt.getTime());
  }

  toPrimitives(): CreditNotePrimitives {
    return {
      id: this.props.id,
      order_id: this.props.orderId,
      amount: this.props.amount.toPrimitives(),
      reason: this.props.reason,
      status: this.props.status,
      issued_at: this.props.issuedAt.toISOString(),
    };
  }
}
