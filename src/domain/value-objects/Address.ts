import { ValidationError } from '../errors/DomainError';

export class Address {
  private constructor(public readonly value: string) {}

  static create(value: string): Address {
    if (typeof value !== 'string') {
      throw new ValidationError('La dirección de destino debe ser una cadena de texto.');
    }

    const normalized = value.trim().replace(/\s+/g, ' ');

    if (normalized.length < 5) {
      throw new ValidationError('La dirección de destino debe tener al menos 5 caracteres.');
    }

    if (normalized.length > 250) {
      throw new ValidationError('La dirección de destino no puede superar los 250 caracteres.');
    }

    return new Address(normalized);
  }

  equals(other: Address): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
