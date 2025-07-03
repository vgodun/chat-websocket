import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export class LoginDto {
    @ApiProperty({ example: 'john.doe@example.com', description: 'User email address' })
    @IsEmail()
    email: string;
  
    @ApiProperty({ example: 'SecurePass123!', description: 'User password' })
    @IsString()
    password: string;
  }