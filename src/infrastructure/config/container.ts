import { CancelOrderUseCase } from '../../application/use-cases/CancelOrderUseCase';
import { CancelPaidOrderUseCase } from '../../application/use-cases/CancelPaidOrderUseCase';
import { CreateOrderUseCase } from '../../application/use-cases/CreateOrderUseCase';
import { GetOrderUseCase } from '../../application/use-cases/GetOrderUseCase';
import { ListOrdersUseCase } from '../../application/use-cases/ListOrdersUseCase';
import { UpdateDestinationAddressUseCase } from '../../application/use-cases/UpdateDestinationAddressUseCase';
import { AdvanceOrderStatusUseCase } from '../../application/use-cases/AdvanceOrderStatusUseCase';
import { CreditNoteRepository } from '../../domain/repositories/CreditNoteRepository';
import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { SystemClock } from '../clock/SystemClock';
import { UuidGenerator } from '../id/UuidGenerator';
import { ConsoleFinanceNotifier } from '../notifications/ConsoleFinanceNotifier';
import { InMemoryCreditNoteRepository } from '../persistence/in-memory/InMemoryCreditNoteRepository';
import { InMemoryOrderRepository } from '../persistence/in-memory/InMemoryOrderRepository';
import { seedOrders } from './seed';

export interface ApplicationContainer {
  orderRepository: OrderRepository;
  creditNoteRepository: CreditNoteRepository;
  createOrderUseCase: CreateOrderUseCase;
  getOrderUseCase: GetOrderUseCase;
  listOrdersUseCase: ListOrdersUseCase;
  cancelOrderUseCase: CancelOrderUseCase;
  cancelPaidOrderUseCase: CancelPaidOrderUseCase;
  updateDestinationAddressUseCase: UpdateDestinationAddressUseCase;
  advanceOrderStatusUseCase: AdvanceOrderStatusUseCase;
}

export async function buildContainer(): Promise<ApplicationContainer> {
  const orderRepository = new InMemoryOrderRepository();
  const creditNoteRepository = new InMemoryCreditNoteRepository();
  const clock = new SystemClock();
  const idGenerator = new UuidGenerator();
  const financeNotifier = new ConsoleFinanceNotifier();

  const cancelPaidOrderUseCase = new CancelPaidOrderUseCase(
    orderRepository,
    creditNoteRepository,
    financeNotifier,
    idGenerator,
    clock,
  );

  const cancelOrderUseCase = new CancelOrderUseCase(
    orderRepository,
    cancelPaidOrderUseCase,
    idGenerator,
    clock,
  );

  const createOrderUseCase = new CreateOrderUseCase(
    orderRepository,
    idGenerator,
    clock,
  );

  const getOrderUseCase = new GetOrderUseCase(orderRepository);
  const listOrdersUseCase = new ListOrdersUseCase(orderRepository);

  const updateDestinationAddressUseCase = new UpdateDestinationAddressUseCase(
    orderRepository,
    clock,
  );

  const advanceOrderStatusUseCase = new AdvanceOrderStatusUseCase(
    orderRepository,
    clock,
  );

  await seedOrders(orderRepository, clock);

  return {
    orderRepository,
    creditNoteRepository,
    createOrderUseCase,
    getOrderUseCase,
    listOrdersUseCase,
    cancelOrderUseCase,
    cancelPaidOrderUseCase,
    updateDestinationAddressUseCase,
    advanceOrderStatusUseCase,
  };
}
