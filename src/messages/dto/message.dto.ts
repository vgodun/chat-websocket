import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageType } from '../interface/messages.interface';


export class MessageResponseDto {
  @ApiProperty({ description: 'Message ID' })
  id: string;

  @ApiProperty({ description: 'Message content' })
  content: string;

  @ApiProperty({ enum: MessageType, description: 'Message type' })
  type: MessageType;

  @ApiProperty({ description: 'Sender information' })
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };

  @ApiProperty({ description: 'Room ID' })
  roomId: string;

  @ApiPropertyOptional({ description: 'Reply to message ID' })
  replyToId?: string;

  @ApiPropertyOptional({ description: 'Attachment URL' })
  attachmentUrl?: string;

  @ApiPropertyOptional({ description: 'Attachment name' })
  attachmentName?: string;

  @ApiProperty({ description: 'Message creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Message update timestamp' })
  updatedAt: Date;

  @ApiProperty({ description: 'Whether message was edited' })
  isEdited: boolean;
} 