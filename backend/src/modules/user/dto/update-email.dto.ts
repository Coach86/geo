import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class UpdateEmailDto {
  @ApiProperty({
    description: 'New email address for the user',
    example: 'newemail@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}