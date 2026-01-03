import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { MenuItemService } from './menu-item.service';
import { GuestMenuQueryDto } from './dto/guest-menu.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { QrTokenGuard } from '../tables/guards/qr-token.guard';
import { BadRequestException } from '@nestjs/common';
import { MenuCategoriesListResponseDto } from './dto/menu-response.dto';

@ApiTags('Menu Items - Guest')
@Controller('menu')
export class GuestMenuController {
  constructor(private readonly menuItemService: MenuItemService) {}

  @Get()
  @UseGuards(QrTokenGuard)
  @ApiOperation({
    summary: 'Get public menu',
    description:
      'Retrieve the public menu with optional filtering and pagination. Requires valid QR token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Menu retrieved successfully',
    type: MenuCategoriesListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Restaurant ID is required' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async getGuestMenu(@Query() query: GuestMenuQueryDto, @Req() request: any) {
    const restaurantId = request.qrToken?.restaurantId;
    if (restaurantId) {
      return this.menuItemService.getGuestMenu(query, restaurantId);
    }
    throw new BadRequestException('Restaurant not found');
  }
}
