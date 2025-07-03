import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, MaxLength, IsOptional, IsEnum, IsArray, IsUUID } from "class-validator";
import { RoomType } from "../interface/chat.interface";

export class CreateChatRoomDto {
    @ApiProperty({ example: 'Patient-Doctor Consultation', description: 'Room name' })
    @IsString()
    @MaxLength(255)
    name: string;
  
    @ApiPropertyOptional({ example: 'Private consultation room', description: 'Room description' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;
  
    @ApiProperty({ enum: RoomType, example: RoomType.PATIENT_DOCTOR, description: 'Room type' })
    @IsEnum(RoomType)
    type: RoomType = RoomType.PATIENT_DOCTOR;
  
    @ApiPropertyOptional({ example: ['user-id-1', 'user-id-2'], description: 'Array of user IDs to add to room' })
    @IsOptional()
    @IsArray()
    @IsUUID(4, { each: true })
    participantIds?: string[];
  }