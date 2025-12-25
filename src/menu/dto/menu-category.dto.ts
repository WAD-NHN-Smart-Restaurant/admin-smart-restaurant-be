import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  Min,
  MinLength,
  MaxLength,
} from 'class-validator';

export enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  display_order?: number;

  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus = CategoryStatus.ACTIVE;
}

export class UpdateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  display_order?: number;

  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;
}

export class CategoryQueryDto {
  @IsString()
  @IsOptional()
  q?: string;

  @IsEnum(CategoryStatus)
  @IsOptional()
  status?: CategoryStatus;

  @IsString()
  @IsOptional()
  sort?: 'display_order' | 'name' | 'created_at';
}
