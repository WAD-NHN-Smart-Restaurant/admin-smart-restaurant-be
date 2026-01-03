import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Patch,
  Query,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { GetRestaurantId } from '../auth/decorators/get-restaurant-id.decorator';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  CategoryStatus,
} from './dto/menu-category.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MenuCategoriesListResponseDto } from '../menu-item/dto/menu-response.dto';
import { MenuCategoryResponseDto } from '../menu-item/dto/menu-response.dto';
import { MenuCategoryService } from './menu-category.service';

@ApiTags('Menu Categories - Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/menu/categories')
export class MenuCategoryController {
  constructor(private readonly menuCategoryService: MenuCategoryService) {}

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Post()
  @ApiOperation({
    summary: 'Create menu category',
    description:
      'Creates a new menu category for the restaurant. Requires admin authentication.',
  })
  @ApiBody({ type: CreateCategoryDto })
  @ApiResponse({
    status: 201,
    description: 'Category created successfully',
    type: MenuCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async createCategory(
    @GetRestaurantId() restaurantId: string,
    @Body() createDto: CreateCategoryDto,
  ) {
    // Debug logging
    console.log('🔍 Debug - createCategory called');
    console.log('Restaurant ID from decorator:', restaurantId);
    console.log('Request user:', (this as any).request?.user);

    return this.menuCategoryService.createCategory(restaurantId, createDto);
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Get()
  @ApiOperation({
    summary: 'Get menu categories',
    description:
      'Retrieves all menu categories for the restaurant with optional filtering and sorting. Requires admin authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    type: MenuCategoriesListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async getCategories(
    @GetRestaurantId() restaurantId: string,
    @Query() query: CategoryQueryDto,
  ) {
    return this.menuCategoryService.getCategories(restaurantId, query);
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Put(':id')
  @ApiOperation({
    summary: 'Update menu category',
    description:
      'Updates an existing menu category. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Category updated successfully',
    type: MenuCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategory(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
    @Body() updateDto: UpdateCategoryDto,
  ) {
    return this.menuCategoryService.updateCategory(id, restaurantId, updateDto);
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update category status',
    description:
      'Updates the status of a menu category (active/inactive). Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          example: 'active',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Category status updated successfully',
    type: MenuCategoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid status' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async updateCategoryStatus(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
    @Body('status') status: CategoryStatus, // Simple body: { "status": "active" }
  ) {
    return this.menuCategoryService.updateCategoryStatus(
      id,
      restaurantId,
      status,
    );
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete menu category',
    description: 'Soft deletes a menu category. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Category deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
  ) {
    return this.menuCategoryService.deleteCategory(id, restaurantId);
  }
}
