import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateChatRoomDto {
    @ApiPropertyOptional({ example: 'Updated room name', description: 'New room name' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;
  
    @ApiPropertyOptional({ example: 'Updated description', description: 'New room description' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;
  }
  