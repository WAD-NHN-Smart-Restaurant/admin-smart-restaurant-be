import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateMenuItemPhotoDto {
  @IsString()
  url: string;

  @IsBoolean()
  @IsOptional()
  is_primary?: boolean = false;
}

export class UpdateMenuItemPhotoDto {
  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;
}
