import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum StaffRoleFilter {
  ADMIN = 'admin',
  WAITER = 'waiter',
  KITCHEN_STAFF = 'kitchen_staff',
}

export class ListStaffQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by staff role',
    enum: StaffRoleFilter,
    example: 'waiter',
  })
  @IsEnum(StaffRoleFilter)
  @IsOptional()
  role?: StaffRoleFilter;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    default: 10,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}
