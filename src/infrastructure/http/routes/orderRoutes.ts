import { Router } from 'express';
import { OrderController } from '../controllers/OrderController';

export function createOrderRouter(controller: OrderController): Router {
  const router = Router();

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.get);
  router.patch('/:id/estado', controller.updateStatus);
  router.patch('/:id/direccion', controller.updateDestination);

  return router;
}
