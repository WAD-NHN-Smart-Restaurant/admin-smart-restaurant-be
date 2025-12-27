import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GuestMenuQueryDto {
  @ApiPropertyOptional({
    description:
      'Restaurant ID to scope the menu (optional when using QR token)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  restaurantId?: string;

  @ApiPropertyOptional({
    description: 'Filter by menu category ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by chef recommended items only',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  chefRecommended?: boolean;

  @ApiPropertyOptional({
    description: 'Sort order for the results',
    example: 'name',
    enum: ['name', 'price_asc', 'price_desc', 'popularity'],
  })
  @IsString()
  @IsOptional()
  sort?: 'name' | 'price_asc' | 'price_desc' | 'popularity';

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'QR token for table authentication (required for access)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  token?: string;

  @ApiPropertyOptional({
    description: 'Table ID (optional, extracted from QR token)',
    example: 'b83e05be-f475-4e26-aba2-eabb229a9d0c',
  })
  @IsUUID()
  @IsOptional()
  table?: string;
}
