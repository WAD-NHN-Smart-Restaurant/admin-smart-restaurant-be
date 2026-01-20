import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { TablesModule } from './tables/tables.module';
import { MenuItemModule } from './menu-item/menu-item.module';
import { StorageModule } from './storage/storage.module';
import { MenuCategoryModule } from './menu-category/menu-category.module';
import { ModifierGroupModule } from './modifier-group/modifier-group.module';
import { ModifierOptionModule } from './modifier-option/modifier-option.module';
import { WaiterModule } from './staff/waiter.module';
import { StaffManagementModule } from './staff-management/staff-management.module';
import { BillsModule } from './bills/bills.module';
import { OrdersModule } from './orders/orders.module';
import { HealthController } from './common/health.controller';
import { ProfilesModule } from './profiles/profiles.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    AuthModule,
    TablesModule,
    MenuItemModule,
    StorageModule,
    MenuCategoryModule,
    ModifierGroupModule,
    ModifierOptionModule,
    WaiterModule,
    StaffManagementModule,
    BillsModule,
    OrdersModule,
    ProfilesModule,
    PaymentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
