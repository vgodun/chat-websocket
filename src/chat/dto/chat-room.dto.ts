import { IsString, IsEnum, IsOptional, IsUUID, MaxLength, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RoomType } from '../interface/chat.interface';


export class AddParticipantsDto {
  @ApiProperty({ example: ['user-id-1', 'user-id-2'], description: 'Array of user IDs to add' })
  @IsArray()
  @IsUUID(4, { each: true })
  userIds: string[];
}

export class ChatRoomResponseDto {
  @ApiProperty({ description: 'Room ID' })
  id: string;

  @ApiProperty({ description: 'Room name' })
  name: string;

  @ApiPropertyOptional({ description: 'Room description' })
  description?: string;

  @ApiProperty({ enum: RoomType, description: 'Room type' })
  type: RoomType;

  @ApiProperty({ description: 'Room participants' })
  participants: Array<{
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    isOnline: boolean;
  }>;

  @ApiProperty({ description: 'Last message timestamp' })
  lastMessageAt?: Date;

  @ApiProperty({ description: 'Room creation timestamp' })
  createdAt: Date;
} 