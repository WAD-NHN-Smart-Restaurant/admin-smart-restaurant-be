import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../utils/const';
import { Database } from '../supabase/supabase.types';
import { CreateTableDto, TableStatus } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { QueryTablesDto } from './dto/query-tables.dto';

type TableRow = Database['public']['Tables']['tables']['Row'];
type TableInsert = Database['public']['Tables']['tables']['Insert'];
type TableUpdate = Database['public']['Tables']['tables']['Update'];

@Injectable()
export class TablesService {
  constructor(
    @Inject(SUPABASE) private readonly supabase: SupabaseClient<Database>,
  ) {}

  /**
   * Create a new table
   */
  async create(createTableDto: CreateTableDto): Promise<TableRow> {
    // Check if table_number already exists
    const { data: existingTable } = await this.supabase
      .from('tables')
      .select('id')
      .eq('table_number', createTableDto.table_number)
      .single();

    if (existingTable) {
      throw new ConflictException(
        `Table number '${createTableDto.table_number}' already exists`,
      );
    }

    // Create the table
    const tableData: TableInsert = {
      table_number: createTableDto.table_number,
      capacity: createTableDto.capacity,
      location: createTableDto.location || null,
      description: createTableDto.description || null,
      status: createTableDto.status || TableStatus.ACTIVE,
    };

    const { data, error } = await this.supabase
      .from('tables')
      .insert(tableData)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create table: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all tables with optional filters and sorting
   */
  async findAll(query: QueryTablesDto): Promise<TableRow[]> {
    let dbQuery = this.supabase.from('tables').select('*');

    // Apply filters
    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status);
    }

    if (query.location) {
      dbQuery = dbQuery.eq('location', query.location);
    }

    // Apply sorting
    const sortBy = query.sortBy || 'created_at';
    const sortOrder = query.sortOrder || 'asc';
    dbQuery = dbQuery.order(sortBy, { ascending: sortOrder === 'asc' });

    const { data, error } = await dbQuery;

    if (error) {
      throw new BadRequestException(`Failed to fetch tables: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a single table by ID
   */
  async findOne(id: string): Promise<TableRow> {
    const { data, error } = await this.supabase
      .from('tables')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Table with ID '${id}' not found`);
    }

    return data;
  }

  /**
   * Update table details
   */
  async update(id: string, updateTableDto: UpdateTableDto): Promise<TableRow> {
    // Check if table exists
    await this.findOne(id);

    // If updating table_number, check for uniqueness
    if (updateTableDto.table_number) {
      const { data: existingTable } = await this.supabase
        .from('tables')
        .select('id')
        .eq('table_number', updateTableDto.table_number)
        .neq('id', id)
        .single();

      if (existingTable) {
        throw new ConflictException(
          `Table number '${updateTableDto.table_number}' already exists`,
        );
      }
    }

    const updateData: TableUpdate = {
      ...updateTableDto,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('tables')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update table: ${error.message}`);
    }

    return data;
  }

  /**
   * Update table status (activate/deactivate)
   */
  async updateStatus(id: string, status: TableStatus): Promise<TableRow> {
    // Check if table exists
    await this.findOne(id);

    // If deactivating, check for active orders
    if (status === TableStatus.INACTIVE) {
      const hasActiveOrders = await this.hasActiveOrders(id);
      if (hasActiveOrders) {
        throw new BadRequestException(
          'Cannot deactivate table with active orders. Please complete or cancel all orders first.',
        );
      }
    }

    const { data, error } = await this.supabase
      .from('tables')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(
        `Failed to update table status: ${error.message}`,
      );
    }

    return data;
  }

  /**
   * Check if table has active orders
   */
  async hasActiveOrders(tableId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('orders')
      .select('id')
      .eq('table_id', tableId)
      .eq('status', 'active')
      .limit(1);

    if (error) {
      throw new BadRequestException(`Failed to check orders: ${error.message}`);
    }

    return data && data.length > 0;
  }

  /**
   * Get table with order status
   */
  async findOneWithOrderStatus(id: string): Promise<{
    table: TableRow;
    hasActiveOrders: boolean;
    activeOrderCount: number;
  }> {
    const table = await this.findOne(id);

    const { data: activeOrders, error } = await this.supabase
      .from('orders')
      .select('id')
      .eq('table_id', id)
      .eq('status', 'active');

    if (error) {
      throw new BadRequestException(`Failed to check orders: ${error.message}`);
    }

    return {
      table,
      hasActiveOrders: activeOrders && activeOrders.length > 0,
      activeOrderCount: activeOrders?.length || 0,
    };
  }

  /**
   * Get all unique locations
   */
  async getLocations(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('tables')
      .select('location')
      .not('location', 'is', null);

    if (error) {
      throw new BadRequestException(
        `Failed to fetch locations: ${error.message}`,
      );
    }

    // Get unique locations
    const locations = [...new Set(data.map((t) => t.location).filter(Boolean))];
    return locations as string[];
  }
}
