import { randomUUID } from 'node:crypto';
import { IdGeneratorPort } from '../../application/ports/IdGeneratorPort';

export class UuidGenerator implements IdGeneratorPort {
  generate(): string {
    return randomUUID();
  }
}
