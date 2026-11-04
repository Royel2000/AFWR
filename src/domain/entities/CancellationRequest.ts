import { ValidationError } from '../errors/DomainError';

export interface CancellationRequestProps {
  id: string;
  reason: string;
  requestedBy: string;
  requestedAt: Date;
}

export interface CancellationRequestPrimitives {
  id: string;
  reason: string;
  requested_by: string;
  requested_at: string;
}

export class CancellationRequest {
  private constructor(private readonly props: CancellationRequestProps) {}

  static create(props: CancellationRequestProps): CancellationRequest {
    const reason = typeof props.reason === 'string' ? props.reason.trim() : '';
    const requestedBy =
      typeof props.requestedBy === 'string' ? props.requestedBy.trim() : '';

    if (!reason) {
      throw new ValidationError('El motivo de cancelación es obligatorio.');
    }

    if (reason.length < 5) {
      throw new ValidationError(
        'El motivo de cancelación debe tener al menos 5 caracteres.',
      );
    }

    if (reason.length > 500) {
      throw new ValidationError(
        'El motivo de cancelación no puede superar los 500 caracteres.',
      );
    }

    if (!requestedBy) {
      throw new ValidationError('El usuario responsable es obligatorio.');
    }

    if (!props.id || !props.id.trim()) {
      throw new ValidationError('El identificador de la solicitud de cancelación es obligatorio.');
    }

    if (!(props.requestedAt instanceof Date) || Number.isNaN(props.requestedAt.getTime())) {
      throw new ValidationError('La fecha de la solicitud de cancelación no es válida.');
    }

    return new CancellationRequest({
      id: props.id,
      reason,
      requestedBy,
      requestedAt: new Date(props.requestedAt.getTime()),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get reason(): string {
    return this.props.reason;
  }

  get requestedBy(): string {
    return this.props.requestedBy;
  }

  get requestedAt(): Date {
    return new Date(this.props.requestedAt.getTime());
  }

  toPrimitives(): CancellationRequestPrimitives {
    return {
      id: this.props.id,
      reason: this.props.reason,
      requested_by: this.props.requestedBy,
      requested_at: this.props.requestedAt.toISOString(),
    };
  }
}
