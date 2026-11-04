import { InvalidTrackingNumberError } from '../errors/DomainError';

const TRACKING_NUMBER_PATTERN = /^EF-\d{4}-\d{6}$/;

export class TrackingNumber {
  private constructor(public readonly value: string) {}

  static create(value: string): TrackingNumber {
    if (typeof value !== 'string') {
      throw new InvalidTrackingNumberError(String(value));
    }

    const normalized = value.trim().toUpperCase();

    if (!TRACKING_NUMBER_PATTERN.test(normalized)) {
      throw new InvalidTrackingNumberError(value);
    }

    return new TrackingNumber(normalized);
  }

  static isValid(value: string): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    return TRACKING_NUMBER_PATTERN.test(value.trim().toUpperCase());
  }

  equals(other: TrackingNumber): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
