import { ValidationError } from '../errors/DomainError';

export type Currency = 'PEN' | 'USD';

const SUPPORTED_CURRENCIES: readonly Currency[] = ['PEN', 'USD'];

export interface MoneyPrimitives {
  amount: number;
  currency: Currency;
}

export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: Currency,
  ) {}

  static create(amount: number, currency: string = 'PEN'): Money {
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      throw new ValidationError('El monto debe ser un número válido.');
    }

    if (amount < 0) {
      throw new ValidationError('El monto no puede ser negativo.');
    }

    const normalizedCurrency = String(currency).trim().toUpperCase() as Currency;

    if (!SUPPORTED_CURRENCIES.includes(normalizedCurrency)) {
      throw new ValidationError(
        `Moneda no soportada: "${currency}". Las monedas permitidas son PEN y USD.`,
      );
    }

    const rounded = Math.round((amount + Number.EPSILON) * 100) / 100;

    return new Money(rounded, normalizedCurrency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toPrimitives(): MoneyPrimitives {
    return {
      amount: this.amount,
      currency: this.currency,
    };
  }
}
