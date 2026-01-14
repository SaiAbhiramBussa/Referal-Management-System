import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    constructor() {
        super({
            log:
                process.env.NODE_ENV === 'development'
                    ? ['query', 'info', 'warn', 'error']
                    : ['error'],
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    /**
     * Clean database for testing purposes.
     * Only available in test environment.
     */
    async cleanDatabase() {
        if (process.env.NODE_ENV !== 'test') {
            throw new Error('cleanDatabase is only available in test environment');
        }

        const tables = ['ledger_entries', 'rewards', 'idempotency_keys', 'rules', 'users'];

        for (const table of tables) {
            await this.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
        }
    }
}
