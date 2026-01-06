import { Module } from '@nestjs/common';
import { ModifierOptionService } from './modifier-option.service';
import { ModifierOptionController } from './modifier-option.controller';
import { ModifierOptionRepository } from './modifier-option.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [ModifierOptionController],
  providers: [ModifierOptionService, ModifierOptionRepository],
  exports: [ModifierOptionService, ModifierOptionRepository],
})
export class ModifierOptionModule {}
