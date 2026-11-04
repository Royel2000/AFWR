import { Order } from '../../../domain/entities/Order';
import { OrderRepository } from '../../../domain/repositories/OrderRepository';

export class InMemoryOrderRepository implements OrderRepository {
  private readonly orders = new Map<string, Order>();

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  async findByTrackingNumber(trackingNumber: string): Promise<Order | null> {
    const normalized = trackingNumber.trim().toUpperCase();

    for (const order of this.orders.values()) {
      if (order.trackingNumber.value === normalized) {
        return order;
      }
    }

    return null;
  }

  async findByIdOrTrackingNumber(idOrTrackingNumber: string): Promise<Order | null> {
    const byId = await this.findById(idOrTrackingNumber);

    if (byId) {
      return byId;
    }

    return this.findByTrackingNumber(idOrTrackingNumber);
  }

  async findAll(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async save(order: Order): Promise<void> {
    this.orders.set(order.id, order);
  }

  clear(): void {
    this.orders.clear();
  }
}
