import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './modules/users/users.module';
import { RewardsModule } from './modules/rewards/rewards.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { RulesModule } from './modules/rules/rules.module';
import { HealthModule } from './modules/health/health.module';

@Module({
    imports: [
        // Configuration
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),

        // Database
        PrismaModule,

        // Feature modules
        HealthModule,
        UsersModule,
        RewardsModule,
        LedgerModule,
        RulesModule,
    ],
})
export class AppModule { }
