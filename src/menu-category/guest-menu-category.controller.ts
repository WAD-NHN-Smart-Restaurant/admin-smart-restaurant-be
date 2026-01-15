import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { QrTokenGuard } from '../tables/guards/qr-token.guard';
import { BadRequestException } from '@nestjs/common';
import { MenuCategoriesListResponseDto } from '../menu-item/dto/menu-response.dto';
import { MenuCategoryService } from './menu-category.service';
import { GuestMenuCategoryQueryDto } from './dto/guest-menu-category.dto';

@ApiTags('Menu Categories - Guest')
@Controller('menu/categories')
export class GuestMenuCategoryController {
  constructor(private readonly menuCategoryService: MenuCategoryService) {}

  @Get()
  @UseGuards(QrTokenGuard)
  @ApiOperation({
    summary: 'Get active menu categories for guests',
    description:
      'Retrieves active menu categories for the restaurant. Accessible by guests with valid QR token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Active categories retrieved successfully',
    type: MenuCategoriesListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - restaurant not found',
  })
  async getGuestCategories(
    @Query() query: GuestMenuCategoryQueryDto,
    @Req() request: any,
  ) {
    const restaurantId = request.qrToken?.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant not found');
    }
    return this.menuCategoryService.getActiveCategories(restaurantId);
  }
}
