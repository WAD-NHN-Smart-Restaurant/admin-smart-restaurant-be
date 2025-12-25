import { Controller, Get, Query } from '@nestjs/common';
import { MenuService } from './menu.service';
import { GuestMenuQueryDto } from './dto/guest-menu.dto';
import { GetRestaurantId } from '../auth/decorators/get-restaurant-id.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Menu - Guest')
@Controller('menu')
export class GuestMenuController {
  constructor(private readonly menuService: MenuService) {}

  // Guest Menu API (no auth required)
  @Get()
  @ApiOperation({
    summary: 'Get public menu',
    description:
      'Retrieve the public menu with optional filtering and pagination. No authentication required.',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search query to filter menu items by name or description',
    example: 'pizza',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    description: 'Filter by menu category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({
    name: 'chefRecommended',
    required: false,
    description: 'Filter by chef recommended items only',
    example: true,
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    description: 'Sort order for the results',
    enum: ['name', 'price_asc', 'price_desc', 'popularity'],
    example: 'name',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of items per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Menu retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Menu retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: '550e8400-e29b-41d4-a716-446655440000',
                  },
                  name: { type: 'string', example: 'Margherita Pizza' },
                  price: { type: 'number', example: 15.99 },
                  description: {
                    type: 'string',
                    example:
                      'Classic pizza with tomato sauce, mozzarella cheese, and fresh basil',
                  },
                  status: {
                    type: 'string',
                    example: 'available',
                    enum: ['available', 'unavailable', 'sold_out'],
                  },
                  is_chef_recommended: { type: 'boolean', example: true },
                  category: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                    },
                  },
                  photos: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        url: { type: 'string' },
                        is_primary: { type: 'boolean' },
                      },
                    },
                  },
                  modifier_groups: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        options: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              name: { type: 'string' },
                              price_adjustment: { type: 'number' },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 20 },
                total: { type: 'number', example: 150 },
                totalPages: { type: 'number', example: 8 },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
  })
  async getGuestMenu(
    @GetRestaurantId() restaurantId: string,
    @Query() query: GuestMenuQueryDto,
  ) {
    return this.menuService.getGuestMenu(restaurantId, query);
  }
}
