import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  Query,
  Param,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersGateway } from './orders.gateway';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { Request as ExpressRequest } from 'express';
import { QrTokenGuard } from '../tables/guards/qr-token.guard';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private ordersGateway: OrdersGateway,
  ) {}

  /**
   * Guest: Create new order or add items to existing order
   * POST /guest/orders
   */
  @Post('guest')
  @UseGuards(QrTokenGuard)
  async createOrAddOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Request()
    req: ExpressRequest & {
      qrToken?: { tableId: string; restaurantId: string };
    },
  ) {
    const { tableId, restaurantId } = req.qrToken!;
    const { guestName, notes } = createOrderDto;

    const order = await this.ordersService.createOrAddOrder(
      tableId,
      restaurantId,
      createOrderDto,
      guestName,
      notes,
    );

    return {
      status: true,
      data: order,
      message: 'Order created/updated successfully',
    };
  }

  /**
   * Guest: Get current active order
   * GET /guest/orders
   */
  @Get('guest')
  @UseGuards(QrTokenGuard)
  async getActiveOrder(
    @Request()
    req: ExpressRequest & {
      qrToken?: { tableId: string };
    },
  ) {
    const { tableId } = req.qrToken!;

    const order = await this.ordersService.getActiveOrderForGuest(tableId);

    return {
      status: true,
      data: order,
    };
  }

  /**
   * Guest: Request bill (change status to payment_pending)
   * POST /guest/request-bill
   */
  @Post('guest/request-bill')
  @UseGuards(QrTokenGuard)
  async requestBill(
    @Request()
    req: ExpressRequest & {
      qrToken?: { tableId: string; restaurantId: string };
    },
  ) {
    const { tableId, restaurantId } = req.qrToken!;

    const order = await this.ordersService.requestBill(tableId, restaurantId);

    return {
      status: true,
      data: order,
      message: 'Bill requested successfully',
    };
  }

  /**
   * Guest: Call waiter
   * POST /guest/call-waiter
   */
  @Post('guest/call-waiter')
  @UseGuards(QrTokenGuard)
  callWaiter(
    @Request()
    req: ExpressRequest & {
      qrToken?: { tableId: string; restaurantId: string };
    },
  ) {
    const { tableId, restaurantId } = req.qrToken!;

    // Emit call waiter notification via WebSocket
    this.ordersGateway.emitCallWaiter(tableId, restaurantId);

    return {
      status: true,
      message: 'Waiter called successfully',
    };
  }

  /**
   * Admin: Get all orders for restaurant with pagination
   * GET /admin/orders
   */
  @Get('admin')
  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  async getRestaurantOrders(
    @Request()
    req: ExpressRequest & {
      qrToken?: { restaurantId: string };
    },
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    const restaurantId = req.qrToken!.restaurantId;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offset = (pageNum - 1) * limitNum;

    const result = await this.ordersService.getRestaurantOrders(
      restaurantId,
      limitNum,
      offset,
    );

    return {
      status: true,
      data: result.data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.count,
      },
    };
  }

  /**
   * Admin/Kitchen: Get order by ID
   * GET /admin/orders/:id
   */
  @Get('admin/:id')
  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  async getOrder(@Param('id') orderId: string) {
    const order = await this.ordersService.getOrder(orderId);

    return {
      status: true,
      data: order,
    };
  }

  /**
   * Admin/Kitchen: Update order status
   * PATCH /admin/orders/:id/status
   */
  @Patch('admin/:id/status')
  @UseGuards(SupabaseJwtAuthGuard, AdminGuard)
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Body() body: { status: string },
  ) {
    const { status } = body;

    const order = await this.ordersService.updateOrderStatus(orderId, status);

    return {
      status: true,
      data: order,
      message: 'Order status updated successfully',
    };
  }

  /**
   * Customer: Get order history
   * GET /customer/history
   */
  @Get('customer/history')
  @UseGuards(SupabaseJwtAuthGuard)
  async getCustomerOrderHistory(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const customerId = req.user.id;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const result = await this.ordersService.getCustomerOrderHistory(
      customerId,
      limitNum,
      offset,
    );

    return {
      status: true,
      data: result.data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.count,
      },
    };
  }

  /**
   * Customer: Create a review for a menu item
   * POST /customer/reviews
   */
  @Post('customer/reviews')
  @UseGuards(SupabaseJwtAuthGuard)
  async createReview(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Body() createReviewDto: CreateReviewDto,
  ) {
    const customerId = req.user.id;
    const { menuItemId, orderId, rating, comment } = createReviewDto;

    const review = await this.ordersService.createReview(
      customerId,
      menuItemId,
      orderId,
      rating,
      comment,
    );

    return {
      status: true,
      data: review,
      message: 'Review created successfully',
    };
  }

  /**
   * Customer: Get my reviews
   * GET /customer/reviews
   */
  @Get('customer/reviews')
  @UseGuards(SupabaseJwtAuthGuard)
  async getCustomerReviews(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const customerId = req.user.id;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const result = await this.ordersService.getCustomerReviews(
      customerId,
      limitNum,
      offset,
    );

    return {
      status: true,
      data: result.data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.count,
      },
    };
  }

  /**
   * Customer: Get order details with item processing statuses
   * GET /customer/orders/:id
   */
  @Get('customer/:id')
  @UseGuards(SupabaseJwtAuthGuard)
  async getCustomerOrderDetails(
    @Request() req: ExpressRequest & { user: { id: string } },
    @Param('id') orderId: string,
  ) {
    const customerId = req.user.id;
    const order = await this.ordersService.getOrderDetails(orderId, customerId);

    return {
      status: true,
      data: order,
    };
  }

  /**
   * Get reviews for a menu item (public)
   * GET /menu-items/:id/reviews
   */
  @Get('menu-items/:id/reviews')
  async getMenuItemReviews(
    @Param('id') menuItemId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const result = await this.ordersService.getMenuItemReviews(
      menuItemId,
      limitNum,
      offset,
    );

    return {
      status: true,
      data: result.data,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.count,
      },
    };
  }
}
