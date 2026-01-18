import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { KitchenService } from './kitchen.service';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetRestaurantId } from '../auth/decorators/get-restaurant-id.decorator';
import {
  UpdateOrderItemStatusDto,
  BulkUpdateOrderItemsDto,
  GetKitchenOrdersQueryDto,
} from './dto/kitchen-action.dto';

@ApiTags('Kitchen')
@Controller('kitchen')
@UseGuards(SupabaseJwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class KitchenController {
  constructor(private kitchenService: KitchenService) {}

  /**
   * Get kitchen orders
   * GET /kitchen/orders
   */
  @Get('orders')
  @Roles('kitchen_staff', 'admin')
  @ApiOperation({
    summary: 'Get kitchen orders',
    description:
      'Get all orders with items in accepted, preparing, or ready status',
  })
  @ApiResponse({
    status: 200,
    description: 'Kitchen orders retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Kitchen staff role required',
  })
  async getKitchenOrders(
    @GetRestaurantId() restaurantId: string,
    @Query() query: GetKitchenOrdersQueryDto,
  ) {
    return this.kitchenService.getKitchenOrders(restaurantId, query);
  }

  /**
   * Update order item status
   * PATCH /kitchen/order-items/:id/status
   */
  @Patch('order-items/:id/status')
  @Roles('kitchen_staff', 'admin')
  @ApiOperation({
    summary: 'Update order item status',
    description: 'Update a single order item status to preparing or ready',
  })
  @ApiParam({ name: 'id', description: 'Order item ID' })
  @ApiResponse({
    status: 200,
    description: 'Order item status updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Order item not found' })
  async updateOrderItemStatus(
    @Param('id') orderItemId: string,
    @Body() dto: Omit<UpdateOrderItemStatusDto, 'order_item_id'>,
  ) {
    return this.kitchenService.updateOrderItemStatus({
      ...dto,
      order_item_id: orderItemId,
    });
  }

  /**
   * Bulk update order items status
   * PATCH /kitchen/order-items/bulk-update
   */
  @Patch('order-items/bulk-update')
  @Roles('kitchen_staff', 'admin')
  @ApiOperation({
    summary: 'Bulk update order items',
    description: 'Update multiple order items status at once',
  })
  @ApiResponse({
    status: 200,
    description: 'Order items updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({
    status: 404,
    description: 'One or more order items not found',
  })
  async bulkUpdateOrderItems(@Body() dto: BulkUpdateOrderItemsDto) {
    return this.kitchenService.bulkUpdateOrderItems(dto);
  }

  /**
   * Reject order item
   * POST /kitchen/order-items/:id/reject
   */
  @Post('order-items/:id/reject')
  @Roles('kitchen_staff', 'admin')
  @ApiOperation({
    summary: 'Reject order item',
    description: 'Reject an order item with a reason',
  })
  @ApiParam({ name: 'id', description: 'Order item ID' })
  @ApiResponse({
    status: 200,
    description: 'Order item rejected successfully',
  })
  @ApiResponse({ status: 404, description: 'Order item not found' })
  async rejectOrderItem(
    @Param('id') orderItemId: string,
    @Body() dto: { reason: string },
  ) {
    console.log('Rejecting order item', orderItemId, 'Reason:', dto.reason);
    return this.kitchenService.rejectOrderItem(orderItemId, dto.reason);
  }
}
