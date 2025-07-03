import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
  } from '@nestjs/websockets';
  import { Server, Socket } from 'socket.io';
  import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import { MessageService } from '../../messages/service/message.service';
  import { ChatRoomService } from '../service/chat-room.service';
  import { AuthService } from '../../auth/service/auth.service';
import { CreateMessageDto } from 'src/messages/dto/createMessages.dto';
  
  @WebSocketGateway({
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3001'],
      credentials: true,
    },
    namespace: '/chat',
  })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;
  
    private readonly logger = new Logger(ChatGateway.name);
    private connectedUsers = new Map<string, { socketId: string; userId: string; rooms: Set<string> }>();
  
    constructor(
      private readonly messageService: MessageService,
      private readonly chatRoomService: ChatRoomService,
      private readonly authService: AuthService,
      private readonly jwtService: JwtService,
    ) {}

    afterInit(server: Server) {
      this.logger.log('Chat Gateway initialized');
    }
  
    async handleConnection(client: Socket) {
      try {
        let token: string | null = null;
        
        if (client.handshake.auth?.token) {
          token = client.handshake.auth.token;
          this.logger.debug('Token found in auth object');
        }
        
        if (!token && client.handshake.headers?.authorization) {
          const authHeader = client.handshake.headers.authorization;
          if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            token = authHeader.replace('Bearer ', '');
            this.logger.debug('Token found in authorization header');
          }
        }
        
        if (!token && client.handshake.query?.token) {
          token = Array.isArray(client.handshake.query.token) 
            ? client.handshake.query.token[0] 
            : client.handshake.query.token;
          this.logger.debug('Token found in query parameter');
        }
        
        if (!token) {
          this.logger.warn('No authentication token provided from any source');
          throw new Error('No authentication token provided. Use auth.token, Authorization header, or ?token= query parameter');
        }
        
        const payload = this.jwtService.verify(token);
        const user = await this.authService.validateUser(payload);
  
        this.connectedUsers.set(client.id, {
          socketId: client.id,
          userId: user.id,
          rooms: new Set(),
        });
  
        await this.updateUserOnlineStatus(user.id, true);
  
        await client.join(`user:${user.id}`);
  
        await this.broadcastUserStatus(user.id, true);
        
        client.emit('connected', {
          userId: user.id,
          email: user.email,
          role: user.role,
          message: 'Successfully connected to chat',
          timestamp: new Date().toISOString(),
        });
  
      } catch (error) {
        client.emit('error', { 
          message: 'Authentication failed: ' + error.message,
          timestamp: new Date().toISOString(),
        });
        client.disconnect();
      }
    }

    async handleDisconnect(client: Socket) {
      const connection = this.connectedUsers.get(client.id);
      
      if (connection) {
        try {
          await this.updateUserOnlineStatus(connection.userId, false);
          
          await this.broadcastUserStatus(connection.userId, false);
          
          this.logger.log(`User ${connection.userId} disconnected from socket ${client.id}`);
        } catch (error) {
          this.logger.error(`Error handling disconnect: ${error.message}`);
        }
        
        this.connectedUsers.delete(client.id);
      } else {
        this.logger.debug(`Socket ${client.id} disconnected (no user info found)`);
      }
    }
  

    @SubscribeMessage('join-room')
    async handleJoinRoom(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { roomId: string },
    ) {
      try {
        const connection = this.connectedUsers.get(client.id);
        if (!connection) {
          throw new Error('User not authenticated');
        }
  
        await this.chatRoomService.getRoomById(data.roomId, connection.userId);
  
        await client.join(data.roomId);
        connection.rooms.add(data.roomId);
  
        client.to(data.roomId).emit('user-joined-room', {
          userId: connection.userId,
          roomId: data.roomId,
          timestamp: new Date().toISOString(),
        });
  
        client.emit('joined-room', { 
          roomId: data.roomId,
          timestamp: new Date().toISOString(),
        });
        
        this.logger.log(`User ${connection.userId} joined room ${data.roomId}`);
  
      } catch (error) {
        this.logger.error(`Join room error: ${error.message}`);
        client.emit('error', { message: error.message });
      }
    }
  

    @SubscribeMessage('leave-room')
    async handleLeaveRoom(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { roomId: string },
    ) {
      try {
        const connection = this.connectedUsers.get(client.id);
        if (!connection) {
          throw new Error('User not authenticated');
        }
  
        await client.leave(data.roomId);
        connection.rooms.delete(data.roomId);
  
        client.to(data.roomId).emit('user-left-room', {
          userId: connection.userId,
          roomId: data.roomId,
          timestamp: new Date().toISOString(),
        });
  
        client.emit('left-room', { 
          roomId: data.roomId,
          timestamp: new Date().toISOString(),
        });
        
        this.logger.log(`User ${connection.userId} left room ${data.roomId}`);
  
      } catch (error) {
        this.logger.error(`Leave room error: ${error.message}`);
        client.emit('error', { message: error.message });
      }
    }
  

    @SubscribeMessage('send-message')
    async handleSendMessage(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: CreateMessageDto & { roomId: string },
    ) {
      try {
        const connection = this.connectedUsers.get(client.id);
        if (!connection) {
          throw new Error('User not authenticated');
        }
  
        const message = await this.messageService.createMessage(
          data.roomId,
          connection.userId,
          data,
        );
  
        this.server.to(data.roomId).emit('message-received', {
          ...message,
          timestamp: new Date().toISOString(),
        });
  
        client.emit('message-sent', { 
          messageId: message.id,
          timestamp: new Date().toISOString(),
        });
  
        this.logger.log(` Message sent by ${connection.userId} in room ${data.roomId}`);
  
      } catch (error) {
        this.logger.error(`Send message error: ${error.message}`);
        client.emit('error', { message: error.message });
      }
    }
  

    @SubscribeMessage('typing')
    async handleTyping(
      @ConnectedSocket() client: Socket,
      @MessageBody() data: { roomId: string; isTyping: boolean },
    ) {
      try {
        const connection = this.connectedUsers.get(client.id);
        if (!connection) {
          return;
        }
  
        client.to(data.roomId).emit('user-typing', {
          userId: connection.userId,
          roomId: data.roomId,
          isTyping: data.isTyping,
          timestamp: new Date().toISOString(),
        });
  
        this.logger.debug(` User ${connection.userId} typing: ${data.isTyping} in room ${data.roomId}`);
  
      } catch (error) {
        this.logger.error(`Typing error: ${error.message}`);
      }
    }
  

    private async updateUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
      try {
        this.logger.debug(`User ${userId} status: ${isOnline ? 'online' : 'offline'}`);
      } catch (error) {
        this.logger.error(`Failed to update user status: ${error.message}`);
      }
    }
  

    private async broadcastUserStatus(userId: string, isOnline: boolean): Promise<void> {
      try {
        this.server.emit('user-online', {
          userId,
          isOnline,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        this.logger.error(`Failed to broadcast user status: ${error.message}`);
      }
    }
  

    public async sendToUser(userId: string, event: string, data: any): Promise<void> {
      this.server.to(`user:${userId}`).emit(event, data);
    }
  

    public async sendToRoom(roomId: string, event: string, data: any): Promise<void> {
      this.server.to(roomId).emit(event, data);
    }
  }