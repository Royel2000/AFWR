import { Order } from '../entities/Order';

export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  findByTrackingNumber(trackingNumber: string): Promise<Order | null>;
  findByIdOrTrackingNumber(idOrTrackingNumber: string): Promise<Order | null>;
  findAll(): Promise<Order[]>;
  save(order: Order): Promise<void>;
}
