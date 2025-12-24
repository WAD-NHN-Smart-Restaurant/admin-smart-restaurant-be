import { Module } from '@nestjs/common';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';
import { TablesRepository } from './tables.repository';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthModule } from '../auth/auth.module';
import { QrTokenGuard } from './guards/qr-token.guard';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [TablesController],
  providers: [TablesService, TablesRepository, QrTokenGuard],
  exports: [TablesService, TablesRepository, QrTokenGuard],
})
export class TablesModule {}
