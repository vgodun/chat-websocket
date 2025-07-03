import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength } from "class-validator";

export class UpdateMessageDto {
    @ApiProperty({ example: 'Updated message content', description: 'New message content' })
    @IsString()
    @MaxLength(2000)
    content: string;
  }