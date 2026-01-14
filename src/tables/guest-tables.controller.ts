import {
  Controller,
  Get,
  Param,
  //   UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { TablesService } from './tables.service';
// import { QrTokenGuard } from './guards/qr-token.guard';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

/**
 * Guest-facing tables controller
 * Allows guests to fetch table info using QR token from JWT
 * Does NOT require admin authentication
 */
@ApiTags('Guest Tables')
@Controller('tables')
export class GuestTablesController {
  constructor(private readonly tablesService: TablesService) {}

  /**
   * Get table info by ID for guest
   * Uses QR token from JWT for verification
   * Returns table_number to display in header
   *
   * GET /tables/:id
   * Authorization: Bearer <JWT with tableId>
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get table info for guest',
    description:
      'Fetch table information including table_number for display. Does not require admin auth.',
  })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResponse({
    status: 200,
    description: 'Table info retrieved successfully',
    schema: {
      example: {
        id: 'table-uuid',
        table_number: '5',
        capacity: 4,
        location: 'Window',
        status: 'available',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Table not found' })
  async getTableInfo(@Param('id') id: string) {
    try {
      // Fetch table from database using existing service method
      const table = await this.tablesService.findOne(id);

      // Return only necessary public fields
      return {
        id: table.id,
        table_number: table.table_number,
        capacity: table.capacity,
        location: table.location,
        status: table.status,
      };
    } catch (error) {
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Failed to fetch table info',
      );
    }
  }
}
