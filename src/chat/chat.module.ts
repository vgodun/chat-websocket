import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatRoom } from './entity/chat-room.entity';
import { Message } from '../messages/entity/message.entity';
import { User } from '../auth/entity/user.entity';
import { ChatRoomService } from './service/chat-room.service';
import { MessageService } from '../messages/service/message.service';
import { MessagesController } from '../messages/controller/messages.controller';
import { ChatGateway } from './gateways/chat.gateway';
import { AuthModule } from 'src/auth/auth.module';
import { UserRoom } from 'src/auth/entity/user-room.entity';
import { ChatRoomsController } from './controller/chat-rooms.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChatRoom,
      Message,
      UserRoom,
      User,
    ]),
    AuthModule,
  ],
  controllers: [
    ChatRoomsController,
    MessagesController,
  ],
  providers: [
    ChatRoomService,
    MessageService,
    ChatGateway,
  ],
  exports: [
    ChatRoomService,
    MessageService,
    ChatGateway,
  ],
})
export class ChatModule {} 