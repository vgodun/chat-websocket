import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "../interface/user.interface";

export class AuthResponseDto {
    @ApiProperty({ description: 'JWT access token' })
    accessToken: string;
  
    @ApiProperty({ description: 'JWT refresh token' })
    refreshToken: string;
  
    @ApiProperty({ description: 'User information' })
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: UserRole;
    };
  } 