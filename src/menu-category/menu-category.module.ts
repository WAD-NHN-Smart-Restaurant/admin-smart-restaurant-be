import { Module } from '@nestjs/common';
import { MenuCategoryService } from './menu-category.service';
import { MenuCategoryController } from './menu-category.controller';
import { GuestMenuCategoryController } from './guest-menu-category.controller';
import { MenuCategoryRepository } from './menu-category.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { TablesModule } from '../tables/tables.module';

@Module({
  imports: [SupabaseModule, AuthModule, TablesModule],
  controllers: [MenuCategoryController, GuestMenuCategoryController],
  providers: [MenuCategoryService, MenuCategoryRepository],
  exports: [MenuCategoryService, MenuCategoryRepository],
})
export class MenuCategoryModule {}
