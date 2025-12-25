import { Controller, Get, Query } from '@nestjs/common';
import { MenuService } from './menu.service';
import { GuestMenuQueryDto } from './dto/guest-menu.dto';
import { GetRestaurantId } from '../auth/decorators/get-restaurant-id.decorator';

@Controller('menu')
export class GuestMenuController {
  constructor(private readonly menuService: MenuService) {}

  // Guest Menu API (no auth required)
  @Get()
  async getGuestMenu(
    @GetRestaurantId() restaurantId: string,
    @Query() query: GuestMenuQueryDto,
  ) {
    return this.menuService.getGuestMenu(restaurantId, query);
  }
}
