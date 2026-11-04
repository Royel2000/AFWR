export abstract class DomainError extends Error {
  protected constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super('VALIDATION_ERROR', message);
  }
}

export class InvalidTrackingNumberError extends DomainError {
  constructor(value: string) {
    super(
      'INVALID_TRACKING_NUMBER',
      `Formato de guía inválido: "${value}". El formato esperado es EF-AAAA-NNNNNN.`,
    );
  }
}

export class InvalidOrderTransitionError extends DomainError {
  constructor(message: string) {
    super('INVALID_ORDER_TRANSITION', message);
  }
}
