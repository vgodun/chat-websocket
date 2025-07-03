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
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { MessageService } from '../service/message.service';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../auth/entity/user.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { MessageResponseDto } from '../dto/message.dto';
import { CreateMessageDto } from '../dto/createMessages.dto';
import { UpdateMessageDto } from '../dto/updateMessages.dto';


@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MessagesController {
  constructor(private readonly messageService: MessageService) {}


  @Post('rooms/:roomId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Send message to room',
    description: 'Create a new message in the specified chat room',
  })
  @ApiParam({ name: 'roomId', description: 'Chat room ID' })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data or reply message not found' })
  @ApiResponse({ status: 403, description: 'Access denied to this room' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createMessage(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
    @Body() createMessageDto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messageService.createMessage(roomId, user.id, createMessageDto);
  }


  @Get('rooms/:roomId')
  @ApiOperation({
    summary: 'Get room messages',
    description: 'Retrieve messages from a chat room with pagination (newest first)',
  })
  @ApiParam({ name: 'roomId', description: 'Chat room ID' })
  @ApiQuery({ name: 'page', description: 'Page number', required: false, example: 1 })
  @ApiQuery({ name: 'limit', description: 'Messages per page (max 100)', required: false, example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Room messages retrieved successfully',
    type: [MessageResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Access denied to this room' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRoomMessages(
    @CurrentUser() user: User,
    @Param('roomId') roomId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 50,
  ): Promise<MessageResponseDto[]> {
    const maxLimit = Math.min(limit, 100);
    return this.messageService.getRoomMessages(roomId, user.id, page, maxLimit);
  }


  @Put(':messageId')
  @ApiOperation({
    summary: 'Update message',
    description: 'Update message content (only by message sender, within time limit)',
  })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({
    status: 200,
    description: 'Message updated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Message too old to edit' })
  @ApiResponse({ status: 403, description: 'Can only edit your own messages' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMessage(
    @CurrentUser() user: User,
    @Param('messageId') messageId: string,
    @Body() updateMessageDto: UpdateMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messageService.updateMessage(messageId, user.id, updateMessageDto);
  }


  @Delete(':messageId')
  @ApiOperation({
    summary: 'Delete message',
    description: 'Delete a message (only by message sender)',
  })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  @ApiResponse({ status: 403, description: 'Can only delete your own messages' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteMessage(
    @CurrentUser() user: User,
    @Param('messageId') messageId: string,
  ): Promise<{ message: string }> {
    await this.messageService.deleteMessage(messageId, user.id);
    return { message: 'Message deleted successfully' };
  }
} 