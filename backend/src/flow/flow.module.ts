import { Module } from '@nestjs/common';
import { FlowService } from './flow.service';
import { FlowController } from './flow.controller';
import { FlowExecutor } from './flow.executor';

@Module({
  providers: [FlowService, FlowExecutor],
  controllers: [FlowController],
  exports: [FlowService, FlowExecutor],
})
export class FlowModule {}
