import { CreditNotePrimitives } from '../../../domain/entities/CreditNote';
import { Order, OrderPrimitives } from '../../../domain/entities/Order';
import { CancelOrderOutput } from '../../../application/dtos/OrderDtos';

export interface OrderResponse {
  data: OrderPrimitives;
}

export interface OrderListResponse {
  data: OrderPrimitives[];
}

export interface CancellationResponse {
  data: OrderPrimitives & {
    credit_note: CreditNotePrimitives | null;
    idempotent: boolean;
  };
}

export function presentOrder(order: Order): OrderResponse {
  return { data: order.toPrimitives() };
}

export function presentOrderList(orders: Order[]): OrderListResponse {
  return { data: orders.map((order) => order.toPrimitives()) };
}

export function presentCancellationResult(
  result: CancelOrderOutput,
): CancellationResponse {
  return {
    data: {
      ...result.order.toPrimitives(),
      credit_note: result.creditNote?.toPrimitives() ?? null,
      idempotent: result.idempotent,
    },
  };
}
