import { OrderStatus } from '../enums/OrderStatus';
import { PaymentStatus } from '../enums/PaymentStatus';
import {
  InvalidOrderTransitionError,
  ValidationError,
} from '../errors/DomainError';
import { Address } from '../value-objects/Address';
import { Money, MoneyPrimitives } from '../value-objects/Money';
import { TrackingNumber } from '../value-objects/TrackingNumber';
import {
  CancellationRequest,
  CancellationRequestPrimitives,
} from './CancellationRequest';

export interface OrderProps {
  id: string;
  trackingNumber: TrackingNumber;
  status: OrderStatus;
  destinationAddress: Address;
  cardChargedAmount: Money;
  paymentStatus: PaymentStatus;
  isDeleted: boolean;
  cancellation: CancellationRequest | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderPrimitives {
  id: string;
  tracking_number: string;
  package_status: OrderStatus;
  destination_address: string;
  card_charged_amount: MoneyPrimitives;
  payment_status: PaymentStatus;
  is_deleted: boolean;
  cancellation: CancellationRequestPrimitives | null;
  created_at: string;
  updated_at: string;
}

const CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PREPARING,
  OrderStatus.WAREHOUSE,
];

const ADDRESS_CHANGEABLE_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PREPARING,
  OrderStatus.WAREHOUSE,
];

export class Order {
  private constructor(private readonly props: OrderProps) {}

  static create(props: OrderProps): Order {
    if (!props.id || !props.id.trim()) {
      throw new ValidationError('El identificador del envío es obligatorio.');
    }

    if (!Object.values(OrderStatus).includes(props.status)) {
      throw new ValidationError(`Estado de envío inválido: "${props.status}".`);
    }

    if (!Object.values(PaymentStatus).includes(props.paymentStatus)) {
      throw new ValidationError(`Estado de pago inválido: "${props.paymentStatus}".`);
    }

    if (!(props.createdAt instanceof Date) || Number.isNaN(props.createdAt.getTime())) {
      throw new ValidationError('La fecha de creación del envío no es válida.');
    }

    if (!(props.updatedAt instanceof Date) || Number.isNaN(props.updatedAt.getTime())) {
      throw new ValidationError('La fecha de actualización del envío no es válida.');
    }

    return new Order({
      ...props,
      createdAt: new Date(props.createdAt.getTime()),
      updatedAt: new Date(props.updatedAt.getTime()),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get trackingNumber(): TrackingNumber {
    return this.props.trackingNumber;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get destinationAddress(): Address {
    return this.props.destinationAddress;
  }

  get cardChargedAmount(): Money {
    return this.props.cardChargedAmount;
  }

  get paymentStatus(): PaymentStatus {
    return this.props.paymentStatus;
  }

  get isDeleted(): boolean {
    return this.props.isDeleted;
  }

  get cancellation(): CancellationRequest | null {
    return this.props.cancellation;
  }

  get createdAt(): Date {
    return new Date(this.props.createdAt.getTime());
  }

  get updatedAt(): Date {
    return new Date(this.props.updatedAt.getTime());
  }

  isPaid(): boolean {
    return this.props.paymentStatus === PaymentStatus.PAID;
  }

  isCancelled(): boolean {
    return this.props.status === OrderStatus.CANCELLED;
  }

  cancel(
    reason: string,
    requestedBy: string,
    cancellationId: string,
    at: Date,
  ): CancellationRequest | null {
    this.assertNotDeleted();

    if (this.props.status === OrderStatus.CANCELLED) {
      return null;
    }

    if (this.props.status === OrderStatus.IN_TRANSIT) {
      throw new InvalidOrderTransitionError(
        'No se puede cancelar un envío que ya está en tránsito (IN_TRANSIT).',
      );
    }

    if (!CANCELLABLE_STATUSES.includes(this.props.status)) {
      throw new InvalidOrderTransitionError(
        `No se puede cancelar un envío en estado ${this.props.status}.`,
      );
    }

    const cancellation = CancellationRequest.create({
      id: cancellationId,
      reason,
      requestedBy,
      requestedAt: at,
    });

    this.props.status = OrderStatus.CANCELLED;
    this.props.cancellation = cancellation;
    this.props.updatedAt = new Date(at.getTime());

    return cancellation;
  }

  changeDestination(newAddress: Address, at: Date): void {
    this.assertNotDeleted();

    if (this.props.status === OrderStatus.CANCELLED) {
      throw new InvalidOrderTransitionError(
        'No se puede modificar la dirección de un envío cancelado (CANCELLED).',
      );
    }

    if (this.props.status === OrderStatus.IN_TRANSIT) {
      throw new InvalidOrderTransitionError(
        'No se puede modificar la dirección de un envío que ya está en tránsito (IN_TRANSIT).',
      );
    }

    if (!ADDRESS_CHANGEABLE_STATUSES.includes(this.props.status)) {
      throw new InvalidOrderTransitionError(
        `No se puede modificar la dirección de un envío en estado ${this.props.status}.`,
      );
    }

    this.props.destinationAddress = newAddress;
    this.props.updatedAt = new Date(at.getTime());
  }

  markInWarehouse(at: Date): void {
    this.assertNotDeleted();

    if (this.props.status !== OrderStatus.PREPARING) {
      throw new InvalidOrderTransitionError(
        `Transición inválida: no se puede pasar de ${this.props.status} a ${OrderStatus.WAREHOUSE}.`,
      );
    }

    this.props.status = OrderStatus.WAREHOUSE;
    this.props.updatedAt = new Date(at.getTime());
  }

  markInTransit(at: Date): void {
    this.assertNotDeleted();

    if (this.props.status !== OrderStatus.WAREHOUSE) {
      throw new InvalidOrderTransitionError(
        `Transición inválida: no se puede pasar de ${this.props.status} a ${OrderStatus.IN_TRANSIT}.`,
      );
    }

    this.props.status = OrderStatus.IN_TRANSIT;
    this.props.updatedAt = new Date(at.getTime());
  }

  toPrimitives(): OrderPrimitives {
    return {
      id: this.props.id,
      tracking_number: this.props.trackingNumber.value,
      package_status: this.props.status,
      destination_address: this.props.destinationAddress.value,
      card_charged_amount: this.props.cardChargedAmount.toPrimitives(),
      payment_status: this.props.paymentStatus,
      is_deleted: this.props.isDeleted,
      cancellation: this.props.cancellation?.toPrimitives() ?? null,
      created_at: this.props.createdAt.toISOString(),
      updated_at: this.props.updatedAt.toISOString(),
    };
  }

  private assertNotDeleted(): void {
    if (this.props.isDeleted) {
      throw new InvalidOrderTransitionError(
        'No se puede operar sobre un envío eliminado.',
      );
    }
  }
}
