import { Order } from '../../domain/entities/Order';
import { OrderStatus } from '../../domain/enums/OrderStatus';
import { PaymentStatus } from '../../domain/enums/PaymentStatus';
import { ValidationError } from '../../domain/errors/DomainError';
import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { Address } from '../../domain/value-objects/Address';
import { Money } from '../../domain/value-objects/Money';
import { TrackingNumber } from '../../domain/value-objects/TrackingNumber';
import { CreateOrderInput } from '../dtos/OrderDtos';
import { DuplicateTrackingNumberError } from '../errors/ApplicationError';
import { ClockPort } from '../ports/ClockPort';
import { IdGeneratorPort } from '../ports/IdGeneratorPort';

export class CreateOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CreateOrderInput): Promise<Order> {
    const trackingNumber = TrackingNumber.create(input.trackingNumber);
    const existing = await this.orders.findByTrackingNumber(trackingNumber.value);

    if (existing) {
      throw new DuplicateTrackingNumberError(trackingNumber.value);
    }

    const destinationAddress = Address.create(input.destinationAddress);
    const cardChargedAmount = Money.create(
      input.cardChargedAmount,
      input.currency,
    );

    if (cardChargedAmount.amount <= 0) {
      throw new ValidationError('El monto cargado debe ser mayor a cero.');
    }

    const paymentStatus = input.paymentStatus ?? PaymentStatus.PENDING;

    if (
      paymentStatus !== PaymentStatus.PENDING &&
      paymentStatus !== PaymentStatus.PAID
    ) {
      throw new ValidationError(
        'El estado de pago inicial debe ser PENDING o PAID.',
      );
    }

    const now = this.clock.now();
    const order = Order.create({
      id: this.idGenerator.generate(),
      trackingNumber,
      status: OrderStatus.PREPARING,
      destinationAddress,
      cardChargedAmount,
      paymentStatus,
      isDeleted: false,
      cancellation: null,
      createdAt: now,
      updatedAt: now,
    });

    await this.orders.save(order);

    return order;
  }
}
