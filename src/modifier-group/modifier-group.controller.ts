import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { GetRestaurantId } from '../auth/decorators/get-restaurant-id.decorator';
import {
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  CreateModifierOptionDto,
  UpdateModifierOptionDto,
} from './dto/modifier.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ModifierGroupService } from '../modifier-group/modifier-group.service';

@ApiTags('Modifier Groups - Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/menu/modifier-groups')
export class ModifierGroupController {
  constructor(private readonly modifierGroupService: ModifierGroupService) {}

  // 4. Menu Item Modifiers APIs
  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Post()
  @ApiOperation({
    summary: 'Create modifier group',
    description:
      'Creates a new modifier group for menu item customization. Requires admin authentication.',
  })
  @ApiBody({ type: CreateModifierGroupDto })
  @ApiResponse({
    status: 201,
    description: 'Modifier group created successfully',
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
  async createModifierGroup(
    @GetRestaurantId() restaurantId: string,
    @Body() createDto: CreateModifierGroupDto,
  ) {
    return this.modifierGroupService.createModifierGroup(
      restaurantId,
      createDto,
    );
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Get('modifier-groups')
  @ApiOperation({
    summary: 'Get modifier groups',
    description:
      'Retrieves all modifier groups for the restaurant. Requires admin authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Modifier groups retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async getModifierGroups(@GetRestaurantId() restaurantId: string) {
    return this.modifierGroupService.getModifierGroups(restaurantId);
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Put(':id')
  @ApiOperation({
    summary: 'Update modifier group',
    description:
      'Updates an existing modifier group. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Modifier group ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateModifierGroupDto })
  @ApiResponse({
    status: 200,
    description: 'Modifier group updated successfully',
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
  @ApiResponse({ status: 404, description: 'Modifier group not found' })
  async updateModifierGroup(
    @Param('id') id: string,
    @GetRestaurantId() restaurantId: string,
    @Body() updateDto: UpdateModifierGroupDto,
  ) {
    return this.modifierGroupService.updateModifierGroup(
      id,
      restaurantId,
      updateDto,
    );
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Post(':id/options')
  @ApiOperation({
    summary: 'Create modifier option',
    description:
      'Creates a new modifier option for a modifier group. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Modifier group ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: CreateModifierOptionDto })
  @ApiResponse({
    status: 201,
    description: 'Modifier option created successfully',
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
  @ApiResponse({ status: 404, description: 'Modifier group not found' })
  async createModifierOption(
    @Param('id') groupId: string,
    @GetRestaurantId() restaurantId: string,
    @Body() createDto: CreateModifierOptionDto,
  ) {
    return this.modifierGroupService.createModifierOption(
      groupId,
      restaurantId,
      createDto,
    );
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Put(':id')
  @ApiOperation({
    summary: 'Update modifier option',
    description:
      'Updates an existing modifier option. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Modifier option ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({ type: UpdateModifierOptionDto })
  @ApiResponse({
    status: 200,
    description: 'Modifier option updated successfully',
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
  @ApiResponse({ status: 404, description: 'Modifier option not found' })
  async updateModifierOption(
    @Param('id') optionId: string,
    @GetRestaurantId() restaurantId: string,
    @Body() updateDto: UpdateModifierOptionDto,
  ) {
    return this.modifierGroupService.updateModifierOption(
      optionId,
      restaurantId,
      updateDto,
    );
  }
}
