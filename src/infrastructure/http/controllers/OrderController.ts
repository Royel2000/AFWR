import { Request, Response } from 'express';
import { AdvanceOrderStatusUseCase } from '../../../application/use-cases/AdvanceOrderStatusUseCase';
import { CancelOrderUseCase } from '../../../application/use-cases/CancelOrderUseCase';
import { CreateOrderUseCase } from '../../../application/use-cases/CreateOrderUseCase';
import { GetOrderUseCase } from '../../../application/use-cases/GetOrderUseCase';
import { ListOrdersUseCase } from '../../../application/use-cases/ListOrdersUseCase';
import { UpdateDestinationAddressUseCase } from '../../../application/use-cases/UpdateDestinationAddressUseCase';
import { OrderStatus } from '../../../domain/enums/OrderStatus';
import { PaymentStatus } from '../../../domain/enums/PaymentStatus';
import { ValidationError } from '../../../domain/errors/DomainError';
import { TrackingNumber } from '../../../domain/value-objects/TrackingNumber';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  presentCancellationResult,
  presentOrder,
  presentOrderList,
} from '../presenters/OrderPresenter';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class OrderController {
  constructor(
    private readonly createOrder: CreateOrderUseCase,
    private readonly getOrder: GetOrderUseCase,
    private readonly listOrders: ListOrdersUseCase,
    private readonly cancelOrder: CancelOrderUseCase,
    private readonly updateDestinationAddress: UpdateDestinationAddressUseCase,
    private readonly advanceOrderStatus: AdvanceOrderStatusUseCase,
  ) {}

  create = asyncHandler(async (req: Request, res: Response) => {
    const body = this.getBody(req);
    const trackingNumber = body.tracking_number ?? body.trackingNumber;
    const destinationAddress =
      body.destination_address ?? body.destinationAddress;
    const cardChargedAmount =
      body.card_charged_amount ?? body.cardChargedAmount;

    if (typeof trackingNumber !== 'string' || !trackingNumber.trim()) {
      throw new ValidationError('El campo tracking_number es obligatorio.');
    }

    if (
      typeof destinationAddress !== 'string' ||
      !destinationAddress.trim()
    ) {
      throw new ValidationError('El campo destination_address es obligatorio.');
    }

    if (cardChargedAmount === undefined || cardChargedAmount === null) {
      throw new ValidationError(
        'El campo card_charged_amount es obligatorio.',
      );
    }

    if (
      typeof cardChargedAmount !== 'number' ||
      !Number.isFinite(cardChargedAmount)
    ) {
      throw new ValidationError(
        'El campo card_charged_amount debe ser un número válido.',
      );
    }

    const order = await this.createOrder.execute({
      trackingNumber,
      destinationAddress,
      cardChargedAmount,
      currency: typeof body.currency === 'string' ? body.currency : undefined,
      paymentStatus:
        body.payment_status === undefined
          ? undefined
          : (body.payment_status as PaymentStatus),
    });

    res.status(201).json(presentOrder(order));
  });

  get = asyncHandler(async (req: Request, res: Response) => {
    const id = this.getOrderIdentifier(req);

    const order = await this.getOrder.execute(id);

    res.status(200).json(presentOrder(order));
  });

  list = asyncHandler(async (_req: Request, res: Response) => {
    const orders = await this.listOrders.execute();

    res.status(200).json(presentOrderList(orders));
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const id = this.getOrderIdentifier(req);
    const body = this.getBody(req);
    const status = body.estado;

    if (typeof status !== 'string' || !status.trim()) {
      throw new ValidationError('El campo estado es obligatorio.');
    }

    if (status === OrderStatus.CANCELLED) {
      const reason = body.motivo_cancelacion ?? body.reason;
      const requestedBy =
        body.usuario_responsable ?? body.usuario ?? body.requested_by;

      if (typeof reason !== 'string' || !reason.trim()) {
        throw new ValidationError(
          'El campo motivo_cancelacion es obligatorio para cancelar un envío.',
        );
      }

      if (typeof requestedBy !== 'string' || !requestedBy.trim()) {
        throw new ValidationError(
          'El campo usuario_responsable es obligatorio para cancelar un envío.',
        );
      }

      const creditNoteAmount = body.monto_nota_credito;

      if (
        creditNoteAmount !== undefined &&
        (typeof creditNoteAmount !== 'number' ||
          !Number.isFinite(creditNoteAmount))
      ) {
        throw new ValidationError(
          'El campo monto_nota_credito debe ser un número válido.',
        );
      }

      const result = await this.cancelOrder.execute({
        orderId: id,
        reason,
        requestedBy,
        creditNoteAmount,
        currency:
          typeof body.moneda === 'string' ? body.moneda : undefined,
      });

      res.status(200).json(presentCancellationResult(result));
      return;
    }

    if (
      status !== OrderStatus.WAREHOUSE &&
      status !== OrderStatus.IN_TRANSIT
    ) {
      throw new ValidationError(
        `Estado no permitido: "${status}". Use WAREHOUSE, IN_TRANSIT o CANCELLED.`,
      );
    }

    const order = await this.advanceOrderStatus.execute({
      orderId: id,
      status,
    });

    res.status(200).json(presentOrder(order));
  });

  updateDestination = asyncHandler(async (req: Request, res: Response) => {
    const id = this.getOrderIdentifier(req);
    const body = this.getBody(req);
    const destinationAddress =
      body.direccion_destino ?? body.destination_address;

    if (
      typeof destinationAddress !== 'string' ||
      !destinationAddress.trim()
    ) {
      throw new ValidationError(
        'El campo direccion_destino es obligatorio.',
      );
    }

    const order = await this.updateDestinationAddress.execute({
      orderId: id,
      destinationAddress,
    });

    res.status(200).json(presentOrder(order));
  });

  private getBody(req: Request): Record<string, unknown> {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      throw new ValidationError('El cuerpo de la solicitud debe ser un objeto JSON.');
    }

    return req.body as Record<string, unknown>;
  }

  private getOrderIdentifier(req: Request): string {
    const id = req.params.id;

    if (typeof id !== 'string' || !id.trim()) {
      throw new ValidationError('El identificador del envío es obligatorio.');
    }

    if (!UUID_PATTERN.test(id) && !TrackingNumber.isValid(id)) {
      throw new ValidationError(
        `Formato de identificador/guía inválido: "${id}". Use un UUID o una guía con formato EF-AAAA-NNNNNN.`,
      );
    }

    return id;
  }
}
