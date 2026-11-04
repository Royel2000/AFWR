import {
  ApplicationError,
  CreditNoteAmountMismatchError,
  DuplicateTrackingNumberError,
  OrderNotFoundError,
  PaidOrderRequiredError,
} from '../../../application/errors/ApplicationError';
import {
  DomainError,
  InvalidOrderTransitionError,
  InvalidTrackingNumberError,
  ValidationError,
} from '../../../domain/errors/DomainError';

export interface HttpErrorResponse {
  status: number;
  body: {
    error: {
      code: string;
      message: string;
      details?: unknown;
    };
  };
}

function buildError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): HttpErrorResponse {
  return {
    status,
    body: {
      error: {
        code,
        message,
        ...(details === undefined ? {} : { details }),
      },
    },
  };
}

export function mapErrorToHttp(error: unknown): HttpErrorResponse {
  if (error instanceof InvalidTrackingNumberError) {
    return buildError(400, error.code, error.message);
  }

  if (error instanceof ValidationError) {
    return buildError(400, error.code, error.message);
  }

  if (error instanceof CreditNoteAmountMismatchError) {
    return buildError(400, error.code, error.message, {
      expected: error.expected,
      received: error.received,
    });
  }

  if (error instanceof PaidOrderRequiredError) {
    return buildError(400, error.code, error.message);
  }

  if (error instanceof InvalidOrderTransitionError) {
    return buildError(409, error.code, error.message);
  }

  if (error instanceof DuplicateTrackingNumberError) {
    return buildError(409, error.code, error.message);
  }

  if (error instanceof OrderNotFoundError) {
    return buildError(404, error.code, error.message);
  }

  if (error instanceof ApplicationError) {
    return buildError(400, error.code, error.message);
  }

  if (error instanceof DomainError) {
    return buildError(400, error.code, error.message);
  }

  if (error instanceof SyntaxError) {
    return buildError(400, 'INVALID_JSON', 'El cuerpo de la solicitud no es un JSON válido.');
  }

  console.error('[Error no controlado]', error);

  return buildError(
    500,
    'INTERNAL_SERVER_ERROR',
    'Ocurrió un error interno en el servidor.',
  );
}
