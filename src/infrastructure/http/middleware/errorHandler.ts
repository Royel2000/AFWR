import { NextFunction, Request, Response } from 'express';
import { mapErrorToHttp } from '../errors/HttpErrorMapper';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const { status, body } = mapErrorToHttp(error);
  res.status(status).json(body);
}
