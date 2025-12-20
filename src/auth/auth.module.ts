import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { SupabaseJwtAuthGuard } from './guards/supabase-jwt-auth.guard';

@Module({
  imports: [SupabaseModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, SupabaseJwtAuthGuard],
  exports: [AuthService, SupabaseJwtAuthGuard],
})
export class AuthModule {}
