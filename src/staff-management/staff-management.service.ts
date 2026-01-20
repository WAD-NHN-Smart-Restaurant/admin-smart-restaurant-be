import {
  Injectable,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { StaffManagementRepository } from './staff-management.repository';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StaffManagementService {
  private readonly DEFAULT_STAFF_PASSWORD: string;

  constructor(
    private authService: AuthService,
    private staffManagementRepository: StaffManagementRepository,
    private configService: ConfigService,
  ) {
    // Get default password from env or use a secure default
    this.DEFAULT_STAFF_PASSWORD =
      this.configService.get<string>('DEFAULT_STAFF_PASSWORD') ||
      'StaffDefault123!';
  }

  /**
   * Create an admin account
   */
  async createAdmin(restaurantId: string, dto: CreateStaffDto) {
    return this.createStaffMember(restaurantId, dto, 'admin');
  }

  /**
   * Create a waiter account
   */
  async createWaiter(restaurantId: string, dto: CreateStaffDto) {
    return this.createStaffMember(restaurantId, dto, 'waiter');
  }

  /**
   * Create a kitchen staff account
   */
  async createKitchenStaff(restaurantId: string, dto: CreateStaffDto) {
    return this.createStaffMember(restaurantId, dto, 'kitchen_staff');
  }

  /**
   * Common method to create staff members
   */
  private async createStaffMember(
    restaurantId: string,
    dto: CreateStaffDto,
    role: 'admin' | 'waiter' | 'kitchen_staff',
  ) {
    // Use provided password or default
    const password = dto.password || this.DEFAULT_STAFF_PASSWORD;

    // Create auth account using AuthService signup
    const signUpResult = await this.authService.signUp(restaurantId, {
      email: dto.email,
      password,
      name: dto.name,
      role,
    });

    // Get complete profile data
    const userId = signUpResult.data.user.id;
    if (!userId) {
      throw new Error('Failed to create user account');
    }
    const profile =
      await this.staffManagementRepository.findProfileByAuthId(userId);

    // Return data directly - ResponseInterceptor will wrap it
    return {
      id: profile.id,
      email: dto.email,
      name: profile.full_name || dto.name,
      role: profile.role || role,
      phone_number: profile.phone_number,
      avatar_url: profile.avatar_url,
      is_active: (profile as any).is_active ?? true,
      created_at: profile.created_at,
      restaurant_id: profile.restaurant_id || restaurantId,
      default_password: dto.password ? undefined : password,
    } as any;
  }

  /**
   * Get list of all staff members for a restaurant
   */
  async listStaff(restaurantId: string, filters: ListStaffQueryDto) {
    const result = await this.staffManagementRepository.findStaffByRestaurant(
      restaurantId,
      filters,
    );

    // Fetch emails from auth.users for all staff members
    const userIds = result.data.map((profile: any) => profile.id);
    const emailMap =
      await this.staffManagementRepository.getUserEmails(userIds);

    // Map to response format
    const staffList = result.data.map((profile: any) => ({
      id: profile.id,
      email: emailMap.get(profile.id) || '',
      name: profile.full_name || '',
      role: profile.role || 'waiter',
      phoneNumber: profile.phone_number,
      avatarUrl: profile.avatar_url,
      isActive: profile.is_active ?? true,
      createdAt: profile.created_at,
      restaurantId: profile.restaurant_id || '',
    }));

    // Return data directly - ResponseInterceptor will wrap it
    return {
      data: staffList,
      pagination: result.pagination,
    };
  }

  /**
   * Update staff member profile or status
   */
  async updateStaff(
    staffId: string,
    restaurantId: string,
    dto: UpdateStaffDto,
  ) {
    // Check if staff exists and belongs to restaurant
    const existingStaff = await this.staffManagementRepository.findStaffById(
      staffId,
      restaurantId,
    );

    if (!existingStaff) {
      throw new NotFoundException('Staff member not found');
    }

    // Prepare update data - map DTO fields to database columns
    const updateData: {
      full_name?: string;
      phone_number?: string;
      avatar_url?: string;
      is_active?: boolean;
    } = {};

    if (dto.name !== undefined) {
      updateData.full_name = dto.name;
    }
    if (dto.phoneNumber !== undefined) {
      updateData.phone_number = dto.phoneNumber;
    }
    if (dto.avatarUrl !== undefined) {
      updateData.avatar_url = dto.avatarUrl;
    }
    if (dto.isActive !== undefined) {
      updateData.is_active = dto.isActive;
    }

    // Update staff profile
    const updatedProfile = await this.staffManagementRepository.updateStaff(
      staffId,
      restaurantId,
      updateData,
    );

    // Fetch email from auth.users
    const email = await this.staffManagementRepository.getUserEmail(staffId);

    const updated = updatedProfile as any;
    // Return data directly - ResponseInterceptor will wrap it
    return {
      id: updated.id,
      email: email,
      name: updated.full_name || '',
      role: updated.role || 'waiter',
      phone_number: updated.phone_number,
      avatar_url: updated.avatar_url,
      is_active: updated.is_active ?? true,
      created_at: updated.created_at,
      restaurant_id: updated.restaurant_id || '',
    };
  }

  /**
   * Get a single staff member by ID
   */
  async getStaffById(staffId: string, restaurantId: string) {
    const profile = await this.staffManagementRepository.findStaffById(
      staffId,
      restaurantId,
    );

    // Fetch email from auth.users
    const email = await this.staffManagementRepository.getUserEmail(staffId);

    const prof = profile as any;
    // Return data directly - ResponseInterceptor will wrap it
    return {
      id: prof.id,
      email: email,
      name: prof.full_name || '',
      role: prof.role || 'waiter',
      phoneNumber: prof.phone_number,
      avatarUrl: prof.avatar_url,
      isActive: prof.is_active ?? true,
      createdAt: prof.created_at,
      restaurantId: prof.restaurant_id || '',
    };
  }
}
