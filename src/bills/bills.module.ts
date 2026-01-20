import { Module } from '@nestjs/common';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';
import { BillsRepository } from './bills.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { OrdersGateway } from '../gateways/orders.gateway';

@Module({
  imports: [SupabaseModule],
  controllers: [BillsController],
  providers: [BillsService, BillsRepository, OrdersGateway],
  exports: [BillsService],
})
export class BillsModule {}
