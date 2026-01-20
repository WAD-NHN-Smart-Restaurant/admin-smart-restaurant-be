import { Module } from '@nestjs/common';
import { StaffManagementController } from './staff-management.controller';
import { StaffManagementService } from './staff-management.service';
import { StaffManagementRepository } from './staff-management.repository';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [AuthModule, SupabaseModule],
  controllers: [StaffManagementController],
  providers: [StaffManagementService, StaffManagementRepository],
  exports: [StaffManagementService, StaffManagementRepository],
})
export class StaffManagementModule {}
