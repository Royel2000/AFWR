import { CancellationRequest } from '../../domain/entities/CancellationRequest';
import { CreditNote } from '../../domain/entities/CreditNote';
import { Order } from '../../domain/entities/Order';
import { OrderStatus } from '../../domain/enums/OrderStatus';
import { PaymentStatus } from '../../domain/enums/PaymentStatus';

export interface CreateOrderInput {
  trackingNumber: string;
  destinationAddress: string;
  cardChargedAmount: number;
  currency?: string;
  paymentStatus?: PaymentStatus;
}

export interface CancelOrderInput {
  orderId: string;
  reason: string;
  requestedBy: string;
  creditNoteAmount?: number;
  currency?: string;
}

export interface UpdateDestinationAddressInput {
  orderId: string;
  destinationAddress: string;
}

export interface AdvanceOrderStatusInput {
  orderId: string;
  status: OrderStatus;
}

export interface CancelOrderOutput {
  order: Order;
  cancellation: CancellationRequest | null;
  creditNote: CreditNote | null;
  idempotent: boolean;
}
