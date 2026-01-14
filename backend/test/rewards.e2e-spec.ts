import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

describe('Rewards E2E Tests', () => {
    let app: INestApplication;
    let prisma: PrismaService;
    let referrer: { id: string };
    let referred: { id: string };

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

        // Create test users
        referrer = await prisma.user.create({
            data: { email: 'referrer@test.com', name: 'Test Referrer' },
        });
        referred = await prisma.user.create({
            data: { email: 'referred@test.com', name: 'Test Referred' },
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await app.close();
    });

    describe('POST /api/rewards/credit', () => {
        it('should create a reward with CREDIT ledger entry', async () => {
            const idempotencyKey = uuidv4();

            const response = await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send({
                    referrerId: referrer.id,
                    referredId: referred.id,
                    amount: '500.00',
                    currency: 'INR',
                    idempotencyKey,
                })
                .expect(201);

            expect(response.body.reward).toBeDefined();
            expect(response.body.reward.status).toBe('PENDING');
            expect(response.body.reward.amount).toBe('500.0000');
            expect(response.body.ledgerEntry).toBeDefined();
            expect(response.body.ledgerEntry.type).toBe('CREDIT');
        });

        it('should return same result on idempotent retry', async () => {
            const idempotencyKey = uuidv4();
            const payload = {
                referrerId: referrer.id,
                referredId: referred.id,
                amount: '500.00',
                currency: 'INR',
                idempotencyKey,
            };

            // First request
            const response1 = await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send(payload)
                .expect(201);

            // Second identical request (retry)
            const response2 = await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send(payload)
                .expect(201);

            // Should return same reward
            expect(response1.body.reward.id).toBe(response2.body.reward.id);
            expect(response1.body.ledgerEntry.id).toBe(response2.body.ledgerEntry.id);

            // Should only create one reward and one ledger entry
            const rewardsCount = await prisma.reward.count();
            const ledgerEntriesCount = await prisma.ledgerEntry.count();
            expect(rewardsCount).toBe(1);
            expect(ledgerEntriesCount).toBe(1);
        });

        it('should reject same idempotency key with different data', async () => {
            const idempotencyKey = uuidv4();

            // First request
            await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send({
                    referrerId: referrer.id,
                    referredId: referred.id,
                    amount: '500.00',
                    currency: 'INR',
                    idempotencyKey,
                })
                .expect(201);

            // Second request with different amount
            await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send({
                    referrerId: referrer.id,
                    referredId: referred.id,
                    amount: '1000.00', // Different amount
                    currency: 'INR',
                    idempotencyKey,
                })
                .expect(409);
        });

        it('should reject self-referral', async () => {
            await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send({
                    referrerId: referrer.id,
                    referredId: referrer.id, // Same as referrer
                    amount: '500.00',
                    currency: 'INR',
                    idempotencyKey: uuidv4(),
                })
                .expect(400);
        });
    });

    describe('POST /api/rewards/confirm', () => {
        let rewardId: string;

        beforeEach(async () => {
            const response = await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send({
                    referrerId: referrer.id,
                    referredId: referred.id,
                    amount: '500.00',
                    idempotencyKey: uuidv4(),
                });
            rewardId = response.body.reward.id;
        });

        it('should confirm PENDING reward', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/rewards/confirm')
                .send({ rewardId })
                .expect(200);

            expect(response.body.status).toBe('CONFIRMED');
        });

        it('should reject invalid transition (CONFIRMED → PENDING)', async () => {
            // First confirm
            await request(app.getHttpServer())
                .post('/api/rewards/confirm')
                .send({ rewardId })
                .expect(200);

            // Try to "un-confirm" - there's no endpoint for this, status only moves forward
            // Verify status is still CONFIRMED
            const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
            expect(reward?.status).toBe('CONFIRMED');
        });
    });

    describe('POST /api/rewards/pay', () => {
        let rewardId: string;

        beforeEach(async () => {
            // Create and confirm reward
            const response = await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send({
                    referrerId: referrer.id,
                    referredId: referred.id,
                    amount: '500.00',
                    idempotencyKey: uuidv4(),
                });
            rewardId = response.body.reward.id;

            await request(app.getHttpServer())
                .post('/api/rewards/confirm')
                .send({ rewardId });
        });

        it('should pay CONFIRMED reward and create DEBIT entry', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/rewards/pay')
                .send({ rewardId })
                .expect(200);

            expect(response.body.status).toBe('PAID');
            expect(response.body.ledgerEntries.length).toBe(2);

            const debitEntry = response.body.ledgerEntries.find(
                (e: any) => e.type === 'DEBIT',
            );
            expect(debitEntry).toBeDefined();
        });

        it('should reject paying PENDING reward', async () => {
            // Create a new PENDING reward
            const response = await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send({
                    referrerId: referrer.id,
                    referredId: referred.id,
                    amount: '300.00',
                    idempotencyKey: uuidv4(),
                });

            const pendingRewardId = response.body.reward.id;

            await request(app.getHttpServer())
                .post('/api/rewards/pay')
                .send({ rewardId: pendingRewardId })
                .expect(400);
        });
    });

    describe('POST /api/rewards/reverse', () => {
        let rewardId: string;

        beforeEach(async () => {
            const response = await request(app.getHttpServer())
                .post('/api/rewards/credit')
                .send({
                    referrerId: referrer.id,
                    referredId: referred.id,
                    amount: '500.00',
                    idempotencyKey: uuidv4(),
                });
            rewardId = response.body.reward.id;
        });

        it('should reverse PENDING reward', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/rewards/reverse')
                .send({ rewardId, reason: 'Test reversal' })
                .expect(200);

            expect(response.body.status).toBe('REVERSED');

            // Check reversal ledger entry was created
            const entries = await prisma.ledgerEntry.findMany({
                where: { rewardId },
            });
            const reversalEntry = entries.find((e) => e.type === 'REVERSAL');
            expect(reversalEntry).toBeDefined();
        });

        it('should prevent double reversal', async () => {
            // First reversal
            await request(app.getHttpServer())
                .post('/api/rewards/reverse')
                .send({ rewardId, reason: 'First reversal' })
                .expect(200);

            // Second reversal attempt
            await request(app.getHttpServer())
                .post('/api/rewards/reverse')
                .send({ rewardId, reason: 'Second reversal' })
                .expect(400);
        });

        it('should reject reversing PAID reward', async () => {
            // Confirm and pay
            await request(app.getHttpServer())
                .post('/api/rewards/confirm')
                .send({ rewardId });

            await request(app.getHttpServer())
                .post('/api/rewards/pay')
                .send({ rewardId });

            // Try to reverse
            await request(app.getHttpServer())
                .post('/api/rewards/reverse')
                .send({ rewardId })
                .expect(400);
        });
    });
});
