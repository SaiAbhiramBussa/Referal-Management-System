import { Module } from '@nestjs/common';
import { RewardsController } from './rewards.controller';
import { RewardsService } from './rewards.service';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
    imports: [LedgerModule],
    controllers: [RewardsController],
    providers: [RewardsService],
    exports: [RewardsService],
})
export class RewardsModule { }
