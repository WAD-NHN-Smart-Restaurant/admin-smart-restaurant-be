import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { GuestMenuController } from './guest-menu.controller';
import { MenuService } from './menu.service';
import { MenuRepository } from './menu.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [MenuController, GuestMenuController],
  providers: [MenuService, MenuRepository],
  exports: [MenuService, MenuRepository],
})
export class MenuModule {}
