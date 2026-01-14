import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeEach(async () => {
    // Clean database before each test
    if (process.env.NODE_ENV === 'test') {
        const tables = ['ledger_entries', 'rewards', 'idempotency_keys', 'rules', 'users'];

        for (const table of tables) {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
        }
    }
});

afterAll(async () => {
    await prisma.$disconnect();
});
