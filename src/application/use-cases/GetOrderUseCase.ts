import { Order } from '../../domain/entities/Order';
import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { OrderNotFoundError } from '../errors/ApplicationError';

export class GetOrderUseCase {
  constructor(private readonly orders: OrderRepository) {}

  async execute(idOrTrackingNumber: string): Promise<Order> {
    const order = await this.orders.findByIdOrTrackingNumber(idOrTrackingNumber);

    if (!order) {
      throw new OrderNotFoundError(idOrTrackingNumber);
    }

    return order;
  }
}
