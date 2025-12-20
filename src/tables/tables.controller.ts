import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { UpdateTableStatusDto } from './dto/update-table-status.dto';
import { QueryTablesDto } from './dto/query-tables.dto';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Tables')
@ApiBearerAuth('JWT-auth')
@Controller('admin/tables')
@UseGuards(SupabaseJwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new table',
    description:
      'Creates a new table with unique table number. Requires admin or super_admin role.',
  })
  @ApiBody({ type: CreateTableDto })
  @ApiResponse({ status: 201, description: 'Table created successfully' })
  @ApiResponse({ status: 409, description: 'Table number already exists' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() createTableDto: CreateTableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const table = await this.tablesService.create(createTableDto);
    return {
      success: true,
      message: 'Table created successfully',
      data: table,
    };
  }

  /**
   * Get all tables with filters and sorting
   * GET /admin/tables?status=available&location=Indoor&sortBy=table_number&sortOrder=asc
   */
  @Get()
  @ApiOperation({
    summary: 'Get all tables',
    description: 'Retrieve all tables with optional filtering and sorting',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['available', 'occupied', 'inactive'],
  })
  @ApiQuery({ name: 'location', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['table_number', 'capacity', 'created_at'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Tables retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findAll(@Query() query: QueryTablesDto) {
    const tables = await this.tablesService.findAll(query);
    return {
      success: true,
      message: 'Tables retrieved successfully',
      data: tables,
    };
  }

  @Get('locations')
  @ApiOperation({
    summary: 'Get all unique table locations',
    description:
      'Retrieve a list of all unique location/zone names used in tables',
  })
  @ApiResponse({ status: 200, description: 'Locations retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getLocations() {
    const locations = await this.tablesService.getLocations();
    return {
      success: true,
      message: 'Locations retrieved successfully',
      data: locations,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get table by ID',
    description:
      'Retrieve a single table with its details and active order status',
  })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResponse({ status: 200, description: 'Table retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Table not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async findOne(@Param('id') id: string) {
    const result = await this.tablesService.findOneWithOrderStatus(id);
    return {
      success: true,
      message: 'Table retrieved successfully',
      data: result,
    };
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update table details',
    description:
      'Update table information excluding status. Table number uniqueness is validated. Use PATCH /:id/status to update status.',
  })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiBody({ type: UpdateTableDto })
  @ApiResponse({ status: 200, description: 'Table updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'Cannot update status through this endpoint',
  })
  @ApiResponse({ status: 404, description: 'Table not found' })
  @ApiResponse({ status: 409, description: 'Table number already exists' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(
    @Param('id') id: string,
    @Body() updateTableDto: UpdateTableDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const table = await this.tablesService.update(id, updateTableDto);
    return {
      success: true,
      message: 'Table updated successfully',
      data: table,
    };
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update table status',
    description:
      'Activate or deactivate a table. Prevents deactivation if table has active orders.',
  })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiBody({ type: UpdateTableStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Table status updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot deactivate table with active orders',
  })
  @ApiResponse({ status: 404, description: 'Table not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateTableStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const table = await this.tablesService.updateStatus(
      id,
      updateStatusDto.status,
    );
    return {
      success: true,
      message: `Table ${updateStatusDto.status === 'available' ? 'activated' : updateStatusDto.status === 'inactive' ? 'deactivated' : 'status updated'} successfully`,
      data: table,
    };
  }
}
