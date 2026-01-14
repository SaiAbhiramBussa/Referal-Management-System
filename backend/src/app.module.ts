import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { RewardsModule } from './rewards/rewards.module';
import { LedgerModule } from './ledger/ledger.module';
import { UsersModule } from './users/users.module';
import { RulesModule } from './rules/rules.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    RewardsModule,
    LedgerModule,
    RulesModule,
  ],
})
export class AppModule {}
