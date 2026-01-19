import { Module, forwardRef } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { OrdersModule } from '../orders/orders.module';
import { TablesModule } from '../tables/tables.module';
import { StripeService } from './stripe/stripe.service';

@Module({
  imports: [SupabaseModule, TablesModule, forwardRef(() => OrdersModule)],
  providers: [PaymentsService, PaymentsRepository, StripeService],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
