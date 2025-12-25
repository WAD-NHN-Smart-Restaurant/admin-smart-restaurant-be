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

export class GuestMenuQueryDto {
  @IsString()
  @IsOptional()
  q?: string; // search query

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsBoolean()
  @IsOptional()
  chefRecommended?: boolean;

  @IsString()
  @IsOptional()
  sort?: 'name' | 'price_asc' | 'price_desc' | 'popularity';

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
