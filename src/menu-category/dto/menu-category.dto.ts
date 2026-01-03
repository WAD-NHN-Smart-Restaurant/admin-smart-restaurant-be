import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Main Courses',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Delicious main course dishes',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Display order for sorting categories',
    example: 1,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  display_order?: number;

  @ApiPropertyOptional({
    description: 'Category status',
    enum: CategoryStatus,
    example: CategoryStatus.ACTIVE,
  })
  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus = CategoryStatus.ACTIVE;
}

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Category name',
    example: 'Appetizers',
    minLength: 2,
    maxLength: 50,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Tasty starters and appetizers',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Display order for sorting categories',
    example: 2,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  display_order?: number;

  @ApiPropertyOptional({
    description: 'Category status',
    enum: CategoryStatus,
    example: CategoryStatus.ACTIVE,
  })
  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;
}

export class CategoryQueryDto {
  @ApiPropertyOptional({
    description: 'Search query for filtering categories by name',
    example: 'pizza',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by category status',
    enum: CategoryStatus,
    example: CategoryStatus.ACTIVE,
  })
  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['name', 'displayOrder', 'itemCount', 'createdAt'],
    example: 'displayOrder',
  })
  @IsString()
  @IsOptional()
  sortBy?: 'name' | 'displayOrder' | 'itemCount' | 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'asc',
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
