import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { GetRestaurantId } from '../auth/decorators/get-restaurant-id.decorator';
import { CreateModifierOptionDto } from './dto/create-modifier-option.dto';
import { UpdateModifierOptionDto } from './dto/update-modifier-option.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ModifierOptionService } from './modifier-option.service';

@ApiTags('Modifier Options - Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin/menu/modifier-options')
export class ModifierOptionController {
  constructor(private readonly modifierOptionService: ModifierOptionService) {}

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Post()
  @ApiOperation({
    summary: 'Create modifier option',
    description:
      'Creates a new modifier option for a modifier group. Requires admin authentication.',
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
  async createModifierOption(
    @GetRestaurantId() restaurantId: string,
    @Body() createDto: CreateModifierOptionDto,
  ) {
    return this.modifierOptionService.createModifierOption(
      createDto.group_id,
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
    return this.modifierOptionService.updateModifierOption(
      optionId,
      restaurantId,
      updateDto,
    );
  }

  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  @Delete(':id')
  @ApiOperation({
    summary: 'Soft delete modifier option',
    description:
      'Soft deletes a modifier option by setting status to inactive. Requires admin authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Modifier option ID',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Modifier option soft deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 404, description: 'Modifier option not found' })
  async softDeleteModifierOption(
    @Param('id') optionId: string,
    @GetRestaurantId() restaurantId: string,
  ) {
    return this.modifierOptionService.softDeleteModifierOption(
      optionId,
      restaurantId,
    );
  }
}
