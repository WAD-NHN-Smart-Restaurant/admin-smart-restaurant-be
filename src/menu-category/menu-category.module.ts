import { Module } from '@nestjs/common';
import { MenuCategoryService } from './menu-category.service';
import { MenuCategoryController } from './menu-category.controller';
import { MenuCategoryRepository } from './menu-category.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [MenuCategoryController],
  providers: [MenuCategoryService, MenuCategoryRepository],
  exports: [MenuCategoryService, MenuCategoryRepository],
})
export class MenuCategoryModule {}
