import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { registerDecorator, ValidationOptions } from 'class-validator';

export const PG_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates standard PostgreSQL 8-4-4-4-12 UUID strings (including deterministic seed UUIDs).
 */
@Injectable()
export class ParsePgUuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !PG_UUID_REGEX.test(value)) {
      throw new BadRequestException('Validation failed (UUID expected)');
    }
    return value;
  }
}

export function IsPgUuid(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPgUuid',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a valid UUID`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && PG_UUID_REGEX.test(value);
        },
      },
    });
  };
}
