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
import * as jwt from 'jsonwebtoken';
import * as QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import { PassThrough } from 'stream';
import { TableDto } from './dto/table.dto';

type TableRow = Database['public']['Tables']['tables']['Row'];
type TableInsert = Database['public']['Tables']['tables']['Insert'];
const qrCodeGenerater = 'https://api.qrserver.com/v1/create-qr-code/';

@Injectable()
export class TablesService {
  constructor(private readonly tablesRepository: TablesRepository) {}

  async create(
    createTableDto: CreateTableDto,
    restaurantId: string,
  ): Promise<TableRow> {
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
      restaurant_id: restaurantId,
    };

    try {
      return await this.tablesRepository.create(tableData);
    } catch (error) {
      throw new BadRequestException(`Failed to create table: ${error.message}`);
    }
  }

  async findAll(
    query: QueryTablesDto,
  ): Promise<(TableRow & { qrUrl: string | null })[]> {
    try {
      const tables = await this.tablesRepository.findAll({
        status: query.status,
        location: query.location,
        sortBy: query.sortBy || 'created_at',
        sortOrder: query.sortOrder || 'asc',
      });
      // Compute qrUrl for each table only if qr_token exists

      const result = await Promise.all(
        tables.map(async (table) => {
          return {
            ...table,
            qrUrl: `${qrCodeGenerater}?data=${encodeURIComponent(`${process.env.FRONTEND_URL}/menu?table=${table.id}&token=${table.qr_token}`)}&size=200x200`,
          };
        }),
      );
      return result;
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

  /**
   * Generate a signed token (JWT) for a table and produce a PNG QR code buffer.
   * Stores the token and token creation timestamp in the database.
   */
  async generateQRCode(
    id: string,
    options?: { expiresIn?: string | number; rotate?: boolean },
  ): Promise<{ qrUrl: string }> {
    // Ensure table exists
    const table = await this.findOne(id);
    if (!table) {
      throw new NotFoundException(`Table with ID '${id}' not found`);
    }

    const secret = process.env.QR_JWT_SECRET || 'change_this_secret';
    // Use restaurant_id from the table instead of env
    const restaurantId = table.restaurant_id;

    const payload = {
      tableId: id,
      restaurantId,
      createdAt: new Date().toISOString(),
    } as any;

    const signOptions: jwt.SignOptions = {};
    if (options?.expiresIn) signOptions.expiresIn = options.expiresIn as any;
    const token = jwt.sign(payload, secret, signOptions);

    // Persist token and timestamp
    await this.tablesRepository.updateQRToken(
      id,
      token,
      new Date().toISOString(),
    );
    return {
      qrUrl: `${qrCodeGenerater}?data=${encodeURIComponent(`${process.env.FRONTEND_URL}/menu?table=${table.id}&token=${token}`)}&size=200x200`,
    };
  }

  /**
   * Create QR code buffer from table's qr_token (if exists)
   */
  async getQrBufferFromToken(id: string): Promise<Buffer | null> {
    const table = await this.findOne(id);
    if (!table.qr_token) return null;
    const qrEmbededUrl = `${process.env.FRONTEND_URL}/menu?table=${id}&token=${table.qr_token}`;

    return await QRCode.toBuffer(qrEmbededUrl, {
      type: 'png',
      width: 200,
      margin: 4,
    });
  }

  /**
   * Helper to create a simple PDF buffer containing QR code and table info
   */
  async createPdfWithQr(table: TableRow, qrBuffer: Buffer): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ autoFirstPage: false });
        const chunks: Buffer[] = [];

        doc.addPage({ size: 'A4', margin: 40 });

        // Title / Table number
        doc
          .fontSize(20)
          .text(`Table ${table.table_number}`, { align: 'center' });
        doc.moveDown(1);

        // QR image centered
        const imgX = (doc.page.width - 300) / 2;
        doc.image(qrBuffer, imgX, doc.y, { width: 300 });

        doc.y += 320; // 300 for image height + 20 for margin

        doc.fontSize(12).text('Scan to Order', { align: 'center' });

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err: Error) => reject(err));

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Download QR code for a table (PNG or PDF)
   */
  async getQrCodeFile(
    id: string,
    format: 'png' | 'pdf' = 'png',
  ): Promise<{ filename: string; buffer: Buffer; contentType: string }> {
    //const { qrBuffer, table } = await this.generateQRCode(id, options);

    const table = await this.findOne(id);
    if (!table.qr_token) {
      throw new NotFoundException(`QR code not generated for table ID '${id}'`);
    }

    const qrBuffer = await this.getQrBufferFromToken(id);
    if (!qrBuffer) {
      throw new NotFoundException(
        `Failed to download QR code for table ID '${id}'`,
      );
    }
    if (format === 'pdf') {
      const pdfBuffer = await this.createPdfWithQr(table, qrBuffer);
      return {
        filename: `table-${table.table_number}-qr.pdf`,
        buffer: pdfBuffer,
        contentType: 'application/pdf',
      };
    }
    // PNG
    return {
      filename: `table-${table.table_number}-qr.png`,
      buffer: qrBuffer,
      contentType: 'image/png',
    };
  }

  /**
   * Generate QR buffers for all tables (optionally regenerate tokens)
   */
  async generateAllQRCodes(options?: {
    expiresIn?: string | number;
    rotate?: boolean;
  }) {
    const tables = await this.findAll({} as any);

    for (const t of tables) {
      const res = await this.generateQRCode(t.id, {
        expiresIn: options?.expiresIn,
      });
    }
  }

  /**
   * Download all QR codes as ZIP or single PDF
   */
  async getAllQrCodesArchive(
    format: 'png' | 'pdf' = 'png',
  ): Promise<{ filename: string; stream: PassThrough; contentType: string }> {
    const tables = await this.findAll({} as any);
    const archiveStream = new PassThrough();
    let filename = '';
    let contentType = '';

    if (format === 'pdf') {
      // Single PDF with all tables
      const doc = new PDFDocument({ autoFirstPage: false });
      doc.pipe(archiveStream);
      for (const table of tables) {
        if (!table.qr_token) continue; // Skip tables without QR tokens
        const qrBuffer = await this.getQrBufferFromToken(table.id);
        if (!qrBuffer) continue; // Skip if buffer generation fails

        doc.addPage({ size: 'A4', margin: 40 });
        doc
          .fontSize(20)
          .text(`Table ${table.table_number}`, { align: 'center' });
        doc.moveDown(1);
        const imgX = (doc.page.width - 300) / 2;
        doc.image(qrBuffer, imgX, doc.y, { width: 300 });

        doc.y += 320; // 300 for image height + 20 for margin

        doc.fontSize(12).text('Scan to Order', { align: 'center' });
      }
      doc.end();
      filename = 'all-tables-qr.pdf';
      contentType = 'application/pdf';
    } else {
      // ZIP of PNGs
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(archiveStream);
      for (const table of tables) {
        if (!table.qr_token) continue; // Skip tables without QR tokens
        const qrBuffer = await this.getQrBufferFromToken(table.id);
        if (!qrBuffer) continue; // Skip if buffer generation fails

        archive.append(qrBuffer, {
          name: `table-${table.table_number}-qr.png`,
        });
      }
      archive.finalize();
      filename = 'all-tables-qr.zip';
      contentType = 'application/zip';
    }
    return { filename, stream: archiveStream, contentType };
  }

  /**
   * Verify a QR JWT token and return decoded payload or throw
   */
  verifyQrToken(token: string) {
    const secret = process.env.QR_JWT_SECRET;
    try {
      if (secret) {
        const decoded = jwt.verify(token, secret);
        return decoded as any;
      } else {
        console.error('QR JWT secret not configured');
      }
    } catch (err) {
      console.log('QR token verification failed:', err);
      throw new BadRequestException(
        'This QR code is no longer valid. Please ask staff for assistance.',
      );
    }
  }

  /**
   * Regenerate QR code for a table (invalidate old token)
   */
  async regenerateQRCode(
    id: string,
    options?: { expiresIn?: string | number },
  ) {
    // Just call generateQRCode with rotate flag
    return this.generateQRCode(id, { ...options, rotate: true });
  }

  /**
   * Bulk regenerate all QR codes
   */
  async bulkRegenerateQRCodes(options?: { expiresIn?: string | number }) {
    return this.generateAllQRCodes({ ...options, rotate: true });
  }

  /**
   * Invalidate a QR token (for logging, not implemented in DB here)
   */
  async invalidateQrToken(token: string) {
    // In a real system, store invalidated tokens in DB or cache
    // For demo, just throw error on verify
    return true;
  }
}
