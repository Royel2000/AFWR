import { Order } from '../../domain/entities/Order';
import { OrderStatus } from '../../domain/enums/OrderStatus';
import { ValidationError } from '../../domain/errors/DomainError';
import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { AdvanceOrderStatusInput } from '../dtos/OrderDtos';
import { OrderNotFoundError } from '../errors/ApplicationError';
import { ClockPort } from '../ports/ClockPort';

export class AdvanceOrderStatusUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: AdvanceOrderStatusInput): Promise<Order> {
    const order = await this.orders.findByIdOrTrackingNumber(input.orderId);

    if (!order) {
      throw new OrderNotFoundError(input.orderId);
    }

    const now = this.clock.now();

    switch (input.status) {
      case OrderStatus.WAREHOUSE:
        order.markWarehouse(now);
        break;
      case OrderStatus.IN_TRANSIT:
        order.markInTransit(now);
        break;
      default:
        throw new ValidationError(
          `Transición de estado no soportada: "${input.status}". Use WAREHOUSE o IN_TRANSIT, o el endpoint de cancelación.`,
        );
    }

    await this.orders.save(order);

    return order;
  }
}
