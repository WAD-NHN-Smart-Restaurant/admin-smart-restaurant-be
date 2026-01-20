import { Module } from '@nestjs/common';
import { WaiterController } from './waiter.controller';
import { WaiterService } from './waiter.service';
import { WaiterRepository } from './waiter.repository';
import { KitchenController } from './kitchen.controller';
import { KitchenService } from './kitchen.service';
import { KitchenRepository } from './kitchen.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { OrdersGateway } from '../gateways/orders.gateway';

@Module({
  imports: [SupabaseModule],
  controllers: [WaiterController, KitchenController],
  providers: [
    WaiterService,
    WaiterRepository,
    KitchenService,
    KitchenRepository,
    OrdersGateway,
  ],
  exports: [WaiterService, KitchenService],
})
export class WaiterModule {}
