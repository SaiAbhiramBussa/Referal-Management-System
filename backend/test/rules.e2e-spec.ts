import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Rules E2E Tests', () => {
    let app: INestApplication;
    let prisma: PrismaService;

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
        await prisma.rule.deleteMany();
    });

    afterAll(async () => {
        await prisma.$disconnect();
        await app.close();
    });

    describe('POST /api/rules', () => {
        it('should create a new rule', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/rules')
                .send({
                    name: 'Test Rule',
                    description: 'A test rule',
                    conditions: {
                        operator: 'AND',
                        operands: [
                            { field: 'user.status', op: '=', value: 'ACTIVE' },
                        ],
                    },
                    actions: [
                        { type: 'createReward', params: { amount: 100 } },
                    ],
                })
                .expect(201);

            expect(response.body.name).toBe('Test Rule');
            expect(response.body.version).toBe(1);
            expect(response.body.isActive).toBe(true);
        });

        it('should create new version when updating existing rule name', async () => {
            // Create first version
            await request(app.getHttpServer())
                .post('/api/rules')
                .send({
                    name: 'Versioned Rule',
                    conditions: { field: 'test', op: '=', value: 1 },
                    actions: [{ type: 'createReward', params: {} }],
                });

            // Create second version with same name
            const response = await request(app.getHttpServer())
                .post('/api/rules')
                .send({
                    name: 'Versioned Rule',
                    conditions: { field: 'test', op: '=', value: 2 },
                    actions: [{ type: 'createReward', params: { amount: 200 } }],
                })
                .expect(201);

            expect(response.body.version).toBe(2);

            // Old version should be inactive
            const rules = await prisma.rule.findMany({
                where: { name: 'Versioned Rule' },
                orderBy: { version: 'asc' },
            });

            expect(rules[0].isActive).toBe(false);
            expect(rules[1].isActive).toBe(true);
        });
    });

    describe('POST /api/rules/evaluate', () => {
        beforeEach(async () => {
            // Create test rule
            await request(app.getHttpServer())
                .post('/api/rules')
                .send({
                    name: 'Referral Rule',
                    conditions: {
                        operator: 'AND',
                        operands: [
                            { field: 'referrer.status', op: '=', value: 'PAID' },
                            { field: 'referred.action', op: '=', value: 'SUBSCRIBED' },
                        ],
                    },
                    actions: [
                        { type: 'createReward', params: { amount: 500, currency: 'INR' } },
                        { type: 'issueVoucher', params: { code: 'REF500' } },
                    ],
                });
        });

        it('should trigger actions when conditions match', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/rules/evaluate')
                .send({
                    event: {
                        referrer: { status: 'PAID', userId: '123' },
                        referred: { action: 'SUBSCRIBED', userId: '456' },
                    },
                })
                .expect(201);

            expect(response.body.length).toBe(2);
            expect(response.body[0].type).toBe('createReward');
            expect(response.body[0].params.amount).toBe(500);
            expect(response.body[1].type).toBe('issueVoucher');
        });

        it('should return empty when conditions do not match', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/rules/evaluate')
                .send({
                    event: {
                        referrer: { status: 'PENDING', userId: '123' }, // Not PAID
                        referred: { action: 'SUBSCRIBED', userId: '456' },
                    },
                })
                .expect(201);

            expect(response.body).toEqual([]);
        });

        it('should evaluate OR conditions correctly', async () => {
            await request(app.getHttpServer())
                .post('/api/rules')
                .send({
                    name: 'OR Rule',
                    conditions: {
                        operator: 'OR',
                        operands: [
                            { field: 'user.type', op: '=', value: 'VIP' },
                            { field: 'user.referralCount', op: '>=', value: 10 },
                        ],
                    },
                    actions: [
                        { type: 'createReward', params: { amount: 1000 } },
                    ],
                });

            // Match by VIP
            const response1 = await request(app.getHttpServer())
                .post('/api/rules/evaluate')
                .send({
                    event: { user: { type: 'VIP', referralCount: 2 } },
                })
                .expect(201);

            const orActions = response1.body.filter((a: any) => a.ruleName === 'OR Rule');
            expect(orActions.length).toBe(1);

            // Match by referralCount
            const response2 = await request(app.getHttpServer())
                .post('/api/rules/evaluate')
                .send({
                    event: { user: { type: 'REGULAR', referralCount: 15 } },
                })
                .expect(201);

            const orActions2 = response2.body.filter((a: any) => a.ruleName === 'OR Rule');
            expect(orActions2.length).toBe(1);
        });

        it('should handle nested field access', async () => {
            await request(app.getHttpServer())
                .post('/api/rules')
                .send({
                    name: 'Nested Rule',
                    conditions: {
                        field: 'order.items.total',
                        op: '>',
                        value: 1000,
                    },
                    actions: [
                        { type: 'issueVoucher', params: { discount: 10 } },
                    ],
                });

            const response = await request(app.getHttpServer())
                .post('/api/rules/evaluate')
                .send({
                    event: { order: { items: { total: 1500 } } },
                })
                .expect(201);

            const nestedActions = response.body.filter((a: any) => a.ruleName === 'Nested Rule');
            expect(nestedActions.length).toBe(1);
        });

        it('should handle "in" operator', async () => {
            await request(app.getHttpServer())
                .post('/api/rules')
                .send({
                    name: 'In Operator Rule',
                    conditions: {
                        field: 'user.country',
                        op: 'in',
                        value: ['IN', 'US', 'UK'],
                    },
                    actions: [
                        { type: 'sendNotification', params: { template: 'welcome' } },
                    ],
                });

            const response = await request(app.getHttpServer())
                .post('/api/rules/evaluate')
                .send({
                    event: { user: { country: 'IN' } },
                })
                .expect(201);

            const inActions = response.body.filter((a: any) => a.ruleName === 'In Operator Rule');
            expect(inActions.length).toBe(1);
        });

        it('should handle "exists" operator', async () => {
            await request(app.getHttpServer())
                .post('/api/rules')
                .send({
                    name: 'Exists Rule',
                    conditions: {
                        field: 'user.phoneNumber',
                        op: 'exists',
                        value: null,
                    },
                    actions: [
                        { type: 'sendNotification', params: { channel: 'sms' } },
                    ],
                });

            // With phone number
            const response1 = await request(app.getHttpServer())
                .post('/api/rules/evaluate')
                .send({
                    event: { user: { name: 'Test', phoneNumber: '+91123456789' } },
                })
                .expect(201);

            const existsActions = response1.body.filter((a: any) => a.ruleName === 'Exists Rule');
            expect(existsActions.length).toBe(1);

            // Without phone number
            const response2 = await request(app.getHttpServer())
                .post('/api/rules/evaluate')
                .send({
                    event: { user: { name: 'Test' } },
                })
                .expect(201);

            const existsActions2 = response2.body.filter((a: any) => a.ruleName === 'Exists Rule');
            expect(existsActions2.length).toBe(0);
        });
    });

    describe('GET /api/rules', () => {
        it('should return all rules', async () => {
            await request(app.getHttpServer())
                .post('/api/rules')
                .send({
                    name: 'Rule 1',
                    conditions: { field: 'a', op: '=', value: 1 },
                    actions: [{ type: 'createReward', params: {} }],
                });

            await request(app.getHttpServer())
                .post('/api/rules')
                .send({
                    name: 'Rule 2',
                    conditions: { field: 'b', op: '=', value: 2 },
                    actions: [{ type: 'createReward', params: {} }],
                });

            const response = await request(app.getHttpServer())
                .get('/api/rules')
                .expect(200);

            expect(response.body.length).toBe(2);
        });

        it('should filter active rules only', async () => {
            const createResponse = await request(app.getHttpServer())
                .post('/api/rules')
                .send({
                    name: 'Will Be Inactive',
                    conditions: { field: 'a', op: '=', value: 1 },
                    actions: [{ type: 'createReward', params: {} }],
                });

            // Deactivate the rule
            await request(app.getHttpServer())
                .patch(`/api/rules/${createResponse.body.id}`)
                .send({ isActive: false });

            await request(app.getHttpServer())
                .post('/api/rules')
                .send({
                    name: 'Active Rule',
                    conditions: { field: 'b', op: '=', value: 2 },
                    actions: [{ type: 'createReward', params: {} }],
                });

            const response = await request(app.getHttpServer())
                .get('/api/rules?activeOnly=true')
                .expect(200);

            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toBe('Active Rule');
        });
    });
});
