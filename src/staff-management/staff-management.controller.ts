import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { StaffManagementService } from './staff-management.service';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateAdminDto,
  CreateWaiterDto,
  CreateKitchenStaffDto,
} from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import {
  CreateStaffResponseDto,
  StaffListResponseDto,
  StaffResponseDto,
} from './dto/staff-response.dto';

@ApiTags('Staff Management')
@ApiBearerAuth()
@UseGuards(SupabaseJwtAuthGuard, RolesGuard)
@Controller('staff')
export class StaffManagementController {
  constructor(
    private readonly staffManagementService: StaffManagementService,
  ) {}

  @Post('admins')
  @Roles('admin')
  @ApiOperation({
    summary: 'Create an admin account',
    description:
      'Create a new admin account for the current restaurant. Only admins can perform this action.',
  })
  @ApiResponse({
    status: 201,
    description: 'Admin account created successfully',
    type: CreateStaffResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin role',
  })
  async createAdmin(
    @Body() createAdminDto: CreateAdminDto,
    @Req() req: any,
  ): Promise<CreateStaffResponseDto> {
    const restaurantId = req.user.restaurantId;
    return this.staffManagementService.createAdmin(
      restaurantId,
      createAdminDto,
    );
  }

  @Post('waiters')
  @Roles('admin')
  @ApiOperation({
    summary: 'Create a waiter account',
    description:
      'Create a waiter account responsible for handling table orders and customer interactions.',
  })
  @ApiResponse({
    status: 201,
    description: 'Waiter account created successfully',
    type: CreateStaffResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin role',
  })
  async createWaiter(
    @Body() createWaiterDto: CreateWaiterDto,
    @Req() req: any,
  ): Promise<CreateStaffResponseDto> {
    const restaurantId = req.user.restaurantId;
    return this.staffManagementService.createWaiter(
      restaurantId,
      createWaiterDto,
    );
  }

  @Post('kitchen')
  @Roles('admin')
  @ApiOperation({
    summary: 'Create a kitchen staff account',
    description:
      'Create a kitchen staff account responsible for preparing and managing food orders.',
  })
  @ApiResponse({
    status: 201,
    description: 'Kitchen staff account created successfully',
    type: CreateStaffResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin role',
  })
  async createKitchenStaff(
    @Body() createKitchenStaffDto: CreateKitchenStaffDto,
    @Req() req: any,
  ): Promise<CreateStaffResponseDto> {
    const restaurantId = req.user.restaurantId;
    return this.staffManagementService.createKitchenStaff(
      restaurantId,
      createKitchenStaffDto,
    );
  }

  @Get()
  @Roles('admin')
  @ApiOperation({
    summary: 'List restaurant staff',
    description:
      'Retrieve a list of all staff members belonging to the current restaurant.',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['admin', 'waiter', 'kitchen_staff'],
    description: 'Filter by staff role',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Staff list retrieved successfully',
    type: StaffListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin role',
  })
  async listStaff(
    @Query() query: ListStaffQueryDto,
    @Req() req: any,
  ): Promise<StaffListResponseDto> {
    const restaurantId = req.user.restaurantId;
    return this.staffManagementService.listStaff(restaurantId, query);
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get staff member details',
    description: 'Retrieve detailed information about a specific staff member.',
  })
  @ApiParam({
    name: 'id',
    description: 'Staff member ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff member retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff member not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin role',
  })
  async getStaffById(@Param('id') id: string, @Req() req: any) {
    const restaurantId = req.user.restaurantId;
    return this.staffManagementService.getStaffById(id, restaurantId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Update or deactivate a staff account',
    description:
      'Update profile information or change the active status of a staff member.',
  })
  @ApiParam({
    name: 'id',
    description: 'Staff member ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Staff member updated successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Staff member not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User does not have admin role',
  })
  async updateStaff(
    @Param('id') id: string,
    @Body() updateStaffDto: UpdateStaffDto,
    @Req() req: any,
  ) {
    const restaurantId = req.user.restaurantId;
    return this.staffManagementService.updateStaff(
      id,
      restaurantId,
      updateStaffDto,
    );
  }
}
