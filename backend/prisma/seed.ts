import { PrismaClient, RewardStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Starting database seed...');

    // Clean existing data
    console.log('Cleaning existing data...');
    await prisma.ledgerEntry.deleteMany();
    await prisma.reward.deleteMany();
    await prisma.idempotencyKey.deleteMany();
    await prisma.rule.deleteMany();
    await prisma.user.deleteMany();

    // Create users
    console.log('Creating users...');
    const user1 = await prisma.user.create({
        data: {
            email: 'referrer@example.com',
            name: 'John Referrer',
        },
    });

    const user2 = await prisma.user.create({
        data: {
            email: 'referred@example.com',
            name: 'Jane Referred',
        },
    });

    const user3 = await prisma.user.create({
        data: {
            email: 'admin@example.com',
            name: 'Admin User',
        },
    });

    console.log(`Created users: ${user1.id}, ${user2.id}, ${user3.id}`);

    // Create sample rules
    console.log('Creating rules...');
    const referralRule = await prisma.rule.create({
        data: {
            name: 'Referral Reward Rule',
            description: 'Award INR 500 voucher when referrer is paid and referred subscribes',
            version: 1,
            isActive: true,
            conditions: {
                operator: 'AND',
                operands: [
                    {
                        field: 'referrer.status',
                        op: '=',
                        value: 'PAID',
                    },
                    {
                        field: 'referred.action',
                        op: '=',
                        value: 'SUBSCRIBED',
                    },
                ],
            },
            actions: [
                {
                    type: 'createReward',
                    params: {
                        amount: 500,
                        currency: 'INR',
                        type: 'referral_bonus',
                    },
                },
                {
                    type: 'issueVoucher',
                    params: {
                        code: 'REFERRAL500',
                        value: 500,
                        currency: 'INR',
                        validDays: 30,
                    },
                },
            ],
            metadata: {
                category: 'referral',
                priority: 'high',
            },
        },
    });

    const welcomeRule = await prisma.rule.create({
        data: {
            name: 'Welcome Bonus Rule',
            description: 'Award welcome bonus when new user signs up',
            version: 1,
            isActive: true,
            conditions: {
                operator: 'AND',
                operands: [
                    {
                        field: 'user.action',
                        op: '=',
                        value: 'SIGNUP',
                    },
                    {
                        field: 'user.isNewUser',
                        op: '=',
                        value: true,
                    },
                ],
            },
            actions: [
                {
                    type: 'createReward',
                    params: {
                        amount: 100,
                        currency: 'INR',
                        type: 'welcome_bonus',
                    },
                },
                {
                    type: 'sendNotification',
                    params: {
                        template: 'welcome_bonus',
                        channel: 'email',
                    },
                },
            ],
            metadata: {
                category: 'onboarding',
                priority: 'medium',
            },
        },
    });

    const tieredRule = await prisma.rule.create({
        data: {
            name: 'Tiered Referral Rule',
            description: 'Higher rewards for users with more referrals',
            version: 1,
            isActive: true,
            conditions: {
                operator: 'AND',
                operands: [
                    {
                        field: 'referrer.referralCount',
                        op: '>=',
                        value: 5,
                    },
                    {
                        field: 'referred.action',
                        op: '=',
                        value: 'SUBSCRIBED',
                    },
                ],
            },
            actions: [
                {
                    type: 'createReward',
                    params: {
                        amount: 1000,
                        currency: 'INR',
                        type: 'tiered_referral_bonus',
                    },
                },
            ],
            metadata: {
                category: 'referral',
                priority: 'high',
                tier: 'gold',
            },
        },
    });

    console.log(`Created rules: ${referralRule.id}, ${welcomeRule.id}, ${tieredRule.id}`);

    // Create sample rewards with ledger entries
    console.log('Creating sample rewards and ledger entries...');

    const reward1 = await prisma.reward.create({
        data: {
            referrerId: user1.id,
            referredId: user2.id,
            amount: '500.00',
            currency: 'INR',
            status: RewardStatus.CONFIRMED,
            idempotencyKey: 'sample-reward-1',
            metadata: {
                source: 'seed',
                campaign: 'launch',
            },
            ledgerEntries: {
                create: {
                    userId: user1.id,
                    type: 'CREDIT',
                    amount: '500.00',
                    currency: 'INR',
                    status: 'POSTED',
                    metadata: {
                        action: 'credit',
                        rewardType: 'referral',
                    },
                },
            },
        },
    });

    const reward2 = await prisma.reward.create({
        data: {
            referrerId: user1.id,
            referredId: user3.id,
            amount: '250.00',
            currency: 'INR',
            status: RewardStatus.PENDING,
            idempotencyKey: 'sample-reward-2',
            metadata: {
                source: 'seed',
                campaign: 'promo',
            },
            ledgerEntries: {
                create: {
                    userId: user1.id,
                    type: 'CREDIT',
                    amount: '250.00',
                    currency: 'INR',
                    status: 'POSTED',
                    metadata: {
                        action: 'credit',
                        rewardType: 'referral',
                    },
                },
            },
        },
    });

    console.log(`Created rewards: ${reward1.id}, ${reward2.id}`);

    console.log('✅ Database seed completed successfully!');
    console.log('\nSummary:');
    console.log(`- Users: 3`);
    console.log(`- Rules: 3`);
    console.log(`- Rewards: 2`);
    console.log(`- Ledger Entries: 2`);
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
