import { Module } from '@nestjs/common';
import { MenuItemController } from './menu-item.controller';
import { GuestMenuController } from './guest-menu.controller';
import { MenuItemService } from './menu-item.service';
import { MenuItemRepository } from './menu-item.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { TablesModule } from '../tables/tables.module';
import { MenuCategoryModule } from '../menu-category/menu-category.module';
import { ModifierGroupModule } from '../modifier-group/modifier-group.module';

@Module({
  imports: [
    SupabaseModule,
    AuthModule,
    StorageModule,
    TablesModule,
    MenuCategoryModule,
    ModifierGroupModule,
  ],
  controllers: [MenuItemController, GuestMenuController],
  providers: [MenuItemService, MenuItemRepository],
  exports: [MenuItemService, MenuItemRepository],
})
export class MenuItemModule {}
