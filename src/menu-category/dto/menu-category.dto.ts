import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
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
