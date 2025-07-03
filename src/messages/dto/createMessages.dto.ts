import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, MaxLength, IsEnum, IsOptional, IsUUID } from "class-validator";
import { MessageType } from "../interface/messages.interface";

export class CreateMessageDto {
    @ApiProperty({ example: 'Hello, how are you feeling today?', description: 'Message content' })
    @IsString()
    @MaxLength(2000)
    content: string;
  
    @ApiProperty({ enum: MessageType, example: MessageType.TEXT, description: 'Message type' })
    @IsEnum(MessageType)
    type: MessageType = MessageType.TEXT;
  
    @ApiPropertyOptional({ example: 'uuid', description: 'ID of message being replied to' })
    @IsOptional()
    @IsUUID()
    replyToId?: string;
  
    @ApiPropertyOptional({ example: 'https://example.com/file.pdf', description: 'Attachment URL' })
    @IsOptional()
    @IsString()
    attachmentUrl?: string;
  
    @ApiPropertyOptional({ example: 'document.pdf', description: 'Attachment file name' })
    @IsOptional()
    @IsString()
    attachmentName?: string;
  }