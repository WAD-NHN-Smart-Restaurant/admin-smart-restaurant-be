import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Database } from '../supabase/supabase.types';
import { CreateTableDto, TableStatus } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { QueryTablesDto } from './dto/query-tables.dto';
import { TablesRepository } from './tables.repository';

type TableRow = Database['public']['Tables']['tables']['Row'];
type TableInsert = Database['public']['Tables']['tables']['Insert'];

@Injectable()
export class TablesService {
  constructor(private readonly tablesRepository: TablesRepository) {}

  async create(createTableDto: CreateTableDto): Promise<TableRow> {
    const existingTable = await this.tablesRepository.findByTableNumber(
      createTableDto.table_number,
    );

    if (existingTable) {
      throw new ConflictException(
        `Table number '${createTableDto.table_number}' already exists`,
      );
    }

    const tableData: TableInsert = {
      table_number: createTableDto.table_number,
      capacity: createTableDto.capacity,
      location: createTableDto.location || null,
      description: createTableDto.description || null,
      status: createTableDto.status || TableStatus.AVAILABLE,
    };

    try {
      return await this.tablesRepository.create(tableData);
    } catch (error) {
      throw new BadRequestException(`Failed to create table: ${error.message}`);
    }
  }

  async findAll(query: QueryTablesDto): Promise<TableRow[]> {
    try {
      return await this.tablesRepository.findAll({
        status: query.status,
        location: query.location,
        sortBy: query.sortBy || 'created_at',
        sortOrder: query.sortOrder || 'asc',
      });
    } catch (error) {
      throw new BadRequestException(`Failed to fetch tables: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<TableRow> {
    const table = await this.tablesRepository.findById(id);

    if (!table) {
      throw new NotFoundException(`Table with ID '${id}' not found`);
    }

    return table;
  }

  async update(id: string, updateTableDto: UpdateTableDto): Promise<TableRow> {
    // Check if table exists
    await this.findOne(id);

    // If updating table_number, check for uniqueness
    if (updateTableDto.table_number) {
      const existingTable =
        await this.tablesRepository.findByTableNumberExcludingId(
          updateTableDto.table_number,
          id,
        );

      if (existingTable) {
        throw new ConflictException(
          `Table number '${updateTableDto.table_number}' already exists`,
        );
      }
    }

    try {
      return await this.tablesRepository.update(id, updateTableDto);
    } catch (error) {
      throw new BadRequestException(`Failed to update table: ${error.message}`);
    }
  }

  async updateStatus(id: string, status: TableStatus): Promise<TableRow> {
    // Check if table exists
    await this.findOne(id);

    // If deactivating, check for active orders
    if (status === TableStatus.INACTIVE) {
      const activeOrderCount =
        await this.tablesRepository.countActiveOrders(id);

      if (activeOrderCount > 0) {
        throw new BadRequestException(
          `Cannot deactivate table with ${activeOrderCount} active order(s). Please complete or cancel all orders first.`,
        );
      }
    }

    try {
      return await this.tablesRepository.updateStatus(id, status);
    } catch (error) {
      throw new BadRequestException(
        `Failed to update table status: ${error.message}`,
      );
    }
  }

  /**
   * Get table with order status
   * Business logic: Aggregate table data with active order information
   */
  async findOneWithOrderStatus(id: string): Promise<{
    table: TableRow;
    hasActiveOrders: boolean;
    activeOrderCount: number;
  }> {
    const table = await this.findOne(id);

    try {
      const activeOrderCount =
        await this.tablesRepository.countActiveOrders(id);

      return {
        table,
        hasActiveOrders: activeOrderCount > 0,
        activeOrderCount,
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch order status: ${error.message}`,
      );
    }
  }

  /**
   * Get all unique locations
   */
  async getLocations(): Promise<string[]> {
    try {
      return await this.tablesRepository.getUniqueLocations();
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch locations: ${error.message}`,
      );
    }
  }
}
