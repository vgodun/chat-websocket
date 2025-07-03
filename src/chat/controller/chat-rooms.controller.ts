import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { User } from 'src/auth/entity/user.entity';
import { UserRole } from 'src/auth/interface/user.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ChatRoomService } from '../service/chat-room.service';
import { ChatRoomResponseDto } from '../dto/chat-room.dto';
import { CreateChatRoomDto } from '../dto/createChatRoom.dto';
import { UpdateChatRoomDto } from '../dto/updateChatRoom.dto';
import { AddParticipantsDto } from '../dto/chat-room.dto';

@ApiTags('Chat Rooms')
@Controller('chat-rooms')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChatRoomsController {
  constructor(private readonly chatRoomService: ChatRoomService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create chat room',
    description: 'Create a new chat room with specified participants',
  })
  @ApiResponse({
    status: 201,
    description: 'Chat room created successfully',
    type: ChatRoomResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createRoom(
    @CurrentUser() user: User,
    @Body() createChatRoomDto: CreateChatRoomDto,
  ): Promise<ChatRoomResponseDto> {
    return this.chatRoomService.createChatRoom(createChatRoomDto, user.id);
  }

  @Post('consultation/:doctorId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create patient-doctor consultation room',
    description: 'Create a private consultation room between a patient and doctor',
  })
  @ApiParam({ name: 'doctorId', description: 'Doctor user ID' })
  @ApiResponse({
    status: 201,
    description: 'Consultation room created successfully',
    type: ChatRoomResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid user roles or user not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createConsultationRoom(
    @CurrentUser() user: User,
    @Param('doctorId') doctorId: string,
  ): Promise<ChatRoomResponseDto> {
    const patientId = user.role === UserRole.PATIENT ? user.id : doctorId;
    const finalDoctorId = user.role === UserRole.DOCTOR ? user.id : doctorId;
    
    return this.chatRoomService.createPatientDoctorRoom(patientId, finalDoctorId);
  }

  @Get('my-rooms')
  @ApiOperation({
    summary: 'Get user chat rooms',
    description: 'Retrieve all chat rooms where the current user is a participant',
  })
  @ApiResponse({
    status: 200,
    description: 'User chat rooms retrieved successfully',
    type: [ChatRoomResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserRooms(@CurrentUser() user: User): Promise<ChatRoomResponseDto[]> {
    return this.chatRoomService.getUserRooms(user.id);
  }

  @Get(':roomId')
  @ApiOperation({
    summary: 'Get chat room details',
    description: 'Retrieve detailed information about a specific chat room',
  })
  @ApiParam({ name: 'roomId', description: 'Chat room ID' })
  @ApiResponse({
    status: 200,
    description: 'Chat room details retrieved successfully',
    type: ChatRoomResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Access denied to this room' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRoomById(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
  ): Promise<ChatRoomResponseDto> {
    return this.chatRoomService.getRoomById(roomId, user.id);
  }

  @Put(':roomId')
  @ApiOperation({
    summary: 'Update chat room',
    description: 'Update chat room details (only by owner/moderator)',
  })
  @ApiParam({ name: 'roomId', description: 'Chat room ID' })
  @ApiResponse({
    status: 200,
    description: 'Chat room updated successfully',
    type: ChatRoomResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateRoom(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
    @Body() updateChatRoomDto: UpdateChatRoomDto,
  ): Promise<ChatRoomResponseDto> {
    return this.chatRoomService.updateRoom(roomId, user.id, updateChatRoomDto);
  }

  @Post(':roomId/participants')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add participants to room',
    description: 'Add new participants to the chat room (only by owner/moderator)',
  })
  @ApiParam({ name: 'roomId', description: 'Chat room ID' })
  @ApiResponse({ status: 200, description: 'Participants added successfully' })
  @ApiResponse({ status: 400, description: 'Some users not found' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addParticipants(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
    @Body() addParticipantsDto: AddParticipantsDto,
  ): Promise<{ message: string }> {
    await this.chatRoomService.addParticipants(roomId, user.id, addParticipantsDto);
    return { message: 'Participants added successfully' };
  }

  @Delete(':roomId/participants/:participantId')
  @ApiOperation({
    summary: 'Remove participant from room',
    description: 'Remove a participant from the chat room (only by owner/moderator)',
  })
  @ApiParam({ name: 'roomId', description: 'Chat room ID' })
  @ApiParam({ name: 'participantId', description: 'Participant user ID' })
  @ApiResponse({ status: 200, description: 'Participant removed successfully' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions or cannot remove owner' })
  @ApiResponse({ status: 404, description: 'Room or participant not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeParticipant(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
    @Param('participantId') participantId: string,
  ): Promise<{ message: string }> {
    await this.chatRoomService.removeParticipant(roomId, user.id, participantId);
    return { message: 'Participant removed successfully' };
  }

  @Post(':roomId/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Leave chat room',
    description: 'Leave the chat room (user removes themselves)',
  })
  @ApiParam({ name: 'roomId', description: 'Chat room ID' })
  @ApiResponse({ status: 200, description: 'Left room successfully' })
  @ApiResponse({ status: 400, description: 'Room owner cannot leave while other members exist' })
  @ApiResponse({ status: 404, description: 'Room not found or user not a member' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async leaveRoom(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
  ): Promise<{ message: string }> {
    await this.chatRoomService.leaveRoom(roomId, user.id);
    return { message: 'Left room successfully' };
  }
} 