import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMenuItemPhotoDto {
  @ApiProperty({
    description: 'URL of the uploaded photo',
    example: 'https://example.com/uploads/menu-item-123-photo-1.jpg',
  })
  @IsString()
  url: string;

  @ApiPropertyOptional({
    description: 'Whether this photo is the primary photo for the menu item',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  is_primary?: boolean = false;
}

export class UpdateMenuItemPhotoDto {
  @ApiPropertyOptional({
    description: 'Whether this photo should be set as the primary photo',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  is_primary?: boolean;
}
