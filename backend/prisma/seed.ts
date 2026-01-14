import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create sample users
  const user1 = await prisma.user.upsert({
    where: { email: 'referrer@example.com' },
    update: {},
    create: {
      email: 'referrer@example.com',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'referred@example.com' },
    update: {},
    create: {
      email: 'referred@example.com',
    },
  });

  const user3 = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
    },
  });

  console.log('Created users:', { user1, user2, user3 });

  // Create sample rule: IF referrer is paid AND referred subscribes THEN reward INR 500 voucher
  const sampleRule = await prisma.rule.upsert({
    where: { name_version: { name: 'referral_subscription_reward', version: 1 } },
    update: {},
    create: {
      name: 'referral_subscription_reward',
      version: 1,
      conditions: {
        type: 'AND',
        children: [
          {
            type: 'CONDITION',
            field: 'referrer.status',
            operator: '=',
            value: 'paid',
          },
          {
            type: 'CONDITION',
            field: 'referred.subscribed',
            operator: '=',
            value: true,
          },
        ],
      },
      actions: [
        {
          type: 'createReward',
          params: {
            amount: 500,
            currency: 'INR',
            type: 'voucher',
          },
        },
      ],
      isActive: true,
      metadata: {
        description: 'Reward referrer with INR 500 voucher when referred user subscribes',
      },
    },
  });

  console.log('Created sample rule:', sampleRule);

  // Create another sample rule for high-value referrals
  const highValueRule = await prisma.rule.upsert({
    where: { name_version: { name: 'high_value_referral_bonus', version: 1 } },
    update: {},
    create: {
      name: 'high_value_referral_bonus',
      version: 1,
      conditions: {
        type: 'AND',
        children: [
          {
            type: 'CONDITION',
            field: 'referrer.totalReferrals',
            operator: '>',
            value: 5,
          },
          {
            type: 'CONDITION',
            field: 'referred.plan',
            operator: 'in',
            value: ['premium', 'enterprise'],
          },
        ],
      },
      actions: [
        {
          type: 'createReward',
          params: {
            amount: 1000,
            currency: 'INR',
            type: 'bonus',
          },
        },
        {
          type: 'sendNotification',
          params: {
            template: 'high_value_referral',
            channel: 'email',
          },
        },
      ],
      isActive: true,
      metadata: {
        description: 'Extra bonus for high-performing referrers with premium referrals',
      },
    },
  });

  console.log('Created high-value rule:', highValueRule);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
