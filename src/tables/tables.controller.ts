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
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('JWT-auth')
@Controller('admin/tables')
@UseGuards(SupabaseJwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  /**
   * Create a new table
   * POST /admin/tables
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
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
   * GET /admin/tables?status=active&location=Indoor&sortBy=table_number&sortOrder=asc
   */
  @Get()
  async findAll(@Query() query: QueryTablesDto) {
    const tables = await this.tablesService.findAll(query);
    return {
      success: true,
      message: 'Tables retrieved successfully',
      data: tables,
      count: tables.length,
    };
  }

  /**
   * Get all unique locations
   * GET /admin/tables/locations
   */
  @Get('locations')
  async getLocations() {
    const locations = await this.tablesService.getLocations();
    return {
      success: true,
      message: 'Locations retrieved successfully',
      data: locations,
    };
  }

  /**
   * Get a single table by ID
   * GET /admin/tables/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.tablesService.findOneWithOrderStatus(id);
    return {
      success: true,
      message: 'Table retrieved successfully',
      data: result,
    };
  }

  /**
   * Update table details
   * PUT /admin/tables/:id
   */
  @Put(':id')
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

  /**
   * Update table status (activate/deactivate)
   * PATCH /admin/tables/:id/status
   */
  @Patch(':id/status')
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
      message: `Table ${updateStatusDto.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: table,
    };
  }
}
