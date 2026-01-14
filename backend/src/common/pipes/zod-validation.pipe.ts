import {
    PipeTransform,
    Injectable,
    ArgumentMetadata,
    BadRequestException,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
    constructor(private schema: ZodSchema) { }

    transform(value: unknown, metadata: ArgumentMetadata) {
        try {
            return this.schema.parse(value);
        } catch (error) {
            if (error instanceof ZodError) {
                throw new BadRequestException({
                    message: 'Validation failed',
                    errors: error.errors.map((e) => ({
                        path: e.path.join('.'),
                        message: e.message,
                    })),
                });
            }
            throw error;
        }
    }
}

/**
 * Factory function to create a Zod validation pipe
 */
export function zodValidationPipe(schema: ZodSchema): ZodValidationPipe {
    return new ZodValidationPipe(schema);
}
