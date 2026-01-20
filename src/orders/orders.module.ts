import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersGateway } from './orders.gateway';
import { SupabaseModule } from '../supabase/supabase.module';
import { TablesModule } from '../tables/tables.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [SupabaseModule, TablesModule, forwardRef(() => PaymentsModule)],
  providers: [OrdersService, OrdersRepository, OrdersGateway],
  controllers: [OrdersController],
  exports: [OrdersService, OrdersGateway, OrdersRepository],
})
export class OrdersModule {}
