import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entity/user.entity';
import { ChatRoom } from '../../chat/entity/chat-room.entity';
import { UserRoom } from 'src/auth/entity/user-room.entity';
import { MessageResponseDto } from '../dto/message.dto';
import { CreateMessageDto } from '../dto/createMessages.dto';
import { UpdateMessageDto } from '../dto/updateMessages.dto';
import { Message } from '../entity/message.entity';
import { MessageStatus } from '../interface/messages.interface';


@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(ChatRoom)
    private readonly chatRoomRepository: Repository<ChatRoom>,
    @InjectRepository(UserRoom)
    private readonly userRoomRepository: Repository<UserRoom>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createMessage(
    roomId: string,
    senderId: string,
    createMessageDto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    await this.verifyUserRoomAccess(roomId, senderId);
  
    if (createMessageDto.replyToId) {
      await this.validateReplyMessage(roomId, createMessageDto.replyToId);
    }
  
    const sender = await this.userRepository.findOne({
      where: { id: senderId }
    });
  
    if (!sender) {
      throw new Error(`Sender with ID ${senderId} not found`);
    }
  
    const message = this.messageRepository.create({
      ...createMessageDto,
      senderId,
      roomId,
      status: MessageStatus.SENT,
    });
  
    const savedMessage = await this.messageRepository.save(message);
  
    savedMessage.sender = sender;
  
    await this.chatRoomRepository.update(roomId, {
      lastMessageAt: new Date(),
    });
  
    await this.updateUnreadCounts(roomId, senderId);
  
    return this.formatMessageResponse(savedMessage);
  }


  async getRoomMessages(
    roomId: string,
    userId: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<MessageResponseDto[]> {
    await this.verifyUserRoomAccess(roomId, userId);

    const skip = (page - 1) * limit;

    const messages = await this.messageRepository.find({
      where: { roomId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    await this.markMessagesAsRead(roomId, userId);

    return messages.reverse().map(message => this.formatMessageResponse(message));
  }


  async updateMessage(
    messageId: string,
    userId: string,
    updateMessageDto: UpdateMessageDto,
  ): Promise<MessageResponseDto> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    const editTimeLimit = 15 * 60 * 1000;
    const messageAge = Date.now() - message.createdAt.getTime();
    
    if (messageAge > editTimeLimit) {
      throw new BadRequestException('Message is too old to edit');
    }

    await this.messageRepository.update(messageId, {
      content: updateMessageDto.content,
      isEdited: true,
      editedAt: new Date(),
    });

    const updatedMessage = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['sender'],
    });

    return this.formatMessageResponse(updatedMessage!);
  }


  async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.messageRepository.remove(message);
  }


  private async markMessagesAsRead(roomId: string, userId: string): Promise<void> {
    await this.userRoomRepository.update(
      { roomId, userId },
      { 
        lastReadAt: new Date(),
        unreadCount: 0,
      },
    );
  }


  private async updateUnreadCounts(roomId: string, senderId: string): Promise<void> {
    await this.userRoomRepository
      .createQueryBuilder()
      .update(UserRoom)
      .set({ unreadCount: () => 'unreadCount + 1' })
      .where('roomId = :roomId AND userId != :senderId', { roomId, senderId })
      .execute();
  }


  private async verifyUserRoomAccess(roomId: string, userId: string): Promise<void> {
    const userRoom = await this.userRoomRepository.findOne({
      where: { roomId, userId },
    });

    if (!userRoom) {
      throw new ForbiddenException('You do not have access to this chat room');
    }
  }


  private async validateReplyMessage(roomId: string, replyToId: string): Promise<void> {
    const replyMessage = await this.messageRepository.findOne({
      where: { id: replyToId, roomId },
    });

    if (!replyMessage) {
      throw new BadRequestException('Reply message not found in this room');
    }
  }

  private formatMessageResponse(message: Message): MessageResponseDto {  
    if (!message.sender) {
      throw new Error(`Message sender information is missing for message ${message.id} with senderId ${message.senderId}`);
    }
  
    return {
      id: message.id,
      content: message.content,
      type: message.type,
      sender: {
        id: message.sender.id,
        firstName: message.sender.firstName,
        lastName: message.sender.lastName,
        role: message.sender.role,
      },
      roomId: message.roomId,
      replyToId: message.replyToId,
      attachmentUrl: message.attachmentUrl,
      attachmentName: message.attachmentName,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      isEdited: message.isEdited,
    };
  }
} 