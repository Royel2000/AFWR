import { Order } from '../../domain/entities/Order';
import { OrderStatus } from '../../domain/enums/OrderStatus';
import { PaymentStatus } from '../../domain/enums/PaymentStatus';
import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { Address } from '../../domain/value-objects/Address';
import { Money } from '../../domain/value-objects/Money';
import { TrackingNumber } from '../../domain/value-objects/TrackingNumber';
import { ClockPort } from '../../application/ports/ClockPort';

interface SeedOrder {
  id: string;
  trackingNumber: string;
  status: OrderStatus;
  destinationAddress: string;
  amount: number;
  paymentStatus: PaymentStatus;
}

const SEED_ORDERS: readonly SeedOrder[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    trackingNumber: 'EF-2026-000001',
    status: OrderStatus.PREPARING,
    destinationAddress: 'Av. Arequipa 1234, Lima',
    amount: 120,
    paymentStatus: PaymentStatus.PENDING,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    trackingNumber: 'EF-2026-000002',
    status: OrderStatus.IN_WAREHOUSE,
    destinationAddress: 'Jr. Puno 456, Cusco',
    amount: 85.5,
    paymentStatus: PaymentStatus.PENDING,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    trackingNumber: 'EF-2026-000003',
    status: OrderStatus.IN_TRANSIT,
    destinationAddress: 'Calle Los Olivos 789, Trujillo',
    amount: 200,
    paymentStatus: PaymentStatus.PENDING,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    trackingNumber: 'EF-2026-000004',
    status: OrderStatus.PREPARING,
    destinationAddress: 'Av. Brasil 1500, Lima',
    amount: 150.5,
    paymentStatus: PaymentStatus.PAID,
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    trackingNumber: 'EF-2026-000005',
    status: OrderStatus.IN_WAREHOUSE,
    destinationAddress: 'Calle San Martín 250, Arequipa',
    amount: 99.99,
    paymentStatus: PaymentStatus.PAID,
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    trackingNumber: 'EF-2026-000006',
    status: OrderStatus.IN_TRANSIT,
    destinationAddress: 'Av. La Marina 300, Piura',
    amount: 300,
    paymentStatus: PaymentStatus.PAID,
  },
];

export async function seedOrders(
  orders: OrderRepository,
  clock: ClockPort,
): Promise<void> {
  const now = clock.now();

  for (const seed of SEED_ORDERS) {
    const order = Order.create({
      id: seed.id,
      trackingNumber: TrackingNumber.create(seed.trackingNumber),
      status: seed.status,
      destinationAddress: Address.create(seed.destinationAddress),
      cardChargedAmount: Money.create(seed.amount, 'PEN'),
      paymentStatus: seed.paymentStatus,
      isDeleted: false,
      cancellation: null,
      createdAt: now,
      updatedAt: now,
    });

    await orders.save(order);
  }
}
