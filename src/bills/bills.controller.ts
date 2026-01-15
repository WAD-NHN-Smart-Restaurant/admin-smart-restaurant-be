import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Res,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { BillsService } from './bills.service';
import { SupabaseJwtAuthGuard } from '../auth/guards/supabase-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetRestaurantId } from '../auth/decorators/get-restaurant-id.decorator';
import {
  CreateBillDto,
  ApplyDiscountDto,
  ProcessPaymentDto,
} from './dto/bills.dto';
import { GetRestaurantBillsQueryDto } from './dto/get-restaurant-bills.dto';

@ApiTags('Bills')
@Controller('bills')
@UseGuards(SupabaseJwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class BillsController {
  constructor(private billsService: BillsService) {}

  /**
   * Create bill for a table/order
   * POST /bills
   */
  @Post()
  @Roles('waiter', 'admin')
  @ApiOperation({
    summary: 'Create bill for table',
    description: 'Generate bill with all order items, subtotal, tax, and total',
  })
  @ApiResponse({
    status: 201,
    description: 'Bill created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async createBill(@Body() dto: CreateBillDto) {
    return this.billsService.createBill(dto);
  }

  /**
   * Get bill by order ID
   * GET /bills/:orderId
   */
  @Get(':orderId')
  @Roles('waiter', 'admin', 'customer')
  @ApiOperation({
    summary: 'Get bill details',
    description: 'Get complete bill details for an order',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Bill details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Bill not found' })
  async getBill(@Param('orderId') orderId: string) {
    return this.billsService.getBill(orderId);
  }

  /**
   * Apply discount to bill
   * POST /bills/:orderId/discount
   */
  @Post(':orderId/discount')
  @Roles('waiter', 'admin')
  @ApiOperation({
    summary: 'Apply discounts',
    description: 'Apply percentage or fixed amount discounts to bill',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Discount applied successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async applyDiscount(
    @Param('orderId') orderId: string,
    @Body() dto: ApplyDiscountDto,
  ) {
    return this.billsService.applyDiscount(orderId, dto);
  }

  /**
   * Process payment
   * POST /bills/:orderId/payment
   */
  @Post(':orderId/payment')
  @Roles('waiter', 'admin')
  @ApiOperation({
    summary: 'Process payment',
    description: 'Mark bill as paid (cash, card, or e-wallet)',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Payment processed successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async processPayment(
    @Param('orderId') orderId: string,
    @Body() dto: ProcessPaymentDto,
  ) {
    return this.billsService.processPayment(orderId, dto);
  }

  /**
   * Print/Download bill
   * GET /bills/:orderId/print
   */
  @Get(':orderId/print')
  @Roles('waiter', 'admin')
  @ApiOperation({
    summary: 'Print bill',
    description: 'Print bill to thermal printer or download as PDF',
  })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({
    status: 200,
    description: 'Bill data for printing',
  })
  async printBill(@Param('orderId') orderId: string, @Res() res: Response) {
    const billData = await this.billsService.getBill(orderId);

    // Return bill data formatted for printing
    // In production, you would integrate with thermal printer or PDF generator
    res.json({
      message: 'Bill ready for printing',
      printData: billData,
      format: 'thermal', // or 'pdf'
    });
  }

  /**
   * Get all bills for restaurant
   * GET /bills/restaurant/all
   */
  @Get('restaurant/all')
  @Roles('waiter', 'admin')
  @ApiOperation({
    summary: 'Get restaurant bills',
    description:
      'Get all bills for the restaurant with pagination and filtering',
  })
  @ApiResponse({
    status: 200,
    description: 'Bills retrieved successfully',
  })
  async getRestaurantBills(
    @GetRestaurantId() restaurantId: string,
    @Query() query: GetRestaurantBillsQueryDto,
  ) {
    return this.billsService.getRestaurantBills(restaurantId, query);
  }
}
