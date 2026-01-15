import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiExtraModels,
} from '@nestjs/swagger';
import { WaiterService } from './waiter.service';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GetRestaurantId } from '../auth/decorators/get-restaurant-id.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import {
  AcceptOrderItemDto,
  RejectOrderItemDto,
  SendToKitchenDto,
  MarkAsServedDto,
} from './dto/waiter-action.dto';
import { GetWaiterOrdersQueryDto } from './dto/get-waiter-orders.dto';
import {
  OrdersListResponseDto,
  OrderResponseDto,
} from './dto/waiter-response.dto';

@ApiTags('Waiter')
@Controller('waiter')
@UseGuards(SupabaseJwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
@ApiExtraModels(OrdersListResponseDto, OrderResponseDto)
export class WaiterController {
  constructor(private waiterService: WaiterService) {}

  /**
   * Get waiter orders with filtering
   * GET /waiter/orders
   */
  @Get('orders')
  @Roles('waiter', 'admin')
  @ApiOperation({
    summary: 'Get waiter orders',
    description: 'Get all orders with filtering and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
    type: OrdersListResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Waiter role required' })
  async getWaiterOrders(
    @GetRestaurantId() restaurantId: string,
    @Query() query: GetWaiterOrdersQueryDto,
  ) {
    return this.waiterService.getWaiterOrders(restaurantId, query);
  }

  /**
   * Accept an order item
   * POST /waiter/orders/items/:id/accept
   */
  @Post('orders/items/:id/accept')
  @Roles('waiter', 'admin')
  @ApiOperation({
    summary: 'Accept order item',
    description: 'Waiter accepts an individual order item',
  })
  @ApiParam({ name: 'id', description: 'Order item ID' })
  @ApiResponse({ status: 200, description: 'Order item accepted successfully' })
  @ApiResponse({ status: 404, description: 'Order item not found' })
  async acceptOrderItem(
    @Param('id') orderItemId: string,
    @Body() dto: AcceptOrderItemDto,
  ) {
    return this.waiterService.acceptOrderItem(orderItemId, dto);
  }

  /**
   * Reject an order item
   * POST /waiter/orders/items/:id/reject
   */
  @Post('orders/items/:id/reject')
  @Roles('waiter', 'admin')
  @ApiOperation({
    summary: 'Reject order item',
    description: 'Waiter rejects an individual order item with reason',
  })
  @ApiParam({ name: 'id', description: 'Order item ID' })
  @ApiResponse({ status: 200, description: 'Order item rejected successfully' })
  @ApiResponse({ status: 404, description: 'Order item not found' })
  async rejectOrderItem(
    @Param('id') orderItemId: string,
    @Body() dto: RejectOrderItemDto,
  ) {
    return this.waiterService.rejectOrderItem(orderItemId, dto);
  }

  /**
   * Send accepted orders to kitchen
   * POST /waiter/orders/send-to-kitchen
   */
  @Post('orders/send-to-kitchen')
  @Roles('waiter', 'admin')
  @ApiOperation({
    summary: 'Send orders to kitchen',
    description: 'Forward accepted orders to Kitchen Display System',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders sent to kitchen successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid order items or status',
  })
  async sendToKitchen(@Body() dto: SendToKitchenDto) {
    console.log('Received request to send to kitchen:', dto);
    return this.waiterService.sendToKitchen(dto);
  }

  /**
   * Mark order items as served
   * POST /waiter/orders/mark-served
   */
  @Post('orders/mark-served')
  @Roles('waiter', 'admin')
  @ApiOperation({
    summary: 'Mark orders as served',
    description: 'Update order status when food is delivered to table',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders marked as served successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid order items or status' })
  async markAsServed(@Body() dto: MarkAsServedDto) {
    return this.waiterService.markAsServed(dto);
  }

  /**
   * Get assigned tables for waiter
   * GET /waiter/tables
   */
  @Get('tables')
  @Roles('waiter', 'admin')
  @ApiOperation({
    summary: 'View assigned tables',
    description: 'See tables assigned to the waiter',
  })
  @ApiResponse({
    status: 200,
    description: 'List of assigned tables retrieved successfully',
  })
  async getAssignedTables(
    @CurrentUser() user: AuthenticatedUser,
    @GetRestaurantId() restaurantId: string,
  ) {
    return this.waiterService.getAssignedTables(user.id, restaurantId);
  }

  /**
   * Get orders for a specific table
   * GET /waiter/tables/:tableId/orders
   */
  @Get('tables/:tableId/orders')
  @Roles('waiter', 'admin')
  @ApiOperation({
    summary: 'Get table orders',
    description: 'Get all orders for a specific table',
  })
  @ApiParam({ name: 'tableId', description: 'Table ID' })
  @ApiResponse({
    status: 200,
    description: 'Table orders retrieved successfully',
  })
  async getTableOrders(@Param('tableId') tableId: string) {
    return this.waiterService.getTableOrders(tableId);
  }
}
