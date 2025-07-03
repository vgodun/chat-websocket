import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entity/message.entity';
import { MessageService } from './service/message.service';
import { MessagesController } from './controller/messages.controller';
import { AuthModule } from 'src/auth/auth.module';
import { UserRoom } from 'src/auth/entity/user-room.entity';
import { User } from 'src/auth/entity/user.entity';
import { ChatRoom } from 'src/chat/entity/chat-room.entity';



@Module({
  imports: [
    TypeOrmModule.forFeature([
      Message,
      User,
      ChatRoom,
      UserRoom,
    ]),
    AuthModule, 
  ],
  controllers: [
    MessagesController,
  ],
  providers: [
    MessageService,
  ],
  exports: [
    MessageService, 
  ],
})
export class MessagesModule {} 