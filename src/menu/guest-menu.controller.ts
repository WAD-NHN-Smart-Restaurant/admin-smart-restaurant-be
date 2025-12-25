import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { MenuService } from './menu.service';
import { GuestMenuQueryDto } from './dto/guest-menu.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { QrTokenGuard } from '../tables/guards/qr-token.guard';
import { BadRequestException } from '@nestjs/common';
import { MenuCategoriesListResponseDto } from './dto/menu-response.dto';

@ApiTags('Menu - Guest')
@Controller('menu')
export class GuestMenuController {
  constructor(private readonly menuService: MenuService) {}

  // Guest Menu API (requires QR token)
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
    // Get restaurantId from QR token, fallback to query param for backward compatibility
    const restaurantId = request.qrToken?.restaurantId || query.restaurantId;
    if (!restaurantId) {
      throw new BadRequestException('Restaurant ID is required');
    }

    return this.menuService.getGuestMenu({ ...query, restaurantId });
  }
}
