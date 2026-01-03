import { Module } from '@nestjs/common';
import { ModifierGroupService } from './modifier-group.service';
import { ModifierGroupController } from './modifier-group.controller';
import { ModifierGroupRepository } from './modifier-group.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [ModifierGroupController],
  providers: [ModifierGroupService, ModifierGroupRepository],
  exports: [ModifierGroupService, ModifierGroupRepository],
})
export class ModifierGroupModule {}
