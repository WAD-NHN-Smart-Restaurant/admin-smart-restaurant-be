import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({
    description: 'Profile ID (same as auth user ID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiPropertyOptional({
    description: 'User full name',
    example: 'John Doe',
  })
  full_name: string | null;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
  })
  phone_number: string | null;

  @ApiPropertyOptional({
    description: 'Avatar URL',
    example: 'https://cdn.example.com/avatars/customers/user123.png',
  })
  avatar_url: string | null;

  @ApiPropertyOptional({
    description: 'User role',
    example: 'customer',
  })
  role: string | null;

  @ApiPropertyOptional({
    description: 'Restaurant ID (for admin/staff users)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  restaurant_id: string | null;

  @ApiProperty({
    description: 'Whether the staff account is active (for staff users)',
    example: true,
    default: true,
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Profile creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  created_at: string;

  @ApiProperty({
    description: 'Profile last update timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  updated_at: string;
}
