import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { BillsRepository } from './bills.repository';
import {
  CreateBillDto,
  ApplyDiscountDto,
  ProcessPaymentDto,
} from './dto/bills.dto';
import { OrdersGateway } from '../gateways/orders.gateway';

@Injectable()
export class BillsService {
  // Tax rate (10%)
  private readonly TAX_RATE = 0.1;

  constructor(
    private billsRepository: BillsRepository,
    @Inject(forwardRef(() => OrdersGateway))
    private ordersGateway: OrdersGateway,
  ) {}

  /**
   * Calculate bill totals from order items
   */
  private calculateBillTotals(
    orderItems: Array<{
      status: string;
      total_price?: number;
      unit_price: number;
      quantity: number;
    }>,
    discount: number = 0,
  ) {
    // Calculate subtotal from all served items
    const subtotal = orderItems
      .filter((item) => item.status === 'served')
      .reduce((sum, item) => {
        const itemTotal = item.total_price || item.unit_price * item.quantity;
        return sum + itemTotal;
      }, 0);

    // Apply discount
    const discountAmount = discount;
    const subtotalAfterDiscount = Math.max(0, subtotal - discountAmount);

    // Calculate tax
    const tax = subtotalAfterDiscount * this.TAX_RATE;

    // Calculate total
    const total = subtotalAfterDiscount + tax;

    return {
      subtotal,
      discount: discountAmount,
      tax: parseFloat(tax.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
    };
  }

  /**
   * Create bill for a table/order
   */
  async createBill(dto: CreateBillDto) {
    const { order_id } = dto;

    // Get order with all items
    const order = await this.billsRepository.getOrderForBill(order_id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'completed') {
      throw new BadRequestException('Bill already generated for this order');
    }

    // Check if all items are served
    const hasUnservedItems = order.order_items?.some(
      (item: any) => item.status !== 'served' && item.status !== 'rejected',
    );

    if (hasUnservedItems) {
      throw new BadRequestException(
        'Cannot create bill. Some items are not served yet.',
      );
    }

    // Calculate totals
    const totals = this.calculateBillTotals(order.order_items || [], 0);

    // Update order with totals and change status to payment_pending
    await this.billsRepository.updateOrderTotals(order_id, totals.total);
    await this.billsRepository.updateOrderStatus(order_id, 'payment_pending');

    // Get updated order
    const updatedOrder = await this.billsRepository.getBillByOrderId(order_id);

    const billData = {
      bill: {
        orderId: updatedOrder.id,
        tableNumber: updatedOrder.table?.table_number,
        items: updatedOrder.order_items?.map((item: any) => ({
          id: item.id,
          name: item.menu_item?.name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          modifiers: item.order_item_options?.map((opt: any) => ({
            name: opt.modifier_option?.name,
            price: opt.price_at_time || opt.modifier_option?.price_adjustment,
          })),
          totalPrice: item.total_price,
        })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
        status: updatedOrder.status,
        createdAt: updatedOrder.created_at,
      },
    };

    // Notify via WebSocket
    if (updatedOrder.table?.restaurant_id) {
      this.ordersGateway.notifyBillCreated(
        updatedOrder.table.restaurant_id,
        billData.bill,
      );
    }

    return billData;
  }

  /**
   * Apply discount to bill
   */
  async applyDiscount(orderId: string, dto: ApplyDiscountDto) {
    const order = await this.billsRepository.getBillByOrderId(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'completed') {
      throw new BadRequestException('Cannot apply discount to completed order');
    }

    let discountAmount = 0;

    if (dto.discount_type === 'percentage') {
      const subtotal =
        order.order_items?.reduce(
          (sum: number, item: any) => sum + (item.total_price || 0),
          0,
        ) || 0;
      discountAmount = (subtotal * dto.discount_value) / 100;
    } else {
      discountAmount = dto.discount_value;
    }

    // Recalculate totals with discount
    const totals = this.calculateBillTotals(
      order.order_items || [],
      discountAmount,
    );

    // Update order
    await this.billsRepository.updateOrderTotals(orderId, totals.total);

    // Get updated order
    const updatedOrder = await this.billsRepository.getBillByOrderId(orderId);

    return {
      message: 'Discount applied successfully',
      bill: {
        orderId: updatedOrder.id,
        subtotal: totals.subtotal,
        discount: totals.discount,
        discountReason: dto.reason,
        tax: totals.tax,
        total: totals.total,
      },
    };
  }

  /**
   * Process payment for bill
   */
  async processPayment(orderId: string, dto: ProcessPaymentDto) {
    const order = await this.billsRepository.getBillByOrderId(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'completed') {
      throw new BadRequestException('Order already paid');
    }

    if (!order.total_amount) {
      throw new BadRequestException('Bill not generated for this order');
    }

    // Create payment record
    const payment = await this.billsRepository.createPayment(orderId, {
      paymentMethod: dto.payment_method,
      amount: order.total_amount,
    });

    // Update order status to completed
    await this.billsRepository.updateOrderStatus(orderId, 'completed');

    const paymentResult = {
      message: 'Payment processed successfully',
      payment: {
        id: payment.id,
        amount: payment.amount,
        paymentMethod: payment.payment_method,
        status: payment.status,
        orderId: payment.order_id,
      },
    };

    // Notify via WebSocket
    if (order.table?.restaurant_id) {
      this.ordersGateway.notifyPaymentCompleted(
        order.table.restaurant_id,
        paymentResult.payment,
      );
    }

    return paymentResult;
  }

  /**
   * Get bill details
   */
  async getBill(orderId: string) {
    const order = await this.billsRepository.getBillByOrderId(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const totals = this.calculateBillTotals(order.order_items || [], 0);

    return {
      bill: {
        orderId: order.id,
        tableNumber: order.table?.table_number,
        items: order.order_items?.map((item: any) => ({
          id: item.id,
          name: item.menu_item?.name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          modifiers: item.order_item_options?.map((opt: any) => ({
            name: opt.modifier_option?.name,
            price: opt.price_at_time || opt.modifier_option?.price_adjustment,
          })),
          totalPrice: item.total_price,
        })),
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total: order.total_amount || totals.total,
        status: order.status,
        payments: order.payments,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      },
    };
  }

  /**
   * Get all bills for restaurant
   */
  async getRestaurantBills(
    restaurantId: string,
    query: {
      status?: string;
      paymentMethod?: string;
      tableNumber?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      page?: number;
      limit?: number;
    } = {},
  ) {
    const bills = await this.billsRepository.getBillsByRestaurant(
      restaurantId,
      query,
    );

    return {
      items: bills.items.map((order) => ({
        orderId: order.id,
        tableNumber: order.table?.table_number,
        totalAmount: order.total_amount,
        status: order.status,
        itemCount: order.order_items?.length || 0,
        paymentStatus: order.payments?.[0]?.status,
        paymentMethod: order.payments?.[0]?.payment_method,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      })),
      pagination: bills.pagination,
    };
  }
}
