import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StaffResponseDto {
  @ApiProperty({
    description: 'Staff member ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Staff member email',
    example: 'john.doe@restaurant.com',
  })
  email: string;

  @ApiProperty({
    description: 'Staff member full name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Staff member role',
    example: 'waiter',
    enum: ['admin', 'waiter', 'kitchen_staff'],
  })
  role: string;

  @ApiPropertyOptional({
    description: 'Staff member phone number',
    example: '+1234567890',
  })
  phoneNumber: string | null;

  @ApiPropertyOptional({
    description: 'Staff member avatar URL',
    example: 'https://cdn.example.com/avatars/staff/user123.png',
  })
  avatarUrl: string | null;

  @ApiProperty({
    description: 'Whether the staff account is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Staff member creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Restaurant ID the staff member belongs to',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  restaurantId: string;
}

export class StaffListResponseDto {
  @ApiProperty({
    description: 'List of staff members',
    type: [StaffResponseDto],
  })
  data: StaffResponseDto[];

  @ApiPropertyOptional({
    description: 'Pagination metadata',
  })
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export class CreateStaffResponseDto {
  @ApiProperty({
    description: 'Created staff member data',
    type: StaffResponseDto,
  })
  data: StaffResponseDto;

  @ApiPropertyOptional({
    description:
      'Default password for the new staff account (should be communicated securely)',
    example: 'TempPassword123!',
  })
  defaultPassword?: string;
}
