import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AdvanceOrderStatusUseCase } from '../src/application/use-cases/AdvanceOrderStatusUseCase';
import { CancelOrderUseCase } from '../src/application/use-cases/CancelOrderUseCase';
import { CancelPaidOrderUseCase } from '../src/application/use-cases/CancelPaidOrderUseCase';
import { UpdateDestinationAddressUseCase } from '../src/application/use-cases/UpdateDestinationAddressUseCase';
import { CreditNote } from '../src/domain/entities/CreditNote';
import { Order } from '../src/domain/entities/Order';
import { OrderStatus } from '../src/domain/enums/OrderStatus';
import { PaymentStatus } from '../src/domain/enums/PaymentStatus';
import { InvalidOrderTransitionError } from '../src/domain/errors/DomainError';
import { OrderRepository } from '../src/domain/repositories/OrderRepository';
import { Address } from '../src/domain/value-objects/Address';
import { Money } from '../src/domain/value-objects/Money';
import { TrackingNumber } from '../src/domain/value-objects/TrackingNumber';
import { CreditNoteAmountMismatchError } from '../src/application/errors/ApplicationError';
import { ClockPort } from '../src/application/ports/ClockPort';
import { FinanceNotifierPort } from '../src/application/ports/FinanceNotifierPort';
import { IdGeneratorPort } from '../src/application/ports/IdGeneratorPort';
import { InMemoryCreditNoteRepository } from '../src/infrastructure/persistence/in-memory/InMemoryCreditNoteRepository';
import { InMemoryOrderRepository } from '../src/infrastructure/persistence/in-memory/InMemoryOrderRepository';

class FixedClock implements ClockPort {
  constructor(private readonly fixedDate: Date) {}

  now(): Date {
    return new Date(this.fixedDate.getTime());
  }
}

class SequentialIdGenerator implements IdGeneratorPort {
  private counter = 0;

  generate(): string {
    this.counter += 1;
    return `generated-${this.counter}`;
  }
}

class SpyFinanceNotifier implements FinanceNotifierPort {
  readonly notified: CreditNote[] = [];

  async notifyCreditNoteIssued(creditNote: CreditNote): Promise<void> {
    this.notified.push(creditNote);
  }
}

interface SeedOrderOptions {
  id?: string;
  trackingNumber?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  amount?: number;
  destinationAddress?: string;
}

async function seedOrder(
  repository: OrderRepository,
  options: SeedOrderOptions = {},
): Promise<Order> {
  const now = new Date('2026-01-01T00:00:00.000Z');

  const order = Order.create({
    id: options.id ?? 'order-1',
    trackingNumber: TrackingNumber.create(
      options.trackingNumber ?? 'EF-2026-000001',
    ),
    status: options.status ?? OrderStatus.PREPARING,
    destinationAddress: Address.create(
      options.destinationAddress ?? 'Av. Arequipa 1234, Lima',
    ),
    cardChargedAmount: Money.create(options.amount ?? 150.5, 'PEN'),
    paymentStatus: options.paymentStatus ?? PaymentStatus.PENDING,
    isDeleted: false,
    cancellation: null,
    createdAt: now,
    updatedAt: now,
  });

  await repository.save(order);

  return order;
}

function buildFixture() {
  const orders = new InMemoryOrderRepository();
  const creditNotes = new InMemoryCreditNoteRepository();
  const clock = new FixedClock(new Date('2026-01-15T10:30:00.000Z'));
  const idGenerator = new SequentialIdGenerator();
  const financeNotifier = new SpyFinanceNotifier();

  const cancelPaidOrder = new CancelPaidOrderUseCase(
    orders,
    creditNotes,
    financeNotifier,
    idGenerator,
    clock,
  );

  const cancelOrder = new CancelOrderUseCase(
    orders,
    cancelPaidOrder,
    idGenerator,
    clock,
  );

  const updateDestinationAddress = new UpdateDestinationAddressUseCase(
    orders,
    clock,
  );

  const advanceOrderStatus = new AdvanceOrderStatusUseCase(orders, clock);

  return {
    orders,
    creditNotes,
    financeNotifier,
    cancelOrder,
    cancelPaidOrder,
    updateDestinationAddress,
    advanceOrderStatus,
  };
}

describe('HU-01: cancelación antes del despacho', () => {
  it('cancela un envío en PREPARING y registra motivo, usuario y fecha', async () => {
    const fixture = buildFixture();
    await seedOrder(fixture.orders, { status: OrderStatus.PREPARING });

    const result = await fixture.cancelOrder.execute({
      orderId: 'order-1',
      reason: 'El cliente solicitó la cancelación',
      requestedBy: 'operador-01',
    });

    assert.equal(result.order.status, OrderStatus.CANCELLED);
    assert.equal(result.idempotent, false);
    assert.equal(result.cancellation?.reason, 'El cliente solicitó la cancelación');
    assert.equal(result.cancellation?.requestedBy, 'operador-01');
    assert.equal(
      result.cancellation?.requestedAt.toISOString(),
      '2026-01-15T10:30:00.000Z',
    );
  });

  it('es idempotente y no duplica la solicitud de cancelación', async () => {
    const fixture = buildFixture();
    await seedOrder(fixture.orders, { status: OrderStatus.WAREHOUSE });

    const first = await fixture.cancelOrder.execute({
      orderId: 'order-1',
      reason: 'Cancelación solicitada por el cliente',
      requestedBy: 'operador-01',
    });

    const second = await fixture.cancelOrder.execute({
      orderId: 'order-1',
      reason: 'Reintento de la misma cancelación',
      requestedBy: 'operador-02',
    });

    assert.equal(first.idempotent, false);
    assert.equal(second.idempotent, true);
    assert.equal(
      second.order.cancellation?.id,
      first.order.cancellation?.id,
    );
    assert.equal(
      second.order.cancellation?.requestedBy,
      'operador-01',
    );
  });

  it('rechaza la cancelación de un envío IN_TRANSIT con conflicto de estado', async () => {
    const fixture = buildFixture();
    await seedOrder(fixture.orders, { status: OrderStatus.IN_TRANSIT });

    await assert.rejects(
      fixture.cancelOrder.execute({
        orderId: 'order-1',
        reason: 'Intento de cancelación tardío',
        requestedBy: 'operador-01',
      }),
      InvalidOrderTransitionError,
    );
  });
});

describe('HU-02: modificación de dirección de destino', () => {
  it('permite modificar la dirección en WAREHOUSE', async () => {
    const fixture = buildFixture();
    await seedOrder(fixture.orders, { status: OrderStatus.WAREHOUSE });

    const order = await fixture.updateDestinationAddress.execute({
      orderId: 'order-1',
      destinationAddress: 'Av. Javier Prado 2020, Lima',
    });

    assert.equal(
      order.destinationAddress.value,
      'Av. Javier Prado 2020, Lima',
    );
  });

  it('rechaza modificar la dirección en IN_TRANSIT con conflicto de estado', async () => {
    const fixture = buildFixture();
    await seedOrder(fixture.orders, { status: OrderStatus.IN_TRANSIT });

    await assert.rejects(
      fixture.updateDestinationAddress.execute({
        orderId: 'order-1',
        destinationAddress: 'Av. Javier Prado 2020, Lima',
      }),
      InvalidOrderTransitionError,
    );
  });
});

describe('HU-03: cancelación con pago y nota de crédito', () => {
  it('genera una nota de crédito por el monto exacto y notifica a Finanzas', async () => {
    const fixture = buildFixture();
    await seedOrder(fixture.orders, {
      status: OrderStatus.WAREHOUSE,
      paymentStatus: PaymentStatus.PAID,
      amount: 150.5,
    });

    const result = await fixture.cancelOrder.execute({
      orderId: 'order-1',
      reason: 'Cancelación con reembolso solicitada',
      requestedBy: 'operador-01',
      creditNoteAmount: 150.5,
    });

    assert.equal(result.order.status, OrderStatus.CANCELLED);
    assert.ok(result.creditNote);
    assert.equal(result.creditNote?.amount.amount, 150.5);
    assert.equal(result.creditNote?.amount.currency, 'PEN');
    assert.equal(fixture.financeNotifier.notified.length, 1);
    assert.equal(
      fixture.financeNotifier.notified[0]?.id,
      result.creditNote?.id,
    );
  });

  it('no duplica la nota de crédito al reintentar la cancelación', async () => {
    const fixture = buildFixture();
    await seedOrder(fixture.orders, {
      status: OrderStatus.PREPARING,
      paymentStatus: PaymentStatus.PAID,
      amount: 99.99,
    });

    const first = await fixture.cancelOrder.execute({
      orderId: 'order-1',
      reason: 'Cancelación con reembolso solicitada',
      requestedBy: 'operador-01',
    });

    const second = await fixture.cancelOrder.execute({
      orderId: 'order-1',
      reason: 'Reintento de cancelación',
      requestedBy: 'operador-02',
    });

    assert.equal(second.idempotent, true);
    assert.equal(second.creditNote?.id, first.creditNote?.id);
    assert.equal(fixture.financeNotifier.notified.length, 1);
  });

  it('rechaza una nota de crédito con monto distinto al cobrado', async () => {
    const fixture = buildFixture();
    await seedOrder(fixture.orders, {
      status: OrderStatus.PREPARING,
      paymentStatus: PaymentStatus.PAID,
      amount: 150.5,
    });

    await assert.rejects(
      fixture.cancelOrder.execute({
        orderId: 'order-1',
        reason: 'Cancelación con reembolso solicitada',
        requestedBy: 'operador-01',
        creditNoteAmount: 100,
      }),
      CreditNoteAmountMismatchError,
    );

    const order = await fixture.orders.findById('order-1');
    assert.equal(order?.status, OrderStatus.PREPARING);
    assert.equal(fixture.financeNotifier.notified.length, 0);
  });
});

describe('Máquina de estados', () => {
  it('permite PREPARING -> WAREHOUSE -> IN_TRANSIT', async () => {
    const fixture = buildFixture();
    await seedOrder(fixture.orders, { status: OrderStatus.PREPARING });

    const inWarehouse = await fixture.advanceOrderStatus.execute({
      orderId: 'order-1',
      status: OrderStatus.WAREHOUSE,
    });

    assert.equal(inWarehouse.status, OrderStatus.WAREHOUSE);

    const inTransit = await fixture.advanceOrderStatus.execute({
      orderId: 'order-1',
      status: OrderStatus.IN_TRANSIT,
    });

    assert.equal(inTransit.status, OrderStatus.IN_TRANSIT);
  });

  it('rechaza PREPARING -> IN_TRANSIT', async () => {
    const fixture = buildFixture();
    await seedOrder(fixture.orders, { status: OrderStatus.PREPARING });

    await assert.rejects(
      fixture.advanceOrderStatus.execute({
        orderId: 'order-1',
        status: OrderStatus.IN_TRANSIT,
      }),
      InvalidOrderTransitionError,
    );
  });
});
