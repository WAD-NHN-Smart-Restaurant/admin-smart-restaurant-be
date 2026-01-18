import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersGateway } from '../gateways/orders.gateway';
import { SupabaseModule } from '../supabase/supabase.module';
import { TablesModule } from '../tables/tables.module';

@Module({
  imports: [SupabaseModule, TablesModule],
  providers: [OrdersService, OrdersRepository, OrdersGateway],
  controllers: [OrdersController],
  exports: [OrdersService, OrdersGateway],
})
export class OrdersModule {}
