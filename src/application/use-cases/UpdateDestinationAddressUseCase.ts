import { Order } from '../../domain/entities/Order';
import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { Address } from '../../domain/value-objects/Address';
import { UpdateDestinationAddressInput } from '../dtos/OrderDtos';
import { OrderNotFoundError } from '../errors/ApplicationError';
import { ClockPort } from '../ports/ClockPort';

export class UpdateDestinationAddressUseCase {
  constructor(
    private readonly orders: OrderRepository,
    private readonly clock: ClockPort,
  ) {}

  async execute(input: UpdateDestinationAddressInput): Promise<Order> {
    const order = await this.orders.findByIdOrTrackingNumber(input.orderId);

    if (!order) {
      throw new OrderNotFoundError(input.orderId);
    }

    const newAddress = Address.create(input.destinationAddress);

    order.changeDestination(newAddress, this.clock.now());

    await this.orders.save(order);

    return order;
  }
}
