import { Module } from '@nestjs/common';
import { WaiterController } from './waiter.controller';
import { WaiterService } from './waiter.service';
import { WaiterRepository } from './waiter.repository';
import { KitchenController } from './kitchen.controller';
import { KitchenService } from './kitchen.service';
import { KitchenRepository } from './kitchen.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { OrdersGateway } from '../gateways/orders.gateway';
import { TablesRepository } from '../tables/tables.repository';

@Module({
  imports: [SupabaseModule],
  controllers: [WaiterController, KitchenController],
  providers: [
    WaiterService,
    WaiterRepository,
    KitchenService,
    KitchenRepository,
    OrdersGateway,
    TablesRepository,
  ],
  exports: [WaiterService, KitchenService],
})
export class WaiterModule {}
