import { Module } from '@nestjs/common';
import { BehaviorController } from './behavior.controller';
import { BehaviorService } from './behavior.service';

@Module({
  controllers: [BehaviorController],
  providers: [BehaviorService],
  exports: [BehaviorService],
})
export class BehaviorModule {}
