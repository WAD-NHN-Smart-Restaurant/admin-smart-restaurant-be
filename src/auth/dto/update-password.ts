import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';


export class UpdatePasswordDto_1 {
    @ApiProperty({
    description: 'New password for the user',
    example: 'StrongP@ssw0rd!',
  })
  newPassword: string;
    @ApiProperty({
    description: 'Access token for authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;
    @ApiProperty({
    description: 'Refresh token for obtaining new access tokens',
    example: 'def50200b4c3e5f8a9c6e7d8f9a0b1c2d3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9...',
  })
  refreshToken: string;
}