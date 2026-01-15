import { Module } from '@nestjs/common';
import { WaiterController } from './waiter.controller';
import { WaiterService } from './waiter.service';
import { WaiterRepository } from './waiter.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { OrdersGateway } from '../gateways/orders.gateway';

@Module({
  imports: [SupabaseModule],
  controllers: [WaiterController],
  providers: [WaiterService, WaiterRepository, OrdersGateway],
  exports: [WaiterService],
})
export class WaiterModule {}
