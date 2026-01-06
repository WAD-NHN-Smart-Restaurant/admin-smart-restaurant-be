import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GuestMenuCategoryQueryDto {
  @ApiProperty({
    description: 'QR token for table access',
    example: 'abc123def456',
  })
  @IsString()
  token: string;

  @ApiPropertyOptional({
    description: 'Table identifier',
    example: 'table-1',
  })
  @IsString()
  @IsOptional()
  table?: string;
}
