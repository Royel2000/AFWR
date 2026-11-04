import { Order } from '../../domain/entities/Order';
import { OrderRepository } from '../../domain/repositories/OrderRepository';

export class ListOrdersUseCase {
  constructor(private readonly orders: OrderRepository) {}

  async execute(): Promise<Order[]> {
    return this.orders.findAll();
  }
}
