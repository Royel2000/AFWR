import express, { Express, Request, Response } from 'express';
import { buildContainer } from '../config/container';
import { OrderController } from './controllers/OrderController';
import { errorHandler } from './middleware/errorHandler';
import { createOrderRouter } from './routes/orderRoutes';

export async function createServer(): Promise<Express> {
  const container = await buildContainer();

  const controller = new OrderController(
    container.createOrderUseCase,
    container.getOrderUseCase,
    container.listOrdersUseCase,
    container.cancelOrderUseCase,
    container.updateDestinationAddressUseCase,
    container.advanceOrderStatusUseCase,
  );

  const app = express();

  app.disable('x-powered-by');
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', service: 'envio-facil-backend' });
  });

  const orderRouter = createOrderRouter(controller);

  app.use('/envios', orderRouter);
  app.use('/api/v1/envios', orderRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Ruta no encontrada.',
      },
    });
  });

  app.use(errorHandler);

  return app;
}
