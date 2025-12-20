import { Module } from '@nestjs/common';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { TablesRepository } from './tables.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [TablesController],
  providers: [TablesService, TablesRepository],
  exports: [TablesService, TablesRepository],
})
export class TablesModule {}
