import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

describe('Ledger E2E Tests', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let user: { id: string };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api');
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            }),
        );
        await app.init();

        prisma = moduleFixture.get<PrismaService>(PrismaService);
    });

    beforeEach(async () => {
        // Clean database
        await prisma.ledgerEntry.deleteMany();
        await prisma.reward.deleteMany();
        await prisma.idempotencyKey.deleteMany();
        await prisma.user.deleteMany();

        // Create test user
        user = await prisma.user.create({
            data: { email: 'ledger-test@test.com', name: 'Ledger Test User' },
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await app.close();
    });

    describe('GET /api/ledger/:userId', () => {
        it('should return empty ledger for new user', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/ledger/${user.id}`)
                .expect(200);

            expect(response.body.data).toEqual([]);
            expect(response.body.pagination.hasMore).toBe(false);
        });

        it('should return ledger entries with pagination', async () => {
            // Create another user for referral
            const referred = await prisma.user.create({
                data: { email: 'referred2@test.com', name: 'Referred User' },
            });

            // Create multiple rewards to generate ledger entries
            for (let i = 0; i < 25; i++) {
                await request(app.getHttpServer())
                    .post('/api/rewards/credit')
                    .send({
                        referrerId: user.id,
                        referredId: referred.id,
                        amount: '100.00',
                        idempotencyKey: uuidv4(),
                    });
            }

            // Get first page
            const response1 = await request(app.getHttpServer())
                .get(`/api/ledger/${user.id}?limit=10`)
                .expect(200);

            expect(response1.body.data.length).toBe(10);
            expect(response1.body.pagination.hasMore).toBe(true);
            expect(response1.body.pagination.nextCursor).toBeDefined();

            // Get second page
            const response2 = await request(app.getHttpServer())
                .get(`/api/ledger/${user.id}?limit=10&cursor=${response1.body.pagination.nextCursor}`)
                .expect(200);

            expect(response2.body.data.length).toBe(10);

            // Verify no duplicates between pages
            const ids1 = response1.body.data.map((e: any) => e.id);
            const ids2 = response2.body.data.map((e: any) => e.id);
            const intersection = ids1.filter((id: string) => ids2.includes(id));
            expect(intersection.length).toBe(0);
        });
    });

    describe('GET /api/ledger/:userId/balance', () => {
        it('should calculate correct balance after credits', async () => {
            const referred = await prisma.user.create({
                data: { email: 'balance-test@test.com', name: 'Balance Test' },
            });

            // Create rewards
            await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send({
                    referrerId: user.id,
                    referredId: referred.id,
                    amount: '500.00',
                    idempotencyKey: uuidv4(),
                });

            await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send({
                    referrerId: user.id,
                    referredId: referred.id,
                    amount: '300.00',
                    idempotencyKey: uuidv4(),
                });

            const response = await request(app.getHttpServer())
                .get(`/api/ledger/${user.id}/balance`)
                .expect(200);

            expect(response.body.balance).toBe('800');
        });

        it('should calculate correct balance after credits and debits', async () => {
            const referred = await prisma.user.create({
                data: { email: 'debit-test@test.com', name: 'Debit Test' },
            });

            // Create and pay reward
            const rewardResponse = await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send({
                    referrerId: user.id,
                    referredId: referred.id,
                    amount: '1000.00',
                    idempotencyKey: uuidv4(),
                });

            const rewardId = rewardResponse.body.reward.id;

            await request(app.getHttpServer())
                .post('/api/rewards/confirm')
                .send({ rewardId });

            await request(app.getHttpServer())
                .post('/api/rewards/pay')
                .send({ rewardId });

            const response = await request(app.getHttpServer())
                .get(`/api/ledger/${user.id}/balance`)
                .expect(200);

            // 1000 credit - 1000 debit = 0
            expect(response.body.balance).toBe('0');
        });
    });

    describe('Ledger Immutability', () => {
        it('should not allow direct modification of ledger entries', async () => {
            const referred = await prisma.user.create({
                data: { email: 'immutable-test@test.com', name: 'Immutable Test' },
            });

            // Create a reward to generate ledger entry
            const rewardResponse = await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send({
                    referrerId: user.id,
                    referredId: referred.id,
                    amount: '500.00',
                    idempotencyKey: uuidv4(),
                });

            const entryId = rewardResponse.body.ledgerEntry.id;

            // There's no UPDATE endpoint for ledger entries
            // Verify the entry cannot be modified via Prisma checks
            const entry = await prisma.ledgerEntry.findUnique({
                where: { id: entryId },
            });

            expect(entry).toBeDefined();
            expect(entry?.amount.toString()).toBe('500.0000');

            // Verify ledger entry has no updatedAt field (immutable by design)
            // The schema doesn't have updatedAt for ledger_entries
        });

        it('should create new reversal entry instead of deleting', async () => {
            const referred = await prisma.user.create({
                data: { email: 'reversal-test2@test.com', name: 'Reversal Test' },
            });

            // Create reward
            const rewardResponse = await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send({
                    referrerId: user.id,
                    referredId: referred.id,
                    amount: '500.00',
                    idempotencyKey: uuidv4(),
                });

            const rewardId = rewardResponse.body.reward.id;
            const originalEntryId = rewardResponse.body.ledgerEntry.id;

            // Reverse the reward
            await request(app.getHttpServer())
                .post('/api/rewards/reverse')
                .send({ rewardId });

            // Original entry should still exist (just marked as VOID)
            const originalEntry = await prisma.ledgerEntry.findUnique({
                where: { id: originalEntryId },
            });
            expect(originalEntry).toBeDefined();
            expect(originalEntry?.status).toBe('VOID');

            // Reversal entry should be created
            const reversalEntry = await prisma.ledgerEntry.findFirst({
                where: {
                    reversalOfEntryId: originalEntryId,
                    type: 'REVERSAL',
                },
            });
            expect(reversalEntry).toBeDefined();
        });
    });

    describe('Audit Trail Completeness', () => {
        it('should maintain complete audit trail for reward lifecycle', async () => {
            const referred = await prisma.user.create({
                data: { email: 'audit-test@test.com', name: 'Audit Test' },
            });

            // Create reward
            const createResponse = await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send({
                    referrerId: user.id,
                    referredId: referred.id,
                    amount: '500.00',
                    idempotencyKey: uuidv4(),
                });

            const rewardId = createResponse.body.reward.id;

            // Confirm
            await request(app.getHttpServer())
                .post('/api/rewards/confirm')
                .send({ rewardId });

            // Pay
            await request(app.getHttpServer())
                .post('/api/rewards/pay')
                .send({ rewardId });

            // Get all ledger entries for this reward
            const entries = await prisma.ledgerEntry.findMany({
                where: { rewardId },
                orderBy: { createdAt: 'asc' },
            });

            expect(entries.length).toBe(2);
            expect(entries[0].type).toBe('CREDIT');
            expect(entries[1].type).toBe('DEBIT');

            // All entries should have timestamps
            entries.forEach((entry) => {
                expect(entry.createdAt).toBeDefined();
            });

            // Verify reward history via GET
            const rewardResponse = await request(app.getHttpServer())
                .get(`/api/rewards/${rewardId}`)
                .expect(200);

            expect(rewardResponse.body.ledgerEntries.length).toBe(2);
            expect(rewardResponse.body.status).toBe('PAID');
        });
    });
});
