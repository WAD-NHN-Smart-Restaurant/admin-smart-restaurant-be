import { Module, forwardRef } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { SupabaseJwtAuthGuard } from './guards/supabase-jwt-auth.guard';

@Module({
  imports: [SupabaseModule, forwardRef(() => ProfilesModule)],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, SupabaseJwtAuthGuard],
  exports: [AuthService, SupabaseJwtAuthGuard],
})
export class AuthModule {}
