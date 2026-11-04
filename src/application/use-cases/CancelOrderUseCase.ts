import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { CancelOrderInput, CancelOrderOutput } from '../dtos/OrderDtos';
import { OrderNotFoundError } from '../errors/ApplicationError';
import { ClockPort } from '../ports/ClockPort';
import { IdGeneratorPort } from '../ports/IdGeneratorPort';
import { CancelPaidOrderUseCase } from './CancelPaidOrderUseCase';

export class CancelOrderUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly cancelPaidOrder: CancelPaidOrderUseCase,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: CancelOrderInput): Promise<CancelOrderOutput> {
    const order = await this.orders.findByIdOrTrackingNumber(input.orderId);

    if (!order) {
      throw new OrderNotFoundError(input.orderId);
    }

    if (order.isPaid()) {
      return this.cancelPaidOrder.execute(input);
    }

    const now = this.clock.now();
    const cancellation = order.cancel(
      input.reason,
      input.requestedBy,
      this.idGenerator.generate(),
      now,
    );

    await this.orders.save(order);

    return {
      order,
      cancellation,
      creditNote: null,
      idempotent: cancellation === null,
    };
  }
}
