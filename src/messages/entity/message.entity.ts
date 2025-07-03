import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entity/user.entity';
import { ChatRoom } from '../../chat/entity/chat-room.entity';
import { MessageType, MessageStatus } from '../interface/messages.interface';


@Entity('messages')
@Index(['roomId', 'createdAt'])
@Index(['senderId'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  @Column({ nullable: true })
  attachmentUrl?: string;

  @Column({ nullable: true })
  attachmentName?: string;

  @Column({ nullable: true })
  attachmentSize?: number;

  @Column({ nullable: true })
  replyToId?: string;

  @Column({ default: false })
  isEdited: boolean;

  @Column({ nullable: true })
  editedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;


  @Column()
  senderId: string;

  @ManyToOne(() => User, (user) => user.sentMessages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column()
  roomId: string;

  @ManyToOne(() => ChatRoom, (room) => room.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roomId' })
  room: ChatRoom;
} 