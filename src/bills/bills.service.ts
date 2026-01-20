/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { Database } from '../supabase/supabase.types';

type OrderItem = Database['public']['Tables']['order_items']['Row'];
type OrderItemStatus = Database['public']['Enums']['order_item_status'];
type OrderStatus = Database['public']['Enums']['order_status'];
type PaymentMethod = Database['public']['Enums']['payment_method'];
type PaymentStatus = Database['public']['Enums']['payment_status'];
type MenuItem = Database['public']['Tables']['menu_items']['Row'];
type OrderItemOption =
  Database['public']['Tables']['order_item_options']['Row'];
type ModifierOption = Database['public']['Tables']['modifier_options']['Row'];
type Table = Database['public']['Tables']['tables']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];
type Payment = Database['public']['Tables']['payments']['Row'];

interface OrderItemOptionWithModifier extends OrderItemOption {
  modifier_option?: ModifierOption;
}

interface OrderItemWithRelations extends OrderItem {
  menu_item?: MenuItem;
  order_item_options?: OrderItemOptionWithModifier[];
}

interface OrderWithRelations extends Order {
  table?: Table;
  order_items?: OrderItemWithRelations[];
  payments?: Payment[];
}

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

  /**
   * Create bill for a table/order
   */
  async createBill(dto: CreateBillDto) {
    const { order_id, payment_method } = dto;

    // Get order with all items
    const order = await this.billsRepository.getOrderForBill(order_id);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === 'completed' || order.status === 'payment_pending') {
      throw new BadRequestException('Bill already generated for this order');
    }

    // // Check if all items are served
    // const hasUnservedItems = order.order_items?.some(
    //   (item) => item.status !== 'served' && item.status !== 'rejected',
    // );

    // if (hasUnservedItems) {
    //   throw new BadRequestException(
    //     'Cannot create bill. Some items are not served yet.',
    //   );
    // }

    // Get total amount from order
    const totalAmount = order.total_amount || 0;

    if (!totalAmount) {
      throw new BadRequestException('Order total amount is not calculated');
    }

    // Update order status to payment_pending
    await this.billsRepository.updateOrderStatus(order_id, 'payment_pending');

    // Create payment record with pending status
    const payment = await this.billsRepository.createPayment(order_id, {
      paymentMethod: payment_method,
      amount: totalAmount,
    });

    // Get updated order
    const updatedOrder = await this.billsRepository.getBillByOrderId(order_id);

    const billData = {
      bill: {
        orderId: updatedOrder.id,
        tableNumber: updatedOrder.table?.table_number,
        items: updatedOrder.order_items?.map((item) => ({
          id: item.id,
          name: item.menu_item?.name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          modifiers: item.order_item_options?.map((opt) => ({
            name: opt.modifier_option?.name,
            price: opt.price_at_time || opt.modifier_option?.price_adjustment,
          })),
          totalPrice: item.total_price,
        })),
        total: totalAmount,
        status: updatedOrder.status,
        paymentId: payment.id,
        createdAt: updatedOrder.created_at,
      },
    };

    // Notify via WebSocket
    if (updatedOrder.table_id) {
      // Get restaurant ID from the order's table relationship
      const orderWithTable = await this.billsRepository.getOrderWithTable(
        updatedOrder.id,
      );
      const restaurantId = orderWithTable?.tables?.restaurant_id;

      if (restaurantId) {
        this.ordersGateway.notifyBillCreated(
          restaurantId,
          updatedOrder.table_id,
          billData.bill,
        );
      } else {
        console.warn('Restaurant ID not found for bill creation');
      }
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

    // Get the payment record
    const payment = await this.billsRepository.getPaymentByOrderId(orderId);

    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }

    // Get existing metadata and check if originPrice already exists
    const existingMetadata = (payment.metadata as Record<string, any>) || {};
    const originPrice =
      (existingMetadata.originPrice as number) || payment.amount;

    // Calculate discount based on origin price
    let discountAmount = 0;

    if (dto.discount_type === 'percentage') {
      discountAmount = (originPrice * dto.discount_value) / 100;
    } else {
      discountAmount = dto.discount_value;
    }

    const newTotal = Math.max(0, originPrice - discountAmount);

    // Prepare updated metadata - preserve existing fields and add discount info
    const updatedMetadata = {
      ...existingMetadata,
      discountType: dto.discount_type,
      discountValue: dto.discount_value,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      discountReason: dto.reason || null,
      originPrice: originPrice, // Keep the original price from first discount
    };

    // Update payment with new amount and metadata
    await this.billsRepository.updatePaymentAmountAndMetadata(
      payment.id,
      newTotal,
      updatedMetadata,
    );

    // Update order total
    await this.billsRepository.updateOrderTotals(orderId, newTotal);

    return {
      message: 'Discount applied successfully',
      bill: {
        orderId: order.id,
        discount: parseFloat(discountAmount.toFixed(2)),
        discountReason: dto.reason,
        total: newTotal,
        originPrice: originPrice,
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
    if (order.table_id) {
      // Get restaurant ID from the order's table relationship
      const orderWithTable = await this.billsRepository.getOrderWithTable(
        order.id,
      );
      const restaurantId = orderWithTable?.tables?.restaurant_id;

      if (restaurantId) {
        this.ordersGateway.notifyPaymentCompleted(
          restaurantId,
          order.table_id,
          paymentResult.payment,
        );
      } else {
        console.warn('Restaurant ID not found for payment completion');
      }
    }

    return paymentResult;
  }

  /**
   * Get bill details by payment ID
   */
  async getBillByPaymentId(paymentId: string) {
    const payment = await this.billsRepository.getPaymentById(paymentId);

    if (!payment || !payment.order_id) {
      throw new NotFoundException('Payment not found');
    }

    return this.getBill(payment.order_id);
  }

  /**
   * Get bill details
   */
  async getBill(orderId: string) {
    const order = await this.billsRepository.getBillByOrderId(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Get payment for this order
    const payment = await this.billsRepository.getPaymentByOrderId(orderId);

    if (!payment) {
      throw new NotFoundException('Payment not found for this order');
    }

    // Get metadata for discount info
    const metadata = (payment.metadata as Record<string, any>) || {};
    const discountAmount = (metadata.discountAmount as number) || 0;
    const originPrice = (metadata.originPrice as number) || payment.amount;

    // Calculate subtotal and tax from payment amount
    // total = subtotal + tax, and total = subtotal * 1.1
    // So subtotal = total / 1.1
    const total = payment.amount;
    const subtotal =
      discountAmount > 0
        ? originPrice / (1 + this.TAX_RATE)
        : total / (1 + this.TAX_RATE);
    const tax = total - subtotal;

    return {
      bill: {
        orderId: order.id,
        tableNumber: order.table?.table_number,
        items: order.order_items?.map((item) => ({
          id: item.id,
          name: item.menu_item?.name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          modifiers: item.order_item_options?.map((opt) => ({
            name: opt.modifier_option?.name,
            price: opt.price_at_time || opt.modifier_option?.price_adjustment,
          })),
          totalPrice: item.total_price,
        })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        discount: discountAmount,
        tax: parseFloat(tax.toFixed(2)),
        total: total,
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
      waiterId?: string;
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
      items: bills.items.map((payment) => {
        // Get order total from orders table
        const orderTotal = payment.order?.total_amount || 0;
        // Calculate tax (10%)
        const tax = orderTotal * 0.1;
        // Get discount amount if it exists
        const discountAmount = payment.discount_amount || 0;
        // Final total with discount and tax
        const finalTotal = (orderTotal - discountAmount) * 1.1;

        return {
          orderId: payment.order?.id,
          paymentId: payment.id,
          tableNumber: payment.order?.table?.table_number,
          totalAmount: orderTotal,
          tax: tax,
          discountAmount: discountAmount,
          finalTotal: finalTotal,
          status: payment.order?.status,
          itemCount: payment.order?.order_items?.length || 0,
          paymentStatus: payment.status,
          discountRate: payment.discount_rate,
          paymentMethod: payment.payment_method,
          createdAt: payment.created_at,
          updatedAt: payment.updated_at,
        };
      }),
      pagination: bills.pagination,
    };
  }
}
